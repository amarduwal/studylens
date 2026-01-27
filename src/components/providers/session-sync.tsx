'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { useScanStore } from '@/stores/scan-store';

export function SessionSync() {
  const { data: session } = useSession();
  const { clearAllData } = useScanStore();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = session?.user?.id || null;

    // If user changed (different user or logout)
    if (
      previousUserId.current !== null &&
      previousUserId.current !== currentUserId
    ) {
      clearAllData();
    }

    previousUserId.current = currentUserId;
  }, [session?.user?.id, clearAllData]);

  return null;
}
