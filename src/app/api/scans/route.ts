import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scans, bookmarks, scanImages, subjects, topics } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const bookmarkedOnly = searchParams.get("bookmarked") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereClause;
    const userId = session?.user?.id;

    if (userId) {
      whereClause = eq(scans.userId, userId);
    } else if (sessionId) {
      whereClause = eq(scans.sessionId, sessionId);
    } else {
      return NextResponse.json({ success: true, data: [] });
    }

    // Query with bookmark status
    const results = await db
      .select({
        scan: scans,
        isBookmarked: sql<boolean>`CASE WHEN ${bookmarks.id} IS NOT NULL THEN true ELSE false END`,
        scanImage: scanImages,
        subject: subjects,
        topic: topics,
      })
      .from(scans)
      .leftJoin(
        bookmarks,
        and(
          eq(scans.id, bookmarks.scanId),
          userId ? eq(bookmarks.userId, userId) : sql`false`
        )
      )
      .leftJoin(scanImages, eq(scans.id, scanImages.scanId))
      .leftJoin(subjects, eq(scans.subjectId, subjects.id))
      .leftJoin(topics, eq(scans.topicId, topics.id))
      .where(
        bookmarkedOnly
          ? and(whereClause, sql`${bookmarks.id} IS NOT NULL`)
          : whereClause
      )
      .orderBy(desc(scans.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedResults = results.map(r => ({
      ...r.scan,
      isBookmarked: r.isBookmarked,
      imageUrl: r.scanImage?.storageKey || null,
      subject: r.subject?.name || null,
      topic: r.topic?.name || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error("Fetch scans error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const {
      sessionId,
      contentType,
      difficulty,
      extractedText,
      extractedLatex,
      detectedLanguage,
      explanation,
      explanationLanguage,
      targetEducationLevel,
      processingTimeMs,
      geminiModel,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID required" },
        { status: 400 }
      );
    }

    const [newScan] = await db
      .insert(scans)
      .values({
        userId: session?.user?.id || null,
        sessionId,
        contentType,
        difficulty,
        extractedText,
        extractedLatex,
        detectedLanguage,
        explanation,
        explanationLanguage,
        targetEducationLevel,
        processingTimeMs,
        geminiModel,
        status: "completed",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newScan,
    });
  } catch (error) {
    console.error("Create scan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create scan" },
      { status: 500 }
    );
  }
}
