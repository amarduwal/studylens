'use client';

import { useState, useCallback } from 'react';
import {
  Camera,
  Sparkles,
  Loader2,
  Crown,
  Clock,
  ImageIcon,
} from 'lucide-react';
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
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const maxImages = session?.user?.maxImagesPerScan || 1;

  const {
    currentImages,
    currentImageFiles,
    addImage,
    removeImage,
    error,
    limitError,
    selectedLanguage,
    setCurrentResult,
    setError,
    sessionId,
    deviceFingerprint,
  } = useScanStore();

  const handleImageCapture = useCallback(
    (imageData: string, file: File) => {
      if (currentImages.length >= maxImages) {
        setError(
          `Maximum ${maxImages} image${maxImages > 1 ? 's' : ''} allowed`
        );
        return;
      }

      if (currentImages.length >= 1 && maxImages === 1) {
        setError('Multiple images is a premium feature');
        setShowUpgradeDialog(true);
        return;
      }

      addImage(imageData, file);
      setShowCamera(false);
    },
    [addImage, currentImages.length, maxImages, setError, setShowUpgradeDialog]
  );

  const handleAnalyze = useCallback(async () => {
    if (currentImageFiles.length === 0) return;

    setAnalyzing(true);
    setError(null);

    try {
      const base64Images = await Promise.all(
        currentImageFiles.map((file) => fileToBase64(file))
      );

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: base64Images,
          mimeTypes: currentImageFiles.map((f) => f.type),
          filenames: currentImageFiles.map((f) => f.name),
          language: selectedLanguage,
          sessionId,
          deviceFingerprint,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const resultWithImages = {
          ...data.data,
          imageUrls: currentImages, // Store all images
        };
        setCurrentResult(resultWithImages);
        router.push(`/results/${data.data.id}`);
      } else {
        if (data.error?.code === 'LIMIT_EXCEEDED') {
          useScanStore.getState().setLimitError(data.error);
          setShowUpgradeDialog(true);
          return;
        }
        if (data.error?.code === 'PREMIUM_REQUIRED') {
          setShowUpgradeDialog(true);
          return;
        }
        if (data.error?.code === 503) {
          setError(
            'AI service is currently unavailable. Please try again later.'
          );
          return;
        }
        setError('Failed to analyze image');
        // setError(data.error?.message || 'Failed to analyze image');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [
    currentImageFiles,
    currentImages,
    selectedLanguage,
    router,
    setCurrentResult,
    setError,
    setShowUpgradeDialog,
    sessionId,
    deviceFingerprint,
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
              {currentImages.length > 0 ? (
                <>
                  {/* Image Grid */}
                  <div
                    className={`${
                      currentImages.length === 1 ? '' : 'grid grid-cols-2 gap-3'
                    }`}
                  >
                    {currentImages.map((img, index) => (
                      <div key={index} className="relative">
                        <ImagePreview
                          src={img}
                          onClear={() => removeImage(index)}
                          viewOnly={false}
                        />
                      </div>
                    ))}

                    {/* Add more button (premium only) */}
                    {/* {currentImages.length < 5 &&
                      session?.user?.subscriptionTier === 'premium' && (
                        <button
                          onClick={() => setShowCamera(true)}
                          className="border-2 border-dashed rounded-xl flex items-center justify-center aspect-video hover:bg-muted/50"
                        >
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </button>
                      )} */}
                    {currentImages.length < maxImages && maxImages > 1 && (
                      <div className="col-span-2 flex gap-3 mt-3">
                        <button
                          onClick={() => setShowCamera(true)}
                          className="flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-6 hover:bg-muted/50 transition-colors gap-3"
                        >
                          <div className="rounded-full bg-[hsl(var(--primary))]/10 p-4">
                            <Camera className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Take a Photo
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            document.getElementById('upload-input')?.click()
                          }
                          className="flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-6 hover:bg-muted/50 transition-colors gap-3"
                        >
                          <div className="rounded-full bg-[hsl(var(--primary))]/10 p-4">
                            <ImageIcon className="h-8 w-8 text-[hsl(var(--primary))]" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Upload Image
                          </span>
                        </button>
                        <input
                          id="upload-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const base64 = await fileToBase64(file);
                              const imageData = `data:${file.type};base64,${base64}`;
                              handleImageCapture(imageData, file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Image count */}
                  {currentImages.length > 1 && (
                    <p className="text-sm text-muted-foreground text-center">
                      {currentImages.length} images selected
                    </p>
                  )}

                  {error && (
                    <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-500">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={currentImageFiles.length === 0 || analyzing}
                    className="w-full h-14 text-lg"
                    size="lg"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing
                        {currentImages.length > 1
                          ? ` ${currentImages.length} images `
                          : ''}
                        ...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Explain {currentImages.length > 1 ? 'These' : 'This'}
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
                  <ImageUpload
                    onImageSelect={handleImageCapture}
                    onMultipleImageSelect={(results) => {
                      const available = maxImages - currentImages.length;
                      results
                        .slice(0, available)
                        .forEach(({ imageData, file }) => {
                          addImage(imageData, file);
                        });
                    }}
                    allowMultiple={maxImages > 1}
                    maxFiles={maxImages}
                  />
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
