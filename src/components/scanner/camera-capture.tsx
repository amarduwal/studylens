'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { FlipHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageData: string, file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Stop existing stream first
    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const imageData = canvas.toDataURL('image/jpeg', 0.9);
          stopCamera();
          onCapture(imageData, file);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [onCapture, facingMode, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={handleClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'h-full w-full object-cover',
          facingMode === 'user' && '-scale-x-100'
        )}
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Initializing camera...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white p-4">
            <p className="mb-4">{error}</p>
            <Button onClick={startCamera}>Try Again</Button>
          </div>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 to-transparent p-8 pb-12">
          {/* Flip camera */}
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={flipCamera}
          >
            <FlipHorizontal className="h-6 w-6" />
          </Button>

          {/* Capture button */}
          <button
            onClick={capturePhoto}
            className="h-20 w-20 rounded-full border-4 border-white bg-white/20 transition-transform hover:scale-105 active:scale-95"
          >
            <div className="m-1 h-full w-full rounded-full bg-white" />
          </button>

          {/* Placeholder for symmetry */}
          <div className="h-12 w-12" />
        </div>
      )}

      {/* Viewfinder guide */}
      {!isLoading && !error && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-8 border-2 border-white/30 rounded-3xl" />
          <div className="absolute left-1/2 top-8 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
            <p className="text-white/80 text-sm">
              Position your content in frame
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
