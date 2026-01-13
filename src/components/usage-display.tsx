'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useScanStore } from '@/stores/scan-store';
import { Crown } from 'lucide-react';
import Link from 'next/link';

interface UsageData {
  scans: { used: number; limit: number; remaining: number; unlimited: boolean };
  followups: {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
  };
}

export function UsageDisplay() {
  const { data: session } = useSession();
  const { sessionId } = useScanStore();
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch(`/api/usage?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success) {
          setUsage(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error);
      }
    }

    fetchUsage();
  }, [sessionId, session]);

  if (!usage) return null;

  const { scans } = usage;
  const percentage = scans.unlimited
    ? 100
    : Math.round((scans.used / scans.limit) * 100);
  const isLow = !scans.unlimited && scans.remaining <= 2;

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Daily Scans</span>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {scans.unlimited ? (
            <span className="flex items-center gap-1 text-amber-500">
              <Crown className="h-3.5 w-3.5" />
              Unlimited
            </span>
          ) : (
            `${scans.remaining}/${scans.limit} remaining`
          )}
        </span>
      </div>

      {/* Progress bar */}
      {!scans.unlimited && (
        <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isLow ? 'bg-red-500' : 'bg-[hsl(var(--primary))]'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {/* Upgrade prompt */}
      {isLow && !session?.user && (
        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          <Link
            href="/register"
            className="text-[hsl(var(--primary))] hover:underline"
          >
            Sign up
          </Link>{' '}
          for 10 free scans daily
        </p>
      )}

      {isLow &&
        session?.user &&
        session.user.subscriptionTier !== 'premium' && (
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Link href="/pricing" className="text-amber-500 hover:underline">
              Upgrade to Pro
            </Link>{' '}
            for unlimited scans
          </p>
        )}
    </div>
  );
}
