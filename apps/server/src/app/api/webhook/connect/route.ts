import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "../../../../../prisma";
import { stripe } from "../../../../lib/stripe/server-stripe";
import {
  isStripeConnectPaymentIntentEvent,
  type StripeConnectPaymentIntentEvent,
  type StripeConnectPaymentIntentMetadata,
} from "../../../../lib/stripe/connect-webhook-types";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const allowedEventTypePrefix = "payment_intent.";

type WebhookLogContext = {
  eventId?: string;
  eventType?: string;
  accountId?: string;
  paymentIntentId?: string;
};

const logWebhookError = (
  message: string,
  error: unknown,
  context: WebhookLogContext = {}
) => {
  const normalizedError =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { value: error };

  console.error(message, {
    ...context,
    error: normalizedError,
  });
};

const handlePaymentSuccess = async (
  event: StripeConnectPaymentIntentEvent
) => {
  const paymentIntent = event.data.object;
  const metadata: StripeConnectPaymentIntentMetadata = paymentIntent.metadata;

  const [result, tipResult] = await Promise.all([
    prisma.customerAppointmentPayment.updateMany({
      where: {
        transactionId: paymentIntent.id,
        status: {
          not: "SUCCEEDED",
        },
      },
      data: {
        status: "SUCCEEDED",
      },
    }),
    prisma.appointmentTipCharge.updateMany({
      where: {
        transactionId: paymentIntent.id,
        status: {
          not: "SUCCEEDED",
        },
      },
      data: {
        status: "SUCCEEDED",
      },
    }),
  ]);

  if (result.count === 0 && tipResult.count === 0) {
    console.log(
      "Stripe Connect payment success ignored - no matching payment record:",
      paymentIntent.id
    );
  }

  return NextResponse.json(
    {
      received: true,
      handled: "success",
      updatedPayments: result.count,
      updatedTipCharges: tipResult.count,
      eventType: event.type,
      eventId: event.id,
      accountId: event.account,
      paymentIntentId: paymentIntent.id,
      customerId: paymentIntent.customer,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata,
    },
    { status: 200 }
  );
};

const handlePaymentFailed = async (
  event: StripeConnectPaymentIntentEvent
) => {
  const paymentIntent = event.data.object;

  const [result, tipResult] = await Promise.all([
    prisma.customerAppointmentPayment.updateMany({
      where: {
        transactionId: paymentIntent.id,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
      },
    }),
    prisma.appointmentTipCharge.updateMany({
      where: {
        transactionId: paymentIntent.id,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
      },
    }),
  ]);

  if (result.count === 0 && tipResult.count === 0) {
    console.log(
      "Stripe Connect payment failed ignored - no pending payment record:",
      paymentIntent.id
    );
  }

  return NextResponse.json(
    {
      received: true,
      handled: "failed",
      updatedPayments: result.count,
      updatedTipCharges: tipResult.count,
      eventType: event.type,
      eventId: event.id,
      accountId: event.account,
      paymentIntentId: paymentIntent.id,
      customerId: paymentIntent.customer,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    },
    { status: 200 }
  );
};

export async function POST(req: Request) {
  const body = await req.text();
  const requestHeaders = await headers();
  const signature = requestHeaders.get("Stripe-Signature");

  if (!signature) {
    console.error("Missing Stripe-Signature header");
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  console.log(signature, body, webhookSecret)
  if (!webhookSecret) {
    console.error("Missing STRIPE_CONNECT_WEBHOOK_SECRET");
    return new NextResponse("Webhook is not configured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logWebhookError("Error verifying Stripe Connect webhook", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (!event.type.startsWith(allowedEventTypePrefix)) {
    return new NextResponse("Event type not handled", { status: 200 });
  }

  if (!isStripeConnectPaymentIntentEvent(event)) {
    console.error("Invalid Stripe Connect payment_intent.* payload");
    return new NextResponse("Invalid event payload", { status: 400 });
  }

  const typedEvent: StripeConnectPaymentIntentEvent = event;
  const logContext: WebhookLogContext = {
    eventId: typedEvent.id,
    eventType: typedEvent.type,
    accountId: typedEvent.account,
    paymentIntentId: typedEvent.data.object.id,
  };

  let organization: { id: string } | null = null;

  try {
    organization = await prisma.organization.findFirst({
      where: {
        stripeAccountId: typedEvent.account,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    logWebhookError("Failed to find organization for Stripe account", error, {
      ...logContext,
    });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }

  if (!organization) {
    console.log("Stripe Connect account not exist in db", logContext);
    return new NextResponse("Account not exist", { status: 200 });
  }

  try {
    if (typedEvent.type === "payment_intent.succeeded") {
      return await handlePaymentSuccess(typedEvent);
    }

    if (
      typedEvent.type === "payment_intent.payment_failed" ||
      typedEvent.type === "payment_intent.canceled"
    ) {
      return await handlePaymentFailed(typedEvent);
    }
  } catch (error) {
    logWebhookError("Failed processing Stripe Connect payment event", error, {
      ...logContext
    });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }

  return new NextResponse("Event ignored", { status: 200 });
}