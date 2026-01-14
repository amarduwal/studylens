import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookmarks, scanImages, scans, subjects, topics } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET bookmarks
export async function GET(request: NextRequest) {
  try {
    console.log("Called");
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereClause;

    if (session?.user?.id) {
      whereClause = eq(bookmarks.userId, session.user.id);
    } else if (sessionId) {
      // For guests, we need to join with scans to check sessionId
      const results = await db
        .select({
          bookmark: bookmarks,
          scan: scans,
          scanImage: scanImages,
          subject: subjects,
          topic: topics,
        })
        .from(bookmarks)
        .innerJoin(scans, eq(bookmarks.scanId, scans.id))
        .leftJoin(scanImages, eq(scans.id, scanImages.scanId))
        .leftJoin(subjects, eq(scans.subjectId, subjects.id))
        .leftJoin(topics, eq(scans.topicId, topics.id))
        .where(eq(scans.sessionId, sessionId))
        .limit(limit)
        .offset(offset);

      return NextResponse.json({
        success: true,
        data: results.map(r => ({
          ...r.scan,
          imageUrl: r.scanImage?.storageKey || null,
          isBookmarked: true,
          subject: r.subject?.name || null,
          topic: r.topic?.name || null,
        })),
      });
    } else {
      return NextResponse.json({ success: true, data: [] });
    }

    // For authenticated users
    const results = await db
      .select({
        scan: scans,
        bookmark: bookmarks,
        scanImage: scanImages,
      })
      .from(bookmarks)
      .innerJoin(scans, eq(bookmarks.scanId, scans.id))
      .leftJoin(scanImages, eq(scans.id, scanImages.scanId))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: results.map(r => ({
        ...r.scan,
        imageUrl: r.scanImage?.storageKey || null, // Map storage key to imageUrl
        isBookmarked: true,
      })),
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
    const { scanId, sessionId } = await request.json();

    // Verify scan exists and get userId
    const [scan] = await db
      .select()
      .from(scans)
      .where(eq(scans.id, scanId))
      .limit(1);

    if (!scan) {
      return NextResponse.json(
        { success: false, error: "Scan not found" },
        { status: 404 }
      );
    }

    // Determine userId (authenticated or from scan)
    const userId = session?.user?.id || scan.userId;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if bookmark exists
    const [existingBookmark] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          userId ? eq(bookmarks.userId, userId) : undefined,
          eq(bookmarks.scanId, scanId)
        )
      )
      .limit(1);

    if (existingBookmark) {
      // Remove bookmark
      await db
        .delete(bookmarks)
        .where(eq(bookmarks.id, existingBookmark.id));

      return NextResponse.json({
        success: true,
        data: { isBookmarked: false },
      });
    } else {
      // Add bookmark
      if (!userId) {
        return NextResponse.json(
          { success: false, error: "User ID required for bookmarking" },
          { status: 400 }
        );
      }

      const [newBookmark] = await db
        .insert(bookmarks)
        .values({
          userId,
          scanId,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: { isBookmarked: true, bookmark: newBookmark },
      });
    }
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle bookmark" },
      { status: 500 }
    );
  }
}
