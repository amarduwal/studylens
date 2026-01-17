'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useScanStore } from '@/stores/scan-store';
import { useToast } from '@/components/ui/toast';
import { getImageUrl } from '@/lib/image-utils';
import { useSession } from 'next-auth/react';

export default function HistoryPage() {
  const { data: session } = useSession();
  const {
    scanHistory,
    isLoading,
    hasFetched,
    fetchScansFromDB,
    toggleBookmarkDB,
    isBookmarked,
    sessionId,
  } = useScanStore();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!hasFetched) {
      fetchScansFromDB(sessionId);
    }
  }, [hasFetched, sessionId, fetchScansFromDB]);

  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');

  const filteredScans =
    filter === 'bookmarked'
      ? scanHistory.filter((scan) => isBookmarked(scan.id))
      : scanHistory;

  const handleBookmark = async (scanId: string) => {
    if (!scanId) return;

    if (!session?.user) {
      // Show sign-in prompt
      showToast('Sign in to bookmark scans', 'info');
      return;
    }

    const result = await toggleBookmarkDB(scanId); // Changed
    showToast(
      result.isBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks',
      'success'
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold mb-2">Scan History</h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                Review your past scans and explanations
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-[hsl(var(--border))]">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  filter === 'all'
                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                All ({scanHistory.length})
              </button>
              <button
                onClick={() => setFilter('bookmarked')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  filter === 'bookmarked'
                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                Bookmarked (
                {scanHistory.filter((s) => isBookmarked(s.id)).length})
              </button>
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-[hsl(var(--muted-foreground))]">
                  Loading history...
                </p>
              </div>
            )}

            {/* Scan List */}
            {!isLoading && filteredScans.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {filter === 'bookmarked' ? '🔖' : '📚'}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {filter === 'bookmarked'
                    ? 'No bookmarks yet'
                    : 'No scans yet'}
                </h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-6">
                  {filter === 'bookmarked'
                    ? 'Bookmark scans to find them easily later'
                    : 'Start scanning to build your learning history'}
                </p>
                {filter === 'all' && (
                  <Link href="/">
                    <Button>Scan Something</Button>
                  </Link>
                )}
              </div>
            ) : !isLoading ? (
              <div>
                {filteredScans.map((scan) => (
                  <Link
                    key={scan.id}
                    href={`/results/${scan.id}`}
                    className="block mb-4 last:mb-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                          {/* Image thumbnail */}
                          {scan.imageUrl && (
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[hsl(var(--muted))] shrink-0">
                              <Image
                                src={
                                  getImageUrl(scan.imageUrl) ||
                                  '/Screenshot-1.png'
                                }
                                alt="Scan thumbnail"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1">
                                <h3 className="font-semibold line-clamp-1">
                                  {scan.topic}
                                </h3>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                  {scan.subject}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 -mt-1 -mr-2"
                                onClick={(e) => {
                                  handleBookmark(scan.id);
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                <Bookmark
                                  className={cn(
                                    'h-4 w-4',
                                    isBookmarked(scan.id) &&
                                      'fill-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                                  )}
                                />
                              </Button>
                            </div>

                            <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-2">
                              {scan.extractedText}
                            </p>

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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {ToastComponent}
    </div>
  );
}
