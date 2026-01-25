import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface SessionInfo {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function parseUserAgent(ua: string | null): {
  deviceType: string;
  browser: string;
  os: string;
} {
  if (!ua) return { deviceType: "unknown", browser: "unknown", os: "unknown" };

  // Device type
  let deviceType = "desktop";
  if (/mobile/i.test(ua)) deviceType = "mobile";
  else if (/tablet|ipad/i.test(ua)) deviceType = "tablet";

  // Browser
  let browser = "unknown";
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edge/i.test(ua)) browser = "Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";

  // OS
  let os = "unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

  return { deviceType, browser, os };
}

export async function createSession(info: SessionInfo): Promise<string> {
  const sessionToken = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const { deviceType, browser, os } = parseUserAgent(info.userAgent || null);

  await db.insert(sessions).values({
    userId: info.userId,
    sessionToken,
    ipAddress: info.ipAddress || null,
    userAgent: info.userAgent || null,
    deviceType,
    browser,
    os,
    isValid: true,
    expiresAt,
  });

  return sessionToken;
}

export async function updateSessionActivity(
  userId: string,
  sessionToken?: string
): Promise<void> {
  if (sessionToken) {
    await db
      .update(sessions)
      .set({ lastAccessedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.sessionToken, sessionToken),
          eq(sessions.isValid, true)
        )
      );
  }
}

export async function invalidateSession(sessionToken: string): Promise<void> {
  await db
    .update(sessions)
    .set({ isValid: false })
    .where(eq(sessions.sessionToken, sessionToken));
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ isValid: false })
    .where(eq(sessions.userId, userId));
}
