'use client';

import { AudioLiveSession } from '@/components/live/audio-live-session';
import { useScanStore } from '@/stores/scan-store';
import { useSession } from 'next-auth/react';

export default function LivePage() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  const { data: session } = useSession();
  const { sessionId } = useScanStore();

  return (
    <AudioLiveSession
      apiKey={apiKey}
      userId={session?.user?.id}
      guestSessionId={sessionId}
      language="en"
      subject="General Study Help"
      onClose={() => window.history.back()}
    />
  );
}
