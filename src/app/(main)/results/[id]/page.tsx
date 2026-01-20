'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePreview } from '@/components/scanner/image-preview';
import { ExplanationCard } from '@/components/results/explanation-card';
import { StepByStep } from '@/components/results/step-by-step';
import { FollowUpChat } from '@/components/results/follow-up-chat';
import { useScanStore } from '@/stores/scan-store';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Message, ScanResult } from '@/types';
import { getImageUrl } from '@/lib/image-utils';
import { useSession } from 'next-auth/react';
import { ExportPDF } from '@/components/common/export-pdf';
import { ImageModal } from '@/components/common/image-modal';

export default function ResultsPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;
  const { showToast, ToastComponent } = useToast();
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const {
    currentResult,
    scanHistory,
    getScanById,
    toggleBookmarkDB,
    isBookmarked,
    sessionId,
  } = useScanStore();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadScan() {
      // Try local first
      const local =
        currentResult?.id === scanId
          ? currentResult
          : scanHistory.find((s) => s.id === scanId);

      if (local) {
        setResult(local);
        setIsLoading(false);
        return;
      }

      // Fetch from DB
      const dbScan = await getScanById(scanId, sessionId);
      setResult(dbScan);
      setIsLoading(false);
    }

    loadScan();
  }, [scanId, currentResult, scanHistory, getScanById, sessionId]);

  useEffect(() => {
    async function loadConversation() {
      if (hasLoadedMessages) return; // Prevent reloading

      // Clear existing messages first
      useScanStore.getState().clearMessages();

      // Get conversation for this scan
      const convRes = await fetch(`/api/conversations?scanId=${scanId}`);
      const convData = await convRes.json();

      if (convData.success && convData.data) {
        const conversationId = convData.data.id;

        // Load messages
        const msgRes = await fetch(
          `/api/conversations/${conversationId}/messages`
        );
        const msgData = await msgRes.json();

        if (msgData.success && msgData.data) {
          // Populate store with existing messages
          const formattedMessages = msgData.data.map((msg: Message) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
          }));

          useScanStore.getState().setMessages(formattedMessages);
          setHasLoadedMessages(true);
        }
      }
    }

    loadConversation();
  }, [scanId]);

  useEffect(() => {
    return () => {
      useScanStore.getState().clearMessages();
    };
  }, []);

  const bookmarked = result ? isBookmarked(result.id) : false;

  const handleBookmark = async () => {
    if (!result) return;

    if (!session?.user) {
      // Show sign-in prompt
      showToast('Sign in to bookmark scans', 'info');
      return;
    }

    const response = await toggleBookmarkDB(result.id); // Changed
    showToast(
      response.isBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks',
      'success'
    );
  };

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col bg-[hsl(var(--background))]">
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      {/* Sticky Header */}
      <div className="top-0 bg-[hsl(var(--background))]/95 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--background))]/80 border-b border-[hsl(var(--border))] shadow-sm">
        <div className="mx-auto w-full max-w-2xl">
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
              {status === 'authenticated' && (
                <ExportPDF
                  result={result}
                  imageUrl={getImageUrl(result.storageKey) || result.imageUrl}
                />
              )}
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Original image - Click to enlarge */}
            {result.imageUrl && (
              <>
                <div
                  className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-sm cursor-pointer group relative"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <ImagePreview
                    src={
                      getImageUrl(result.storageKey) ||
                      result.imageUrl ||
                      '/Screenshot-1.png'
                    }
                    onClear={() => router.push('/')}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
                      Click to enlarge
                    </span>
                  </div>
                </div>

                <ImageModal
                  key={isImageModalOpen ? 'open' : 'closed'}
                  src={
                    getImageUrl(result.storageKey) ||
                    result.imageUrl ||
                    '/Screenshot-1.png'
                  }
                  alt="Scanned content"
                  isOpen={isImageModalOpen}
                  onClose={() => setIsImageModalOpen(false)}
                />
              </>
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
              practiceQuestions={result.explanation?.practiceQuestions}
            />
          </div>
        </div>
      </main>

      {ToastComponent}
    </div>
  );
}
