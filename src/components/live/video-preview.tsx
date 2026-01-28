'use client';

import { useRef, useEffect } from 'react';
import { VideoOff, User } from 'lucide-react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  isEnabled: boolean;
  isMirrored?: boolean;
  label?: string;
  className?: string;
}

export function VideoPreview({
  stream,
  isEnabled,
  isMirrored = true,
  label,
  className = '',
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}
    >
      {stream && isEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          {!stream ? (
            <div className="text-center">
              <User className="w-16 h-16 mx-auto text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">Camera not started</p>
            </div>
          ) : (
            <div className="text-center">
              <VideoOff className="w-16 h-16 mx-auto text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">Camera is off</p>
            </div>
          )}
        </div>
      )}

      {label && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
          {label}
        </div>
      )}
    </div>
  );
}
