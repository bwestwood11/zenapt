
import "server-only";

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
  typescript: true,
});

export const syncStripeCustomer = async (customerId: string) => {
  const payments = await stripe.paymentIntents.list({
    customer: customerId,
    limit: 5,
  });

  const successfulPayments = payments.data.filter(
    (payment) => payment.status === "succeeded",
  );

};
