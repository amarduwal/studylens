import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST - Update profile avatar
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { avatarUrl } = body;

    if (!avatarUrl) {
      return NextResponse.json(
        { success: false, error: "Avatar URL is required" },
        { status: 400 }
      );
    }

    // Update user avatar
    await db
      .update(users)
      .set({
        avatarUrl: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Profile image updated successfully",
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile image" },
      { status: 500 }
    );
  }
}

// DELETE - Remove profile avatar
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Remove user avatar
    await db
      .update(users)
      .set({
        avatarUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Profile image removed successfully",
    });
  } catch (error) {
    console.error("Delete avatar error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove profile image" },
      { status: 500 }
    );
  }
}
