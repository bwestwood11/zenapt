import { protectedProcedure, publicProcedure, router, t } from "../lib/trpc";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";
import { getPriceDetails } from "../lib/stripe/helpers";
import { stripe, syncStripeCustomer } from "../lib/stripe/server-stripe";
import z from "zod";

import Stripe from "stripe";
import { validateSubscription } from "../lib/subscription/subscription";
import { revalidateTag } from "next/cache";

const initializePayment = protectedProcedure.mutation(async ({ ctx }) => {
  const { session } = ctx;

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user || !user.email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User not found or email missing",
    });
  }
});

const priceDetails = publicProcedure.query(async () => {
  // Fetch price details from Stripe
  const price = await getPriceDetails();
  return {
    price: price.unit_amount,
  };
});

const getCheckoutSession = protectedProcedure
  .input(
    z.object({
      numberOfLocations: z.number().min(1).max(50).default(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { session } = ctx;
    const { numberOfLocations } = input;
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        management: {
          select: {
            role: true,
            id: true,
            organization: {
              select: {
                id: true,
                subscription: {
                  select: {
                    stripeSubscriptionId: true,
                    stripeCustomerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !user ||
      !user.management.length ||
      !user.email ||
      user.management[0].role !== "OWNER"
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User not found or not authorized",
      });
    }
    if (!!user.management[0].organization?.subscription?.stripeSubscriptionId) {
      return {
        redirect: `${process.env.DASHBOARD_URL}/settings/billing`,
      };
    }

    const organization = user.management[0].organization;
    if (!organization) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Organization not found",
      });
    }

    let customerId = organization.subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? "Anonymous",
        metadata: {
          organizationId: organization.id,
          managementId: user.management[0].id,
          ownerId: user.id,
        },
      });

      customerId = newCustomer.id;
      await prisma.subscription.upsert({
        where: {
          organizationId: organization.id,
        },
        create: {
          organizationId: organization.id,
          stripeCustomerId: customerId,
        },
        update: {
          stripeCustomerId: customerId,
        },
      });

      revalidateTag(organization.id);
    }

    if (!customerId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create or retrieve customer",
      });
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      return_url: `${process.env.DASHBOARD_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: numberOfLocations,
        },
      ],
      ui_mode: "custom",
      metadata: {
        organizationId: organization.id,
      },
    });

    return stripeSession.client_secret;
  });

const getSessionDetails = protectedProcedure
  .input(z.object({ sessionId: z.string().min(0) }))
  .query(async ({ input, ctx }) => {
    const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
      expand: ["subscription"],
    });

    // TODO: Handle other Types as well
    const sessionCustomer =
      typeof session.customer === "string" ? session.customer : null;

    if (!sessionCustomer) {
      console.error("OOPS we got a session customer as a non string");
      throw new TRPCError({
        message: "You are not allowed",
        code: "FORBIDDEN",
      });
    }

    // TODO: Also give permission to the admin role if needed
    if (
      !ctx.session.user.organizationId ||
      !session.customer ||
      ctx.session.user.management?.role !== "OWNER"
    ) {
      throw new TRPCError({
        message: "You are not allowed",
        code: "FORBIDDEN",
      });
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: ctx.session.user.organizationId,
        subscription: { stripeCustomerId: sessionCustomer },
      },
    });

    if (!organization) {
      throw new TRPCError({
        message: "You are not allowed",
        code: "FORBIDDEN",
      });
    }

    await syncStripeCustomer(sessionCustomer);

    revalidateTag(ctx.session.user.organizationId);

    const subscription = session.subscription as Stripe.Subscription;
    const metadata = subscription.items.data[0].price.metadata as {
      MAX_EMAILS?: string;
      MAX_TEXTS?: string;
    };
    return {
      // cs_test_a1vDtvyjh3thhXbJnKGGbfPPFSttLTPSBMnne9CpSFGgm2VVNwLFPEFD1E   -----------> ZPT_.................
      orderNumber: `ZAPT_${session.id.replace("cs_", "")}`,
      date: new Date(session.created * 1000).toLocaleDateString(),
      billingDetails: {
        name: session.customer_details?.name,
        email: session.customer_details?.email,
        businessName: organization.name,
        logo: organization.logo,
      },
      numberOfLocations: subscription?.items.data[0]?.quantity ?? 1,
      maximumEmails:
        parseInt(metadata.MAX_EMAILS || "0", 10) *
        (subscription.items.data[0].quantity ?? 1),
      maximumTexts:
        parseInt(metadata.MAX_TEXTS || "0", 10) *
        (subscription.items.data[0].quantity ?? 1),
      monthlyPricePerLocation: subscription.items.data[0].plan.amount ?? 50000,
      currentPeriodEnd: new Date(
        subscription.items.data[0].current_period_end * 1000,
      ),
      currentPeriodStart: new Date(
        subscription.items.data[0].current_period_start * 1000,
      ),
    };
  });

const getSubscriptionDetails = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.session?.user.organizationId) {
    throw new TRPCError({
      message: "You are not allowed",
      code: "FORBIDDEN",
    });
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: ctx.session.user.organizationId,
    },
    include: {
      subscription: true,
    },
  });

  if (!organization || !organization.subscription?.stripeCustomerId) {
    return { isActive: false };
  }

  const { isActive } = validateSubscription(organization.subscription);

  return {
    isActive,
    ...organization.subscription,
    organization: { ...organization, subscription: undefined },
  };
});

export const paymentRouter = router({
  initializePayment: initializePayment,
  priceDetails: priceDetails,
  getCheckoutSession: getCheckoutSession,
  getSessionDetails: getSessionDetails,
  getSubscriptionDetails: getSubscriptionDetails,
});
