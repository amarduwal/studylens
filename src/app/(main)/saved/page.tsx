'use client';

import { useScanStore } from '@/stores/scan-store';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ScanResult } from '@/types';
import { useToast } from '@/components/ui/toast';

export default function SavedPage() {
  const { fetchBookmarksFromDB, toggleBookmarkDB, sessionId } = useScanStore();
  const [bookmarkedScans, setBookmarkedScans] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    async function loadBookmarks() {
      setIsLoading(true);
      const scans = await fetchBookmarksFromDB(sessionId);
      setBookmarkedScans(scans);
      setIsLoading(false);
    }
    loadBookmarks();
  }, [sessionId, fetchBookmarksFromDB]);

  const handleToggleBookmark = async (scanId: string) => {
    setBookmarkedScans((prev) => prev.filter((s) => s.id !== scanId));
    const result = await toggleBookmarkDB(scanId, sessionId);
    showToast(
      result ? 'Removed from bookmarks' : 'Added to bookmarks',
      'success'
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[hsl(var(--muted-foreground))]">
          Loading bookmarks...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold mb-2">Bookmarked Scans</h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                Quick access to your saved explanations
              </p>
            </div>

            {/* Bookmarked List */}
            {bookmarkedScans.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔖</div>
                <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-6">
                  Bookmark important scans to access them quickly
                </p>
                <Link href="/">
                  <Button>Start Scanning</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {bookmarkedScans.map((scan) => (
                  <Card
                    key={scan.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        {scan.imageUrl && (
                          <Link
                            href={`/results/${scan.id}`}
                            className="shrink-0"
                          >
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[hsl(var(--muted))] shrink-0">
                              <Image
                                src={scan.imageUrl}
                                alt="Scan thumbnail"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          </Link>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/results/${scan.id}`}>
                            <h3 className="font-semibold mb-1 hover:text-[hsl(var(--primary))] transition-colors">
                              {scan.topic}
                            </h3>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                              {scan.subject}
                            </p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-3">
                              {scan.extractedText}
                            </p>
                          </Link>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(scan.createdAt).toLocaleDateString()}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full',
                                  scan.difficulty === 'easy' &&
                                    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                                  scan.difficulty === 'medium' &&
                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                                  scan.difficulty === 'hard' &&
                                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                )}
                              >
                                {scan.difficulty}
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleBookmark(scan.id)}
                              className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {ToastComponent}
    </div>
  );
}
