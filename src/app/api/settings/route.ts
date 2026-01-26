import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, userPreferences, languages } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - Load settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        preferences: true,
        preferredLanguage: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          name: user.name || "",
          avatarUrl: user.avatarUrl || "",
          username: user.username || "",
          bio: user.bio || "",
          dateOfBirth: user.dateOfBirth || "",
          theme: user.theme || "system",
          educationLevel: user.educationLevel || "high",
        },
        preferences: user.preferences || {
          emailNotifications: true,
          pushNotifications: true,
          streakReminders: true,
          weeklySummary: true,
          marketingEmails: false,
          defaultDifficulty: "medium",
          showLatex: true,
          showStepNumbers: true,
          compactView: false,
          fontSize: "medium",
          highContrast: false,
          reduceAnimations: false,
          profilePublic: false,
          showStreakPublic: false,
        },
        languageCode: user.preferredLanguage?.code || "en",
      },
    });
  } catch (error) {
    console.error("Load settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { profile, preferences, languageCode } = body;
    const userId = session.user.id;

    // Get language ID
    let languageId = null;
    if (languageCode) {
      const lang = await db.query.languages.findFirst({
        where: eq(languages.code, languageCode),
        columns: { id: true }
      });
      languageId = lang?.id || null;
    }

    // Update user profile
    if (profile) {
      await db
        .update(users)
        .set({
          name: profile.name,
          username: profile.username || null,
          bio: profile.bio || null,
          dateOfBirth: profile.dateOfBirth || null,
          theme: profile.theme,
          educationLevel: profile.educationLevel,
          preferredLanguageId: languageId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Update preferences
    if (preferences) {
      await db
        .update(userPreferences)
        .set({
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          streakReminders: preferences.streakReminders,
          weeklySummary: preferences.weeklySummary,
          marketingEmails: preferences.marketingEmails,
          defaultDifficulty: preferences.defaultDifficulty,
          showLatex: preferences.showLatex,
          showStepNumbers: preferences.showStepNumbers,
          compactView: preferences.compactView,
          fontSize: preferences.fontSize,
          highContrast: preferences.highContrast,
          reduceAnimations: preferences.reduceAnimations,
          profilePublic: preferences.profilePublic,
          showStreakPublic: preferences.showStreakPublic,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
