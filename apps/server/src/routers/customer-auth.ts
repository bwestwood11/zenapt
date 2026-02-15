import bcrypt from "bcrypt";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "../../prisma";
import { stripe } from "../lib/stripe/server-stripe";
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
import { publicProcedure, router } from "../lib/trpc";
import type { CustomerJWTPayload } from "../lib/types";

const ACCESS_COOKIE_TTL_SECONDS = 60 * 15;
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

export const customerAuthRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.email(),
        password: z.string().min(8),
        organizationId: z.string().min(2).max(90),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, email, password, organizationId } = input;

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
        where: { email },
      });

      if (existingAuth) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const now = new Date();
      const userId = crypto.randomUUID();
      const user = await prisma.user.create({
        data: {
          id: userId,
          name,
          email,
          emailVerified: true,
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
          email,
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
      }),
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;

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
