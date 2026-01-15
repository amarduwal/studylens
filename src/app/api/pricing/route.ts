import { NextResponse } from "next/server";
import { db } from "@/db";
import { pricingPlans } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const plans = await db.query.pricingPlans.findMany({
      where: eq(pricingPlans.isActive, true),
      orderBy: [asc(pricingPlans.sortOrder)],
    });

    return NextResponse.json({
      success: true,
      data: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        priceMonthly: plan.priceMonthly || "0",
        priceYearly: plan.priceYearly || "0",
        currency: plan.currency || 'USD',
        features: plan.features || [],
        dailyScanLimit: plan.dailyScanLimit,
        maxBookmarks: plan.maxBookmarks,
        maxHistoryDays: plan.maxHistoryDays,
        stripePriceIdMonthly: plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.stripePriceIdYearly,
        isFeatured: plan.isFeatured || false,
      })),
    });
  } catch (error) {
    console.error("Pricing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load pricing" },
      { status: 500 }
    );
  }
}
