import { db } from "@/db";
import { sql } from "drizzle-orm";

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
  sessionId?: string | null
): Promise<UsageCheck> {
  const result = await db.execute(sql`
    SELECT * FROM fn_check_rate_limit(
      ${userId || null}::UUID,
      ${sessionId || null}::VARCHAR,
      'scan'
    )
  `);

  const row = result.rows[0] as {
    allowed: boolean;
    remaining: number;
    limit_value: number;
    resets_at: Date;
  };

  let message: string | undefined;
  if (!row.allowed) {
    if (!userId) {
      message = "Daily scan limit reached. Sign in to get more scans or upgrade to Premium for unlimited scans.";
    } else if (row.limit_value < 100) { // Not premium
      message = "Daily scan limit reached. Upgrade to Premium for unlimited scans.";
    } else {
      message = "Daily scan limit reached. Please try again tomorrow.";
    }
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    limit: row.limit_value,
    resetsAt: new Date(row.resets_at),
    message,
  };
}

/**
 * Check followup limit using PostgreSQL function
 */
export async function checkFollowupLimit(
  userId?: string | null,
  sessionId?: string | null
): Promise<UsageCheck> {
  const result = await db.execute(sql`
    SELECT * FROM fn_check_rate_limit(
      ${userId || null}::UUID,
      ${sessionId || null}::VARCHAR,
      'followup'
    )
  `);

  const row = result.rows[0] as {
    allowed: boolean;
    remaining: number;
    limit_value: number;
    resets_at: Date;
  };

  let message: string | undefined;
  if (!row.allowed) {
    if (!userId) {
      message = "Daily message limit reached. Sign in for more messages or upgrade to Premium for unlimited.";
    } else {
      message = "Daily message limit reached. Upgrade to Premium for unlimited messages.";
    }
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    limit: row.limit_value,
    resetsAt: new Date(row.resets_at),
    message,
  };
}

/**
 * Get remaining scans using PostgreSQL function
 */
export async function getRemainingScans(
  userId?: string | null,
  sessionId?: string | null
): Promise<number> {
  const result = await db.execute(sql`
    SELECT fn_get_remaining_scans(
      ${userId || null}::UUID,
      ${sessionId || null}::VARCHAR
    ) as remaining
  `);

  return (result.rows[0] as { remaining: number }).remaining;
}

/**
 * Get usage status from view
 */
export async function getUsageStatus(
  userId?: string | null,
  sessionId?: string | null
) {
  const identifier = userId || sessionId;

  const result = await db.execute(sql`
    WITH usage_stats AS (
      SELECT *
      FROM v_daily_usage_stats
      WHERE identifier = ${identifier}
      LIMIT 1
    ),
    fallback_plan AS (
      SELECT daily_scan_limit
      FROM pricing_plans
      WHERE slug = CASE
        WHEN ${userId}::TEXT IS NOT NULL THEN 'free'
        ELSE 'guest'
      END
      LIMIT 1
    )
    SELECT
      COALESCE(us.scan_count, 0) AS scan_count,
      COALESCE(us.message_count, 0) AS message_count,
      COALESCE(us.practice_count, 0) AS practice_count,
      COALESCE(us.daily_limit, fp.daily_scan_limit, 5) AS daily_limit,
      COALESCE(us.can_scan, true) AS can_scan,
      COALESCE(us.remaining_scans, fp.daily_scan_limit, 5) AS remaining_scans
    FROM fallback_plan fp
    LEFT JOIN usage_stats us ON true
  `);

  const row = result.rows[0] as {
    scan_count: number;
    message_count: number;
    practice_count: number;
    daily_limit: number;
    can_scan: boolean;
    remaining_scans: number;
  };

  // -1 means unlimited (enterprise only)
  const isUnlimited = row.daily_limit === -1;

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
  };
}
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
