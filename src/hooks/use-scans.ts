"use client";

import { useState, useEffect, useCallback } from "react";
import { useScanStore } from "@/stores/scan-store";
import { ScanResult } from "@/types";

interface UseScansOptions {
  bookmarkedOnly?: boolean;
  limit?: number;
}

export function useScans(options: UseScansOptions = {}) {
  const { bookmarkedOnly = false, limit = 50 } = options;
  const { sessionId } = useScanStore();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sessionId,
        limit: limit.toString(),
        ...(bookmarkedOnly && { bookmarked: "true" }),
      });

      const res = await fetch(`/api/scans?${params}`);
      const data = await res.json();

      if (data.success) {
        setScans(data.data);
      } else {
        setError(data.error || "Failed to fetch scans");
      }
    } catch (err) {
      setError("Failed to fetch scans");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, bookmarkedOnly, limit]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const toggleBookmark = async (scanId: string) => {
    try {
      const res = await fetch(`/api/scans/${scanId}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (data.success) {
        setScans((prev) =>
          prev.map((scan) =>
            scan.id === scanId
              ? { ...scan, isBookmarked: data.data.isBookmarked }
              : scan
          )
        );
        return data.data.isBookmarked;
      }
    } catch (err) {
      console.error("Toggle bookmark error:", err);
    }
    return null;
  };

  return { scans, isLoading, error, refetch: fetchScans, toggleBookmark };
}
