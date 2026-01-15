import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, subscriptions, pricingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const billingCycle = session.metadata?.billingCycle;

  if (!userId || !planId) return;

  // Get Stripe subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Update or create subscription
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  const subscriptionData = {
    planId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: stripeSubscription.items.data[0].price.id,
    status: mapStripeStatus(stripeSubscription.status),
    billingCycle: billingCycle || "monthly",
    currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
    updatedAt: new Date(),
  };

  if (existingSub) {
    await db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      ...subscriptionData,
    });
  }

  // Update user tier
  const plan = await db.query.pricingPlans.findFirst({
    where: eq(pricingPlans.id, planId),
  });

  if (plan) {
    await db
      .update(users)
      .set({
        subscriptionTier: plan.slug === "premium" ? "premium" : "free",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  });

  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      status: subscription.status === "active" ? "active" : "past_due",
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  });

  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Downgrade user
  await db
    .update(users)
    .set({
      subscriptionTier: "free",
      updatedAt: new Date(),
    })
    .where(eq(users.id, sub.userId));
}

// Helper to map Stripe status to your enum
function mapStripeStatus(status: string): "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "paused" {
  switch (status) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    case 'trialing':
      return 'trialing';
    case 'paused':
      return 'paused';
    case 'unpaid':
      return 'past_due';
    default:
      return 'active';
  }
}
