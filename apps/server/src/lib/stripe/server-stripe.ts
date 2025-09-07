import "server-only";

import Stripe from "stripe";
import prisma from "../../../prisma";
import { STRIPE_STATUS } from "./types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
  typescript: true,
});

export const syncStripeCustomer = async (customerId: string) => {
  const subscription = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
    expand: ["data.default_payment_method"],
  });
  if (subscription.data.length === 0) {
    await prisma.subscription.update({
      where: { stripeCustomerId: customerId },
      data: {
        status: STRIPE_STATUS.UNPAID,
      },
    });
    return;
  }
  const sub = subscription.data[0];
  const metadata = sub.items.data[0].price.metadata as {
    MAX_EMAILS?: string;
    MAX_TEXTS?: string;
  };
  if (!metadata || !metadata.MAX_EMAILS || !metadata.MAX_TEXTS) {
    throw new Error("Price metadata is missing MAX_EMAILS or MAX_TEXTS");
  }
  const cardBrand =
    sub.default_payment_method && sub.default_payment_method !== "string"
      ? (sub.default_payment_method as Stripe.PaymentMethod).card?.brand
      : null;
  const cardLast4 =
    sub.default_payment_method && sub.default_payment_method !== "string"
      ? (sub.default_payment_method as Stripe.PaymentMethod).card?.last4
      : null;
  console.dir(sub, { depth: null });
  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      status: sub.status,
      stripeSubscriptionId: sub.id,
      amountPaid:
        (sub.items.data[0].plan.amount ?? 50000) *
        (sub.items.data[0].quantity ?? 1),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cardLast4: cardLast4 || undefined,
      cardBrand: cardBrand || undefined,
      currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000),
      currentPeriodStart: new Date(
        sub.items.data[0].current_period_start * 1000
      ),
      lastPaid: new Date(sub.items.data[0].created * 1000),
      priceId: sub.items.data[0].price.id,
      maximumLocations: sub.items.data[0].quantity ?? 1,
      maximumEmails:
        parseInt(metadata.MAX_EMAILS, 10) * (sub.items.data[0].quantity ?? 1),
      maximumTexts:
        parseInt(metadata.MAX_TEXTS, 10) * (sub.items.data[0].quantity ?? 1),
    },
  });
};
