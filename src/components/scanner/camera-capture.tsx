'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  FlipHorizontal,
  X,
  ZoomIn,
  ZoomOut,
  Sun,
  Grid3X3,
  Flashlight,
  Focus,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageData: string, file: File) => void;
  onClose: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camera controls state
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [showControls, setShowControls] = useState(false);

  // Crop state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    cropX: 0,
    cropY: 0,
    cropWidth: 0,
    cropHeight: 0,
  });
  const [dragType, setDragType] = useState<
    'move' | 'nw' | 'ne' | 'sw' | 'se' | null
  >(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateContainerRect = () => {
      const container = document.querySelector('.crop-container');
      if (container) {
        setContainerRect(container.getBoundingClientRect());
      }
    };

    updateContainerRect();
    window.addEventListener('resize', updateContainerRect);
    return () => window.removeEventListener('resize', updateContainerRect);
  }, [isCropping]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    stopCamera();

    try {
      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video:
            facingMode === 'environment'
              ? { facingMode: { ideal: 'environment' } }
              : true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      const videoTrack = mediaStream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      // Check capabilities
      const capabilities =
        videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number };
          torch?: boolean;
        };

      if (capabilities) {
        if (capabilities.zoom) {
          setMaxZoom(capabilities.zoom.max || 1);
        }
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = () => reject(new Error('Video failed to load'));
        });
      }
    } catch (err) {
      console.error('Camera error:', err);

      if (err instanceof Error) {
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError'
        ) {
          setError(
            'Camera permission denied. Please allow camera access in your browser settings.'
          );
        } else if (
          err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError'
        ) {
          setError('No camera found. Please connect a camera and try again.');
        } else if (
          err.name === 'NotReadableError' ||
          err.name === 'TrackStartError'
        ) {
          setError(
            'Camera is in use by another application. Please close other apps using the camera.'
          );
        } else if (err.name === 'OverconstrainedError') {
          setError(
            'Camera does not support required settings. Trying with basic settings...'
          );
          // Already handled in fallback above
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError(
          'Unable to access camera. Please check permissions and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Apply zoom
  useEffect(() => {
    if (trackRef.current && maxZoom > 1) {
      const constraints = { advanced: [{ zoom } as MediaTrackConstraintSet] };
      trackRef.current.applyConstraints(constraints).catch(console.error);
    }
  }, [zoom, maxZoom]);

  // Apply torch
  useEffect(() => {
    if (trackRef.current && hasTorch) {
      const constraints = {
        advanced: [{ torch: torchOn } as MediaTrackConstraintSet],
      };
      trackRef.current.applyConstraints(constraints).catch(console.error);
    }
  }, [torchOn, hasTorch]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setTorchOn(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prev) => {
      const step = 0.5;
      if (direction === 'in') {
        return Math.min(prev + step, maxZoom);
      }
      return Math.max(prev - step, 1);
    });
  };

  const handleBrightness = (value: number) => {
    setBrightness(value);
  };

  const handleTapToFocus = (
    e: React.MouseEvent<HTMLVideoElement> | React.TouchEvent<HTMLVideoElement>
  ) => {
    if (!trackRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    setFocusPoint({ x: clientX - rect.left, y: clientY - rect.top });

    // Apply focus point if supported
    try {
      const constraints = {
        advanced: [
          {
            focusMode: 'manual',
            pointsOfInterest: [{ x, y }],
          } as MediaTrackConstraintSet,
        ],
      };
      trackRef.current.applyConstraints(constraints).catch(() => {});
    } catch {}

    setTimeout(() => setFocusPoint(null), 1500);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply brightness filter
    ctx.filter = `brightness(${brightness})`;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    ctx.filter = 'none';

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setIsCropping(true);

    // Initialize crop area to full image
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
  }, [facingMode, brightness]);

  const handleCropMouseDown = (
    e: React.MouseEvent,
    type: 'move' | 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: cropArea.x,
      cropY: cropArea.y,
      cropWidth: cropArea.width,
      cropHeight: cropArea.height,
    });
    if (containerRect) {
      setContainerRect(containerRect);
    }
  };

  const handleCropMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragType || !containerRect) return;

      const deltaX = ((e.clientX - dragStart.x) / containerRect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / containerRect.height) * 100;

      setCropArea((prev) => {
        const newArea = { ...prev };

        if (dragType === 'move') {
          newArea.x = Math.max(
            0,
            Math.min(100 - prev.width, dragStart.cropX + deltaX)
          );
          newArea.y = Math.max(
            0,
            Math.min(100 - prev.height, dragStart.cropY + deltaY)
          );
        } else {
          // Handle resize from different corners
          const minSize = 10; // Minimum 10% of container

          if (dragType.includes('n')) {
            // North resize
            const newHeight = Math.max(
              minSize,
              Math.min(dragStart.cropHeight - deltaY, 100 - newArea.y)
            );
            newArea.y = dragStart.cropY + deltaY;
            newArea.height = newHeight;
          }

          if (dragType.includes('s')) {
            // South resize
            newArea.height = Math.max(
              minSize,
              Math.min(dragStart.cropHeight + deltaY, 100 - newArea.y)
            );
          }

          if (dragType.includes('w')) {
            // West resize
            const newWidth = Math.max(
              minSize,
              Math.min(dragStart.cropWidth - deltaX, 100 - newArea.x)
            );
            newArea.x = dragStart.cropX + deltaX;
            newArea.width = newWidth;
          }

          if (dragType.includes('e')) {
            // East resize
            newArea.width = Math.max(
              minSize,
              Math.min(dragStart.cropWidth + deltaX, 100 - newArea.x)
            );
          }

          // Ensure aspect ratio if shift key is pressed
          if (e.shiftKey) {
            const aspectRatio = dragStart.cropWidth / dragStart.cropHeight;
            if (dragType === 'se' || dragType === 'nw') {
              newArea.width = newArea.height * aspectRatio;
              if (dragType === 'nw') {
                newArea.x =
                  dragStart.cropX + (dragStart.cropWidth - newArea.width);
              }
            } else if (dragType === 'ne' || dragType === 'sw') {
              newArea.width = newArea.height * aspectRatio;
              if (dragType === 'ne') {
                newArea.x = dragStart.cropX;
              }
            }
          }
        }

        return newArea;
      });
    },
    [isDragging, dragType, dragStart, containerRect]
  );

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  // Touch handlers for mobile crop
  const handleCropTouchStart = (
    e: React.TouchEvent,
    type: 'move' | 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragType(type);
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      cropX: cropArea.x,
      cropY: cropArea.y,
      cropWidth: cropArea.width,
      cropHeight: cropArea.height,
    });
    if (containerRect) {
      setContainerRect(containerRect);
    }
  };

  const handleCropTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !dragType || !containerRect) return;

      const touch = e.touches[0];
      const deltaX =
        ((touch.clientX - dragStart.x) / containerRect.width) * 100;
      const deltaY =
        ((touch.clientY - dragStart.y) / containerRect.height) * 100;

      setCropArea((prev) => {
        const newArea = { ...prev };

        if (dragType === 'move') {
          newArea.x = Math.max(
            0,
            Math.min(100 - prev.width, dragStart.cropX + deltaX)
          );
          newArea.y = Math.max(
            0,
            Math.min(100 - prev.height, dragStart.cropY + deltaY)
          );
        } else {
          // Handle resize from different corners (touch)
          const minSize = 10;

          if (dragType.includes('n')) {
            const newHeight = Math.max(
              minSize,
              Math.min(dragStart.cropHeight - deltaY, 100 - newArea.y)
            );
            newArea.y = dragStart.cropY + deltaY;
            newArea.height = newHeight;
          }

          if (dragType.includes('s')) {
            newArea.height = Math.max(
              minSize,
              Math.min(dragStart.cropHeight + deltaY, 100 - newArea.y)
            );
          }

          if (dragType.includes('w')) {
            const newWidth = Math.max(
              minSize,
              Math.min(dragStart.cropWidth - deltaX, 100 - newArea.x)
            );
            newArea.x = dragStart.cropX + deltaX;
            newArea.width = newWidth;
          }

          if (dragType.includes('e')) {
            newArea.width = Math.max(
              minSize,
              Math.min(dragStart.cropWidth + deltaX, 100 - newArea.x)
            );
          }
        }

        return newArea;
      });
    },
    [isDragging, dragType, dragStart, containerRect]
  );

  const handleCropTouchEnd = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  useEffect(() => {
    if (isCropping) {
      // Mouse events
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
      // Touch events
      window.addEventListener('touchmove', handleCropTouchMove, {
        passive: false,
      });
      window.addEventListener('touchend', handleCropTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleCropMouseMove);
        window.removeEventListener('mouseup', handleCropMouseUp);
        window.removeEventListener('touchmove', handleCropTouchMove);
        window.removeEventListener('touchend', handleCropTouchEnd);
      };
    }
  }, [
    isCropping,
    handleCropMouseMove,
    handleCropMouseUp,
    handleCropTouchMove,
    handleCropTouchEnd,
  ]);

  const applyCrop = useCallback(() => {
    if (!capturedImage || !cropCanvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = cropCanvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cropX = (cropArea.x / 100) * img.width;
      const cropY = (cropArea.y / 100) * img.height;
      const cropWidth = (cropArea.width / 100) * img.width;
      const cropHeight = (cropArea.height / 100) * img.height;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

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
    };
    img.src = capturedImage;
  }, [capturedImage, cropArea, onCapture, stopCamera]);

  const skipCrop = useCallback(() => {
    if (!capturedImage) return;

    // Convert base64 to blob directly
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopCamera();
        onCapture(capturedImage, file);
      });
  }, [capturedImage, onCapture, stopCamera]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCropping(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Crop UI
  if (isCropping && capturedImage) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={retakePhoto}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <span className="text-white font-medium">Crop Image</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Image with crop overlay */}
        <div
          className="relative h-full w-full flex items-center justify-center crop-container"
          ref={(el) => {
            if (el && !containerRect) {
              setContainerRect(el.getBoundingClientRect());
            }
          }}
        >
          <img
            src={capturedImage}
            alt="Captured"
            className="max-h-full max-w-full object-contain"
          />

          {/* Dark overlay outside crop area */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute bg-black/60"
              style={{ top: 0, left: 0, right: 0, height: `${cropArea.y}%` }}
            />
            <div
              className="absolute bg-black/60"
              style={{
                top: `${cropArea.y + cropArea.height}%`,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <div
              className="absolute bg-black/60"
              style={{
                top: `${cropArea.y}%`,
                left: 0,
                width: `${cropArea.x}%`,
                height: `${cropArea.height}%`,
              }}
            />
            <div
              className="absolute bg-black/60"
              style={{
                top: `${cropArea.y}%`,
                left: `${cropArea.x + cropArea.width}%`,
                right: 0,
                height: `${cropArea.height}%`,
              }}
            />
          </div>

          {/* Crop selection box */}
          <div
            className="absolute border-2 border-white cursor-move touch-none select-none"
            style={{
              top: `${cropArea.y}%`,
              left: `${cropArea.x}%`,
              width: `${cropArea.width}%`,
              height: `${cropArea.height}%`,
            }}
            onMouseDown={(e) => handleCropMouseDown(e, 'move')}
            onTouchStart={(e) => handleCropTouchStart(e, 'move')}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>

            {/* Corner handles with directional arrows */}
            {[
              { position: 'top-left', type: 'nw' },
              { position: 'top-right', type: 'ne' },
              { position: 'bottom-left', type: 'sw' },
              { position: 'bottom-right', type: 'se' },
            ].map(({ position, type }) => (
              <div
                key={position}
                className={cn(
                  'absolute w-6 h-6 bg-white border border-gray-300 rounded-full cursor-se-resize flex items-center justify-center',
                  position === 'top-left' && '-top-3 -left-3 cursor-nw-resize',
                  position === 'top-right' &&
                    '-top-3 -right-3 cursor-ne-resize',
                  position === 'bottom-left' &&
                    '-bottom-3 -left-3 cursor-sw-resize',
                  position === 'bottom-right' &&
                    '-bottom-3 -right-3 cursor-se-resize'
                )}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleCropMouseDown(
                    e,
                    type as 'move' | 'nw' | 'ne' | 'sw' | 'se'
                  );
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleCropTouchStart(
                    e,
                    type as 'move' | 'nw' | 'ne' | 'sw' | 'se'
                  );
                }}
              >
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
              </div>
            ))}

            {/* Edge handles for better mobile interaction */}
            {[
              { position: 'top', type: 'n' },
              { position: 'bottom', type: 's' },
              { position: 'left', type: 'w' },
              { position: 'right', type: 'e' },
            ].map(({ position, type }) => (
              <div
                key={position}
                className={cn(
                  'absolute bg-transparent',
                  position === 'top' &&
                    'top-0 left-0 right-0 h-6 -translate-y-3 cursor-n-resize',
                  position === 'bottom' &&
                    'bottom-0 left-0 right-0 h-6 translate-y-3 cursor-s-resize',
                  position === 'left' &&
                    'top-0 left-0 bottom-0 w-6 -translate-x-3 cursor-w-resize',
                  position === 'right' &&
                    'top-0 right-0 bottom-0 w-6 translate-x-3 cursor-e-resize'
                )}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleCropMouseDown(
                    e,
                    type as 'move' | 'nw' | 'ne' | 'sw' | 'se'
                  );
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleCropTouchStart(
                    e,
                    type as 'move' | 'nw' | 'ne' | 'sw' | 'se'
                  );
                }}
              />
            ))}
          </div>
        </div>

        {/* Crop canvas (hidden) */}
        <canvas ref={cropCanvasRef} className="hidden" />

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-8 bg-gradient-to-t from-black/80 to-transparent">
          <Button
            className="border-white text-white hover:bg-white/20"
            onClick={skipCrop}
          >
            Skip Crop
          </Button>
          <Button
            className="bg-white text-black hover:bg-white/90"
            onClick={applyCrop}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Crop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-2">
          {/* Grid toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-white hover:bg-white/20',
              showGrid && 'bg-white/20'
            )}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>

          {/* Torch toggle */}
          {hasTorch && facingMode === 'environment' && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/20',
                torchOn && 'bg-yellow-500/50'
              )}
              onClick={() => setTorchOn(!torchOn)}
            >
              <Flashlight className="h-5 w-5" />
            </Button>
          )}

          {/* Settings toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-white hover:bg-white/20',
              showControls && 'bg-white/20'
            )}
            onClick={() => setShowControls(!showControls)}
          >
            <Sun className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Brightness/Zoom controls panel */}
      {showControls && (
        <div className="absolute top-16 right-4 z-10 p-4 rounded-2xl bg-black/70 backdrop-blur-sm space-y-4">
          {/* Brightness control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-white text-xs">
              <Sun className="h-4 w-4" />
              <span>Brightness</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={brightness}
              onChange={(e) => handleBrightness(parseFloat(e.target.value))}
              className="w-32 accent-white"
            />
          </div>

          {/* Zoom control */}
          {maxZoom > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white text-xs">
                <ZoomIn className="h-4 w-4" />
                <span>Zoom {zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max={maxZoom}
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-32 accent-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onClick={handleTapToFocus}
        onTouchStart={handleTapToFocus}
        style={{ filter: `brightness(${brightness})` }}
        className={cn(
          'h-full w-full object-cover',
          facingMode === 'user' && '-scale-x-100'
        )}
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Focus indicator */}
      {focusPoint && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: focusPoint.x - 30,
            top: focusPoint.y - 30,
          }}
        >
          <div className="w-16 h-16 border-2 border-yellow-400 rounded-lg animate-pulse">
            <Focus className="w-full h-full p-3 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Grid overlay */}
      {showGrid && !isLoading && !error && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="border border-white/30" />
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
            <p>Initializing camera...</p>
          </div>
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

      {/* Bottom controls */}
      {!isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 pb-12">
          <div className="flex items-center justify-center gap-8">
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
              <div className="h-full w-full rounded-full bg-white" />
            </button>

            {/* Zoom buttons */}
            {maxZoom > 1 ? (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
                  onClick={() => handleZoom('in')}
                  disabled={zoom >= maxZoom}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
                  onClick={() => handleZoom('out')}
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-12 w-12" />
            )}
          </div>

          {/* Zoom indicator */}
          {maxZoom > 1 && zoom > 1 && (
            <div className="text-center mt-4">
              <span className="text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                {zoom.toFixed(1)}x
              </span>
            </div>
          )}
        </div>
      )}

      {/* Viewfinder guide */}
      {!isLoading && !error && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-8 border-2 border-white/30 rounded-3xl" />
          <div className="absolute left-1/2 top-20 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
            <p className="text-white/80 text-sm">
              Tap to focus • Position content in frame
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
