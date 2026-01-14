import { db } from "./index";
import { pricingPlans } from "./schema";

const plans = [
  {
    name: "guest",
    slug: "guest",
    displayName: "Guest",
    description: "Try StudyLens without an account",
    priceMonthly: "0",
    priceYearly: "0",
    dailyScanLimit: 3,
    maxImageSizeMb: 5,
    maxFollowupQuestions: 2,
    maxPracticeProblems: 1,
    maxHistoryDays: 0,
    canAccessPremiumSubjects: false,
    canExportPdf: false,
    canUseOffline: false,
    prioritySupport: false,
    noAds: false,
    sortOrder: 0,
  },
  {
    name: "free",
    slug: "free",
    displayName: "Free",
    description: "For casual learners",
    priceMonthly: "0",
    priceYearly: "0",
    dailyScanLimit: 10,
    maxImageSizeMb: 10,
    maxFollowupQuestions: 5,
    maxPracticeProblems: 3,
    maxHistoryDays: 30,
    canAccessPremiumSubjects: false,
    canExportPdf: false,
    canUseOffline: false,
    prioritySupport: false,
    noAds: false,
    sortOrder: 1,
  },
  {
    name: "premium",
    slug: "premium",
    displayName: "Premium",
    description: "Unlimited learning power",
    priceMonthly: "9.99",
    priceYearly: "99.99",
    dailyScanLimit: -1, // -1 means unlimited
    maxImageSizeMb: 20,
    maxFollowupQuestions: -1,
    maxPracticeProblems: -1,
    maxHistoryDays: -1,
    canAccessPremiumSubjects: true,
    canExportPdf: true,
    canUseOffline: true,
    prioritySupport: true,
    noAds: true,
    sortOrder: 2,
  },
];

async function seed() {
  console.log("🌱 Seeding pricing plans...");

  for (const plan of plans) {
    await db
      .insert(pricingPlans)
      .values(plan)
      .onConflictDoUpdate({
        target: pricingPlans.name,
        set: plan,
      });
  }

  console.log("✅ Seeding complete!");
}

seed().catch(console.error);
