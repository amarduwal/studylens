'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMediaStream } from '@/hooks/live/use-media-stream';
import { useLiveSession } from '@/hooks/live/use-live-session';
import { useScreenShare } from '@/hooks/live/use-screen-share';
import { VideoPreview } from './video-preview';
import { TranscriptPanel } from './transcript-panel';
import { ControlBar } from './control-bar';
import { WhiteboardCanvas } from './whiteboard-canvas';
import { CodeExecutor } from './code-executor';
import { SessionConfig } from '@/types/live.ts';
import { LIVE_CONFIG } from '@/lib/live/constants';
import { Loader2, AlertCircle, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveSessionProps {
  apiKey: string;
  config: SessionConfig;
  onEnd?: () => void;
}

export function LiveSession({ apiKey, config, onEnd }: LiveSessionProps) {
  const [textInput, setTextInput] = useState('');
  const [activePanel, setActivePanel] = useState<
    'transcript' | 'whiteboard' | 'code'
  >('transcript');
  const [whiteboardElements, setWhiteboardElements] = useState<any[]>([]);
  const [codeData, setCodeData] = useState<{
    code: string;
    language: 'javascript' | 'python';
    explanation?: string;
  } | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Media stream hook
  const {
    videoStream,
    audioStream,
    isAudioEnabled,
    isVideoEnabled,
    audioLevel,
    hasAudioPermission,
    hasVideoPermission,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    captureFrame,
  } = useMediaStream({
    enableAudio: config.voiceEnabled,
    enableVideo: config.videoEnabled,
    onAudioData: (audioData) => {
      if (session.status === 'connected') {
        session.sendAudio(audioData);
      }
    },
  });

  // Screen share hook
  const screenShare = useScreenShare();

  // Live session hook
  const session = useLiveSession(apiKey, config);

  // Handle tool calls from AI
  useEffect(() => {
    const handleToolCall = (event: CustomEvent) => {
      const { toolName, args, toolCallId } = event.detail;

      switch (toolName) {
        case 'draw_diagram':
          setActivePanel('whiteboard');
          setWhiteboardElements(args.elements || []);
          session.executeToolResult(toolName, {
            success: true,
            message: 'Diagram displayed',
          });
          break;

        case 'execute_code':
          setActivePanel('code');
          setCodeData({
            code: args.code,
            language: args.language,
            explanation: args.explanation,
          });
          session.executeToolResult(toolName, {
            success: true,
            message: 'Code displayed',
          });
          break;

        case 'generate_practice_problem':
          // Handle practice problem generation
          session.executeToolResult(toolName, {
            success: true,
            problem: {
              question: `Practice problem for ${args.topic}`,
              difficulty: args.difficulty,
            },
          });
          break;

        default:
          session.executeToolResult(toolName, { success: true });
      }
    };

    window.addEventListener('live:tool_call' as any, handleToolCall);
    return () =>
      window.removeEventListener('live:tool_call' as any, handleToolCall);
  }, [session]);

  // Start session
  const handleStart = async () => {
    try {
      await startMedia();
      await session.connect();

      // Start periodic frame capture for video
      if (config.videoEnabled) {
        frameIntervalRef.current = setInterval(() => {
          const frame = captureFrame();
          if (frame && session.status === 'connected') {
            session.sendImage(frame);
          }
        }, 1000 / LIVE_CONFIG.VIDEO.FRAME_RATE);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  // End session
  const handleEnd = async () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }
    stopMedia();
    screenShare.stopSharing();
    await session.disconnect();
    onEnd?.();
  };

  // Toggle screen share
  const handleToggleScreenShare = async () => {
    if (screenShare.isSharing) {
      screenShare.stopSharing();
    } else {
      await screenShare.startSharing();
    }
  };

  // Send text message
  const handleSendText = () => {
    if (textInput.trim()) {
      session.sendText(textInput);
      setTextInput('');
    }
  };

  // Handle screen share frame capture
  useEffect(() => {
    if (screenShare.isSharing && session.status === 'connected') {
      const interval = setInterval(() => {
        const frame = screenShare.captureFrame();
        if (frame) {
          session.sendImage(frame);
        }
      }, 2000); // Capture screen every 2 seconds

      return () => clearInterval(interval);
    }
  }, [screenShare.isSharing, session.status, screenShare, session]);

  // Render based on session status
  if (session.status === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            StudyLens Live Tutor
          </h1>
          <p className="text-gray-400 mb-8">
            Start a real-time tutoring session with AI. Show your work, ask
            questions, and learn interactively.
          </p>

          <div className="space-y-4 text-left mb-8">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                🎤
              </div>
              <span>Voice conversation with AI</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                📷
              </div>
              <span>Show your work via camera</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                🖥️
              </div>
              <span>Share your screen</span>
            </div>
          </div>

          <Button
            onClick={handleStart}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Start Session
          </Button>
        </div>
      </div>
    );
  }

  if (session.status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to AI Tutor...</p>
        </div>
      </div>
    );
  }

  if (session.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Connection Error
          </h2>
          <p className="text-gray-400 mb-6">{session.error}</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={onEnd} className="flex-1">
              Go Back
            </Button>
            <Button onClick={handleStart} className="flex-1">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main session UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Left: Video & Tools */}
        <div className="w-80 flex flex-col gap-4">
          {/* Video Preview */}
          <VideoPreview
            stream={videoStream}
            isEnabled={isVideoEnabled}
            label="You"
            className="aspect-video"
          />

          {/* Screen Share Preview */}
          {screenShare.isSharing && (
            <VideoPreview
              stream={screenShare.stream}
              isEnabled={true}
              isMirrored={false}
              label="Screen"
              className="aspect-video"
            />
          )}

          {/* AI Speaking Indicator */}
          {session.isAiSpeaking && (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
              <div>
                <p className="text-purple-400 font-medium">AI is speaking...</p>
                <p className="text-purple-300/60 text-sm">
                  Listening for your response
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Center: Main Panel */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Panel Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activePanel === 'transcript' ? 'default' : 'ghost'}
              onClick={() => setActivePanel('transcript')}
            >
              Transcript
            </Button>
            <Button
              variant={activePanel === 'whiteboard' ? 'default' : 'ghost'}
              onClick={() => setActivePanel('whiteboard')}
            >
              Whiteboard
            </Button>
            <Button
              variant={activePanel === 'code' ? 'default' : 'ghost'}
              onClick={() => setActivePanel('code')}
            >
              Code
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 bg-gray-800/30 rounded-xl overflow-hidden">
            {activePanel === 'transcript' && (
              <TranscriptPanel
                messages={session.messages}
                currentThought={session.currentThought}
                className="h-full"
              />
            )}

            {activePanel === 'whiteboard' && (
              <WhiteboardCanvas
                elements={whiteboardElements}
                onClear={() => setWhiteboardElements([])}
                className="h-full"
              />
            )}

            {activePanel === 'code' && codeData && (
              <CodeExecutor
                code={codeData.code}
                language={codeData.language}
                explanation={codeData.explanation}
                className="h-full"
              />
            )}
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type a message (or just speak)..."
              className="flex-1 bg-gray-800 border-gray-700"
            />
            <Button onClick={handleSendText} disabled={!textInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 flex justify-center">
        <ControlBar
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={screenShare.isSharing}
          isConnected={session.status === 'connected'}
          audioLevel={audioLevel}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onEndSession={handleEnd}
        />
      </div>
    </div>
  );
}
