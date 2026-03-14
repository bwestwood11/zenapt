import type Stripe from "stripe";

export type StripeConnectPaymentIntentMetadata = Stripe.Metadata & {
  organizationId?: string;
  downpaymentPercentage?: string;
  customerId?: string;
  locationEmployeeId?: string;
  paymentScope?: string;
  totalPrice?: string;
  locationId?: string;
};

export type StripeConnectPaymentIntentEvent = Stripe.Event & {
  account: string;
  data: {
    object: Stripe.PaymentIntent & {
      metadata: StripeConnectPaymentIntentMetadata;
    };
  };
  type: `payment_intent.${string}`;
};



const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isStripeConnectPaymentIntentEvent = (
  event: Stripe.Event
): event is Stripe.Event & StripeConnectPaymentIntentEvent => {
  if (!event.type.startsWith("payment_intent.")) {
    return false;
  }

  const account = (event as Stripe.Event & { account?: unknown }).account;
  if (typeof account !== "string" || account.length === 0) {
    return false;
  }

  const data = event.data;
  if (!isRecord(data) || !isRecord(data.object)) {
    return false;
  }

  const paymentIntent = data.object;

  return (
    paymentIntent.object === "payment_intent" &&
    typeof paymentIntent.id === "string" &&
    typeof paymentIntent.amount === "number" &&
    typeof paymentIntent.amount_received === "number" &&
    typeof paymentIntent.currency === "string" &&
    (typeof paymentIntent.customer === "string" ||
      paymentIntent.customer === null) &&
    typeof paymentIntent.status === "string"
  );
};