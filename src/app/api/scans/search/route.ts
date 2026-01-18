import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const sessionId = searchParams.get("sessionId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const offset = (page - 1) * pageSize;
    const userId = session?.user?.id;

    if (!query || (!userId && !sessionId)) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0, hasMore: false }
      });
    }

    // For authenticated users, use the function
    if (userId) {
      const results = await db.execute(sql`
        SELECT * FROM fn_search_scans(
          ${userId}::UUID,
          ${query}::TEXT,
          ${pageSize}::INTEGER,
          ${offset}::INTEGER
        )
      `);

      const formattedResult = results.rows.map((row) => ({
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
        data: formattedResult,
        pagination: {
          page,
          pageSize,
          total: results.rows.length,
          totalPages: Math.ceil(results.rows.length / pageSize),
          hasMore: results.rows.length === pageSize,
        },
      });
    }

    // For guests, simple search on session_id
    const results = await db.execute(sql`
      SELECT
        s.id as scan_id,
        s.user_id,
        s.session_id,
        s.content_type,
        s.subject_id,
        s.topic_id,
        s.difficulty,
        s.extracted_text,
        s.extracted_latex,
        s.detected_language,
        s.explanation,
        s.explanation_language,
        s.target_education_level,
        s.processing_time_ms,
        s.gemini_model,
        s.token_count,
        s.status,
        s.error_message,
        s.created_at,
        s.updated_at,

        sub.name as subject_name,
        t.name as topic_name,
        si.storage_key as image_url,
        si.thumbnail_key as thumbnail_url,
        false as is_bookmarked,
        NULL::UUID as bookmark_id,
        NULL::TEXT[] as bookmark_tags,
        NULL::TEXT as bookmark_notes,
        false as bookmark_is_pinned,
        NULL::VARCHAR as bookmark_folder_name,

        s.explanation->>'simple_answer' as simple_answer,
        1.0 as relevance
      FROM scans s
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN topics t ON s.topic_id = t.id
      LEFT JOIN scan_images si ON s.id = si.scan_id AND si.sort_order = 0
      WHERE s.session_id = ${sessionId}
      AND (
        s.extracted_text ILIKE ${`%${query}%`}
        OR s.explanation::TEXT ILIKE ${`%${query}%`}
        OR sub.name ILIKE ${`%${query}%`}
        OR t.name ILIKE ${`%${query}%`}
      )
      ORDER BY s.created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);
    return NextResponse.json({
      success: true,
      data: results.rows,
      pagination: {
        page,
        pageSize,
        total: results.rows.length,
        totalPages: Math.ceil(results.rows.length / pageSize),
        hasMore: results.rows.length === pageSize,
      },
    });
  } catch (error) {
    console.error("Search scans error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search scans" },
      { status: 500 }
    );
  }
}
