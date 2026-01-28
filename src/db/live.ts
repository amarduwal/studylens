import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// Live Session Status Enum
export const liveSessionStatusEnum = ["connecting", "connected", "reconnecting", "ended", "error"] as const;
export type LiveSessionStatus = (typeof liveSessionStatusEnum)[number];

// Live Message Role Enum
export const liveMessageRoleEnum = ["user", "assistant", "system", "tool"] as const;
export type LiveMessageRole = (typeof liveMessageRoleEnum)[number];

// Live Message Type Enum
export const liveMessageTypeEnum = ["text", "audio", "tool_call", "tool_result"] as const;
export type LiveMessageType = (typeof liveMessageTypeEnum)[number];

// Live Sessions Table
export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: varchar("session_id", { length: 255 }),
    language: varchar("language", { length: 10 }).default("en"),
    educationLevel: varchar("education_level", { length: 50 }),
    subject: varchar("subject", { length: 100 }),
    status: varchar("status", { length: 20 }).default("connecting"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    duration: integer("duration"), // in seconds
    messageCount: integer("message_count").default(0),
    toolCallsCount: integer("tool_calls_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_live_sessions_user").on(table.userId),
    statusIdx: index("idx_live_sessions_status").on(table.status),
  })
);

// Live Session Messages Table
export const liveSessionMessages = pgTable(
  "live_session_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => liveSessions.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    content: text("content"),
    audioUrl: text("audio_url"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("idx_live_session_messages_session").on(table.sessionId),
    createdAtIdx: index("idx_live_session_messages_created_at").on(table.createdAt),
  })
);

// Relations
export const liveSessionsRelations = relations(liveSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [liveSessions.userId],
    references: [users.id],
  }),
  messages: many(liveSessionMessages),
}));

export const liveSessionMessagesRelations = relations(liveSessionMessages, ({ one }) => ({
  session: one(liveSessions, {
    fields: [liveSessionMessages.sessionId],
    references: [liveSessions.id],
  }),
}));

// Types
export type LiveSession = typeof liveSessions.$inferSelect;
export type NewLiveSession = typeof liveSessions.$inferInsert;
export type LiveSessionMessage = typeof liveSessionMessages.$inferSelect;
export type NewLiveSessionMessage = typeof liveSessionMessages.$inferInsert;
