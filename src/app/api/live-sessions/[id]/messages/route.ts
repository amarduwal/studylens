import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { liveSessionMessages, liveSessions } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getSignedAudioUrl } from "@/lib/r2-audio";

interface Params {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const messages = await db
      .select()
      .from(liveSessionMessages)
      .where(eq(liveSessionMessages.sessionId, id))
      .orderBy(asc(liveSessionMessages.createdAt));

    // Refresh signed URLs for audio if using private bucket
    const messagesWithFreshUrls = await Promise.all(
      messages.map(async (msg) => {
        let audioUrl = msg.audioUrl;

        // If we have an audioKey, generate fresh signed URL
        // Only needed if using signed URLs (private bucket)
        if (msg.audioKey && !process.env.R2_PUBLIC_URL) {
          try {
            audioUrl = await getSignedAudioUrl(msg.audioKey, 7200);
          } catch (e) {
            console.error("Failed to get signed URL:", e);
          }
        }

        return {
          ...msg,
          audioUrl,
          duration: msg.duration ? parseFloat(msg.duration) : null,
        };
      })
    );

    return NextResponse.json({ success: true, messages: messagesWithFreshUrls });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [message] = await db
      .insert(liveSessionMessages)
      .values({
        sessionId: id,
        role: body.role,
        type: body.type || "text",
        content: body.content || null,
        audioUrl: body.audioUrl || null,
        audioKey: body.audioKey || null,
        duration: body.duration?.toString() || null,
        metadata: body.metadata || null,
      })
      .returning();

    // Update message count on session
    await db
      .update(liveSessions)
      .set({
        messageCount: sql`COALESCE(${liveSessions.messageCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(liveSessions.id, id));

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        duration: message.duration ? parseFloat(message.duration) : null,
      }
    });
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create message" },
      { status: 500 }
    );
  }
}
