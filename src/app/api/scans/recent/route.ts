import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "10");

    const userId = session?.user?.id;

    if (!userId && !sessionId) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Query the view
    const results = await db.execute(sql`
      SELECT *
      FROM v_recent_scans
      WHERE ${userId
        ? sql`user_id = ${userId}`
        : sql`session_id = ${sessionId}`
      }
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    const recentScans = results.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      contentType: row.content_type,
      difficulty: row.difficulty,
      extractedText: row.extracted_text,
      simpleAnswer: row.simple_answer, // New field
      explanationLanguage: row.explanation_language,
      processingTimeMs: row.processing_time_ms,
      status: row.status,
      createdAt: row.created_at,
      subject: row.subject_name,
      subjectIcon: row.subject_icon,
      topic: row.topic_name,
      // Generate full R2 URL
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_key,
      userRating: row.user_rating,
      isBookmarked: row.is_bookmarked, // Comes from view
      messageCount: row.message_count, // New field
    }));

    return NextResponse.json({
      success: true,
      data: recentScans,
    });
  } catch (error) {
    console.error("Fetch recent scans error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recent scans" },
      { status: 500 }
    );
  }
}
