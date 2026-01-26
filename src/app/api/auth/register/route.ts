// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, userPreferences, subscriptions, pricingPlans, emailVerificationCodes, tempEmailAttempts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { generateVerificationCode, getCodeExpiryTime, sendVerificationEmail } from "@/lib/email";
import { TempEmailDetector } from "@/lib/email/temp-email-detector";

const registerSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),

  email: z.string()
    .email("Invalid email address")
    .toLowerCase()
    .refine((email) => {
      // Basic format validation
      return email.includes('@') && email.includes('.');
    }, "Invalid email format"),

  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),

  // Optional: Add honeypot field for bots
  website: z.string().max(0).optional(), // Bots will fill this
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.issues[0].message,
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    const { name, email, password, website } = validation.data;

    // Honeypot check
    if (website && website.length > 0) {
      console.log('Bot detected via honeypot field');
      return NextResponse.json(
        { success: true, message: "Registration successful" }, // Fake success to confuse bots
        { status: 200 }
      );
    }

    // 1. Check for temporary email
    const tempCheck = await TempEmailDetector.isTemporaryEmail(email);

    // Log the attempt regardless of outcome
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.insert(tempEmailAttempts).values({
      email,
      domain: email.split('@')[1] || 'unknown',
      ipAddress: clientIp,
      userAgent,
      wasBlocked: tempCheck.isTemp,
      matchedRules: tempCheck.reason ? [tempCheck.reason] : [],
      detectedBy: 'self_hosted_detector',
    });

    if (tempCheck.isTemp) {
      // Increment hit count if domain is in blocked list
      if (tempCheck.confidence > 80) {
        const domainPart = email.split('@')[1];
        if (domainPart) {
          // Option A: Use raw SQL
          await db.execute(sql`
            UPDATE blocked_email_domains
            SET hit_count = hit_count + 1,
                updated_at = NOW()
            WHERE domain = ${domainPart}
          `);
        }
      }

      return NextResponse.json(
        {
          error: "Temporary or disposable email addresses are not allowed. Please use a permanent email address from providers like Gmail, Outlook, or Yahoo.",
          code: "TEMP_EMAIL_NOT_ALLOWED",
          suggestion: "Use a personal or work email address",
          confidence: tempCheck.confidence
        },
        { status: 403 }
      );
    }

    // 2. Rate limiting by IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttemptsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tempEmailAttempts)
      .where(
        sql`${tempEmailAttempts.ipAddress} = ${clientIp}
    AND ${tempEmailAttempts.createdAt} > ${oneHourAgo}`
      );

    const recentAttempts = recentAttemptsResult[0]?.count || 0;

    if (recentAttempts > 10) {
      return NextResponse.json(
        {
          error: "Too many registration attempts from your IP address. Please try again in an hour.",
          code: "RATE_LIMITED"
        },
        { status: 429 }
      );
    }

    // 3. Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "This email is already registered. Try logging in instead.",
          code: "EMAIL_EXISTS",
          suggestion: "Try logging in or use a different email"
        },
        { status: 400 }
      );
    }

    // 4. Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        subscriptionTier: "free",
      })
      .returning();

    // 5. Create related records
    await db.insert(userPreferences).values({
      userId: newUser.id,
    }).onConflictDoNothing();

    // 6. Assign free plan
    const freePlan = await db.query.pricingPlans.findFirst({
      where: eq(pricingPlans.slug, "free"),
    });

    if (freePlan) {
      await db.insert(subscriptions).values({
        userId: newUser.id,
        planId: freePlan.id,
        status: "active",
      }).onConflictDoNothing();
    }

    // 7. Generate verification code
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryTime(10);

    await db.insert(emailVerificationCodes).values({
      userId: newUser.id,
      email,
      code,
      expiresAt,
    });

    // 8. Send verification email
    const emailSent = await sendVerificationEmail(email, code, name);

    if (!emailSent) {
      // Mark for manual verification
      await db.update(users).set({
        emailVerified: null
      }).where(eq(users.id, newUser.id));

      return NextResponse.json({
        userId: newUser.id,
        success: true,
        warning: "Account created! Verification email failed. Please check spam folder or contact support.",
        requiresManualVerification: true,
      });
    }

    // 9. Success response
    return NextResponse.json({
      userId: newUser.id,
      success: true,
      message: "Account created successfully! Please check your email for verification.",
      nextStep: "verify-email",
    });

  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }

      if (error.message.includes("connection")) {
        return NextResponse.json(
          { error: "Database connection issue. Please try again." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
