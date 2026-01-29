import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { liveSessionMessages, liveSessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Use the same R2 client as image uploads
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

/**
 * POST - Upload audio and create message
 * Accepts multipart form data with audio file
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const content = formData.get("content") as string || "[Audio response]";
    const role = formData.get("role") as string || "assistant";
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
    let duration: number | null = null;

    // Upload audio if provided
    if (audioFile && audioFile.size > 0) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());

      // Generate storage key
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      audioKey = `voice-sessions/${year}/${month}/${sessionId}/${timestamp}_${uniqueId}.wav`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: audioKey,
        Body: buffer,
        ContentType: "audio/wav",
        CacheControl: "public, max-age=31536000",
        Metadata: {
          sessionId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await r2Client.send(command);

      audioUrl = `${PUBLIC_URL}/${audioKey}`;

      // Calculate duration (16-bit PCM at 24kHz)
      // WAV header is 44 bytes, rest is audio data
      const audioDataSize = buffer.length - 44;
      const sampleRate = 24000;
      const bytesPerSample = 2; // 16-bit
      const channels = 1;
      duration = audioDataSize / (sampleRate * bytesPerSample * channels);

      metadata = {
        ...metadata,
        audioSize: buffer.length,
        format: "wav",
        sampleRate,
      };
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

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        duration: duration,
      },
    });
  } catch (error) {
    console.error("Failed to upload audio:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload audio" },
      { status: 500 }
    );
  }
}
