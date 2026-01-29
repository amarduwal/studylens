'use client';

import { useState, useEffect, useCallback } from 'react';
import { LiveSessionService, LiveMessage } from '@/lib/live/live-session-service';

interface LiveSessionInfo {
  id: string;
  sessionId: string;
  subject?: string;
  status: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UseLiveSessionsOptions {
  userId?: string;
  guestSessionId?: string;
}

export function useLiveSessions({ userId, guestSessionId }: UseLiveSessionsOptions) {
  const [sessions, setSessions] = useState<LiveSessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<LiveMessage[]>([]);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const service = new LiveSessionService();
      const result = await service.getUserSessions(userId, guestSessionId, 20);
      setSessions(result);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, guestSessionId]);

  const loadSessionMessages = useCallback(async (sessionDbId: string) => {
    try {
      const response = await fetch(`/api/live-sessions/${sessionDbId}/messages`);
      const data = await response.json();
      if (data.success) {
        setSessionMessages(data.messages);
        setSelectedSessionId(sessionDbId);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessionId(null);
    setSessionMessages([]);
  }, []);

  useEffect(() => {
    if (userId || guestSessionId) {
      loadSessions();
    }
  }, [userId, guestSessionId, loadSessions]);

  return {
    sessions,
    isLoading,
    selectedSessionId,
    sessionMessages,
    loadSessions,
    loadSessionMessages,
    clearSelection,
  };
}
