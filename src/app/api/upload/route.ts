import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadBase64Image } from "@/lib/r2";
import { db } from "@/db";
import { scanImages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const { image, mimeType, scanId, sessionId, originalFilename } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image is required" },
        { status: 400 }
      );
    }

    // Upload to R2
    const result = await uploadBase64Image(image, {
      mimeType,
      folder: "scans",
      userId: session?.user?.id,
      sessionId,
      originalFilename,
    });

    // Check for duplicate by hash
    if (scanId) {
      const existing = await db.query.scanImages.findFirst({
        where: eq(scanImages.fileHash, result.fileHash),
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          data: {
            id: existing.id,
            storageKey: existing.storageKey,
            publicUrl: result.publicUrl,
            isExisting: true,
          },
        });
      }

      // Save to database
      const [savedImage] = await db
        .insert(scanImages)
        .values({
          scanId,
          storageKey: result.storageKey,
          originalFilename,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
          fileHash: result.fileHash,
          isProcessed: true,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: {
          id: savedImage.id,
          storageKey: savedImage.storageKey,
          publicUrl: result.publicUrl,
        },
      });
    }

    // Return without saving if no scanId
    return NextResponse.json({
      success: true,
      data: {
        storageKey: result.storageKey,
        publicUrl: result.publicUrl,
        fileSize: result.fileSize,
        fileHash: result.fileHash,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
