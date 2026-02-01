'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface LiveUsage {
  enabled: boolean;
  sessionsUsed: number;
  sessionsLimit: number;
  sessionsRemaining: number;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  maxSessionMinutes: number;
  unlimited: boolean;
  canStart: boolean;
}

export function useLiveUsage() {
  const { data: session, status } = useSession();
  const [usage, setUsage] = useState<LiveUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  const fetchUsage = useCallback(async () => {
    if (!isAuthenticated) {
      setUsage({
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
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/live/usage');
      const data = await response.json();

      if (data.success) {
        setUsage(data.live);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch usage');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (status !== 'loading') {
      fetchUsage();
    }
  }, [status, fetchUsage]);

  const recordStart = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/live/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await response.json();

      if (data.success) {
        setUsage(data.live);
        return true;
      }
      setError(data.error);
      return false;
    } catch {
      return false;
    }
  }, []);

  const recordEnd = useCallback(async (durationMinutes: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/live/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', durationMinutes }),
      });
      const data = await response.json();

      if (data.success) {
        setUsage(data.live);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    usage,
    isLoading,
    isAuthenticated,
    error,
    refresh: fetchUsage,
    recordStart,
    recordEnd,
  };
}
