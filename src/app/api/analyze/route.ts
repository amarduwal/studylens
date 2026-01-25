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
import { checkScanLimit, incrementGuestUsage } from "@/lib/usage";
import { deepSanitize, getValidEducationLevel, sanitizeExplanation } from "@/components/common/helper";

// Request validation schema
const analyzeSchema = z.object({
  images: z.array(z.string().min(1)).min(1).max(5),
  mimeTypes: z.array(z.string()).min(1).max(5),
  language: z.enum(["en", "hi", "ne", "es", "fr", "ar", "zh", "bn", "pt", "id"]).default("en"),
  educationLevel: z.string().optional(),
  sessionId: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  filenames: z.array(z.string()).optional(),
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

    const { images, mimeTypes, language, educationLevel, sessionId, deviceFingerprint, filenames } = validationResult.data;

    // Get IP address from request
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;


    const trackingUserId = session?.user?.id ? session.user.id : null;
    const trackingSessionId = sessionId || body.sessionId || null;

    // Check if user can upload multiple images (premium only)
    if (images.length > 1) {
      // Get user subscription tier from session
      const isPremium = session?.user?.subscriptionTier === 'premium';
      if (!trackingUserId || !isPremium) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "PREMIUM_REQUIRED",
              message: "Multiple image upload is a premium feature. Please upgrade.",
            },
          },
          { status: 403 }
        );
      }
    }

    const limitCheck = await checkScanLimit(
      trackingUserId,
      trackingSessionId || sessionId,
      deviceFingerprint,
      clientIp
    );

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

    // Check total size for all images
    const totalSize = images.reduce((sum, img) => sum + (img.length * 3) / 4, 0);
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB total for multiple images

    if (totalSize > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "IMAGE_TOO_LARGE",
            message: "Total images size exceeds 20MB limit. Please compress the images.",
          },
        },
        { status: 400 }
      );
    }

    // Analyze with Gemini
    const startTime = Date.now();
    let result;

    try {
      result = await analyzeImage(
        images.length === 1 ? images[0] : images,
        mimeTypes.length === 1 ? mimeTypes[0] : mimeTypes,
        language as SupportedLanguage
      );
    } catch (analysisError) {
      console.error("Primary analysis failed:", analysisError);

      // Return a more helpful error
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AI_ANALYSIS_ERROR",
            message: analysisError instanceof Error
              ? analysisError.message
              : "Failed to analyze the image. Please try with a clearer image.",
          },
        },
        { status: 500 }
      );
    }

    console.log("Analysis result received:", {
      contentType: result.contentType,
      subject: result.subject,
      topic: result.topic
    });

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

    // Deep sanitize the explanation before storing
    const sanitizedExplanation = deepSanitize(sanitizeExplanation(result.explanation));

    // Verify the explanation can be serialized
    try {
      JSON.stringify(sanitizedExplanation);
    } catch (serializeError) {
      console.error("Explanation serialization failed:", serializeError);
      throw new Error("Failed to process explanation data");
    }

    // Upload image to R2
    // Upload all images to R2
    let uploadResults;
    try {
      uploadResults = await Promise.all(
        images.map((image, index) =>
          uploadBase64Image(image, {
            originalFilename: filenames?.[index],
            mimeType: mimeTypes[index],
            folder: `scans/${trackingUserId || trackingSessionId}`,
            userId: trackingUserId || undefined,
            sessionId: trackingSessionId,
          })
        )
      );
    } catch (uploadError) {
      console.error("Error uploading images:", uploadError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UPLOAD_ERROR",
            message: "Failed to upload images. Please try again.",
          },
        },
        { status: 500 }
      );
    }

    // Generate scan ID
    const scanId = uuidv4();

    // Store scan in database
    // IMPORTANT: The trigger will automatically:
    // 1. Increment daily_usage (scan_count)
    // 2. Update user totals (total_scans, last_active_at)
    // 3. Update study streaks
    // Store scan in database with sanitized data
    try {
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
          extractedText: result.extractedText || "",
          extractedLatex: result.extractedLatex,
          detectedLanguage: result.detectedLanguage,
          explanation: sanitizedExplanation, // Use sanitized version
          processingTimeMs: processingTime,
          geminiModel: process.env.GOOGLE_AI_MODEL,
          explanationLanguage: result.explanationLanguage || language,
          targetEducationLevel: getValidEducationLevel(result.targetEducationLevel || educationLevel),
          tokenCount: result.tokenCount,
          deviceFingerprint: trackingUserId ? null : (deviceFingerprint || null),
          ipAddress: trackingUserId ? null : (clientIp || null),
          status: "completed",
        })
        .returning();

      console.log("Scan inserted successfully:", scanId);
    } catch (dbError) {
      console.error("Database insert error:", dbError);

      // Log more details
      if (dbError instanceof Error) {
        console.error("DB Error name:", dbError.name);
        console.error("DB Error message:", dbError.message);
      }

      // Try to provide a more specific error message
      let errorMessage = "Failed to save scan results.";
      if (dbError instanceof Error && dbError.message.includes("invalid input syntax")) {
        errorMessage = "Invalid data format. Please try again with a different image.";
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: errorMessage,
          },
        },
        { status: 500 }
      );
    }

    // Increment guest usage
    if (!trackingUserId) {
      await incrementGuestUsage(
        trackingSessionId || sessionId || scanId,
        deviceFingerprint,
        clientIp,
        userAgent
      );
    }

    // Save image reference
    // Save all image references
    try {
      await db.insert(scanImages).values(
        uploadResults.map((upload, index) => ({
          scanId: scanId,
          storageProvider: "r2" as const,
          storageKey: upload.publicUrl,
          originalFilename: filenames?.[index] || `scan-${Date.now()}-${index}.${mimeTypes[index].split('/')[1]}`,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
          fileHash: upload.fileHash,
          isProcessed: true,
          sortOrder: index,
        }))
      );
    } catch (imageDbError) {
      console.error("Error saving image references:", imageDbError);
      // Continue - scan was saved, just images weren't linked
    }


    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: scanId,
        imageUrls: uploadResults.map(r => r.publicUrl),
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
