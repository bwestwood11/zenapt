import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe, syncStripeCustomer } from "../../../lib/stripe/server-stripe";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const header = await headers();
  const signature = header.get("Stripe-Signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Error constructing Stripe event:", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (!allowedEvents.includes(event.type)) {
    return new NextResponse("Event type not handled", { status: 200 });
  }
  const { customer: customerId } = event.data.object as { customer: string };
  if (typeof customerId !== "string") {
    console.error(
      "[THIS SHOULD NOT HAPPEN] No customer ID found in event data"
    );
    return new NextResponse("No customer ID", { status: 400 });
  }
  try {
    await syncStripeCustomer(customerId);
  } catch (error) {
    console.error("Error syncing Stripe customer:", error);
    return new NextResponse("Error syncing customer", {
      status: 500,
    });
  }
  return new NextResponse("Success", { status: 200 });
}

const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];
