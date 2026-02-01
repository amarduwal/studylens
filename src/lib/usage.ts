import { db, guestUsage } from "@/db";
import { and, eq, sql } from "drizzle-orm";

export interface UsageCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  message?: string;
}

/**
 * Check scan limit using PostgreSQL function
 */
export async function checkScanLimit(
  userId?: string | null,
  sessionId?: string | null,
  deviceFingerprint?: string | null,
  clientIp?: string | null,
  actionType: 'scan' | 'followup' | 'practice' = 'scan'
): Promise<UsageCheck> {
  const result = await db.execute(sql`
    SELECT * FROM fn_check_rate_limit(
      ${userId || null}::UUID,
      ${sessionId || null}::VARCHAR,
      ${actionType}::VARCHAR,
      ${deviceFingerprint || null}::VARCHAR,
      ${clientIp || null}::VARCHAR
    )
  `);

  const row = result.rows[0] as {
    allowed: boolean;
    remaining: number;
    limit_value: number;
    resets_at: Date;
  };

  // -1 means unlimited
  const isUnlimited = row.limit_value === -1;

  let message: string | undefined;

  if (!row.allowed) {
    if (!userId) {
      message = "Daily limit reached. Sign in for more or upgrade to Premium for unlimited.";
    } else if (!isUnlimited) {
      message = "Daily limit reached. Upgrade to Premium for unlimited.";
    } else {
      message = "Limit reached. Please try again later.";
    }
  }

  return {
    allowed: row.allowed,
    remaining: isUnlimited ? 999999 : row.remaining,
    limit: isUnlimited ? -1 : row.limit_value,
    resetsAt: new Date(row.resets_at),
    message,
  };
}

export async function incrementGuestUsage(
  sessionId: string,
  deviceFingerprint?: string,
  clientIp?: string,
  userAgent?: string
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Try to find existing record for this fingerprint+IP+date
  const [existing] = await db
    .select()
    .from(guestUsage)
    .where(
      and(
        eq(guestUsage.date, todayStr),
        deviceFingerprint
          ? eq(guestUsage.deviceFingerprint, deviceFingerprint)
          : eq(guestUsage.sessionId, sessionId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(guestUsage)
      .set({
        scanCount: sql`${guestUsage.scanCount} + 1`,
        ipAddress: clientIp || existing.ipAddress,
        updatedAt: new Date(),
      })
      .where(eq(guestUsage.id, existing.id));
  } else {
    await db.insert(guestUsage).values({
      sessionId,
      deviceFingerprint: deviceFingerprint || null,
      ipAddress: clientIp || null,
      userAgent: userAgent || null,
      date: todayStr,
      scanCount: 1,
    });
  }
}

/**
 * Check followup limit using PostgreSQL function
 */
export async function checkFollowupLimit(
  userId?: string | null,
  sessionId?: string | null,
  deviceFingerprint?: string | null,
  clientIp?: string | null
): Promise<UsageCheck> {
  const result = await db.execute(sql`
    SELECT * FROM fn_check_rate_limit(
      ${userId || null}::UUID,
      ${sessionId || null}::VARCHAR,
      'followup',
      ${deviceFingerprint || null}::VARCHAR,
      ${clientIp || null}::VARCHAR
    )
  `);

  const row = result.rows[0] as {
    allowed: boolean;
    remaining: number;
    limit_value: number;
    resets_at: Date;
  };

  const isUnlimited = row.limit_value === -1;

  let message: string | undefined;
  if (!row.allowed) {
    if (!userId) {
      message = "Daily message limit reached. Sign in for more messages or upgrade to Premium for unlimited.";
    } else if (!isUnlimited) {
      message = "Daily message limit reached. Upgrade to Premium for unlimited messages.";
    } else {
      message = "Limit reached. Please try again later.";
    }
  }

  return {
    allowed: row.allowed,
    remaining: isUnlimited ? 999999 : row.remaining,
    limit: isUnlimited ? -1 : row.limit_value,
    resetsAt: new Date(row.resets_at),
    message,
  };
}

/**
 * Get remaining scans using PostgreSQL function
 */
export async function getRemainingScans(
  userId?: string | null,
  sessionId?: string | null,
  deviceFingerprint?: string | null,
  clientIp?: string | null
): Promise<number> {
  const result = await db.execute(sql`
    SELECT fn_get_remaining_scans(
      ${userId || null}::UUID,
      ${sessionId || null}::VARCHAR,
      ${deviceFingerprint || null}::VARCHAR,
      ${clientIp || null}::VARCHAR
    ) as remaining
  `);

  return (result.rows[0] as { remaining: number }).remaining;
}

/**
 * Get usage status from view
 */
export async function getUsageStatus(
  userId?: string | null,
  sessionId?: string | null,
  deviceFingerprint?: string | null,
  clientIp?: string | null
) {
  // Authenticated user - use view
  if (userId) {
    const result = await db.execute(sql`
      WITH usage_stats AS (
        SELECT *
        FROM v_daily_usage_stats
        WHERE user_id = ${userId}::UUID
        LIMIT 1
      ),
      fallback_plan AS (
        SELECT
          daily_scan_limit,
          daily_followup_limit,
          daily_practice_limit,
          live_sessions_enabled,
          daily_live_session_limit,
          daily_live_minutes_limit,
          max_session_duration_minutes
        FROM pricing_plans
        WHERE slug = 'free'
        LIMIT 1
      )
      SELECT
        COALESCE(us.scan_count, 0) AS scan_count,
        COALESCE(us.message_count, 0) AS message_count,
        COALESCE(us.practice_count, 0) AS practice_count,
        COALESCE(us.live_session_count, 0) AS live_session_count,
        COALESCE(us.live_minutes_used, 0) AS live_minutes_used,
        COALESCE(us.daily_limit, fp.daily_scan_limit, 5) AS daily_limit,
        COALESCE(us.can_scan, true) AS can_scan,
        COALESCE(us.remaining_scans, fp.daily_scan_limit, 5) AS remaining_scans,
        COALESCE(us.live_enabled, fp.live_sessions_enabled, false) AS live_enabled,
        COALESCE(us.daily_live_session_limit, fp.daily_live_session_limit, 0) AS daily_live_session_limit,
        COALESCE(us.daily_live_minutes_limit, fp.daily_live_minutes_limit, 0) AS daily_live_minutes_limit,
        COALESCE(us.max_session_duration_minutes, fp.max_session_duration_minutes, 10) AS max_session_duration_minutes,
        COALESCE(us.remaining_live_sessions, 0) AS remaining_live_sessions,
        COALESCE(us.remaining_live_minutes, 0) AS remaining_live_minutes
      FROM fallback_plan fp
      LEFT JOIN usage_stats us ON true
    `);

    const row = result.rows[0] as {
      scan_count: number;
      message_count: number;
      practice_count: number;
      live_session_count: number;
      live_minutes_used: number;
      daily_limit: number;
      can_scan: boolean;
      remaining_scans: number;
      live_enabled: boolean;
      daily_live_session_limit: number;
      daily_live_minutes_limit: number;
      max_session_duration_minutes: number;
      remaining_live_sessions: number;
      remaining_live_minutes: number;
    };

    const isUnlimited = row.daily_limit === -1;
    const isLiveUnlimited = row.daily_live_session_limit === -1;

    // Determine if can start live session
    const canStartLive = row.live_enabled && (
      isLiveUnlimited || (
        row.remaining_live_sessions > 0 &&
        row.remaining_live_minutes > 0
      )
    );

    return {
      scans: {
        used: row.scan_count,
        limit: isUnlimited ? -1 : row.daily_limit,
        remaining: isUnlimited ? -1 : row.remaining_scans,
        unlimited: isUnlimited,
        canScan: row.can_scan,
      },
      messages: {
        used: row.message_count,
        limit: isUnlimited ? -1 : row.daily_limit,
        remaining: isUnlimited ? -1 : Math.max(0, row.daily_limit - row.message_count),
        unlimited: isUnlimited,
      },
      live: {
        enabled: row.live_enabled,
        sessionsUsed: row.live_session_count,
        sessionsLimit: isLiveUnlimited ? -1 : row.daily_live_session_limit,
        sessionsRemaining: isLiveUnlimited ? -1 : row.remaining_live_sessions,
        minutesUsed: Number(row.live_minutes_used),
        minutesLimit: isLiveUnlimited ? -1 : row.daily_live_minutes_limit,
        minutesRemaining: isLiveUnlimited ? -1 : Number(row.remaining_live_minutes),
        maxSessionMinutes: row.max_session_duration_minutes,
        unlimited: isLiveUnlimited,
        canStart: canStartLive,
      },
    };
  }

  // Guest user - no live access
  const result = await db.execute(sql`
    SELECT * FROM fn_get_guest_usage(
      ${sessionId || null}::VARCHAR,
      ${deviceFingerprint || null}::VARCHAR,
      ${clientIp || null}::VARCHAR
    )
  `);

  const row = result.rows[0] as {
    scan_count: number;
    message_count: number;
    practice_count: number;
    daily_limit: number;
    can_scan: boolean;
    remaining_scans: number;
  };

  return {
    scans: {
      used: row.scan_count,
      limit: row.daily_limit,
      remaining: row.remaining_scans,
      unlimited: false,
      canScan: row.can_scan,
    },
    messages: {
      used: row.message_count,
      limit: row.daily_limit,
      remaining: Math.max(0, row.daily_limit - row.message_count),
      unlimited: false,
    },
    live: {
      enabled: false,
      sessionsUsed: 0,
      sessionsLimit: 0,
      sessionsRemaining: 0,
      minutesUsed: 0,
      minutesLimit: 0,
      minutesRemaining: 0,
      maxSessionMinutes: 0,
      unlimited: false,
      canStart: false,
    },
  };
}

// Function to record live session usage:
export async function recordLiveSessionUsage(
  userId: string,
  action: 'start' | 'end',
  durationMinutes?: number
) {
  const today = new Date().toISOString().split('T')[0];

  if (action === 'start') {
    await db.execute(sql`
      INSERT INTO daily_usage (user_id, usage_date, live_session_count, live_minutes_used)
      VALUES (${userId}::UUID, ${today}::DATE, 1, 0)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET
        live_session_count = daily_usage.live_session_count + 1,
        updated_at = NOW()
    `);
  } else if (action === 'end' && durationMinutes) {
    await db.execute(sql`
      INSERT INTO daily_usage (user_id, usage_date, live_session_count, live_minutes_used)
      VALUES (${userId}::UUID, ${today}::DATE, 0, ${durationMinutes})
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET
        live_minutes_used = daily_usage.live_minutes_used + ${durationMinutes},
        updated_at = NOW()
    `);
  }
}

// export async function getUsageStatus(
//   userId?: string | null,
//   sessionId?: string | null
// ) {
//   const identifier = userId || sessionId;

//   const result = await db.execute(sql`
//     WITH usage_stats AS (
//       SELECT *
//       FROM v_daily_usage_stats
//       WHERE identifier = ${identifier}
//       LIMIT 1
//     ),
//     fallback_plan AS (
//       SELECT daily_scan_limit
//       FROM pricing_plans
//       WHERE slug = CASE
//         WHEN ${userId}::TEXT IS NOT NULL THEN 'free'
//         ELSE 'guest'
//       END
//       LIMIT 1
//     )
//     SELECT
//       COALESCE(us.scan_count, 0) AS scan_count,
//       COALESCE(us.message_count, 0) AS message_count,
//       COALESCE(us.practice_count, 0) AS practice_count,
//       COALESCE(us.daily_limit, fp.daily_scan_limit, 5) AS daily_limit,
//       COALESCE(us.can_scan, true) AS can_scan,
//       COALESCE(us.remaining_scans, fp.daily_scan_limit, 5) AS remaining_scans
//     FROM fallback_plan fp
//     LEFT JOIN usage_stats us ON true
//   `);

//   const row = result.rows[0] as {
//     scan_count: number;
//     message_count: number;
//     practice_count: number;
//     daily_limit: number;
//     can_scan: boolean;
//     remaining_scans: number;
//   };

//   // -1 means unlimited (enterprise only)
//   const isUnlimited = row.daily_limit === -1;

//   return {
//     scans: {
//       used: row.scan_count,
//       limit: isUnlimited ? -1 : row.daily_limit,
//       remaining: isUnlimited ? -1 : row.remaining_scans,
//       unlimited: isUnlimited,
//       canScan: row.can_scan,
//     },
//     messages: {
//       used: row.message_count,
//       limit: isUnlimited ? -1 : row.daily_limit,
//       remaining: isUnlimited ? -1 : Math.max(0, row.daily_limit - row.message_count),
//       unlimited: isUnlimited,
//     },
//   };
// }

// export async function getUsageStatus(
//   userId?: string | null,
//   sessionId?: string | null
// ) {
//   const identifier = userId || sessionId;

//   const result = await db.execute(sql`
//     SELECT *
//     FROM v_daily_usage_stats
//     WHERE identifier = ${identifier}
//     AND usage_date = CURRENT_DATE
//     LIMIT 1
//   `);

//   const row = result.rows[0] as {
//     scan_count: number;
//     message_count: number;
//     practice_count: number;
//     daily_limit: number;
//     can_scan: boolean;
//     remaining_scans: number;
//   } | undefined;

//   if (!row) {
//     // No usage today, return defaults
//     const defaultLimit = userId ? 10 : 5;
//     return {
//       scans: {
//         used: 0,
//         limit: defaultLimit,
//         remaining: defaultLimit,
//         unlimited: false,
//         canScan: true,
//       },
//       messages: {
//         used: 0,
//         limit: userId ? 10 : 5,
//         remaining: userId ? 10 : 5,
//         unlimited: false,
//       },
//     };
//   }

//   const isUnlimited = row.daily_limit === 999999 || row.daily_limit === null;

//   return {
//     scans: {
//       used: row.scan_count,
//       limit: isUnlimited ? -1 : row.daily_limit,
//       remaining: isUnlimited ? -1 : row.remaining_scans,
//       unlimited: isUnlimited,
//       canScan: row.can_scan,
//     },
//     messages: {
//       used: row.message_count,
//       limit: isUnlimited ? -1 : 10,
//       remaining: isUnlimited ? -1 : Math.max(0, 10 - row.message_count),
//       unlimited: isUnlimited,
//     },
//   };
// }
