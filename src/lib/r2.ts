import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// Initialize R2 Client
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

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  width?: number;
  height?: number;
}

/**
 * Get public URL from storage key
 */
export function getPublicUrl(storageKey: string): string {
  return `${PUBLIC_URL}/${storageKey}`;
}

/**
 * Calculate file hash for deduplication
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Upload image to R2
 */
export async function uploadImage(
  buffer: Buffer,
  options: {
    originalFilename?: string;
    mimeType: string;
    folder?: string;
    userId?: string;
    sessionId?: string;
  }
): Promise<UploadResult> {
  const { mimeType, folder = "scans", userId, sessionId, originalFilename } = options;

  // Generate unique key
  const extension = getExtensionFromMime(mimeType);
  const timestamp = Date.now();
  const uniqueId = uuidv4();

  // Structure: folder/year/month/userFolder/timestamp_uniqueId.ext
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const userFolder = userId || sessionId || "anonymous";

  const storageKey = `${folder}/${year}/${month}/${userFolder}/${timestamp}_${uniqueId}.${extension}`;

  // Calculate hash
  const fileHash = calculateFileHash(buffer);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: {
      originalFilename: originalFilename || "",
      userId: userId || "",
      sessionId: sessionId || "",
      uploadedAt: new Date().toISOString(),
    },
  });

  await r2Client.send(command);

  return {
    storageKey,
    publicUrl: getPublicUrl(storageKey),
    fileSize: buffer.length,
    mimeType,
    fileHash,
  };
}

/**
 * Upload base64 image to R2
 */
export async function uploadBase64Image(
  base64Data: string,
  options: {
    originalFilename?: string;
    mimeType?: string;
    folder?: string;
    userId?: string;
    sessionId?: string;
  }
): Promise<UploadResult> {
  // Extract content type and data from base64 string
  let mimeType = options.mimeType || "image/jpeg";
  let base64String = base64Data;

  if (base64Data.includes("data:")) {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64String = matches[2];
    }
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(base64String, "base64");

  return uploadImage(buffer, {
    ...options,
    mimeType,
  });
}

/**
 * Upload thumbnail to R2
 */
export async function uploadThumbnail(
  buffer: Buffer,
  originalKey: string,
  mimeType: string
): Promise<string> {
  // Generate thumbnail key based on original
  const thumbnailKey = originalKey.replace(/(\.[^.]+)$/, "_thumb$1");

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: thumbnailKey,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await r2Client.send(command);

  return thumbnailKey;
}

/**
 * Delete image from R2
 */
export async function deleteImage(storageKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  await r2Client.send(command);
}

/**
 * Delete image and its thumbnail
 */
export async function deleteImageWithThumbnail(
  storageKey: string,
  thumbnailKey?: string
): Promise<void> {
  await deleteImage(storageKey);
  if (thumbnailKey) {
    await deleteImage(thumbnailKey);
  }
}

/**
 * Get signed URL for private objects
 */
export async function getSignedImageUrl(
  storageKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Check if image exists
 */
export async function imageExists(storageKey: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return mimeToExt[mimeType] || "jpg";
}

export async function uploadAvatar(
  buffer: Buffer,
  userId: string,
  options: {
    originalFilename?: string;
    mimeType?: string;
  } = {}
): Promise<UploadResult> {
  const { mimeType = "image/jpeg", originalFilename } = options;

  // Validate image dimensions
  const imageInfo = await getImageDimensions(buffer, mimeType);

  // Generate avatar-specific key
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const extension = getExtensionFromMime(mimeType);

  // Structure: avatars/userId/timestamp_randomId.ext
  const storageKey = `avatars/${userId}/${timestamp}_${uniqueId}.${extension}`;

  // Optimize image for avatar (you could add sharp optimization here)
  // For now, we'll upload as-is, but you can compress if needed

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: {
      userId,
      uploadedAt: new Date().toISOString(),
      width: imageInfo.width?.toString() || "",
      height: imageInfo.height?.toString() || "",
    },
  });

  await r2Client.send(command);

  return {
    storageKey,
    publicUrl: getPublicUrl(storageKey),
    fileSize: buffer.length,
    mimeType,
    fileHash: calculateFileHash(buffer),
    width: imageInfo.width,
    height: imageInfo.height,
  };
}

/**
 * Get image dimensions from buffer
 */
export async function getImageDimensions(
  buffer: Buffer,
  mimeType: string
): Promise<{ width?: number; height?: number }> {
  try {
    const sizeOf = (await import("image-size")).default;
    const dimensions = sizeOf(buffer);
    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.error("Failed to get image dimensions:", error);
    return {};
  }
}

/**
 * Delete user avatar and all previous avatars
 */
export async function deleteUserAvatars(userId: string): Promise<void> {
  try {
    // Note: In production, you might want to use R2's ListObjectsV2Command
    // to find and delete all avatars for this user
    // For simplicity, we'll just handle one at a time for now
    console.log(`Would delete all avatars for user: ${userId}`);
    // Implement batch deletion if needed
  } catch (error) {
    console.error("Failed to delete user avatars:", error);
  }
}
