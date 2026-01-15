import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, pricingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, data: null });
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
      with: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          planSlug: "free",
          status: "active",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        planSlug: subscription.plan?.slug || "free",
        planName: subscription.plan?.name || "Free",
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load subscription" },
      { status: 500 }
    );
  }
}
