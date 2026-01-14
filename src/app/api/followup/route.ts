import { NextRequest, NextResponse } from "next/server";
import { handleFollowUp } from "@/lib/gemini";
import { SupportedLanguage, FollowUpResponse, ConversationMessage } from "@/types";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { conversations, dailyUsage, db, users } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

const followUpSchema = z.object({
  scanId: z.string().min(1),
  question: z.string().min(1, "Question is required"),
  originalContext: z.string().min(1, "Context is required"),
  conversationHistory: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().or(z.date()),
    })
  ).default([]),
  language: z.enum(["en", "hi", "ne", "es", "fr", "ar", "zh", "bn", "pt", "id"]).default("en"),
  sessionId: z.string(),
});

export async function POST(request: NextRequest): Promise<NextResponse<FollowUpResponse>> {
  try {
    const body = await request.json();
    const session = await auth();

    const validationResult = followUpSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationResult.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { scanId, question, originalContext, conversationHistory, language, sessionId } = validationResult.data;

    // Convert to proper ConversationMessage format
    const history: ConversationMessage[] = conversationHistory.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    // Get response from Gemini
    const answer = await handleFollowUp(
      originalContext,
      question,
      history,
      language as SupportedLanguage
    );

    // Update conversation and usage stats
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scanId, scanId))
      .limit(1);

    if (conversation) {
      await db
        .update(conversations)
        .set({
          messageCount: sql`${conversations.messageCount} + 1`,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));
    } else {
      // Create conversation if it doesn't exist
      await db.insert(conversations).values({
        scanId,
        userId: session?.user?.id || null,
        sessionId: sessionId || "",
        messageCount: 1,
        lastMessageAt: new Date(),
      });
    }

    // Update user message count
    if (session?.user?.id) {
      await db
        .update(users)
        .set({ totalMessages: sql`${users.totalMessages} + 1` })
        .where(eq(users.id, session.user.id));
    }

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const [existingUsage] = await db
      .select()
      .from(dailyUsage)
      .where(
        session?.user?.id
          ? and(eq(dailyUsage.userId, session.user.id), sql`DATE(${dailyUsage.usageDate}) = ${today}`)
          : and(eq(dailyUsage.sessionId, sessionId || ""), sql`DATE(${dailyUsage.usageDate}) = ${today}`)
      )
      .limit(1);

    if (existingUsage) {
      await db
        .update(dailyUsage)
        .set({ messageCount: sql`${dailyUsage.messageCount} + 1` })
        .where(eq(dailyUsage.id, existingUsage.id));
    } else {
      await db.insert(dailyUsage).values({
        userId: session?.user?.id || null,
        sessionId: sessionId || null,
        messageCount: 1,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        messageId: uuidv4(),
      },
    });
  } catch (error) {
    console.error("Follow-up API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_ERROR",
          message: error instanceof Error ? error.message : "Failed to process question",
        },
      },
      { status: 500 }
    );
  }
}
