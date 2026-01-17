"use client";

import { useState, useCallback } from "react";
import { compressImage, fileToBase64 } from "@/lib/utils";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  url: string;
  key: string;
}

export function useImageUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (
      file: File,
      options?: { scanId?: string; sessionId?: string }
    ): Promise<UploadResult | null> => {
      setState({ isUploading: true, progress: 0, error: null });

      try {
        // Compress if needed
        setState((s) => ({ ...s, progress: 10 }));
        let processedFile = file;
        if (file.size > 4 * 1024 * 1024) {
          processedFile = await compressImage(file);
        }

        // Convert to base64
        setState((s) => ({ ...s, progress: 30 }));
        const base64 = await fileToBase64(processedFile);
        const imageData = `data:${processedFile.type};base64,${base64}`;

        // Upload
        setState((s) => ({ ...s, progress: 50 }));
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageData,
            mimeType: processedFile.type,
            ...options,
          }),
        });

        setState((s) => ({ ...s, progress: 90 }));
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Upload failed");
        }

        setState({ isUploading: false, progress: 100, error: null });

        return {
          url: data.data.url,
          key: data.data.key,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setState({ isUploading: false, progress: 0, error: message });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    upload,
    reset,
    ...state,
  };
}
