import { NextRequest, NextResponse } from "next/server";
import { simplifyExplanation } from "@/lib/gemini";
import { SupportedLanguage } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { explanation, targetAge, language } = await request.json();

    if (!explanation || !targetAge) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await simplifyExplanation(
      explanation,
      targetAge,
      language as SupportedLanguage || "en"
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Simplify error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to simplify explanation" },
      { status: 500 }
    );
  }
}
