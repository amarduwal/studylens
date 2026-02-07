import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { liveSessionMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: sessionId, messageId } = await params;
    const body = await request.json();
    const { metadata } = body;

    // Get existing message
    const [existingMessage] = await db
      .select()
      .from(liveSessionMessages)
      .where(
        and(
          eq(liveSessionMessages.id, messageId),
          eq(liveSessionMessages.sessionId, sessionId)
        )
      )
      .limit(1);

    if (!existingMessage) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    // Merge existing metadata with new metadata
    const existingMetadata = (existingMessage.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
    };

    // Update message
    const [updatedMessage] = await db
      .update(liveSessionMessages)
      .set({
        metadata: updatedMetadata,
      })
      .where(eq(liveSessionMessages.id, messageId))
      .returning();

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error("Failed to update message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update message" },
      { status: 500 }
    );
  }
}
