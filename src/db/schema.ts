import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  primaryKey,
  jsonb,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ============ ENUMS ============

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "guest",
  "free",
  "premium",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "expired",
  "past_due",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "math_problem",
  "science_diagram",
  "text_passage",
  "handwritten_notes",
  "graph_chart",
  "code_snippet",
  "other",
]);

export const difficultyEnum = pgEnum("difficulty_level", [
  "easy",
  "medium",
  "hard",
]);

export const educationLevelEnum = pgEnum("education_level", [
  "elementary",
  "middle",
  "high",
  "undergraduate",
  "graduate",
  "professional",
]);

// ============ LANGUAGES ============

export const languages = pgTable("languages", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  nativeName: varchar("native_name", { length: 100 }).notNull(),
  direction: varchar("direction", { length: 3 }).default("ltr"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ AUTH TABLES (NextAuth.js Compatible) ============

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Basic Info
  email: varchar("email", { length: 255 }).unique(),  // Remove .notNull() - can be NULL for OAuth-only
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  passwordHash: varchar("password_hash", { length: 255 }),

  // Profile
  name: varchar("name", { length: 100 }),
  username: varchar("username", { length: 50 }).unique(),
  avatarUrl: varchar("avatar_url", { length: 500 }),  // Changed from image
  bio: text("bio"),
  dateOfBirth: date("date_of_birth"),

  // Preferences (on user table now)
  preferredLanguageId: uuid("preferred_language_id").references(() => languages.id, { onDelete: "set null" }),
  educationLevel: educationLevelEnum("education_level").default("high"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  theme: varchar("theme", { length: 20 }).default("system"),

  // Subscription
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),

  // Usage tracking
  totalScans: integer("total_scans").default(0),
  totalMessages: integer("total_messages").default(0),

  // Status
  isActive: boolean("is_active").default(true),
  isBanned: boolean("is_banned").default(false),
  bannedReason: text("banned_reason"),
  bannedAt: timestamp("banned_at", { withTimezone: true }),

  // Timestamps
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft delete
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).$type<AdapterAccountType>().notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// ============ PRICING PLANS ============

export const pricingPlans = pgTable("pricing_plans", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Plan Info
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),  // Changed from displayName
  description: text("description"),

  // Pricing
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),

  // Limits
  dailyScanLimit: integer("daily_scan_limit"),  // NULL = unlimited
  monthlyScanLimit: integer("monthly_scan_limit"),
  maxBookmarks: integer("max_bookmarks"),
  maxHistoryDays: integer("max_history_days"),

  // Features (JSON for flexibility)
  features: jsonb("features").default([]),

  // Stripe
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 100 }),
  stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 100 }),

  // Meta
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ USER PREFERENCES ============

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Notification Preferences
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  streakReminders: boolean("streak_reminders").default(true),
  weeklySummary: boolean("weekly_summary").default(true),
  marketingEmails: boolean("marketing_emails").default(false),

  // Display Preferences
  defaultDifficulty: difficultyEnum("default_difficulty").default("medium"),
  showLatex: boolean("show_latex").default(true),
  showStepNumbers: boolean("show_step_numbers").default(true),
  compactView: boolean("compact_view").default(false),

  // Accessibility
  fontSize: varchar("font_size", { length: 10 }).default("medium"),
  highContrast: boolean("high_contrast").default(false),
  reduceAnimations: boolean("reduce_animations").default(false),

  // Privacy
  profilePublic: boolean("profile_public").default(false),
  showStreakPublic: boolean("show_streak_public").default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ DAILY USAGE TRACKING ============

export const dailyUsage = pgTable("daily_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 100 }),
  usageDate: date("usage_date").notNull().defaultNow(),
  scanCount: integer("scan_count").default(0).notNull(),
  messageCount: integer("followup_count").default(0).notNull(),
  practiceCount: integer("practice_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ SUBSCRIPTIONS ============

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => pricingPlans.id, { onDelete: "set null" }),

  // Stripe Info
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }).unique(),
  stripePriceId: varchar("stripe_price_id", { length: 100 }),

  // Subscription Details
  status: subscriptionStatusEnum("status").default("active"),
  billingCycle: varchar("billing_cycle", { length: 20 }).default("monthly"),

  // Trial
  trialStart: timestamp("trial_start", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),

  // Current Period
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

  // Cancellation
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ SCANS ============

export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: varchar("session_id", { length: 100 }),
  imageUrl: text("image_url").notNull(),
  contentType: contentTypeEnum("content_type").default("other"),
  subject: varchar("subject", { length: 100 }),
  topic: varchar("topic", { length: 200 }),
  difficulty: difficultyEnum("difficulty"),
  extractedText: text("extracted_text"),
  explanation: jsonb("explanation"),
  language: varchar("language", { length: 10 }).default("en"),
  isBookmarked: boolean("is_bookmarked").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),  // Add this
});

// ============ CONVERSATIONS ============

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .unique()
    .references(() => scans.id, { onDelete: "cascade" }),
  messages: jsonb("messages").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ STUDY STREAKS ============

export const studyStreaks = pgTable("study_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Streak Data
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),

  // Dates
  streakStartDate: date("streak_start_date"),
  lastActivityDate: date("last_activity_date"),

  // Weekly Activity (for heatmap)
  weeklyActivity: jsonb("weekly_activity").default({}),

  // All-time Stats
  totalActiveDays: integer("total_active_days").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ RELATIONS ============

export const languagesRelations = relations(languages, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  preferredLanguage: one(languages, {
    fields: [users.preferredLanguageId],
    references: [languages.id],
  }),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  studyStreak: one(studyStreaks, {
    fields: [users.id],
    references: [studyStreaks.userId],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  scans: many(scans),
  dailyUsage: many(dailyUsage),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const studyStreaksRelations = relations(studyStreaks, ({ one }) => ({
  user: one(users, {
    fields: [studyStreaks.userId],
    references: [users.id],
  }),
}));

export const pricingPlansRelations = relations(pricingPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(pricingPlans, {
    fields: [subscriptions.planId],
    references: [pricingPlans.id],
  }),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  user: one(users, {
    fields: [scans.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [scans.id],
    references: [conversations.scanId],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  scan: one(scans, {
    fields: [conversations.scanId],
    references: [scans.id],
  }),
}));

export const dailyUsageRelations = relations(dailyUsage, ({ one }) => ({
  user: one(users, {
    fields: [dailyUsage.userId],
    references: [users.id],
  }),
}));

// ============ TYPES ============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;

export type PricingPlan = typeof pricingPlans.$inferSelect;
export type NewPricingPlan = typeof pricingPlans.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type StudyStreak = typeof studyStreaks.$inferSelect;
export type NewStudyStreak = typeof studyStreaks.$inferInsert;

export type DailyUsage = typeof dailyUsage.$inferSelect;
export type NewDailyUsage = typeof dailyUsage.$inferInsert;

export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
