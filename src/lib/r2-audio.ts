// This file should ONLY be imported from server-side code (API routes, server components)
// DO NOT import from client components

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// Lazy initialization to avoid issues when imported incorrectly
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 credentials not configured. This module can only be used on the server.");
    }

    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _r2Client;
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export interface AudioUploadResult {
  key: string;
  url: string;
  size: number;
}

/**
 * Upload audio buffer to R2 storage (SERVER-SIDE ONLY)
 */
export async function uploadAudioToR2(
  audioBuffer: Buffer,
  sessionId: string,
  messageId: string,
  format: "mp3" | "wav" | "opus" | "pcm" = "wav"
): Promise<AudioUploadResult> {
  const r2Client = getR2Client();

  const timestamp = Date.now();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const uniqueId = uuidv4();

  const key = `voice-sessions/${year}/${month}/${sessionId}/${messageId}-${timestamp}-${uniqueId}.${format}`;

  const contentType: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    opus: "audio/opus",
    pcm: "audio/pcm",
  };

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: contentType[format],
      CacheControl: "public, max-age=31536000",
      Metadata: {
        sessionId,
        messageId,
        createdAt: new Date().toISOString(),
      },
    })
  );

  const url = `${PUBLIC_URL}/${key}`;

  return { key, url, size: audioBuffer.length };
}

/**
 * Delete audio from R2 (SERVER-SIDE ONLY)
 */
export async function deleteAudioFromR2(key: string): Promise<void> {
  try {
    const r2Client = getR2Client();
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error("Failed to delete audio from R2:", error);
  }
}

/**
 * Generate signed URL for private bucket access (SERVER-SIDE ONLY)
 */
export async function getSignedAudioUrl(
  key: string,
  expiresIn: number = 7200
): Promise<string> {
  const r2Client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Estimate audio duration from buffer size
 */
export function estimateAudioDuration(
  bufferSizeBytes: number,
  sampleRate: number = 24000,
  bitsPerSample: number = 16,
  channels: number = 1
): number {
  const bytesPerSecond = (sampleRate * bitsPerSample * channels) / 8;
  return bufferSizeBytes / bytesPerSecond;
}
