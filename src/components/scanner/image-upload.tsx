'use client';

import React, { useCallback } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn, compressImage, fileToBase64 } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (imageData: string, file: File) => void;
  onMultipleImageSelect?: (images: { imageData: string; file: File }[]) => void;
  disabled?: boolean;
  allowMultiple?: boolean;
  maxFiles?: number;
}

export function ImageUpload({
  onImageSelect,
  onMultipleImageSelect,
  disabled,
  allowMultiple = false,
  maxFiles = 5,
}: ImageUploadProps) {
  const processFile = useCallback(async (file: File) => {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPEG, PNG, or WebP)');
      return null;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return null;
    }

    try {
      // Compress if larger than 4MB
      let processedFile = file;
      if (file.size > 4 * 1024 * 1024) {
        processedFile = await compressImage(file);
      }

      const base64 = await fileToBase64(processedFile);
      const imageData = `data:${processedFile.type};base64,${base64}`;

      return { imageData, file: processedFile };
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
      return null;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      if (allowMultiple && onMultipleImageSelect) {
        // Process multiple files
        const fileArray = Array.from(files).slice(0, maxFiles);
        const processed = await Promise.all(
          fileArray.map((file) => processFile(file))
        );
        const validResults = processed.filter((r) => r !== null) as {
          imageData: string;
          file: File;
        }[];

        if (validResults.length > 0) {
          onMultipleImageSelect(validResults);
        }
      } else {
        // Single file
        const result = await processFile(files[0]);
        if (result) {
          onImageSelect(result.imageData, result.file);
        }
      }

      event.target.value = '';
    },
    [processFile, onImageSelect, onMultipleImageSelect, allowMultiple, maxFiles]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer.files;
      if (!files || files.length === 0) return;

      if (allowMultiple && onMultipleImageSelect) {
        const fileArray = Array.from(files).slice(0, maxFiles);
        const processed = await Promise.all(
          fileArray.map((file) => processFile(file))
        );
        const validResults = processed.filter((r) => r !== null) as {
          imageData: string;
          file: File;
        }[];

        if (validResults.length > 0) {
          onMultipleImageSelect(validResults);
        }
      } else {
        const result = await processFile(files[0]);
        if (result) {
          onImageSelect(result.imageData, result.file);
        }
      }
    },
    [processFile, onImageSelect, onMultipleImageSelect, allowMultiple, maxFiles]
  );

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors',
        'border-[hsl(var(--muted-foreground))]/25 bg-[hsl(var(--muted))]/50',
        'hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--muted))]',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple={allowMultiple}
        onChange={handleFileChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-[hsl(var(--primary))]/10 p-4">
          <ImageIcon className="h-8 w-8 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <p className="font-medium">
            Drop {allowMultiple ? 'images' : 'an image'} here
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            or click to browse
          </p>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          JPEG, PNG, WebP up to 10MB
          {allowMultiple && ` (max ${maxFiles} images)`}
        </p>
      </div>
    </div>
  );
}
