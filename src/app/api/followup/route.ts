import { NextRequest, NextResponse } from "next/server";
import { handleFollowUp } from "@/lib/gemini";
import { SupportedLanguage, FollowUpResponse, ConversationMessage } from "@/types";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { checkFollowupLimit } from "@/lib/usage";

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
  deviceFingerprint: z.string().optional(),
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

    const { scanId, question, originalContext, conversationHistory, language, sessionId, deviceFingerprint } = validationResult.data;
    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const trackingUserId = session?.user?.id || null;
    const trackingSessionId = trackingUserId ? null : sessionId;

    // Check follow-up limit
    const limitCheck = await checkFollowupLimit(
      trackingUserId,
      trackingSessionId || sessionId,
      trackingUserId ? null : deviceFingerprint,
      trackingUserId ? null : clientIp
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_EXCEEDED",
            message: `Daily message limit reached (${limitCheck.limit} messages). ${!session?.user?.id
              ? "Sign in for more messages."
              : session?.user?.id && limitCheck.limit <= 3
                ? "Upgrade to Premium for unlimited messages."
                : "Try again tomorrow."
              }`,
            remaining: 0,
            limit: limitCheck.limit,
            resetsAt: limitCheck.resetsAt.toISOString(),
          },
        },
        { status: 429 }
      );
    }

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

    // Get or create conversation using the PostgreSQL function
    const conversationResult = await db.execute(sql`
      SELECT fn_get_or_create_conversation(
        ${scanId}::UUID,
        ${trackingUserId}::UUID,
        ${trackingSessionId}::VARCHAR
      ) as conversation_id
    `);

    const conversationId = (conversationResult.rows[0] as any).conversation_id;

    // Store user message using PostgreSQL function
    await db.execute(sql`
      SELECT fn_add_message(
        ${conversationId}::UUID,
        'user'::message_role,
        ${question}::TEXT,
        NULL::VARCHAR, -- model_used
        'sent'::VARCHAR, -- status
        NULL::INTEGER, -- token_count
        NULL::INTEGER -- processing_time_ms
      )
    `);

    // Store assistant message using PostgreSQL function
    await db.execute(sql`
      SELECT fn_add_message(
        ${conversationId}::UUID,
        'assistant'::message_role,
        ${answer}::TEXT,
        ${process.env.GOOGLE_AI_MODEL}::VARCHAR, -- model_used
        'sent'::VARCHAR, -- status
        NULL::INTEGER, -- token_count
        NULL::INTEGER -- processing_time_ms
      )
    `);


    return NextResponse.json({
      success: true,
      data: {
        answer,
        messageId: uuidv4(),
        usage: {
          remaining: limitCheck.remaining - 1, // Subtract the one we just used
          limit: limitCheck.limit,
          resetsAt: limitCheck.resetsAt.toISOString(),
        },
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
