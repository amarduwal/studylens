import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// GET bookmarks
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Use the view for authenticated users
    // Non auth user are not allow to bookmark for now
    const result = await db.execute(sql`
        SELECT * FROM v_user_bookmarks
        WHERE user_id = ${userId}
        LIMIT ${limit} OFFSET ${offset}
      `);

    return NextResponse.json({
      success: true,
      data: result.rows.map((r) => ({
        id: r.scan_id,
        bookmarkId: r.bookmark_id,
        storageKey: r.storage_key,
        contentType: r.content_type,
        detectedLanguage: r.detected_language,
        extractedText: r.excerpt,
        imageUrl: r.original_filename,
        subject: r.subject_name,
        subjectIcon: r.subject_icon,
        subjectColor: r.subject_color,
        topic: r.topic_name,
        notes: r.notes,
        tags: r.tags,
        isPinned: r.is_pinned,
        sortOrder: r.sort_order,
        foldername: r.folder_name,
        isBookmarked: true,
        createdAt: r.scan_date,
        bookmarkedAt: r.bookmarked_at,
      })),
    }, {
      headers: { "Cache-Control": "private, max-age=10" },
    });
  } catch (error) {
    console.error("Fetch bookmarks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

// POST - Toggle bookmark
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { scanId } = await request.json();

    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          success: false, error: "Login required to bookmark. Please sign in.", code: "AUTH_REQUIRED"
        },
        { status: 401 }
      );
    }

    // Use the function for toggle
    const result = await db.execute(sql`
      SELECT fn_toggle_bookmark(${userId}::uuid, ${scanId}::uuid) AS is_bookmarked
    `);

    const isBookmarked = (result.rows[0])?.is_bookmarked;

    return NextResponse.json({
      success: true,
      data: { isBookmarked },
    });
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle bookmark" },
      { status: 500 }
    );
  }
}
