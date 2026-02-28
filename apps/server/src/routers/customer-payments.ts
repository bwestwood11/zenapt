import { TRPCError } from "@trpc/server";
import prisma from "../../prisma";
import { stripe } from "../lib/stripe/server-stripe";
import { isEditConflictFastFail } from "../lib/appointment/appointment";
import { customerJwtProcedure, router } from "../lib/trpc";
import { sendAppointmentBookedEmail } from "../lib/email/appointment";
import { after } from "next/server";
import z from "zod";
import Stripe from "stripe";
import {
  calculateDiscountedTotal,
  resolveActivePromoCode,
} from "../lib/payments/promo";

const getSavedCardSummary = async (
  stripeCustomerId: string,
  stripeAccountId: string,
) => {
  const customer = await stripe.customers.retrieve(
    stripeCustomerId,
    {
      expand: ["invoice_settings.default_payment_method"],
    },
    {
      stripeAccount: stripeAccountId,
    },
  );

  if ("deleted" in customer && customer.deleted) {
    return null;
  }

  const defaultPaymentMethod =
    customer.invoice_settings?.default_payment_method &&
    typeof customer.invoice_settings.default_payment_method !== "string"
      ? customer.invoice_settings.default_payment_method
      : null;

  if (defaultPaymentMethod?.card) {
    if (defaultPaymentMethod.allow_redisplay !== "always") {
      await stripe.paymentMethods.update(
        defaultPaymentMethod.id,
        {
          allow_redisplay: "always",
        },
        {
          stripeAccount: stripeAccountId,
        },
      );
    }
    return {
      id: defaultPaymentMethod.id,
      brand: defaultPaymentMethod.card.brand,
      last4: defaultPaymentMethod.card.last4,
    };
  }

  const paymentMethods = await stripe.paymentMethods.list(
    {
      customer: stripeCustomerId,
      type: "card",
      limit: 1,
    },
    {
      stripeAccount: stripeAccountId,
    },
  );

  const firstPaymentMethod = paymentMethods.data[0];
  const card = firstPaymentMethod?.card;
  if (!card) {
    return null;
  }

  if (firstPaymentMethod.allow_redisplay !== "always") {
    await stripe.paymentMethods.update(
      firstPaymentMethod.id,
      {
        allow_redisplay: "always",
      },
      {
        stripeAccount: stripeAccountId,
      },
    );
  }

  return {
    id: firstPaymentMethod.id,
    brand: card.brand,
    last4: card.last4,
  }
};

const getAllSavedCards = async (
  stripeCustomerId: string,
  stripeAccountId: string,
) => {
  const paymentMethods = await stripe.paymentMethods.list(
    {
      customer: stripeCustomerId,
      type: "card",
      limit: 10,
    },
    {
      stripeAccount: stripeAccountId,
    },
  );

  const cards = paymentMethods.data
    .filter((pm) => pm.card)
    .map((pm) => ({
      id: pm.id,
      brand: pm.card!.brand,
      last4: pm.card!.last4,
      expMonth: pm.card!.exp_month,
      expYear: pm.card!.exp_year,
    }));

  return cards;
};

const createSetupIntent = customerJwtProcedure
  .input(
    z.object({
      organizationId: z.string().min(2).max(90).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    console.log("[createSetupIntent] Payload received - customerAuth:", {
      customerAuthId: ctx.customerAuth?.id,
      customerId: ctx.customer?.id,
      userId: ctx.customer?.userId,
      orgId: ctx.customer?.orgId,
    });

    const organizationId = input.organizationId ?? ctx.customer.orgId;
    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
    });
    if (!organization) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization not found",
      });
    }
    if (!organization.stripeAccountId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization is not set up",
      });
    }

    const customer = ctx.customer;
    if (!customer?.id || !customer.user) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer record not found",
      });
    }

    if (customer.orgId !== organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer record not found",
      });
    }

    let stripeCustomerId = customer.stripeCustomerId;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create(
        {
          email: customer.user.email ?? undefined,
          name: customer.user.name ?? undefined,
          metadata: {
            userId: customer.user.id,
            customerId: customer.id,
          },
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      stripeCustomerId = stripeCustomer.id;

      await prisma.customer.update({
        where: { id: customer.id },
        data: { stripeCustomerId },
      });
    }

    const setupIntent = await stripe.setupIntents.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: {
          userId: customer.user.id,
          customerId: customer.id,
        },
      },
      {
        stripeAccount: organization.stripeAccountId,
      },
    );

    const customerSession = await stripe.customerSessions.create(
      {
        customer: stripeCustomerId,
        components: {
          payment_element: {
            enabled: true,
          },
        },
      },
      {
        stripeAccount: organization.stripeAccountId,
      },
    );

    if (!setupIntent.client_secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to create setup intent",
      });
    }

    const savedCard = await getSavedCardSummary(
      stripeCustomerId,
      organization.stripeAccountId,
    );

    const allSavedCards = await getAllSavedCards(
      stripeCustomerId,
      organization.stripeAccountId,
    );

    return {
      clientSecret: setupIntent.client_secret,
      savedCard,
      allSavedCards,
      customerSessionClientSecret: customerSession.client_secret,
      stripeAccountId: organization.stripeAccountId,
    };
  });

const finalizeSetupIntent = customerJwtProcedure
  .input(
    z.object({
      setupIntentId: z.string().min(1),
      organizationId: z.string().min(2).max(90).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const organizationId = input.organizationId ?? ctx.customer.orgId;
    const customer = ctx.customer;
    if (!customer?.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer record not found",
      });
    }

    if (customer.orgId !== organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer record not found",
      });
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
    });
    if (!organization) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization not found",
      });
    }
    if (!organization.stripeAccountId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization is not set up",
      });
    }

    const stripeCustomerId = customer.stripeCustomerId;
    if (!stripeCustomerId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Stripe customer not found",
      });
    }

    const setupIntent = await stripe.setupIntents.retrieve(
      input.setupIntentId,
      {
        expand: ["payment_method"],
      },
      {
        stripeAccount: organization.stripeAccountId,
      },
    );

    const newPaymentMethod =
      setupIntent.payment_method &&
      typeof setupIntent.payment_method !== "string"
        ? setupIntent.payment_method
        : null;

    if (newPaymentMethod?.type !== "card") {
      return { deduped: false };
    }

    const fingerprint = newPaymentMethod.card?.fingerprint;
    if (!fingerprint) {
      return { deduped: false };
    }

    const existingPaymentMethods = await stripe.paymentMethods.list(
      {
        customer: stripeCustomerId,
        type: "card",
        limit: 20,
      },
      {
        stripeAccount: organization.stripeAccountId,
      },
    );

    const duplicate = existingPaymentMethods.data.find(
      (method) =>
        method.id !== newPaymentMethod.id &&
        method.card?.fingerprint === fingerprint,
    );

    if (duplicate) {
      await stripe.paymentMethods.detach(newPaymentMethod.id, {
        stripeAccount: organization.stripeAccountId,
      });
      await stripe.customers.update(
        stripeCustomerId,
        {
          invoice_settings: {
            default_payment_method: duplicate.id,
          },
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      if (duplicate.allow_redisplay !== "always") {
        await stripe.paymentMethods.update(
          duplicate.id,
          {
            allow_redisplay: "always",
          },
          {
            stripeAccount: organization.stripeAccountId,
          },
        );
      }

      return {
        deduped: true,
        card: {
          id: duplicate.id,
          brand: duplicate.card?.brand ?? null,
          last4: duplicate.card?.last4 ?? null,
        },
      };
    }

    if (newPaymentMethod.allow_redisplay !== "always") {
      await stripe.paymentMethods.update(
        newPaymentMethod.id,
        {
          allow_redisplay: "always",
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );
    }

    return {
      deduped: false,
      card: {
        id: newPaymentMethod.id,
        brand: newPaymentMethod.card?.brand ?? null,
        last4: newPaymentMethod.card?.last4 ?? null,
      },
    };
  });

const createAppointment = customerJwtProcedure
  .input(
    z.object({
      locationId: z.string().min(1),
      locationEmployeeId: z.string().min(1),
      serviceIds: z.array(z.string().min(1)).min(1),
      addOnIds: z.array(z.string().min(1)).optional(),
      startTime: z.date(),
      endTime: z.date(),
      organizationId: z.string().min(2).max(90).optional(),
      paymentMethodId: z.string().min(1).optional(),
      promoCode: z.string().trim().min(1).max(64).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const organizationId = input.organizationId ?? ctx.customer.orgId;
    const customer = ctx.customer;

    if (!customer?.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer record not found",
      });
    }

    if (customer.orgId !== organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer record not found",
      });
    }

    if (
      input.startTime.getMinutes() % 5 !== 0 ||
      input.endTime.getMinutes() % 5 !== 0
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Appointment times must be in 5-minute intervals",
      });
    }

    if (input.startTime.getTime() >= input.endTime.getTime()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Start time must be before end time",
      });
    }

    const location = await prisma.location.findFirst({
      where: {
        id: input.locationId,
        organizationId,
      },
      select: {
        id: true,
        appointmentSettings: {
          select: {
            downpaymentPercentage: true,
          },
        },
      },
    });

    if (!location) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Location not found",
      });
    }

    const employeeServices = await prisma.employeeService.findMany({
      where: {
        id: { in: input.serviceIds },
        locationEmployeeId: input.locationEmployeeId,
        locationId: input.locationId,
      },
      include: {
        addOns: {
          select: {
            id: true,
            basePrice: true,
          },
        },
      },
    });

    if (employeeServices.length !== input.serviceIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "One or more services are invalid for the selected professional",
      });
    }

    const maxBufferTime = Math.max(
      ...employeeServices.map((service) => service.bufferTime),
      0,
    );
    const maxPrepTime = Math.max(
      ...employeeServices.map((service) => service.prepTime),
      0,
    );

    const addOnIds = input.addOnIds ?? [];
    let validatedAddOnIds: string[] = [];
    let addOnsPrice = 0;

    if (addOnIds.length > 0) {
      const availableAddOnIds = new Set(
        employeeServices.flatMap((service) =>
          service.addOns.map((addOn) => addOn.id),
        ),
      );

      const invalidAddOns = addOnIds.filter((id) => !availableAddOnIds.has(id));
      if (invalidAddOns.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more add-ons are not available for the selected services",
        });
      }

      validatedAddOnIds = addOnIds;
      addOnsPrice = employeeServices.reduce((sum, service) => {
        const serviceAddOnPrice = service.addOns
          .filter((addOn) => validatedAddOnIds.includes(addOn.id))
          .reduce((inner, addOn) => inner + addOn.basePrice, 0);

        return sum + serviceAddOnPrice;
      }, 0);
    }

    const totalPrice =
      employeeServices.reduce((sum, service) => sum + service.price, 0) +
      addOnsPrice;

    let appliedPromoCode:
      | {
          id: string;
          code: string;
          discountPercentage: number;
        }
      | null = null;

    if (input.promoCode) {
      appliedPromoCode = await resolveActivePromoCode({
        code: input.promoCode,
        organizationId,
        locationId: input.locationId,
      });
    }

    const { discountAmount, discountedTotal } = calculateDiscountedTotal(
      totalPrice,
      appliedPromoCode?.discountPercentage ?? 0,
    );

    const downpaymentPercentage = Math.min(
      100,
      Math.max(0, location.appointmentSettings?.downpaymentPercentage ?? 0),
    );
    const amountToChargeNow =
      downpaymentPercentage > 0 && discountedTotal > 0
        ? Math.max(1, Math.round((discountedTotal * downpaymentPercentage) / 100))
        : 0;

    if (amountToChargeNow > 0 && !input.paymentMethodId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "A saved payment method is required to charge the downpayment",
      });
    }

    const hasConflict = await isEditConflictFastFail({
      employeeId: input.locationEmployeeId,
      startTime: input.startTime,
      endTime: input.endTime,
      locationId: input.locationId,
    });

    if (hasConflict) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Selected time is no longer available due to an existing booking",
      });
    }

    const isCustomerConnectedToLocation = await prisma.customer.findFirst({
      where: {
        id: customer.id,
        location: { some: { id: input.locationId } },
      },
      select: { id: true },
    });

    if (!isCustomerConnectedToLocation) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          location: {
            connect: { id: input.locationId },
          },
        },
      });
    }

    let paymentMethodLast4: string | undefined;
    let stripeTransactionId: string | undefined;

    if (input.paymentMethodId) {
      if (!customer.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer payment profile not found. Please add a card again.",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { stripeAccountId: true },
      });

      if (amountToChargeNow > 0 && !organization?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization payments are not configured",
        });
      }

      if (organization?.stripeAccountId) {
        let retrievedPaymentMethodCustomerId: string | null = null;

        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(
            input.paymentMethodId,
            { stripeAccount: organization.stripeAccountId },
          );

          retrievedPaymentMethodCustomerId =
            typeof paymentMethod.customer === "string"
              ? paymentMethod.customer
              : null;

          if (
            retrievedPaymentMethodCustomerId &&
            retrievedPaymentMethodCustomerId !== customer.stripeCustomerId
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Selected card does not belong to this customer",
            });
          }

          if (!retrievedPaymentMethodCustomerId) {
            await stripe.paymentMethods.attach(
              input.paymentMethodId,
              {
                customer: customer.stripeCustomerId,
              },
              {
                stripeAccount: organization.stripeAccountId,
              },
            );
          }

          await stripe.customers.update(
            customer.stripeCustomerId,
            {
              invoice_settings: {
                default_payment_method: input.paymentMethodId,
              },
            },
            {
              stripeAccount: organization.stripeAccountId,
            },
          );

          paymentMethodLast4 = paymentMethod.card?.last4;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error("Failed to retrieve payment method details:", error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unable to verify the selected payment method",
          });
        }

        if (amountToChargeNow > 0) {
          try {
            const paymentIntent = await stripe.paymentIntents.create(
              {
                amount: amountToChargeNow,
                currency: "usd",
                customer: customer.stripeCustomerId,
                payment_method: input.paymentMethodId,
                confirm: true,
                off_session: true,
                description: `Appointment downpayment for location ${input.locationId}`,
                metadata: {
                  paymentScope: "CUSTOMER_APPOINTMENT",
                  organizationId,
                  customerId: customer.id,
                  locationId: input.locationId,
                  locationEmployeeId: input.locationEmployeeId,
                  downpaymentPercentage: String(downpaymentPercentage),
                  totalPrice: String(totalPrice),
                  discountAmount: String(discountAmount),
                  discountedTotal: String(discountedTotal),
                  promoCode: appliedPromoCode?.code ?? "",
                },
              },
              {
                stripeAccount: organization.stripeAccountId,
              },
            );
            stripeTransactionId = paymentIntent.id;
          } catch (error) {
            if (error instanceof Stripe.errors.StripeError) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  error.message ||
                  "Failed to charge downpayment. Please try another card.",
              });
            }

            console.error("Failed to charge downpayment:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to process payment",
            });
          }
        }
      }

    }

    const appointment = await prisma.appointment.create({
      data: {
        startTime: input.startTime,
        endTime: input.endTime,
        bufferTime: maxBufferTime,
        prepTime: maxPrepTime,
        customerId: customer.id,
        locationId: input.locationId,
        price: totalPrice,
        promoCodeId: appliedPromoCode?.id,
        discountPercentageApplied:
          appliedPromoCode && discountAmount > 0
            ? appliedPromoCode.discountPercentage
            : null,
        discountAmountApplied: discountAmount > 0 ? discountAmount : null,
        service: {
          connect: input.serviceIds.map((id) => ({ id })),
        },
        ...(validatedAddOnIds.length > 0 && {
          addOns: {
            connect: validatedAddOnIds.map((id) => ({ id })),
          },
        }),
        ...(input.paymentMethodId && {
          paymentMethodId: input.paymentMethodId,
          paymentMethodLast4,
        }),
        status: "SCHEDULED",
      },
      include: {
        service: {
          select: {
            id: true,
          },
        },
        addOns: {
          select: {
            id: true,
          },
        },
      },
    });

    if (input.paymentMethodId) {
      if (amountToChargeNow > 0 && !stripeTransactionId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment reference missing for downpayment",
        });
      }

      await prisma.customerAppointmentPayment.create({
        data: {
          customerId: customer.id,
          appointmentId: appointment.id,
          amountPaid: amountToChargeNow,
          paymentType: "DOWNPAYMENT",
          status: "PENDING",
          paymentMethod: input.paymentMethodId,
          transactionId: stripeTransactionId ?? null,
        },
      });
    }

    after(async () => {
      try {
        await sendAppointmentBookedEmail(appointment.id);
      } catch (error) {
        console.error(
          "[customerPayments.createAppointment] Failed to send appointment confirmation email",
          error,
        );
      }
    });

    return {
      success: true,
      appointmentId: appointment.id,
      amountCharged: amountToChargeNow,
      downpaymentPercentage,
      totalPrice,
      discountAmount,
      discountedTotal,
      appliedPromoCode: appliedPromoCode?.code ?? null,
    };
  });

export const customerPaymentsRouter = router({
  createSetupIntent,
  finalizeSetupIntent,
  createAppointment,
});
