import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsageStatus } from "@/lib/usage";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    const usage = await getUsageStatus(userId, sessionId);

    return NextResponse.json({
      success: true,
      data: usage,
      user: session?.user
        ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          subscriptionTier: session.user.subscriptionTier,
        }
        : null,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
