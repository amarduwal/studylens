import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scans, bookmarks, scanImages } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET single scan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const scanId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    const userId = session?.user?.id;

    // Query with bookmark and image info
    const [result] = await db
      .select({
        scan: scans,
        isBookmarked: sql<boolean>`CASE WHEN ${bookmarks.id} IS NOT NULL THEN true ELSE false END`,
        scanImage: scanImages,
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
      .where(
        and(
          eq(scans.id, scanId),
          userId
            ? eq(scans.userId, userId)
            : sessionId
              ? eq(scans.sessionId, sessionId)
              : sql`false`
        )
      )
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Scan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.scan,
        isBookmarked: result.isBookmarked,
        imageUrl: result.scanImage?.storageKey || null,
      },
    });
  } catch (error) {
    console.error("Fetch scan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scan" },
      { status: 500 }
    );
  }
}

// PATCH - Update scan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const scanId = params.id;
    const body = await request.json();

    // Verify ownership
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

    // Update allowed fields
    const [updated] = await db
      .update(scans)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(scans.id, scanId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update scan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update scan" },
      { status: 500 }
    );
  }
}

// DELETE - Delete scan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const scanId = params.id;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify ownership and delete
    const [deleted] = await db
      .delete(scans)
      .where(
        and(
          eq(scans.id, scanId),
          eq(scans.userId, session.user.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Scan not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scan deleted successfully",
    });
  } catch (error) {
    console.error("Delete scan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete scan" },
      { status: 500 }
    );
  }
}
