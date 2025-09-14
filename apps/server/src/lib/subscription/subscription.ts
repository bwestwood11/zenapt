import type { Subscription } from "../../../prisma/generated/client";

const DAY_IN_MS = 86_400_000; // 1 Day

export const validateSubscription = (subscription: Pick<Subscription, "currentPeriodEnd" | "stripeSubscriptionId">) => {
  const isNotExpired =
    !!subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd.getTime() + DAY_IN_MS > Date.now();
  const isSubscriptionActive =
    !!subscription.stripeSubscriptionId && isNotExpired;

  return { isActive: isSubscriptionActive };
};
