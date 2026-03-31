import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { z } from "zod";
import prisma from "../../prisma";
import { stripe } from "../lib/stripe/server-stripe";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";
import { organizationEmailService } from "../lib/email/organization-email";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
  hashToken,
  signCustomerAccessToken,
  signCustomerRefreshToken,
  verifyCustomerToken,
  verifyTokenHash,
} from "../lib/customer-auth";
import {
  getAppointmentCollectedAmount,
  isCancellationFeeApplicable,
  resolveCancellationChargeResult,
  resolveDiscountAmount,
  syncAppointmentPaymentsIfPossible,
} from "./appointment";
import { customerJwtProcedure, publicProcedure, router } from "../lib/trpc";
import type { CustomerJWTPayload } from "../lib/types";

const ACCESS_COOKIE_TTL_SECONDS = 60 * 15;
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const CUSTOMER_COOKIE_SECURE =
  process.env.CUSTOMER_COOKIE_SECURE === "true" ||
  process.env.NODE_ENV === "production";
const CUSTOMER_COOKIE_SAMESITE =
  process.env.CUSTOMER_COOKIE_SAMESITE === "none" ? "none" : "lax";

const setCustomerAuthCookies = async (
  accessToken: string,
  refreshToken: string,
) => {
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: CUSTOMER_COOKIE_SECURE,
    sameSite: CUSTOMER_COOKIE_SAMESITE,
    maxAge: ACCESS_COOKIE_TTL_SECONDS,
  });

  cookieStore.set(CUSTOMER_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: CUSTOMER_COOKIE_SECURE,
    sameSite: CUSTOMER_COOKIE_SAMESITE,
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
};

const clearCustomerAuthCookies = async () => {
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: CUSTOMER_COOKIE_SECURE,
    sameSite: CUSTOMER_COOKIE_SAMESITE,
    maxAge: 0,
  });

  cookieStore.set(CUSTOMER_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: CUSTOMER_COOKIE_SECURE,
    sameSite: CUSTOMER_COOKIE_SAMESITE,
    maxAge: 0,
  });
};

const normalizeEmail = (email: string) => email.trim();

const buildOtpIdentifier = (organizationId: string, email: string) =>
  `customer-signup-otp:${organizationId}:${normalizeEmail(email)}`;

const generateOtpCode = () =>
  crypto
    .randomInt(0, Math.pow(10, OTP_LENGTH))
    .toString()
    .padStart(OTP_LENGTH, "0");

const sendCustomerOtpEmail = async (input: {
  email: string;
  organizationId: string;
  organizationName: string;
  otpCode: string;
  expiresInMinutes: number;
}) => {
  const { email, organizationId, organizationName, otpCode, expiresInMinutes } =
    input;

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[customerAuth] OTP for ${email} (${organizationName}) => ${otpCode} (expires in ${expiresInMinutes}m)`,
    );
  }

  await organizationEmailService.send({
    organizationId,
    to: email,
    subject: `${organizationName} verification code`,
    text: `Your ${organizationName} verification code is ${otpCode}. It expires in ${expiresInMinutes} minutes.`,
  });
};

const createAndSendSignupOtp = async (input: {
  email: string;
  organizationId: string;
}) => {
  const normalizedEmail = normalizeEmail(input.email);

  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, stripeAccountId: true, name: true },
  });

  if (!organization) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization not found",
    });
  }

  if (!organization?.stripeAccountId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization is not properly configured for payments",
    });
  }

  const existingAuth = await prisma.customerAuth.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingAuth) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An account with this email already exists",
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An account with this email already exists",
    });
  }

  const otpCode = generateOtpCode();
  const identifier = buildOtpIdentifier(input.organizationId, normalizedEmail);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.verification.deleteMany({
    where: { identifier },
  });

  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier,
      value: await hashToken(otpCode),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
  });

  await sendCustomerOtpEmail({
    email: normalizedEmail,
    organizationId: organization.id,
    organizationName: organization.name,
    otpCode,
    expiresInMinutes: OTP_TTL_MINUTES,
  });

  return {
    email: normalizedEmail,
    expiresAt,
  };
};

const buildPayload = (input: {
  customerAuthId: string;
  customerId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string | null;
}): CustomerJWTPayload => ({
  sub: input.customerAuthId,
  customerId: input.customerId,
  userId: input.userId,
  orgId: input.orgId,
  email: input.email,
  name: input.name,
  type: "customer",
});

const getSessionFromAccessToken = async (token: string) => {
  const payload = verifyCustomerToken(token);
  if (payload.type !== "customer") {
    throw new Error("Invalid customer token");
  }

  const customerAuth = await prisma.customerAuth.findUnique({
    where: { id: payload.sub },
    include: {
      customer: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!customerAuth?.customer) {
    throw new Error("Customer not found");
  }

  return {
    customerAuth,
    customer: customerAuth.customer,
    user: customerAuth.customer.user,
  };
};

const getStripeDefaultPaymentMethodId = (
  customer: Stripe.Customer,
): string | null => {
  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

  if (!defaultPaymentMethod) {
    return null;
  }

  return typeof defaultPaymentMethod === "string"
    ? defaultPaymentMethod
    : defaultPaymentMethod.id;
};

const getCustomerSavedPaymentMethods = async ({
  stripeCustomerId,
  stripeAccountId,
  selectedPaymentMethodId,
}: {
  stripeCustomerId: string | null;
  stripeAccountId: string | null | undefined;
  selectedPaymentMethodId?: string | null;
}) => {
  if (!stripeCustomerId || !stripeAccountId) {
    return {
      selectedPaymentMethodId: selectedPaymentMethodId ?? null,
      savedPaymentMethods: [] as Array<{
        id: string;
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
        isDefault: boolean;
      }>,
    };
  }

  const stripeCustomer = await stripe.customers.retrieve(
    stripeCustomerId,
    {
      expand: ["invoice_settings.default_payment_method"],
    },
    {
      stripeAccount: stripeAccountId,
    },
  );

  if ("deleted" in stripeCustomer && stripeCustomer.deleted) {
    return {
      selectedPaymentMethodId: selectedPaymentMethodId ?? null,
      savedPaymentMethods: [] as Array<{
        id: string;
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
        isDefault: boolean;
      }>,
    };
  }

  const defaultPaymentMethodId = getStripeDefaultPaymentMethodId(stripeCustomer);
  const paymentMethods = await stripe.paymentMethods.list(
    {
      customer: stripeCustomerId,
      type: "card",
      limit: 20,
    },
    {
      stripeAccount: stripeAccountId,
    },
  );

  const savedPaymentMethods = paymentMethods.data
    .filter((paymentMethod) => Boolean(paymentMethod.card))
    .map((paymentMethod) => ({
      id: paymentMethod.id,
      brand: paymentMethod.card?.brand ?? "card",
      last4: paymentMethod.card?.last4 ?? "****",
      expMonth: paymentMethod.card?.exp_month ?? 0,
      expYear: paymentMethod.card?.exp_year ?? 0,
      isDefault: paymentMethod.id === defaultPaymentMethodId,
    }))
    .sort((left, right) => Number(right.isDefault) - Number(left.isDefault));

  return {
    selectedPaymentMethodId:
      selectedPaymentMethodId ??
      defaultPaymentMethodId ??
      savedPaymentMethods[0]?.id ??
      null,
    savedPaymentMethods,
  };
};

const getCustomerPortalCancellationAppointment = async ({
  appointmentId,
  customerId,
  organizationId,
}: {
  appointmentId: string;
  customerId: string;
  organizationId: string;
}) =>
  prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      customerId,
      location: {
        organizationId,
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      price: true,
      customerId: true,
      paymentMethodId: true,
      paymentMethodLast4: true,
      discountAmountApplied: true,
      promoCode: {
        select: {
          discount: true,
        },
      },
      customer: {
        select: {
          stripeCustomerId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          timeZone: true,
          organizationId: true,
          appointmentSettings: {
            select: {
              cancellationPercent: true,
              cancellationDuration: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          serviceTerms: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

export const customerAuthRouter = router({
  requestSignUpOtp: publicProcedure
    .input(
      z.object({
        email: z.email(),
        organizationId: z.string().min(2).max(90),
      }),
    )
    .mutation(async ({ input }) => createAndSendSignupOtp(input)),
  resendSignUpOtp: publicProcedure
    .input(
      z.object({
        email: z.email(),
        organizationId: z.string().min(2).max(90),
      }),
    )
    .mutation(async ({ input }) => createAndSendSignupOtp(input)),
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.email(),
        password: z.string().min(8),
        phoneNumber: z.string().min(1),
        consentToSmsAndEmail: z.literal(true),
        otp: z.string().regex(/^\d{6}$/),
        organizationId: z.string().min(2).max(90),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, email, password, phoneNumber, organizationId, otp } = input;
      const normalizedEmail = normalizeEmail(email);

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, stripeAccountId: true },
      });

      if (!organization) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization not found",
        });
      }

      if (!organization?.stripeAccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization is not properly configured for payments",
        });
      }

      const existingAuth = await prisma.customerAuth.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingAuth) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const now = new Date();
      const otpIdentifier = buildOtpIdentifier(organizationId, normalizedEmail);
      const verification = await prisma.verification.findFirst({
        where: {
          identifier: otpIdentifier,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification code",
        });
      }

      const isOtpValid = await verifyTokenHash(otp, verification.value);
      if (!isOtpValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification code",
        });
      }
      const userId = crypto.randomUUID();
      const user = await prisma.user.create({
        data: {
          id: userId,
          name,
          email: normalizedEmail,
          emailVerified: false,
          image: null,
          token: null,
          createdAt: now,
          updatedAt: now,
          isTempPassword: false,
        },
      });

      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
          orgId: organizationId,
          phoneNumber,
        },
      });

      // Always create a new Stripe customer for this organization

      const stripeCustomer = await stripe.customers.create(
        {
          email: user.email,
          name: user.name ?? undefined,
          metadata: {
            userId: user.id,
            customerId: customer.id,
          },
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      // Update customer with Stripe ID
      await prisma.customer.update({
        where: { id: customer.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });

      console.log("[signUp] Created Stripe customer:", {
        customerId: customer.id,
        stripeCustomerId: stripeCustomer.id,
      });

      const passwordHash = await bcrypt.hash(password, 10);
      const customerAuth = await prisma.customerAuth.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          customerId: customer.id,
          userId: user.id,
          orgId: organizationId,
        },
      });

      console.log("[signUp] Created customerAuth:", {
        id: customerAuth.id,
        email: customerAuth.email,
        customerId: customer.id,
        userId: user.id,
        orgId: organizationId,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      const payload = buildPayload({
        customerAuthId: customerAuth.id,
        customerId: customer.id,
        userId: user.id,
        orgId: organizationId,
        email: user.email,
        name: user.name ?? null,
      });

      const accessToken = signCustomerAccessToken(payload);
      const refreshToken = signCustomerRefreshToken(payload);
      const refreshTokenHash = await hashToken(refreshToken);

      await prisma.customerAuth.update({
        where: { id: customerAuth.id },
        data: {
          refreshTokenHash,
          refreshTokenExpiresAt: new Date(
            Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
          ),
        },
      });

      await setCustomerAuthCookies(accessToken, refreshToken);

      await prisma.verification.deleteMany({
        where: { identifier: otpIdentifier },
      });

      return {
        customer: {
          id: customer.id,
          orgId: customer.orgId,
          phoneNumber: customer.phoneNumber,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      };
    }),
  signIn: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string().min(8),
        organizationId: z.string().min(2).max(90).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { password, organizationId } = input;
      const email = normalizeEmail(input.email);

      const customerAuth = await prisma.customerAuth.findUnique({
        where: { email },
        include: {
          customer: {
            include: { user: true },
          },
        },
      });

      if (!customerAuth?.customer) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      if (organizationId && customerAuth.orgId !== organizationId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      if (!customerAuth.customer.user.emailVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Email verification required",
        });
      }
      const isPasswordValid = await bcrypt.compare(
        password,
        customerAuth.passwordHash,
      );

      if (!isPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const payload = buildPayload({
        customerAuthId: customerAuth.id,
        customerId: customerAuth.customer.id,
        userId: customerAuth.userId,
        orgId: customerAuth.orgId,
        email: customerAuth.email,
        name: customerAuth.customer.user.name ?? null,
      });

      const accessToken = signCustomerAccessToken(payload);
      const refreshToken = signCustomerRefreshToken(payload);
      const refreshTokenHash = await hashToken(refreshToken);

      await prisma.customerAuth.update({
        where: { id: customerAuth.id },
        data: {
          refreshTokenHash,
          refreshTokenExpiresAt: new Date(
            Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
          ),
        },
      });

      await setCustomerAuthCookies(accessToken, refreshToken);

      return {
        customer: {
          id: customerAuth.customer.id,
          orgId: customerAuth.customer.orgId,
          phoneNumber: customerAuth.customer.phoneNumber,
        },
        user: {
          id: customerAuth.customer.user.id,
          name: customerAuth.customer.user.name,
          email: customerAuth.customer.user.email,
          image: customerAuth.customer.user.image,
        },
      };
    }),
  getPortalOverview: customerJwtProcedure
    .input(
      z.object({
        organizationId: z.string().min(2).max(90).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = input.organizationId ?? ctx.customer.orgId;

      if (ctx.customer.orgId !== organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Customer record not found",
        });
      }

      const appointmentWhere = {
        customerId: ctx.customer.id,
        location: {
          organizationId,
        },
      };
      const now = new Date();

      const [organization, totalAppointments, upcomingAppointmentsCount, completedAppointmentsCount, recentAppointments] =
        await Promise.all([
          prisma.organization.findUnique({
            where: {
              id: organizationId,
            },
            select: {
              id: true,
              name: true,
              description: true,
              logo: true,
            },
          }),
          prisma.appointment.count({
            where: appointmentWhere,
          }),
          prisma.appointment.count({
            where: {
              ...appointmentWhere,
              startTime: {
                gte: now,
              },
              status: {
                in: ["SCHEDULED", "RESCHEDULED"],
              },
            },
          }),
          prisma.appointment.count({
            where: {
              ...appointmentWhere,
              status: "COMPLETED",
            },
          }),
          prisma.appointment.findMany({
            where: appointmentWhere,
            orderBy: {
              startTime: "desc",
            },
            take: 12,
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              paymentStatus: true,
              price: true,
              location: {
                select: {
                  id: true,
                  name: true,
                  timeZone: true,
                },
              },
              service: {
                select: {
                  id: true,
                  serviceTerms: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          }),
        ]);

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const upcomingAppointment = [...recentAppointments]
        .filter(
          (appointment) =>
            appointment.startTime >= now &&
            ["SCHEDULED", "RESCHEDULED"].includes(appointment.status),
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0] ?? null;

      return {
        organization,
        customer: {
          id: ctx.customer.id,
          phoneNumber: ctx.customer.phoneNumber,
          createdAt: ctx.customer.createdAt,
          user: {
            id: ctx.customer.user.id,
            name: ctx.customer.user.name,
            email: ctx.customer.user.email,
            image: ctx.customer.user.image,
          },
        },
        stats: {
          totalAppointments,
          upcomingAppointmentsCount,
          completedAppointmentsCount,
        },
        upcomingAppointment: upcomingAppointment
          ? {
              id: upcomingAppointment.id,
              startTime: upcomingAppointment.startTime,
              endTime: upcomingAppointment.endTime,
              status: upcomingAppointment.status,
              paymentStatus: upcomingAppointment.paymentStatus,
              price: upcomingAppointment.price,
              location: upcomingAppointment.location,
              serviceNames: upcomingAppointment.service.map(
                (service) => service.serviceTerms.name,
              ),
            }
          : null,
        appointments: recentAppointments.map((appointment) => ({
          id: appointment.id,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
          price: appointment.price,
          location: appointment.location,
          serviceNames: appointment.service.map(
            (service) => service.serviceTerms.name,
          ),
        })),
      };
    }),
  getAppointmentCancellationPreview: customerJwtProcedure
    .input(
      z.object({
        appointmentId: z.string().min(1),
        organizationId: z.string().min(2).max(90).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = input.organizationId ?? ctx.customer.orgId;

      if (ctx.customer.orgId !== organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Customer record not found",
        });
      }

      const appointment = await getCustomerPortalCancellationAppointment({
        appointmentId: input.appointmentId,
        customerId: ctx.customer.id,
        organizationId,
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      if (!["SCHEDULED", "RESCHEDULED"].includes(appointment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only upcoming appointments can be canceled",
        });
      }

      if (appointment.startTime.getTime() <= Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This appointment can no longer be canceled online",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          stripeAccountId: true,
        },
      });

      await syncAppointmentPaymentsIfPossible({
        appointmentId: appointment.id,
        stripeAccountId: organization?.stripeAccountId,
      });

      const [alreadyChargedAmount, savedPaymentMethodsState] = await Promise.all([
        getAppointmentCollectedAmount(appointment.id),
        getCustomerSavedPaymentMethods({
          stripeCustomerId: appointment.customer.stripeCustomerId,
          stripeAccountId: organization?.stripeAccountId,
          selectedPaymentMethodId: appointment.paymentMethodId,
        }),
      ]);

      const discountAmount = resolveDiscountAmount({
        price: appointment.price,
        discountAmountApplied: appointment.discountAmountApplied,
        promoDiscountPercentage: appointment.promoCode?.discount,
      });
      const discountedTotalAmount = Math.max(
        0,
        appointment.price - discountAmount,
      );
      const cancellationPercent =
        appointment.location.appointmentSettings?.cancellationPercent ?? 100;
      const cancellationDuration =
        appointment.location.appointmentSettings?.cancellationDuration ?? 60;
      const cancellationWindowApplies = isCancellationFeeApplicable({
        appointmentStartTime: appointment.startTime,
        cancellationDurationMinutes: cancellationDuration,
      });
      const cancellationFeeAmount = cancellationWindowApplies
        ? Math.round((discountedTotalAmount * cancellationPercent) / 100)
        : 0;
      const additionalChargeAmount = Math.max(
        0,
        cancellationFeeAmount - alreadyChargedAmount,
      );
      const selectedCard = savedPaymentMethodsState.savedPaymentMethods.find(
        (card) => card.id === savedPaymentMethodsState.selectedPaymentMethodId,
      );
      const canCancel =
        additionalChargeAmount <= 0 || Boolean(selectedCard);

      return {
        appointmentId: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        location: appointment.location,
        serviceNames: appointment.service.map(
          (service) => service.serviceTerms.name,
        ),
        totalAmount: appointment.price,
        discountAmount,
        discountedTotalAmount,
        alreadyChargedAmount,
        cancellationPercent,
        cancellationDuration,
        cancellationWindowApplies,
        cancellationFeeAmount,
        additionalChargeAmount,
        selectedPaymentMethodId: savedPaymentMethodsState.selectedPaymentMethodId,
        savedPaymentMethods: savedPaymentMethodsState.savedPaymentMethods,
        paymentMethodLast4: appointment.paymentMethodLast4,
        canCancel,
        requiresCharge: cancellationWindowApplies && additionalChargeAmount > 0,
        blockingReason: canCancel
          ? null
          : "Add a saved card to pay the cancellation fee before canceling this appointment.",
      };
    }),
  cancelAppointment: customerJwtProcedure
    .input(
      z.object({
        appointmentId: z.string().min(1),
        organizationId: z.string().min(2).max(90).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = input.organizationId ?? ctx.customer.orgId;

      if (ctx.customer.orgId !== organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Customer record not found",
        });
      }

      const appointment = await getCustomerPortalCancellationAppointment({
        appointmentId: input.appointmentId,
        customerId: ctx.customer.id,
        organizationId,
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      if (!["SCHEDULED", "RESCHEDULED"].includes(appointment.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only upcoming appointments can be canceled",
        });
      }

      if (appointment.startTime.getTime() <= Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This appointment can no longer be canceled online",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          stripeAccountId: true,
        },
      });

      await syncAppointmentPaymentsIfPossible({
        appointmentId: appointment.id,
        stripeAccountId: organization?.stripeAccountId,
      });

      const discountAmount = resolveDiscountAmount({
        price: appointment.price,
        discountAmountApplied: appointment.discountAmountApplied,
        promoDiscountPercentage: appointment.promoCode?.discount,
      });
      const discountedTotal = Math.max(0, appointment.price - discountAmount);
      const cancellationPercent =
        appointment.location.appointmentSettings?.cancellationPercent ?? 100;
      const cancellationDuration =
        appointment.location.appointmentSettings?.cancellationDuration ?? 60;
      const cancellationWindowApplies = isCancellationFeeApplicable({
        appointmentStartTime: appointment.startTime,
        cancellationDurationMinutes: cancellationDuration,
      });
      const cancellationFeeAmount = cancellationWindowApplies
        ? Math.round((discountedTotal * cancellationPercent) / 100)
        : 0;
      const alreadyChargedAmount = await getAppointmentCollectedAmount(
        appointment.id,
      );
      const chargeAmount = Math.max(
        0,
        cancellationFeeAmount - alreadyChargedAmount,
      );
      const chargeResult = await resolveCancellationChargeResult({
        appointment,
        chargeAmount,
        cancellationPercent,
        cancellationFeeAmount,
        alreadyChargedAmount,
        cancellationWindowApplies,
        skipCancellationFee: false,
      });

      if (chargeAmount > 0 && chargeResult.chargeStatus === "NOT_CHARGED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            chargeResult.chargeFailureReason ??
            "A valid saved card is required to cancel this appointment.",
        });
      }

      let updatedAppointment = chargeResult.updatedAppointment;

      updatedAppointment ??= await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CANCELED",
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          updatedAt: true,
        },
      });

      const actorName =
        ctx.customer.user.name?.trim() || ctx.customer.user.email || "Customer";
      let chargeDescription = " The cancellation was outside the late-cancellation window.";

      if (chargeResult.chargeStatus === "CHARGED") {
        chargeDescription = ` A cancellation fee of ${chargeResult.chargedAmount} cents was charged.`;
      } else if (cancellationWindowApplies) {
        chargeDescription = " No additional cancellation fee was due.";
      }

      addActivityLog({
        type: ACTIVITY_LOG_ACTIONS.UPDATED_APPOINTMENT_STATUS,
        description: `${actorName} canceled appointment ${appointment.id}.${chargeDescription}`,
        userId: ctx.customer.user.id,
        organizationId: appointment.location.organizationId,
        locationId: appointment.location.id,
      });

      return {
        success: true,
        appointment: updatedAppointment,
        cancellationPercent,
        cancellationDuration,
        cancellationWindowApplies,
        cancellationFeeAmount,
        alreadyChargedAmount,
        chargedAmount: chargeResult.chargedAmount,
        chargeStatus: chargeResult.chargeStatus,
        chargeFailureReason: chargeResult.chargeFailureReason,
        paymentMethodLast4: chargeResult.paymentMethodLast4,
      };
    }),
  session: publicProcedure.query(async () => {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;

    if (!accessToken) {
      return null;
    }

    try {
      const { customer, user } = await getSessionFromAccessToken(accessToken);
      return {
        customer: {
          id: customer.id,
          orgId: customer.orgId,
          phoneNumber: customer.phoneNumber,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      };
    } catch {
      return null;
    }
  }),
  refresh: publicProcedure.mutation(async () => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(CUSTOMER_REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Refresh token missing",
      });
    }

    let payload: CustomerJWTPayload;
    try {
      payload = verifyCustomerToken(refreshToken);
    } catch {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }

    if (payload.type !== "customer") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }

    const customerAuth = await prisma.customerAuth.findUnique({
      where: { id: payload.sub },
      include: {
        customer: { include: { user: true } },
      },
    });

    if (!customerAuth?.customer || !customerAuth.refreshTokenHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }

    if (
      customerAuth.refreshTokenExpiresAt &&
      customerAuth.refreshTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Refresh token expired",
      });
    }

    const isRefreshValid = await verifyTokenHash(
      refreshToken,
      customerAuth.refreshTokenHash,
    );

    if (!isRefreshValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }

    const newPayload = buildPayload({
      customerAuthId: customerAuth.id,
      customerId: customerAuth.customer.id,
      userId: customerAuth.userId,
      orgId: customerAuth.orgId,
      email: customerAuth.email,
      name: customerAuth.customer.user.name ?? null,
    });

    const accessToken = signCustomerAccessToken(newPayload);
    const newRefreshToken = signCustomerRefreshToken(newPayload);
    const refreshTokenHash = await hashToken(newRefreshToken);

    await prisma.customerAuth.update({
      where: { id: customerAuth.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: new Date(
          Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
        ),
      },
    });

    await setCustomerAuthCookies(accessToken, newRefreshToken);

    return {
      customer: {
        id: customerAuth.customer.id,
        orgId: customerAuth.customer.orgId,
        phoneNumber: customerAuth.customer.phoneNumber,
      },
      user: {
        id: customerAuth.customer.user.id,
        name: customerAuth.customer.user.name,
        email: customerAuth.customer.user.email,
        image: customerAuth.customer.user.image,
      },
    };
  }),
  logout: publicProcedure.mutation(async () => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(CUSTOMER_REFRESH_COOKIE)?.value;

    if (refreshToken) {
      try {
        const payload = verifyCustomerToken(refreshToken);
        if (payload.type === "customer") {
          await prisma.customerAuth.update({
            where: { id: payload.sub },
            data: {
              refreshTokenHash: null,
              refreshTokenExpiresAt: null,
            },
          });
        }
      } catch {
        // Ignore token errors on logout.
      }
    }

    await clearCustomerAuthCookies();

    return "OK";
  }),
});
