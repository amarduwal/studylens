import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { liveSessionMessages, liveSessions } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const saveMessageSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  type: z.enum(["text", "audio", "tool_call", "tool_result"]),
  content: z.string().optional(),
  audioUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const saveMessagesSchema = z.object({
  messages: z.array(saveMessageSchema),
});

// POST - Save messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle single message or array of messages
    const isBatch = Array.isArray(body.messages);
    const validationResult = isBatch
      ? saveMessagesSchema.safeParse(body)
      : saveMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const messages = isBatch
      ? (validationResult.data as z.infer<typeof saveMessagesSchema>).messages
      : [validationResult.data as z.infer<typeof saveMessageSchema>];

    // Insert messages
    const insertedMessages = await db
      .insert(liveSessionMessages)
      .values(
        messages.map((msg) => ({
          sessionId: msg.sessionId,
          role: msg.role,
          type: msg.type,
          content: msg.content,
          audioUrl: msg.audioUrl,
          metadata: msg.metadata,
        }))
      )
      .returning();

    // Update message count in session
    if (messages.length > 0) {
      await db
        .update(liveSessions)
        .set({
          messageCount: sql`${liveSessions.messageCount} + ${messages.length}`,
          updatedAt: new Date(),
        })
        .where(eq(liveSessions.id, messages[0].sessionId));
    }

    return NextResponse.json({
      success: true,
      data: insertedMessages,
    });
  } catch (error) {
    console.error("Save messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save messages" },
      { status: 500 }
    );
  }
}

// GET - Get messages for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID required" },
        { status: 400 }
      );
    }

    const messages = await db
      .select()
      .from(liveSessionMessages)
      .where(eq(liveSessionMessages.sessionId, sessionId))
      .orderBy(desc(liveSessionMessages.createdAt));

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get messages" },
      { status: 500 }
    );
  }
}
