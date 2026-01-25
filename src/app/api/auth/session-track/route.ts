import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getGeoFromIP } from "@/lib/geo";

function parseUserAgent(ua: string | null): {
  deviceType: string;
  browser: string;
  os: string;
} {
  if (!ua) return { deviceType: "unknown", browser: "unknown", os: "unknown" };

  let deviceType = "desktop";
  if (/mobile/i.test(ua)) deviceType = "mobile";
  else if (/tablet|ipad/i.test(ua)) deviceType = "tablet";

  let browser = "unknown";
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edge/i.test(ua)) browser = "Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";

  let os = "unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

  return { deviceType, browser, os };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const userId = session.user.id;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const { country, city } = await getGeoFromIP(ipAddress);
    const userAgent = request.headers.get("user-agent") || null;
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Check for existing valid session with same device characteristics
    const [existingSession] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.deviceType, deviceType),
          eq(sessions.browser, browser),
          eq(sessions.os, os),
          eq(sessions.isValid, true),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existingSession) {
      // Update existing session
      await db
        .update(sessions)
        .set({
          lastAccessedAt: new Date(),
          ipAddress: ipAddress || existingSession.ipAddress,
          country: country || existingSession.country,
          city: city || existingSession.city,
        })
        .where(eq(sessions.id, existingSession.id));

      return NextResponse.json({
        success: true,
        sessionToken: existingSession.sessionToken,
        existing: true
      });
    }

    // Create new session
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      deviceType,
      browser,
      os,
      country,
      city,
      isValid: true,
      expiresAt,
    });

    return NextResponse.json({ success: true, sessionToken, existing: false });
  } catch (error) {
    console.error("Session track error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
