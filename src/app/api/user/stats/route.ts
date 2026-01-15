import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

interface UserStats extends Record<string, unknown> {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  memberSince: string;
  total_scans: number;
  total_messages: number;
  total_bookmarks: number;
  total_practice_attempts: number;
  correct_answers: number;
  accuracy_percentage: number | null;
  current_streak: number;
  longest_streak: number;
  favorite_subject: string | null;
  most_active_hour: number | null;
}

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

    const result = await db.execute<UserStats>(sql`
      SELECT
        u.name,
        u.email,
        u.avatar_url AS "avatarUrl",
        u.created_at AS "memberSince",
        COALESCE(stats.total_scans, 0) AS total_scans,
        COALESCE(stats.total_messages, 0) AS total_messages,
        COALESCE(stats.total_bookmarks, 0) AS total_bookmarks,
        COALESCE(stats.total_practice_attempts, 0) AS total_practice_attempts,
        COALESCE(stats.correct_answers, 0) AS correct_answers,
        stats.accuracy_percentage,
        COALESCE(stats.current_streak, 0) AS current_streak,
        COALESCE(stats.longest_streak, 0) AS longest_streak,
        stats.favorite_subject,
        stats.most_active_hour
      FROM users u
      LEFT JOIN LATERAL fn_get_user_stats(${userId}::uuid) stats ON true
      WHERE u.id = ${userId}
    `);

    const data = result.rows[0];

    if (!data) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl,
          memberSince: data.memberSince,
        },
        stats: {
          totalScans: Number(data.total_scans),
          totalMessages: Number(data.total_messages),
          totalBookmarks: Number(data.total_bookmarks),
          totalPracticeAttempts: Number(data.total_practice_attempts),
          correctAnswers: Number(data.correct_answers),
          accuracyPercentage: data.accuracy_percentage ? Number(data.accuracy_percentage) : null,
          currentStreak: Number(data.current_streak),
          longestStreak: Number(data.longest_streak),
          favoriteSubject: data.favorite_subject,
          mostActiveHour: data.most_active_hour,
        },
      },
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
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
