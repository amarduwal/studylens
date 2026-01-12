'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePreview } from '@/components/scanner/image-preview';
import { ExplanationCard } from '@/components/results/explanation-card';
import { StepByStep } from '@/components/results/step-by-step';
import { FollowUpChat } from '@/components/results/follow-up-chat';
import { useScanStore } from '@/stores/scan-store';
import { shareScan, canShare } from '@/lib/share';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;
  const { showToast, ToastComponent } = useToast();

  const { currentResult, scanHistory, toggleBookmark, isBookmarked } =
    useScanStore();

  // Try to find result in store or history
  const result =
    currentResult?.id === scanId
      ? currentResult
      : scanHistory.find((s) => s.id === scanId);

  const bookmarked = result ? isBookmarked(result.id) : false;

  const handleBookmark = () => {
    if (!result) return;
    toggleBookmark(result.id);
    showToast(
      bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
      'success'
    );
  };

  const handleShare = async () => {
    if (!result) return;

    const success = await shareScan(result);
    if (success) {
      showToast(
        canShare() ? 'Shared successfully' : 'Copied to clipboard',
        'success'
      );
    } else {
      showToast('Failed to share', 'error');
    }
  };

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
        <div className="container max-w-2xl py-12 text-center">
          <div className="mb-8">
            <span className="text-6xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Result not found</h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            This scan may have expired or been deleted.
          </p>
          <Button onClick={() => router.push('/')} size="lg">
            Scan Something New
          </Button>
        </div>
      </div>
    );
  }

  const originalContext = `
Subject: ${result.subject}
Topic: ${result.topic}
Content: ${result.extractedText}
Answer: ${result.explanation.simpleAnswer}
Concept: ${result.explanation.concept}
  `.trim();

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-[hsl(var(--background))]/95 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--background))]/80 border-b border-[hsl(var(--border))] shadow-sm">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="flex items-center justify-between h-14 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="font-semibold text-base">Results</h1>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBookmark}
                className="relative"
              >
                <Bookmark
                  className={cn(
                    'h-5 w-5 transition-colors',
                    bookmarked &&
                      'fill-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                  )}
                />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Original image */}
            {result.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-sm">
                <ImagePreview
                  src={result.imageUrl}
                  onClear={() => router.push('/')}
                />
              </div>
            )}

            {/* Explanation */}
            <ExplanationCard result={result} />

            {/* Step by Step */}
            {result.explanation.stepByStep &&
              result.explanation.stepByStep.length > 0 && (
                <StepByStep steps={result.explanation.stepByStep} />
              )}

            {/* Follow-up Chat */}
            <FollowUpChat
              scanId={result.id}
              originalContext={originalContext}
            />
          </div>
        </div>
      </main>

      {ToastComponent}
    </div>
  );
}
