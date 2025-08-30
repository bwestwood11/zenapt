import { type Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | undefined;
const getStripe = () => {
  if (stripePromise === undefined) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export default getStripe;