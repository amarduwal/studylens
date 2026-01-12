'use client';

import React, { useState, useCallback } from 'react';
import { Camera, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/scanner/camera-capture';
import { ImageUpload } from '@/components/scanner/image-upload';
import { ImagePreview } from '@/components/scanner/image-preview';
import { useScanStore } from '@/stores/scan-store';
import { fileToBase64 } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);

  const {
    currentImage,
    currentImageFile,
    isAnalyzing,
    error,
    selectedLanguage,
    setCurrentImage,
    setCurrentResult,
    setIsAnalyzing,
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

  const handleAnalyze = async () => {
    if (!currentImageFile) return;

    setIsAnalyzing(true);
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
        setError(data.error?.message || 'Failed to analyze image');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleImageCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-6 px-4">
      <div className="space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Understand Anything, Instantly</h1>
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
                <div className="rounded-lg bg-[hsl(var(--destructive))]/10 p-4 text-center text-sm text-[hsl(var(--destructive))]">
                  {error}
                </div>
              )}

              {/* Analyze button */}
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {isAnalyzing ? (
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
      </div>
    </div>
  );
}
