import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { liveSessionMessages, liveSessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// Threshold for multipart upload (5MB)
const MULTIPART_THRESHOLD = 5 * 1024 * 1024;
// Minimum part size for multipart (5MB - R2 requirement)
const MIN_PART_SIZE = 5 * 1024 * 1024;

/**
 * Upload large file using multipart upload
 */
async function uploadLargeFile(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata: Record<string, string>
): Promise<void> {
  console.log(`🚀 Starting multipart upload for ${(buffer.length / 1024 / 1024).toFixed(2)}MB file`);

  // Create multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
    Metadata: metadata,
  });

  const { UploadId } = await r2Client.send(createCommand);

  if (!UploadId) {
    throw new Error("Failed to create multipart upload");
  }

  const parts: { ETag: string; PartNumber: number }[] = [];

  try {
    // Calculate part size (minimum 5MB, or divide into ~10 parts for very large files)
    const partSize = Math.max(MIN_PART_SIZE, Math.ceil(buffer.length / 10));
    const numParts = Math.ceil(buffer.length / partSize);

    console.log(`📦 Uploading ${numParts} parts of ${(partSize / 1024 / 1024).toFixed(2)}MB each`);

    for (let i = 0; i < numParts; i++) {
      const start = i * partSize;
      const end = Math.min(start + partSize, buffer.length);
      const partBuffer = buffer.slice(start, end);
      const partNumber = i + 1;

      console.log(`  📤 Part ${partNumber}/${numParts}: ${(partBuffer.length / 1024).toFixed(0)}KB`);

      const uploadPartCommand = new UploadPartCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId,
        PartNumber: partNumber,
        Body: partBuffer,
      });

      const { ETag } = await r2Client.send(uploadPartCommand);

      if (!ETag) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      parts.push({ ETag, PartNumber: partNumber });
    }

    // Complete the multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts },
    });

    await r2Client.send(completeCommand);
    console.log(`✅ Multipart upload completed: ${key}`);

  } catch (error) {
    // Abort on failure
    console.error("❌ Multipart upload failed, aborting:", error);

    try {
      await r2Client.send(new AbortMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId,
      }));
    } catch (abortError) {
      console.error("Failed to abort multipart upload:", abortError);
    }

    throw error;
  }
}

/**
 * Upload small file using simple PUT
 */
async function uploadSmallFile(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata: Record<string, string>
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
    Metadata: metadata,
  });

  await r2Client.send(command);
  console.log(`✅ Audio uploaded to R2: ${key}`);
}

/**
 * POST - Upload audio and create message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: sessionId } = await params;

    // Verify session exists
    const [session] = await db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const content = (formData.get("content") as string) || "[Audio response]";
    const role = (formData.get("role") as string) || "assistant";
    const durationStr = formData.get("duration") as string;
    const metadataStr = formData.get("metadata") as string;

    let metadata: Record<string, unknown> = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        // Ignore parse errors
      }
    }

    let audioUrl: string | null = null;
    let audioKey: string | null = null;
    let duration: number | null = durationStr ? parseFloat(durationStr) : null;

    // Upload audio if provided
    if (audioFile && audioFile.size > 0) {
      const fileSize = audioFile.size;
      console.log(`📥 Received audio file: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      const buffer = Buffer.from(await audioFile.arrayBuffer());

      // Generate storage key
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      audioKey = `voice-sessions/${year}/${month}/${sessionId}/${timestamp}_${uniqueId}.wav`;

      const uploadMetadata = {
        sessionId,
        duration: duration?.toString() || "",
        uploadedAt: new Date().toISOString(),
        originalSize: fileSize.toString(),
      };

      // Choose upload method based on file size
      if (fileSize > MULTIPART_THRESHOLD) {
        console.log(`📦 Using multipart upload for large file`);
        await uploadLargeFile(buffer, audioKey, "audio/wav", uploadMetadata);
      } else {
        await uploadSmallFile(buffer, audioKey, "audio/wav", uploadMetadata);
      }

      audioUrl = `${PUBLIC_URL}/${audioKey}`;

      // Calculate duration from WAV data
      const audioDataSize = buffer.length - 44; // WAV header is 44 bytes
      const sampleRate = 24000;
      const bytesPerSample = 2; // 16-bit
      const channels = 1;
      duration = audioDataSize / (sampleRate * bytesPerSample * channels);

      metadata = {
        ...metadata,
        audioSize: buffer.length,
        format: "wav",
        sampleRate,
        uploadTimeMs: Date.now() - startTime,
      };

      console.log(`⏱️ Audio duration: ${duration.toFixed(2)}s, Upload took: ${Date.now() - startTime}ms`);
    }

    // Create message in database
    const [message] = await db
      .insert(liveSessionMessages)
      .values({
        sessionId,
        role,
        type: audioUrl ? "audio" : "text",
        content,
        audioUrl,
        audioKey,
        duration: duration?.toString() || null,
        metadata,
      })
      .returning();

    // Update session message count
    await db
      .update(liveSessions)
      .set({
        messageCount: sql`COALESCE(${liveSessions.messageCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(liveSessions.id, sessionId));

    console.log(`✅ Message saved: ${message.id}, Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        duration: duration,
      },
    });
  } catch (error) {
    console.error("❌ Failed to upload audio:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload audio",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
export const fetchCache = 'force-no-store';
