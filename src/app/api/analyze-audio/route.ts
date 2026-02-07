import { NextRequest, NextResponse } from "next/server";
import { analyzeAudioResponse } from "@/lib/analyze-audio";
import { SupportedLanguage } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      responseText,
      language = "en",
      subject,
      userQuestion
    } = body;

    if (!responseText || typeof responseText !== "string") {
      return NextResponse.json(
        { success: false, error: "responseText is required" },
        { status: 400 }
      );
    }

    // Skip very short responses
    if (responseText.length < 20) {
      return NextResponse.json(
        { success: false, error: "Response too short to analyze" },
        { status: 400 }
      );
    }

    const result = await analyzeAudioResponse(responseText, {
      language: language as SupportedLanguage,
      subject,
      userQuestion,
    });

    return NextResponse.json({ success: true, analysis: result });
  } catch (error) {
    console.error("Audio analysis failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed"
      },
      { status: 500 }
    );
  }
}
