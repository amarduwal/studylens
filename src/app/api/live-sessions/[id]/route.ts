import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { liveSessions, liveSessionMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteAudioFromR2 } from "@/lib/r2-audio";

interface Params {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const [session] = await db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.status) updateData.status = body.status;
    if (body.endedAt) updateData.endedAt = new Date(body.endedAt);
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.messageCount !== undefined) updateData.messageCount = body.messageCount;
    if (body.toolCallsCount !== undefined) updateData.toolCallsCount = body.toolCallsCount;

    const [session] = await db
      .update(liveSessions)
      .set(updateData)
      .where(eq(liveSessions.id, id))
      .returning();

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Get all messages with audio to delete from R2
    const messages = await db
      .select({ audioKey: liveSessionMessages.audioKey })
      .from(liveSessionMessages)
      .where(eq(liveSessionMessages.sessionId, id));

    // Delete audio files from R2
    for (const msg of messages) {
      if (msg.audioKey) {
        await deleteAudioFromR2(msg.audioKey);
      }
    }

    // Delete session (cascade deletes messages)
    await db.delete(liveSessions).where(eq(liveSessions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
