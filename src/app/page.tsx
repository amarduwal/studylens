'use client';

import { useState, useCallback } from 'react';
import { Camera, Sparkles, Loader2, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/scanner/camera-capture';
import { ImageUpload } from '@/components/scanner/image-upload';
import { ImagePreview } from '@/components/scanner/image-preview';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useScanStore } from '@/stores/scan-store';
import { fileToBase64 } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { UsageDisplay } from '@/components/usage-display';
import { getTimeUntilReset, UpgradeBenefit } from '@/components/common/helper';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const {
    currentImage,
    currentImageFile,
    error,
    limitError,
    selectedLanguage,
    setCurrentImage,
    setCurrentResult,
    setError,
    clearCurrentScan,
  } = useScanStore();

  const handleImageCapture = useCallback(
    (imageData: string, file: File) => {
      setCurrentImage(imageData, file);
      setShowCamera(false);
    },
    [setCurrentImage]
  );

  const handleAnalyze = useCallback(async () => {
    if (!currentImageFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(currentImageFile);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: currentImageFile.type,
          language: selectedLanguage,
          sessionId: useScanStore.getState().sessionId,
          filename: currentImageFile.name,
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Store the image URL in the result
        const resultWithImage = {
          ...data.data,
          imageUrl: currentImage,
        };
        setCurrentResult(resultWithImage);
        router.push(`/results/${data.data.id}`);
      } else {
        // ✅ LIMIT_EXCEEDED special handling
        if (data.error?.code === 'LIMIT_EXCEEDED') {
          useScanStore.getState().setLimitError(data.error);
          setShowUpgradeDialog(true);
          return;
        }
        setError(data.error?.message || 'Failed to analyze image');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [
    currentImageFile,
    currentImage,
    selectedLanguage,
    setCurrentResult,
    setError,
    router,
  ]);

  // Show fullscreen camera
  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleImageCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <Header />

      <main className="flex-1 overflow-y-auto pb-20 md:pb-20">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">
                Understand Anything, Instantly
              </h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                Point your camera at any educational content and get instant
                explanations
              </p>
            </div>

            {/* Image capture area */}
            <div className="space-y-4">
              {currentImage ? (
                <>
                  <ImagePreview
                    src={currentImage}
                    onClear={clearCurrentScan}
                    onRetake={() => setShowCamera(true)}
                  />

                  {/* Error message */}
                  {error && (
                    <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-500">
                      {error}
                    </div>
                  )}

                  {/* Analyze button */}
                  <Button
                    onClick={handleAnalyze}
                    disabled={!currentImageFile || analyzing}
                    className="w-full h-14 text-lg"
                    size="lg"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Explain This
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Camera button */}
                  <Button
                    onClick={() => setShowCamera(true)}
                    className="w-full h-32 flex-col gap-3"
                    variant="outline"
                  >
                    <Camera className="h-10 w-10" />
                    <span className="text-lg font-medium">Take a Photo</span>
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[hsl(var(--border))]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[hsl(var(--background))] px-2 text-[hsl(var(--muted-foreground))]">
                        or
                      </span>
                    </div>
                  </div>

                  {/* Upload area */}
                  <ImageUpload onImageSelect={handleImageCapture} />
                </>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4 space-y-3">
              <h3 className="font-medium">📸 Tips for best results</h3>
              <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-2">
                <li>• Ensure good lighting</li>
                <li>• Keep the content in focus</li>
                <li>• Capture the entire problem or content</li>
                <li>• Avoid glare and shadows</li>
              </ul>
            </div>

            {/* Usage Display */}
            <UsageDisplay />

            {/* Supported subjects */}
            <div className="rounded-xl border border-[hsl(var(--border))] p-4 space-y-3">
              <h3 className="font-medium">📚 What can I scan?</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'Math Problems',
                  'Physics',
                  'Chemistry',
                  'Biology',
                  'History',
                  'Geography',
                  'Code',
                  'Diagrams',
                  'Handwritten Notes',
                ].map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs text-white"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Dialog */}
        {showUpgradeDialog && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
              onClick={() => setShowUpgradeDialog(false)}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 top-[50%] z-50 translate-y-[-50%] mx-auto max-w-sm animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-purple-600 p-6 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold mb-1">
                    Daily Limit Reached
                  </h2>
                  <p className="text-white/80 text-sm">
                    You&quot;ve used all {limitError?.limit || 10} scans for
                    today
                  </p>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Reset Timer */}
                  <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mb-5 p-3 rounded-xl bg-[hsl(var(--muted))]/50">
                    <Clock className="h-4 w-4" />
                    <span>
                      Resets in {getTimeUntilReset(limitError?.resetsAt)}
                    </span>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2.5 mb-6">
                    <UpgradeBenefit
                      emoji="🚀"
                      text="Unlimited scans every day"
                      color="emerald"
                    />
                    <UpgradeBenefit
                      emoji="⚡"
                      text="Priority AI - 3x faster results"
                      color="blue"
                    />
                    <UpgradeBenefit
                      emoji="🧠"
                      text="Advanced explanations & practice"
                      color="purple"
                    />
                    <UpgradeBenefit
                      emoji="📱"
                      text="Export to PDF & share"
                      color="amber"
                    />
                  </div>

                  {/* Price teaser */}
                  {/* <div className="text-center mb-5 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                    <span className="text-2xl font-bold text-[hsl(var(--primary))]">
                      $9.99
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      /month
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Cancel anytime • 7-day free trial
                    </p>
                  </div> */}

                  {/* Actions */}
                  <div className="space-y-2">
                    <Link href="/pricing" className="block">
                      <Button className="w-full h-12 bg-gradient-to-r from-[hsl(var(--secondary))] to-purple-600 hover:opacity-90">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowUpgradeDialog(false)}
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        <Footer />
      </main>

      <BottomNav />
    </div>
  );
}
