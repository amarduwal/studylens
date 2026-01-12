import { NextRequest, NextResponse } from "next/server";
import { handleFollowUp } from "@/lib/gemini";
import { SupportedLanguage, FollowUpResponse, ConversationMessage } from "@/types";
import { z } from "zod";
import { nanoid } from "nanoid";

const followUpSchema = z.object({
  scanId: z.string().min(1),
  question: z.string().min(1, "Question is required"),
  originalContext: z.string().min(1, "Context is required"),
  conversationHistory: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().or(z.date()),
    })
  ).default([]),
  language: z.enum(["en", "hi", "ne", "es", "fr", "ar", "zh", "bn", "pt", "id"]).default("en"),
});

export async function POST(request: NextRequest): Promise<NextResponse<FollowUpResponse>> {
  try {
    const body = await request.json();

    const validationResult = followUpSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationResult.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { question, originalContext, conversationHistory, language } = validationResult.data;

    // Convert to proper ConversationMessage format
    const history: ConversationMessage[] = conversationHistory.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    // Get response from Gemini
    const answer = await handleFollowUp(
      originalContext,
      question,
      history,
      language as SupportedLanguage
    );

    return NextResponse.json({
      success: true,
      data: {
        answer,
        messageId: nanoid(),
      },
    });
  } catch (error) {
    console.error("Follow-up API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_ERROR",
          message: error instanceof Error ? error.message : "Failed to process question",
        },
      },
      { status: 500 }
    );
  }
}
