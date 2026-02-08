'use client';

import { AudioLiveSession } from '@/components/live/audio-live-session';
import { useLiveUsage } from '@/hooks/use-live-usage';
import { useScanStore } from '@/stores/scan-store';
import { Loader2, Lock, Zap } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  apiKey: string;
}

export default function LiveClient({ apiKey }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { sessionId } = useScanStore();
  const { usage, isLoading, isAuthenticated, recordStart, recordEnd } =
    useLiveUsage();

  if (!isAuthenticated && !isLoading) {
    router.push('/login?redirect=/live');
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[hsl(var(--primary))]" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Loading Live Audio...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!usage?.canStart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h1 className="text-xl font-bold mb-2">Live Sessions Unavailable</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-6 max-w-sm">
          {!usage?.enabled
            ? 'Live audio sessions are not available on your current plan.'
            : 'You have reached your daily limit for live sessions.'}
        </p>

        {usage?.enabled && (
          <div className="text-sm text-[hsl(var(--muted-foreground))] mb-4 space-y-1">
            <p>
              Sessions: {usage.sessionsUsed} /{' '}
              {usage.sessionsLimit === -1 ? '∞' : usage.sessionsLimit}
            </p>
            <p>
              Minutes: {usage.minutesUsed.toFixed(1)} /{' '}
              {usage.minutesLimit === -1 ? '∞' : usage.minutesLimit}
            </p>
          </div>
        )}

        <Link
          href="/pricing"
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium"
        >
          <Zap className="w-4 h-4" />
          Upgrade Plan
        </Link>
      </div>
    );
  }

  return (
    <AudioLiveSession
      apiKey={apiKey}
      userId={session?.user?.id}
      guestSessionId={sessionId}
      language="en"
      subject="General Study Help"
      educationLevel={session?.user?.preferences?.educationLevel || undefined}
      maxDurationMinutes={usage.maxSessionMinutes}
      remainingMinutes={usage.unlimited ? undefined : usage.minutesRemaining}
      onSessionStart={recordStart}
      onSessionEnd={recordEnd}
      onClose={() => window.history.back()}
    />
  );
}
