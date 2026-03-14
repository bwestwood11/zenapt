import { type Stripe, loadStripe } from "@stripe/stripe-js";

const stripePromises = new Map<string, Promise<Stripe | null>>();

const getStripe = (stripeAccountId?: string | null) => {
  const key = stripeAccountId ?? "platform";

  if (!stripePromises.has(key)) {
    const options = stripeAccountId
      ? { stripeAccount: stripeAccountId }
      : undefined;
    const promise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      options,
    );
    stripePromises.set(key, promise);
  }

  return stripePromises.get(key)!;
};

export default getStripe;
