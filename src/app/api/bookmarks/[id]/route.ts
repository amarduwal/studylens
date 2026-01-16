import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const bookmarkId = (await params).id;
    const body = await request.json();

    const { tags, notes, isPinned, sortOrder, folderName } = body;

    // Verify ownership
    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(
        session?.user?.id
          ? and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, session.user.id))
          : eq(bookmarks.id, bookmarkId)
      )
      .limit(1);

    if (!bookmark) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 }
      );
    }

    // Update bookmark
    const [updated] = await db
      .update(bookmarks)
      .set({
        tags: tags !== undefined ? tags : bookmark.tags,
        notes: notes !== undefined ? notes : bookmark.notes,
        isPinned: isPinned !== undefined ? isPinned : bookmark.isPinned,
        sortOrder: sortOrder !== undefined ? sortOrder : bookmark.sortOrder,
        folderName: folderName !== undefined ? folderName : bookmark.folderName,
        updatedAt: new Date(),
      })
      .where(eq(bookmarks.id, bookmarkId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Update bookmark error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update bookmark" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const bookmarkId = params.id;

    await db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.id, bookmarkId),
          eq(bookmarks.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
