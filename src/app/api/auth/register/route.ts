import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, userPreferences, subscriptions, pricingPlans, studyStreaks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        subscriptionTier: "free",
      })
      .returning();

    // Create preferences
    await db.insert(userPreferences).values({
      userId: newUser.id,
    }).onConflictDoNothing();

    // Create streak record
    await db.insert(studyStreaks).values({
      userId: newUser.id
    }).onConflictDoNothing();

    // Assign free plan
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

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
