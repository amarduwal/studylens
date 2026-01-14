import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailVerificationCodes } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { z } from "zod";
import { generateVerificationCode, getCodeExpiryTime, sendVerificationEmail } from "@/lib/email";

const resendSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, userId } = validation.data;

    // Find user
    let user;
    if (userId) {
      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    } else if (email) {
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Check rate limiting - last code sent within 1 minute
    const recentCode = await db.query.emailVerificationCodes.findFirst({
      where: and(
        eq(emailVerificationCodes.userId, user.id),
        gt(emailVerificationCodes.createdAt, new Date(Date.now() - 60 * 1000))
      ),
      orderBy: [desc(emailVerificationCodes.createdAt)],
    });

    if (recentCode) {
      const waitTime = Math.ceil(
        (new Date(recentCode.createdAt).getTime() + 60000 - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: `Please wait ${waitTime} seconds before requesting a new code` },
        { status: 429 }
      );
    }

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryTime(10);

    await db.insert(emailVerificationCodes).values({
      userId: user.id,
      email: user.email!,
      code,
      expiresAt,
    });

    // Send email
    const emailSent = await sendVerificationEmail(user.email!, code, user.name || undefined);

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent",
      userId: user.id,
    });
  } catch (error) {
    console.error("Resend code error:", error);
    return NextResponse.json(
      { error: "Failed to resend code" },
      { status: 500 }
    );
  }
}
