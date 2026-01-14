import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scanId = searchParams.get("scanId");

    if (!scanId) {
      return NextResponse.json(
        { success: false, error: "scanId required" },
        { status: 400 }
      );
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scanId, scanId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: conversation || null,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}
