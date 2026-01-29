import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { liveSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, language, educationLevel, subject } = body;

    const [session] = await db
      .insert(liveSessions)
      .values({
        userId: userId || null,
        sessionId: sessionId,
        language: language || "en",
        educationLevel: educationLevel || null,
        subject: subject || null,
        status: "connecting",
        startedAt: new Date(),
        messageCount: 0,
        toolCallsCount: 0,
      })
      .returning();

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Failed to create live session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = session?.user?.id ? session.user.id : null;
    const sessionId = searchParams.get("sessionId");

    let whereClause;

    if (userId) {
      whereClause = eq(liveSessions.userId, userId);
    } else if (sessionId) {
      whereClause = eq(liveSessions.sessionId, sessionId);
    }

    const sessions = await db
      .select()
      .from(liveSessions)
      .where(whereClause)
      .orderBy(desc(liveSessions.createdAt))
      .limit(limit);

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
