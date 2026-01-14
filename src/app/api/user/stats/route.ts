import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scans, bookmarks, studyStreaks, users } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Get scan count
    const [scanStats] = await db
      .select({
        totalScans: count(scans.id),
      })
      .from(scans)
      .where(eq(scans.userId, userId));

    // Get bookmark count
    const [bookmarkStats] = await db
      .select({
        totalBookmarks: count(bookmarks.id),
      })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));

    // Get streak data
    const [streakData] = await db
      .select()
      .from(studyStreaks)
      .where(eq(studyStreaks.userId, userId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: user?.name,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
          preferredLanguage: user?.preferredLanguageId,
        },
        stats: {
          totalScans: scanStats?.totalScans || 0,
          totalBookmarks: bookmarkStats?.totalBookmarks || 0,
          currentStreak: streakData?.currentStreak || 0,
          longestStreak: streakData?.longestStreak || 0,
        },
      },
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
