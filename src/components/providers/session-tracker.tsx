'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const SESSION_TRACKED_KEY = 'studylens-session-tracked';

export function SessionTracker() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const trackedUserId = localStorage.getItem(SESSION_TRACKED_KEY);

      // Only track if not already tracked for this user
      if (trackedUserId !== session.user.id) {
        fetch('/api/auth/session-track', {
          method: 'POST',
        })
          .then((res) => {
            if (res.ok) {
              localStorage.setItem(SESSION_TRACKED_KEY, session.user.id);
            }
          })
          .catch(console.error);
      }
    }

    if (status === 'unauthenticated') {
      localStorage.removeItem(SESSION_TRACKED_KEY);
    }
  }, [status, session]);

  return null;
}
