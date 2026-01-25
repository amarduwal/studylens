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
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const offset = (page - 1) * pageSize;
    const limit = pageSize;


    let whereClause;
    const userId = session?.user?.id;

    if (userId) {
      whereClause = eq(scans.userId, userId);
    } else if (sessionId) {
      whereClause = eq(scans.sessionId, sessionId);
    } else {
      return NextResponse.json({ success: true, data: [], pagination: { page: 1, pageSize, total: 0, totalPages: 0 } });
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scans)
      .leftJoin(
        bookmarks,
        and(
          eq(scans.id, bookmarks.scanId),
          userId ? eq(bookmarks.userId, userId) : sql`false`
        )
      )
      .where(
        bookmarkedOnly
          ? and(whereClause, sql`${bookmarks.id} IS NOT NULL`)
          : whereClause
      );

    const total = Number(countResult.count);
    const totalPages = Math.ceil(total / pageSize);

    // Query with bookmark status
    const results = await db
      .select({
        scan: scans,
        isBookmarked: sql<boolean>`CASE WHEN ${bookmarks.id} IS NOT NULL THEN true ELSE false END`,
        imageUrls: sql<string[]>`COALESCE(
          array_agg(${scanImages.storageKey} ORDER BY ${scanImages.sortOrder})
          FILTER (WHERE ${scanImages.storageKey} IS NOT NULL),
          ARRAY[]::text[]
        )`,
        storageKeys: sql<string[]>`COALESCE(
          array_agg(${scanImages.storageKey} ORDER BY ${scanImages.sortOrder})
          FILTER (WHERE ${scanImages.storageKey} IS NOT NULL),
          ARRAY[]::text[]
        )`,
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
      .groupBy(scans.id, bookmarks.id, subjects.id, topics.id)

      .orderBy(desc(scans.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedResults = results.map(r => ({
      ...r.scan,
      isBookmarked: r.isBookmarked,
      imageUrls: r.imageUrls,
      storageKey: r.storageKeys,
      subject: r.subject?.name || null,
      topic: r.topic?.name || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
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
