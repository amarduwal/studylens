'use client';

import Image from 'next/image';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
  src: string;
  onClear: () => void;
  onRetake?: () => void;
}

export function ImagePreview({ src, onClear, onRetake }: ImagePreviewProps) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[hsl(var(--muted))]">
      <Image
        src={src}
        alt="Preview"
        fill
        className="object-contain"
        unoptimized // For base64 images
      />

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-2">
        {onRetake && (
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/90 shadow-md hover:bg-white"
            onClick={onRetake}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full bg-white/90 shadow-md hover:bg-white"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
