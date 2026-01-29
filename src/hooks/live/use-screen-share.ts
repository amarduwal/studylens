"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { LIVE_CONFIG } from "@/lib/live/constants";

interface UseScreenShareReturn {
  isSharing: boolean;
  stream: MediaStream | null;
  error: string | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  captureFrame: () => string | null;
}

export function useScreenShare(): UseScreenShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopSharing = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsSharing(false);
  }, [stream]);

  useEffect(() => {
    // Initialize canvas
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = LIVE_CONFIG.VIDEO.WIDTH;
    canvasRef.current.height = LIVE_CONFIG.VIDEO.HEIGHT;

    // Initialize video element
    videoRef.current = document.createElement("video");
    videoRef.current.autoplay = true;
    videoRef.current.muted = true;

    return () => {
      stopSharing();
    };
  }, []);

  const startSharing = useCallback(async () => {
    try {
      setError(null);

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 5 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsSharing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Handle stream end (user clicks "Stop sharing")
      mediaStream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };

    } catch (err) {
      console.error("Error starting screen share:", err);
      setError(err instanceof Error ? err.message : "Failed to start screen sharing");
      setIsSharing(false);
    }
  }, [stopSharing]);


  const captureFrame = useCallback((): string | null => {
    if (!isSharing || !videoRef.current || !canvasRef.current) {
      return null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;

    // Draw current video frame to canvas
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    return canvasRef.current.toDataURL("image/jpeg", LIVE_CONFIG.VIDEO.QUALITY);
  }, [isSharing]);

  return {
    isSharing,
    stream,
    error,
    startSharing,
    stopSharing,
    captureFrame,
  };
}
