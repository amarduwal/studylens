import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { liveSessions, liveSessionMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Request validation schemas
const createSessionSchema = z.object({
  language: z.string().default("en"),
  educationLevel: z.string().optional(),
  subject: z.string().optional(),
  voiceEnabled: z.boolean().default(true),
  videoEnabled: z.boolean().default(true),
});

const updateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["connecting", "connected", "reconnecting", "ended", "error"]).optional(),
  endedAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  messageCount: z.number().optional(),
  toolCallsCount: z.number().optional(),
});

// POST - Create new session
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const validationResult = createSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { language, educationLevel, subject } = validationResult.data;
    const sessionId = uuidv4();

    // Create session in database
    const [newSession] = await db
      .insert(liveSessions)
      .values({
        id: sessionId,
        userId: session?.user?.id || null,
        sessionId: sessionId,
        language,
        educationLevel,
        subject,
        status: "connecting",
        startedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        sessionId: newSession.id,
        createdAt: newSession.createdAt,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// PATCH - Update session
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = updateSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { sessionId, status, endedAt, duration, messageCount, toolCallsCount } = validationResult.data;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (endedAt) updateData.endedAt = new Date(endedAt);
    if (duration !== undefined) updateData.duration = duration;
    if (messageCount !== undefined) updateData.messageCount = messageCount;
    if (toolCallsCount !== undefined) updateData.toolCallsCount = toolCallsCount;

    const [updatedSession] = await db
      .update(liveSessions)
      .set(updateData)
      .where(eq(liveSessions.id, sessionId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
  }
}

// GET - Get session history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const sessions = await db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.userId, session.user.id))
      .orderBy(desc(liveSessions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}
