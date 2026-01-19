'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Bookmark, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useScanStore } from '@/stores/scan-store';
import { useToast } from '@/components/ui/toast';
import { getImageUrl } from '@/lib/image-utils';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/components/common/helper';

export default function HistoryPage() {
  const { data: session } = useSession();
  const {
    scanHistory,
    getRecentScans,
    isLoading,
    hasFetched,
    fetchScansFromDB,
    toggleBookmarkDB,
    isBookmarked,
    sessionId,
    hasMore,
    currentPage,
    searchScans,
    clearSearch,
    searchResults,
    searchQuery,
  } = useScanStore();
  const recentScans = getRecentScans(); // Get from local state
  const { showToast, ToastComponent } = useToast();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'recent' | 'all' | 'search'>('recent');

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery.trim()) {
        setIsSearching(true);
        setFilter('search');
        searchScans(localSearchQuery, sessionId).finally(() =>
          setIsSearching(false)
        );
      } else {
        clearSearch();
        if (filter === 'search') setFilter('recent');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchQuery, sessionId, searchScans, clearSearch, filter]);

  useEffect(() => {
    if (!hasFetched && filter !== 'recent' && filter !== 'search') {
      fetchScansFromDB(sessionId);
    }
  }, [hasFetched, filter, sessionId, fetchScansFromDB]);

  const filteredScans =
    filter === 'search'
      ? searchResults
      : filter === 'recent'
      ? recentScans
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

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    await fetchScansFromDB(sessionId, currentPage + 1); // Use store's currentPage
    setIsLoadingMore(false);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    clearSearch();
    setFilter('recent');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] py-10">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold mb-2">Scan History</h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                Review your past scans and explanations
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Search your scans..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-[hsl(var(--input))] transition-shadow"
              />
              {localSearchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-[hsl(var(--border))]">
              {/* Search Results Tab - Only visible when searching */}
              {searchQuery && (
                <button
                  onClick={() => setFilter('search')}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                    filter === 'search'
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  )}
                >
                  Search Results
                  <span className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded-full">
                    {isSearching ? '...' : searchResults.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setFilter('recent')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  filter === 'recent'
                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                Recent Scans
              </button>
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  filter === 'all'
                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                All
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
                  {filter === 'search' ? '🔍' : '📚'}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {filter === 'search'
                    ? `No results for "${searchQuery}"`
                    : 'No scans yet'}
                </h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-6">
                  {filter === 'search'
                    ? 'Try different keywords'
                    : 'Start scanning to build your learning history'}
                </p>
                {filter === 'search' && (
                  <Button variant="outline" onClick={handleClearSearch}>
                    Clear Search
                  </Button>
                )}
                {(filter === 'all' || filter === 'recent') && (
                  <Link href="/">
                    <Button>Scan Something</Button>
                  </Link>
                )}
              </div>
            ) : !isLoading ? (
              <div>
                {searchQuery && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {isSearching
                          ? 'Searching...'
                          : `${searchResults.length} results for "${searchQuery}"`}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSearch}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
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
                                {formatDate(scan.createdAt)}
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

                {!isLoading && filter !== 'recent' && hasMore && (
                  <div className="text-center py-4">
                    <Button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      variant="outline"
                    >
                      {isLoadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {ToastComponent}
    </div>
  );
}
