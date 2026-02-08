import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET - Get configuration for live session
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user has access (you can add premium checks here)
    const hasAccess = true; // For MVP, allow all users

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Live tutoring requires a premium subscription" },
        { status: 403 }
      );
    }

    // Return the API key for client-side use
    // In production, you might want to use a more secure approach
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        apiKey,
        model: "gemini-2.0-flash-live-001",
        maxDuration: session?.user ? 30 * 60 : 10 * 60, // 30 min for logged in, 10 for guests
        features: {
          voiceEnabled: true,
          videoEnabled: true,
          screenShareEnabled: true,
          toolsEnabled: true,
        },
      },
    });
  } catch (error) {
    console.error("Get config error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get configuration" },
      { status: 500 }
    );
  }
}
