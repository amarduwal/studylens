import { NextRequest, NextResponse } from "next/server";
import { generatePracticeProblems } from "@/lib/gemini";
import { SupportedLanguage } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { topic, difficulty, count, language } = await request.json();

    const problems = await generatePracticeProblems(
      topic,
      difficulty,
      count || 3,
      language as SupportedLanguage || "en"
    );

    return NextResponse.json({
      success: true,
      data: { problems },
    });
  } catch (error) {
    console.error("Practice problems error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate practice problems" },
      { status: 500 }
    );
  }
}
