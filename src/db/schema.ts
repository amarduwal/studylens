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
  bigint,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============ ENUMS ============

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  'guest',
  'free',
  'premium',
  'enterprise'
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  'active',
  'canceled',
  'past_due',
  'incomplete',
  'trialing',
  'paused'
]);

export const contentTypeEnum = pgEnum("content_type", [
  'math_problem',
  'algebra',
  'geometry',
  'calculus',
  'statistics',
  'physics_problem',
  'chemistry_problem',
  'biology_diagram',
  'science_diagram',
  'text_passage',
  'essay',
  'handwritten_notes',
  'printed_text',
  'graph_chart',
  'table_data',
  'code_snippet',
  'circuit_diagram',
  'map',
  'historical_document',
  'language_text',
  'music_sheet',
  'other'
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
  "other",
]);

export const oauthProviderEnum = pgEnum("oauth_provider", [
  "google",
  "github",
  "facebook",
  "apple",
]);

export const difficultyLevelEnum = pgEnum("difficulty_level", [
  'elementary',
  'easy',
  'medium',
  'hard',
  'advanced',
  'expert'
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "refunded",
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

// ============ SUBJECTS & TOPICS ============

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  description: text("description"),
  color: varchar("color", { length: 7 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").references(() => subjects.id, {
    onDelete: "cascade"
  }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  description: text("description"),
  difficulty: difficultyLevelEnum("difficulty").default("medium"),
  educationLevel: educationLevelEnum("education_level").default("high"),
  keywords: text("keywords").array(),
  scanCount: integer("scan_count").default(0),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ AUTH TABLES ============

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Basic Info
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  passwordHash: varchar("password_hash", { length: 255 }),

  // Profile
  name: varchar("name", { length: 100 }),
  username: varchar("username", { length: 50 }).unique(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  bio: text("bio"),
  dateOfBirth: date("date_of_birth"),

  // Preferences
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
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ============ PASSWORD RESET TOKENS ============

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ EMAIL VERIFICATION CODES ============

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").default(0),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // OAuth Provider Info
    type: varchar("type", { length: 50 }).notNull(),
    provider: oauthProviderEnum("provider").notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),

    // OAuth Tokens
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: bigint("expires_at", { mode: "number" }),
    tokenType: varchar("token_type", { length: 50 }),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (account) => ({
    uniqueProviderAccount: primaryKey({
      name: "unique_provider_account",
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),

  // Session Info
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceType: varchar("device_type", { length: 50 }),
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 100 }),

  // Status
  isValid: boolean("is_valid").default(true),

  // Timestamps
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const guestUsage = pgTable("guest_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  date: date("date").notNull(),
  scanCount: integer("scan_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),

  // Pricing
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),

  // Limits
  dailyScanLimit: integer("daily_scan_limit"),
  monthlyScanLimit: integer("monthly_scan_limit"),
  maxImagesPerScan: integer("max_images_per_scan").default(1),
  maxBookmarks: integer("max_bookmarks"),
  maxHistoryDays: integer("max_history_days"),
  dailyFollowupLimit: integer("daily_followup_limit").default(5),
  dailyPracticeLimit: integer("daily_practice_limit").default(5),

  // Features
  features: jsonb("features").default([]),

  // Stripe
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 100 }),
  stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 100 }),

  // Status
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  sortOrder: integer("sort_order").default(0),

  // Timestamps
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

export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 100 }),
    usageDate: date("usage_date").notNull().defaultNow(),
    scanCount: integer("scan_count").default(0).notNull(),
    messageCount: integer("message_count").default(0).notNull(),
    practiceCount: integer("practice_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserDate: check(
      "user_or_session_required",
      sql`(user_id IS NOT NULL OR session_id IS NOT NULL)`
    ),
  })
);

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

// ============ PAYMENTS ============

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),

  // Payment Details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: paymentStatusEnum("status").default("pending"),

  // Stripe Info
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 100 }).unique(),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 100 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 100 }),

  // Payment Method
  paymentMethod: varchar("payment_method", { length: 50 }),
  cardLastFour: varchar("card_last_four", { length: 4 }),
  cardBrand: varchar("card_brand", { length: 20 }),

  // Details
  description: text("description"),
  metadata: jsonb("metadata"),

  // Refund Info
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).default("0"),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),

  // Failure Info
  failureCode: varchar("failure_code", { length: 50 }),
  failureMessage: text("failure_message"),

  // Timestamps
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ SCANS ============

export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: varchar("session_id", { length: 100 }).notNull(),

  // Content Classification
  contentType: contentTypeEnum("content_type").default("other"),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }), // Note: references subjects table (not included in schema)
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),     // Note: references topics table (not included in schema)
  difficulty: difficultyEnum("difficulty"),

  // Extracted Content
  extractedText: text("extracted_text"),
  extractedLatex: text("extracted_latex"),
  detectedLanguage: varchar("detected_language", { length: 50 }),

  // AI Response - JSONB column
  // Note: Drizzle handles JSON serialization, but we need to ensure clean data
  explanation: jsonb("explanation").$type<{
    simpleAnswer: string;
    stepByStep: Array<{
      step: number;
      action: string;
      explanation: string;
      formula?: string | null;
    }>;
    concept: string;
    whyItMatters?: string | null;
    practiceQuestions?: string[];
    tips?: string[];
  }>().notNull(),

  // Settings used
  explanationLanguage: varchar("explanation_language", { length: 10 }).default("en"),
  targetEducationLevel: educationLevelEnum("target_education_level"),

  // Metadata
  processingTimeMs: integer("processing_time_ms"),
  geminiModel: varchar("gemini_model", { length: 50 }),
  tokenCount: integer("token_count"),

  // Tracking
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),

  // Status
  status: varchar("status", { length: 20 }).default("completed"),
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ BOOKMARKS ============

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),

    // Organization
    folderName: varchar("folder_name", { length: 100 }),
    tags: text("tags").array(),

    // Notes
    notes: text("notes"),

    // Priority/Order
    isPinned: boolean("is_pinned").default(false),
    sortOrder: integer("sort_order").default(0),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserScan: primaryKey({
      name: "unique_user_scan",
      columns: [table.userId, table.scanId],
    }),
  })
);

// ============ SCAN IMAGES ============

export const scanImages = pgTable("scan_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),

  // Image Storage
  storageProvider: varchar("storage_provider", { length: 20 }).default("r2"),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }),

  // Image Info
  mimeType: varchar("mime_type", { length: 50 }).notNull(),
  fileSize: integer("file_size").notNull(),
  width: integer("width"),
  height: integer("height"),

  // Variants
  thumbnailKey: varchar("thumbnail_key", { length: 500 }),

  // Hash for duplicate detection
  fileHash: varchar("file_hash", { length: 64 }),

  // Processing
  isProcessed: boolean("is_processed").default(false),

  // Order
  sortOrder: integer("sort_order").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});


// ============ CONVERSATIONS ============

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: varchar("session_id", { length: 100 }).notNull(),

  // Conversation Metadata
  title: varchar("title", { length: 255 }),
  summary: text("summary"),

  // Stats
  messageCount: integer("message_count").default(0),

  // Context for AI
  contextData: jsonb("context_data"),

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ MESSAGES ============

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),

  // Message Content
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),

  // Rich Content
  contentHtml: text("content_html"),
  attachments: jsonb("attachments"),

  // Metadata
  tokenCount: integer("token_count"),
  processingTimeMs: integer("processing_time_ms"),

  // AI Model Info
  modelUsed: varchar("model_used", { length: 50 }),

  // Feedback
  wasHelpful: boolean("was_helpful"),
  feedbackType: varchar("feedback_type", { length: 20 }),

  // Status
  status: varchar("status", { length: 20 }).default("sent"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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

  // Weekly Activity
  weeklyActivity: jsonb("weekly_activity").default({}),

  // All-time Stats
  totalActiveDays: integer("total_active_days").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ BLOCKED EMAIL DOMAINS & TEMP EMAIL ATTEMPTS ============

export const blockedEmailDomains = pgTable("blocked_email_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: varchar("domain", { length: 255 }).unique().notNull(),
  category: varchar("category", { length: 50 }).default("temporary"),
  reason: text("reason"),
  source: varchar("source", { length: 100 }).default("manual"),
  confidence: integer("confidence").default(100),
  hitCount: integer("hit_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
});

export const tempEmailAttempts = pgTable("temp_email_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  wasBlocked: boolean("was_blocked").default(true),
  matchedRules: text("matched_rules").array(),
  detectedBy: varchar("detected_by", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const trustedEmailDomains = pgTable("trusted_email_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: varchar("domain", { length: 255 }).unique().notNull(),
  providerName: varchar("provider_name", { length: 100 }),
  providerType: varchar("provider_type", { length: 50 }).default("personal"),
  countryCode: varchar("country_code", { length: 2 }),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============ RELATIONS ============

export const blockedEmailDomainsRelations = relations(blockedEmailDomains, ({ one }) => ({
  creator: one(users, {
    fields: [blockedEmailDomains.createdBy],
    references: [users.id],
  }),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  users: many(users),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  topics: many(topics),
  scans: many(scans),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [topics.subjectId],
    references: [subjects.id],
  }),
  scans: many(scans),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  resetTokens: one(passwordResetTokens),
  passwordResetTokens: many(passwordResetTokens),
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
  conversations: many(conversations),
  bookmarks: many(bookmarks),
  payments: many(payments),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const emailVerificationCodesRelations = relations(emailVerificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationCodes.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
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

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(pricingPlans, {
    fields: [subscriptions.planId],
    references: [pricingPlans.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  user: one(users, {
    fields: [scans.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [scans.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [scans.topicId],
    references: [topics.id],
  }),
  conversation: one(conversations, {
    fields: [scans.id],
    references: [conversations.scanId],
  }),
  bookmarks: many(bookmarks),
  images: many(scanImages),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  scan: one(scans, {
    fields: [bookmarks.scanId],
    references: [scans.id],
  }),
}));

export const scanImagesRelations = relations(scanImages, ({ one }) => ({
  scan: one(scans, {
    fields: [scanImages.scanId],
    references: [scans.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  scan: one(scans, {
    fields: [conversations.scanId],
    references: [scans.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
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

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;
export type NewEmailVerificationCode = typeof emailVerificationCodes.$inferSelect;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;

export type PricingPlan = typeof pricingPlans.$inferSelect;
export type NewPricingPlan = typeof pricingPlans.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type StudyStreak = typeof studyStreaks.$inferSelect;
export type NewStudyStreak = typeof studyStreaks.$inferInsert;

export type DailyUsage = typeof dailyUsage.$inferSelect;
export type NewDailyUsage = typeof dailyUsage.$inferInsert;

export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export type ScanImage = typeof scanImages.$inferSelect;
export type NewScanImage = typeof scanImages.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

export type GuestUsage = typeof guestUsage.$inferSelect;
export type NewGuestUsage = typeof guestUsage.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type BlockedEmailDomain = typeof blockedEmailDomains.$inferSelect;
export type NewBlockedEmailDomain = typeof blockedEmailDomains.$inferInsert;

export type TempEmailAttempt = typeof tempEmailAttempts.$inferSelect;
export type NewTempEmailAttempt = typeof tempEmailAttempts.$inferInsert;

export type TrustedEmailDomain = typeof trustedEmailDomains.$inferSelect;
export type NewTrustedEmailDomain = typeof trustedEmailDomains.$inferInsert;
