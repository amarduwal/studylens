import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/gemini";
import { SupportedLanguage, AnalyzeResponse } from "@/types";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scans, dailyUsage, users, scanImages } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { findOrCreateSubject, findOrCreateTopic } from "@/lib/subjects-topics";

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

    const trackingUserId = session?.user?.id || null;

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

    // Generate scan ID
    const scanId = uuidv4();

    // Store in database
    const [newScan] = await db
      .insert(scans)
      .values({
        id: scanId,
        userId: trackingUserId,
        sessionId: sessionId || uuidv4(),
        subjectId,
        topicId,
        contentType: result.contentType || "other",
        difficulty: result.difficulty,
        extractedText: result.extractedText,
        extractedLatex: result.extractedLatex,
        detectedLanguage: result.detectedLanguage,
        explanation: result.explanation,
        explanationLanguage: language,
        targetEducationLevel: educationLevel ? educationLevel as "elementary" | "middle" | "high" | "undergraduate" | "graduate" | "professional" : undefined,
        processingTimeMs: processingTime,
        geminiModel: process.env.GOOGLE_AI_MODEL,
        status: "completed",
      })
      .returning();

    // Store image
    // Generate file hash for duplicate detection
    // const imageId = uuidv4();
    const imageBuffer = Buffer.from(image, 'base64');
    const fileHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

    // For now, store as base64 in storage_key (you can later upload to R2/S3)
    // const storageKey = `scans/${scanId}/${imageId}.${mimeType.split('/')[1]}`;

    await db.insert(scanImages).values({
      scanId: scanId,
      storageProvider: "local", // Change to "r2" or "s3" when you implement cloud storage
      storageKey: '/Screenshot-1.png', // Store path/key instead of base64, replace with cloud URL later
      originalFilename: filename || `scan-${Date.now()}.${mimeType.split('/')[1]}`,
      mimeType: mimeType,
      fileSize: imageSizeBytes,
      fileHash: fileHash,
      isProcessed: true,
      sortOrder: 0,
    });


    // Update user's scan count
    if (session?.user?.id) {
      await db
        .update(users)
        .set({
          totalScans: sql`${users.totalScans} + 1`,
          lastActiveAt: new Date(),
        })
        .where(eq(users.id, session.user.id));
    }

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const trackingSessionId = trackingUserId ? null : (sessionId || body.sessionId);
    const [existingUsage] = await db
      .select()
      .from(dailyUsage)
      .where(
        session?.user?.id
          ? and(
            eq(dailyUsage.userId, session.user.id),
            sql`DATE(${dailyUsage.usageDate}) = ${today}`
          )
          : and(
            eq(dailyUsage.sessionId, trackingSessionId || ""),
            sql`DATE(${dailyUsage.usageDate}) = ${today}`
          )
      )
      .limit(1);

    if (existingUsage) {
      await db
        .update(dailyUsage)
        .set({
          scanCount: sql`${dailyUsage.scanCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(dailyUsage.id, existingUsage.id));
    } else {
      await db.insert(dailyUsage).values({
        userId: trackingUserId,
        sessionId: trackingSessionId,
        scanCount: 1,
        messageCount: 0,
        practiceCount: 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: scanId,
      },
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
