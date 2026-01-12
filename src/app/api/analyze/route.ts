import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/gemini";
import { SupportedLanguage, AnalyzeResponse } from "@/types";
import { z } from "zod";

// Request validation schema
const analyzeSchema = z.object({
  image: z.string().min(1, "Image is required"),
  mimeType: z.string().default("image/jpeg"),
  language: z.enum(["en", "hi", "ne", "es", "fr", "ar", "zh", "bn", "pt", "id"]).default("en"),
  educationLevel: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const body = await request.json();

    // Validate request
    const validationResult = analyzeSchema.safeParse(body);
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

    const { image, mimeType, language } = validationResult.data;

    // Check if image is too large (base64 encoded)
    const imageSizeBytes = (image.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (imageSizeBytes > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "IMAGE_TOO_LARGE",
            message: "Image size exceeds 10MB limit. Please compress the image.",
          },
        },
        { status: 400 }
      );
    }

    // Analyze with Gemini
    const result = await analyzeImage(image, mimeType, language as SupportedLanguage);

    // TODO: Store in database
    // TODO: Update user's scan count

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Analyze API error:", error);

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
