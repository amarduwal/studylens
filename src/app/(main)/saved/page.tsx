'use client';

import { useScanStore } from '@/stores/scan-store';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, NotebookText, Pin, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { EditBookmarkModal } from './edit-bookmark-modal';
import { ScanBookmarkResult } from '@/types';

export default function SavedPage() {
  const { fetchBookmarksFromDB, toggleBookmarkDB, sessionId } = useScanStore();
  const [bookmarkedScans, setBookmarkedScans] = useState<ScanBookmarkResult[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const [editingBookmark, setEditingBookmark] =
    useState<ScanBookmarkResult | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

  const handleBookmarkUpdated = async () => {
    setIsLoading(true);
    const scans = await fetchBookmarksFromDB(sessionId);
    setBookmarkedScans(scans);
    setIsLoading(false);
  };

  const sortedScans = useMemo(() => {
    return [...bookmarkedScans].sort((a, b) => {
      // 1. Pinned items ALWAYS first (regardless of sortOrder)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 2. Same pinned status → sort by sortOrder (ASCENDING: 0,1,2,3...)
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }

      // 3. Fallback: unpinned items by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [bookmarkedScans]);

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
                {sortedScans.map((scan) => (
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
                        <div className="relative flex-1 min-w-0">
                          <div className="absolute top-0 right-0 z-20 flex items-center">
                            {scan.isPinned && (
                              <div className="p-1 text-xs transition-colors text-[hsl(var(--primary))]">
                                <Pin className="h-4 w-4" />
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenDropdownId(
                                  openDropdownId === scan.id ? null : scan.id
                                );
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>

                            {/* Dropdown Menu */}
                            {openDropdownId === scan.id && (
                              <>
                                {/* Backdrop to close dropdown */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenDropdownId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg overflow-hidden">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingBookmark(scan);

                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                                  >
                                    <Pencil className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleToggleBookmark(scan.id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Link href={`/results/${scan.id}`}>
                              <h3 className="font-semibold hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
                                {scan.topic}
                              </h3>
                              <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-1">
                                {scan.subject}
                              </p>
                              <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                                {scan.extractedText}
                              </p>
                            </Link>

                            {/* Bottom info */}
                            <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                              {scan.tags && scan.tags.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  {scan.tags.join(', ')}
                                </span>
                              )}
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
                            <div className="flex">
                              {scan.notes && (
                                <span className="flex items-center gap-1 italic text-xs text-[hsl(var(--muted-foreground))]">
                                  <NotebookText className="h-3 w-3 text-[hsl(var(--primary))]" />
                                  {scan.notes.slice(0, 100) + '...'}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-end gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(scan.createdAt).toLocaleDateString()}
                              </span>
                            </div>
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

        {/* Edit Bookmark Modal */}
        {editingBookmark && (
          <EditBookmarkModal
            isOpen={!!editingBookmark}
            onClose={() => setEditingBookmark(null)}
            bookmark={editingBookmark}
            onUpdate={handleBookmarkUpdated}
          />
        )}
      </main>

      {ToastComponent}
    </div>
  );
}
