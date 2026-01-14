import { db } from "@/db";
import { dailyUsage, pricingPlans, subscriptions, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "./auth";

export interface UsageLimits {
  dailyScanLimit: number;
  monthlyScanLimit: number | null;
  maxImageSizeMb: number | null;
  maxFollowupQuestions: number | null;
  maxPracticeProblems: number | null;
  maxBookmarks: number | null;
  maxHistoryDays: number | null;
  features: string[];  // Changed: now JSONB array
  canAccessPremiumSubjects: boolean;
  canExportPdf: boolean;
}

export interface CurrentUsage {
  scanCount: number;
  messageCount: number;
  practiceCount: number;
}

export interface UsageCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  message?: string;
}

/**
 * Get plan limits for a user or session
 */
export async function getPlanLimits(
  userId?: string | null,
  sessionId?: string | null
): Promise<UsageLimits> {
  // Default guest limits
  const guestPlan = await db.query.pricingPlans.findFirst({
    where: eq(pricingPlans.slug, "guest"),
  });

  const defaultLimits: UsageLimits = {
    dailyScanLimit: guestPlan?.dailyScanLimit ?? 1,
    monthlyScanLimit: guestPlan?.monthlyScanLimit ?? null,
    maxImageSizeMb: 5,
    maxFollowupQuestions: 1,
    maxPracticeProblems: 1,
    maxBookmarks: guestPlan?.maxBookmarks ?? 5,
    maxHistoryDays: guestPlan?.maxHistoryDays ?? 0,
    features: (guestPlan?.features as string[]) ?? [],
    canAccessPremiumSubjects: false,
    canExportPdf: false,
  };

  if (!userId) {
    return defaultLimits;
  }

  // Get user's subscription and plan
  const userSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    with: {
      plan: true,
    },
  });

  if (!userSub || !userSub.plan) {
    // Return free plan limits for users without subscription
    const freePlan = await db.query.pricingPlans.findFirst({
      where: eq(pricingPlans.slug, "free"),  // Changed: name → slug
    });

    return {
      dailyScanLimit: freePlan?.dailyScanLimit ?? 10,
      monthlyScanLimit: freePlan?.monthlyScanLimit ?? null,
      maxImageSizeMb: defaultLimits.maxImageSizeMb,
      maxFollowupQuestions: defaultLimits.maxFollowupQuestions,
      maxPracticeProblems: defaultLimits.maxPracticeProblems,
      maxBookmarks: freePlan?.maxBookmarks ?? 20,
      maxHistoryDays: freePlan?.maxHistoryDays ?? 7,
      features: (freePlan?.features as string[]) ?? [],
      canAccessPremiumSubjects: false,
      canExportPdf: false,
    };
  }

  return {
    dailyScanLimit: userSub.plan.dailyScanLimit ?? -1,  // NULL = unlimited
    monthlyScanLimit: userSub.plan.monthlyScanLimit,
    maxImageSizeMb: 10,
    maxFollowupQuestions: 2,
    maxPracticeProblems: -1,
    maxBookmarks: userSub.plan.maxBookmarks,
    maxHistoryDays: userSub.plan.maxHistoryDays,
    features: (userSub.plan.features as string[]) ?? [],
    canAccessPremiumSubjects: true,
    canExportPdf: true,
  };
}

/**
 * Get today's usage for a user or session
 */
export async function getTodayUsage(
  userId?: string | null,
  sessionId?: string | null
): Promise<CurrentUsage> {
  const today = new Date().toISOString().split("T")[0];

  let usage;

  if (userId) {
    usage = await db.query.dailyUsage.findFirst({
      where: and(
        eq(dailyUsage.userId, userId),
        sql`DATE(${dailyUsage.usageDate}) = ${today}`
      ),
    });
  } else if (sessionId) {
    usage = await db.query.dailyUsage.findFirst({
      where: and(
        eq(dailyUsage.sessionId, sessionId),
        sql`DATE(${dailyUsage.usageDate}) = ${today}`
      ),
    });
  }

  return {
    scanCount: usage?.scanCount ?? 0,
    messageCount: usage?.messageCount ?? 0,
    practiceCount: usage?.practiceCount ?? 0,
  };
}

/**
 * Check if user can perform a scan
 */
export async function checkScanLimit(
  userId?: string | null,
  sessionId?: string | null
): Promise<UsageCheck> {
  const limits = await getPlanLimits(userId, sessionId);
  const usage = await getTodayUsage(userId, sessionId);

  // -1 means unlimited
  if (limits.dailyScanLimit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const remaining = limits.dailyScanLimit - usage.scanCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: limits.dailyScanLimit,
    message: allowed
      ? undefined
      : `Daily scan limit reached (${limits.dailyScanLimit}). Upgrade for more scans!`,
  };
}

/**
 * Check if user can ask followup questions
 */
export async function checkFollowupLimit(
  userId?: string | null,
  sessionId?: string | null
): Promise<UsageCheck> {
  const limits = await getPlanLimits(userId, sessionId);
  const usage = await getTodayUsage(userId, sessionId);

  // Premium users (unlimited scans) also get unlimited followups
  const isUnlimited = limits.dailyScanLimit === null || limits.dailyScanLimit === -1;

  if (isUnlimited) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // Free/guest users get limited followups (e.g., 10 per day)
  const followupLimit = isUnlimited ? 50 : 3;
  const remaining = followupLimit - usage.messageCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: followupLimit,
    message: allowed
      ? undefined
      : `Daily followup limit reached. Upgrade for unlimited questions!`,
  };
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  type: "scan" | "followup" | "practice",
  userId?: string | null,
  sessionId?: string | null
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Find or create today's usage record
  let existingUsage;

  if (userId) {
    existingUsage = await db.query.dailyUsage.findFirst({
      where: and(
        eq(dailyUsage.userId, userId),
        sql`DATE(${dailyUsage.usageDate}) = ${today}`
      ),
    });
  } else if (sessionId) {
    existingUsage = await db.query.dailyUsage.findFirst({
      where: and(
        eq(dailyUsage.sessionId, sessionId),
        sql`DATE(${dailyUsage.usageDate}) = ${today}`
      ),
    });
  }

  const updateField =
    type === "scan"
      ? { scanCount: sql`${dailyUsage.scanCount} + 1` }
      : type === "followup"
        ? { messageCount: sql`${dailyUsage.messageCount} + 1` }
        : { practiceCount: sql`${dailyUsage.practiceCount} + 1` };

  if (existingUsage) {
    await db
      .update(dailyUsage)
      .set({ ...updateField, updatedAt: new Date() })
      .where(eq(dailyUsage.id, existingUsage.id));
  } else {
    await db.insert(dailyUsage).values({
      ...(userId && { userId }),
      ...(sessionId && { sessionId }),
      usageDate: today,
      scanCount: type === "scan" ? 1 : 0,
      messageCount: type === "followup" ? 1 : 0,
      practiceCount: type === "practice" ? 1 : 0,
    });
  }
}

/**
 * Get full usage status for display
 */
export async function getUsageStatus(
  userId?: string | null,
  sessionId?: string | null
) {
  const limits = await getPlanLimits(userId, sessionId);
  const usage = await getTodayUsage(userId, sessionId);

  // Check if unlimited (-1 or null means unlimited)
  const isUnlimited = limits.dailyScanLimit === null || limits.dailyScanLimit === -1;

  return {
    scans: {
      used: usage.scanCount,
      limit: limits.dailyScanLimit,
      remaining: isUnlimited
        ? -1
        : Math.max(0, (limits.dailyScanLimit ?? 0) - usage.scanCount),
      unlimited: isUnlimited,
    },
    followups: {
      used: usage.messageCount,
      // Followups not limited per plan anymore, use reasonable default
      limit: isUnlimited ? -1 : 5,
      remaining: isUnlimited ? -1 : Math.max(0, 10 - usage.messageCount),
      unlimited: isUnlimited,
    },
    practice: {
      used: usage.practiceCount,
      // Practice not limited per plan anymore, use reasonable default
      limit: isUnlimited ? -1 : 5,
      remaining: isUnlimited ? -1 : Math.max(0, 5 - usage.practiceCount),
      unlimited: isUnlimited,
    },
    limits,
    // Helper to check features
    hasFeature: (feature: string) => limits.features.includes(feature),
  };
}
