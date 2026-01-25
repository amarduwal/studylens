'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
  src: string;
  onClear: () => void;
  onRetake?: () => void;
  viewOnly: boolean;
  isLoading?: boolean;
}

export function ImagePreview({
  src,
  onClear,
  onRetake,
  viewOnly,
  isLoading,
}: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);

  // Check if URL is base64 or remote
  const isBase64 = src.startsWith('data:');
  // const isR2Url =
  //   src.includes('r2.dev') || src.includes('r2.cloudflarestorage');

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[hsl(var(--muted))]">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {imageError ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Failed to load image
          </p>
        </div>
      ) : (
        <Image
          src={src}
          alt="Preview"
          fill
          className="object-contain"
          unoptimized={isBase64}
          onError={() => setImageError(true)}
          priority
        />
      )}

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-2">
        {onRetake && (
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-amber-700 shadow-md hover:bg-black"
            onClick={onRetake}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        {!viewOnly && (
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-amber-700 shadow-md hover:bg-black"
            onClick={onClear}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
