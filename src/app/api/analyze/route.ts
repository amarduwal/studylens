import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/gemini";
import { SupportedLanguage, AnalyzeResponse } from "@/types";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scans, scanImages } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import { findOrCreateSubject, findOrCreateTopic } from "@/lib/subjects-topics";
import { uploadBase64Image } from "@/lib/r2";
import { checkScanLimit } from "@/lib/usage";
import { getValidEducationLevel, sanitizeExplanation } from "@/components/common/helper";

// Request validation schema
const analyzeSchema = z.object({
  image: z.string().min(1, "Image is required"),
  mimeType: z.string().default("image/jpeg"),
  language: z.enum(["en", "hi", "ne", "es", "fr", "ar", "zh", "bn", "pt", "id"]).default("en"),
  educationLevel: z.string().optional(),
  sessionId: z.string().optional(),
  filename: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const session = await auth();
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

    const { image, mimeType, language, educationLevel, sessionId, filename } = validationResult.data;

    const trackingUserId = session?.user?.id ? session.user.id : null;
    const userSessionId = (sessionId || body.sessionId);
    const trackingSessionId = userSessionId ? userSessionId : null;

    const limitCheck = await checkScanLimit(trackingUserId, trackingSessionId || sessionId);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_EXCEEDED",
            message: limitCheck.message || "Daily scan limit reached.",
            remaining: 0,
            limit: limitCheck.limit,
            resetsAt: limitCheck.resetsAt.toISOString(),
          },
        },
        { status: 429 }
      );
    }

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
    const startTime = Date.now();
    const result = await analyzeImage(image, mimeType, language as SupportedLanguage);
    console.log(result);
    const processingTime = Date.now() - startTime;

    // Find or create subject and topic
    let subjectId = null;
    let topicId = null;

    if (result.subject) {
      subjectId = await findOrCreateSubject(result.subject);

      if (result.topic && subjectId) {
        topicId = await findOrCreateTopic(result.topic, subjectId);
      }
    }

    // Upload image to R2
    const uploadResult = await uploadBase64Image(image, {
      originalFilename: filename,
      mimeType,
      folder: `scans/${trackingUserId || trackingSessionId}`,
      userId: trackingUserId || undefined,
      sessionId: trackingSessionId,
    });

    // Generate scan ID
    const scanId = uuidv4();

    // Store scan in database
    // IMPORTANT: The trigger will automatically:
    // 1. Increment daily_usage (scan_count)
    // 2. Update user totals (total_scans, last_active_at)
    // 3. Update study streaks
    await db
      .insert(scans)
      .values({
        id: scanId,
        userId: trackingUserId || null,
        sessionId: trackingSessionId || uuidv4(),
        subjectId,
        topicId,
        contentType: result.contentType || "other",
        difficulty: result.difficulty,
        extractedText: result.extractedText,
        extractedLatex: result.extractedLatex,
        detectedLanguage: result.detectedLanguage,
        explanation: sanitizeExplanation(result.explanation),
        processingTimeMs: processingTime,
        geminiModel: process.env.GOOGLE_AI_MODEL,
        explanationLanguage: result.explanationLanguage || language,
        targetEducationLevel: getValidEducationLevel(result.targetEducationLevel || educationLevel),
        tokenCount: result.tokenCount,
        status: "completed",
      })
      .returning();

    // Save image reference
    await db.insert(scanImages).values({
      scanId: scanId,
      storageProvider: "r2",
      storageKey: uploadResult.publicUrl,
      originalFilename: filename || `scan-${Date.now()}.${mimeType.split('/')[1]}`,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.fileSize,
      fileHash: uploadResult.fileHash,
      isProcessed: true,
      sortOrder: 0,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: scanId,
        imageUrl: uploadResult.publicUrl,
        usage: {
          remaining: limitCheck.remaining - 1,
          limit: limitCheck.limit,
          resetsAt: limitCheck.resetsAt.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Analyze API error:", error);

    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

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
