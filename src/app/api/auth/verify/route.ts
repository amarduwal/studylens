import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email";

const verifySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, code } = validation.data;

    const result = await db.execute(
      sql`SELECT * FROM fn_verify_email_code(${userId}::uuid, ${code})`
    );

    const verifyResult = result.rows[0] as {
      success: boolean;
      error_message: string | null;
      verification_id: string | null;
    };

    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error_message },
        { status: 400 }
      );
    }

    // Send welcome email
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.email) {
      await sendWelcomeEmail(user.email, user.name || undefined);
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
