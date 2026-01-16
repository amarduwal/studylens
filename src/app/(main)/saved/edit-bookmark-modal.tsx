'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Pin, Tag, StickyNote, SortAscIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScanBookmarkResult } from '@/types';

interface EditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmark: ScanBookmarkResult;
  onUpdate: () => void;
}

export function EditBookmarkModal({
  isOpen,
  onClose,
  bookmark,
  onUpdate,
}: EditBookmarkModalProps) {
  const [tags, setTags] = useState<string>(bookmark.tags?.join(', ') || '');
  const [notes, setNotes] = useState<string>(bookmark.notes || '');
  const [isPinned, setIsPinned] = useState<boolean>(bookmark.isPinned || false);
  const [sortOrder, setSortOrder] = useState<number>(bookmark.sortOrder || 0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when bookmark changes
  useEffect(() => {
    setTags(bookmark.tags?.join(', ') || '');
    setNotes(bookmark.notes || '');
    setIsPinned(bookmark.isPinned || false);
    setSortOrder(bookmark.sortOrder || 0);
  }, [bookmark]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.bookmarkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          notes,
          isPinned,
          sortOrder: sortOrder || null,
        }),
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[50%] z-50 translate-y-[-50%] mx-auto max-w-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-lg font-semibold">Edit Bookmark</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Sort Order */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                <SortAscIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder || 0}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                <Tag className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="algebra, equations, calculus"
                className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                Separate tags with commas
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                <StickyNote className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow resize-none"
              />
            </div>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pin
                  className={cn(
                    'h-4 w-4',
                    isPinned
                      ? 'text-[hsl(var(--primary))]'
                      : 'text-[hsl(var(--muted-foreground))]'
                  )}
                />
                <span className="text-sm font-medium">Pin to top</span>
              </div>
              <div
                className={cn(
                  'w-11 h-6 rounded-full relative transition-colors',
                  isPinned
                    ? 'bg-[hsl(var(--primary))]'
                    : 'bg-[hsl(var(--muted))]'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                    isPinned ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-[hsl(var(--border))]">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-11"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
