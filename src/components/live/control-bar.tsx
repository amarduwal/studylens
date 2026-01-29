'use client';

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  Settings,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './audio-visualizer';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isConnected: boolean;
  audioLevel: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndSession: () => void;
  onOpenChat?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function ControlBar({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isConnected,
  audioLevel,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndSession,
  onOpenChat,
  onOpenSettings,
  className = '',
}: ControlBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 p-4 bg-gray-900/80 backdrop-blur-lg rounded-2xl',
        className,
      )}
    >
      {/* Audio Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={isAudioEnabled ? 'default' : 'destructive'}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={onToggleAudio}
          disabled={!isConnected}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </Button>

        {/* {isAudioEnabled && (
          <AudioVisualizer
            audioLevel={audioLevel}
            isActive={isConnected && isAudioEnabled}
            type="bars"
            color="#3B82F6"
            className="w-20 h-10"
          />
        )} */}
      </div>

      {/* Video Toggle */}
      <Button
        variant={isVideoEnabled ? 'default' : 'destructive'}
        size="lg"
        className="rounded-full w-14 h-14"
        onClick={onToggleVideo}
        disabled={!isConnected}
      >
        {isVideoEnabled ? (
          <Video className="w-6 h-6" />
        ) : (
          <VideoOff className="w-6 h-6" />
        )}
      </Button>

      {/* Screen Share Toggle */}
      <Button
        variant={isScreenSharing ? 'secondary' : 'outline'}
        size="lg"
        className="rounded-full w-14 h-14"
        onClick={onToggleScreenShare}
        disabled={!isConnected}
      >
        {isScreenSharing ? (
          <MonitorOff className="w-6 h-6" />
        ) : (
          <MonitorUp className="w-6 h-6" />
        )}
      </Button>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-700 mx-2" />

      {/* Chat Button */}
      {onOpenChat && (
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={onOpenChat}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )}

      {/* Settings Button */}
      {onOpenSettings && (
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={onOpenSettings}
        >
          <Settings className="w-6 h-6" />
        </Button>
      )}

      {/* Divider */}
      <div className="w-px h-10 bg-gray-700 mx-2" />

      {/* End Session */}
      <Button
        variant="destructive"
        size="lg"
        className="rounded-full px-6 h-14"
        onClick={onEndSession}
      >
        <PhoneOff className="w-6 h-6 mr-2" />
        End Session
      </Button>
    </div>
  );
}
