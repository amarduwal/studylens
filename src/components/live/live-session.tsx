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
import { SessionConfig } from '@/types/live';
import { LIVE_CONFIG } from '@/lib/live/constants';
import { Loader2, AlertCircle, Sparkles, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [whiteboardTitle, setWhiteboardTitle] = useState<string>('');
  const [codeData, setCodeData] = useState<{
    code: string;
    language: 'javascript' | 'python';
    explanation?: string;
  } | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);

  // Live session hook
  const session = useLiveSession(apiKey, config);

  // Media stream hook - pass sendAudio from session
  const media = useMediaStream({
    enableAudio: config.voiceEnabled,
    enableVideo: config.videoEnabled,
    onAudioData: useCallback(
      (audioData: ArrayBuffer) => {
        if (session.status === 'connected') {
          session.sendAudio(audioData);
        }
      },
      [session.status, session.sendAudio],
    ),
  });

  // Screen share hook
  const screenShare = useScreenShare();

  // Handle tool calls from AI
  useEffect(() => {
    const handleToolCall = (event: CustomEvent) => {
      const { toolName, args, toolCallId } = event.detail;
      console.log('Handling tool call:', toolName, args);

      switch (toolName) {
        case 'draw_diagram':
          setActivePanel('whiteboard');
          setWhiteboardElements(args.elements || []);
          setWhiteboardTitle(args.title || '');
          session.executeToolResult(toolName, {
            success: true,
            message: 'Diagram displayed to student',
          });
          break;

        case 'execute_code':
          setActivePanel('code');
          setCodeData({
            code: args.code,
            language: args.language || 'javascript',
            explanation: args.explanation,
          });
          session.executeToolResult(toolName, {
            success: true,
            message: 'Code displayed and ready to run',
          });
          break;

        case 'generate_practice_problem':
          session.executeToolResult(toolName, {
            success: true,
            problem: {
              question: `Here's a ${args.difficulty} ${args.type} problem about ${args.topic}`,
              difficulty: args.difficulty,
              type: args.type,
            },
          });
          break;

        case 'show_step_by_step':
          // Could show in a dedicated panel
          session.executeToolResult(toolName, {
            success: true,
            message: 'Step-by-step solution displayed',
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
    if (sessionStartedRef.current || isStarting) return;

    setIsStarting(true);
    sessionStartedRef.current = true;

    try {
      console.log('Starting media...');
      const mediaStarted = await media.startMedia();

      if (!mediaStarted) {
        console.error('Failed to start media');
        sessionStartedRef.current = false;
        setIsStarting(false);
        return;
      }

      console.log('Media started, connecting to Gemini...');
      await session.connect();

      // Start periodic frame capture for video
      if (config.videoEnabled) {
        console.log('Starting video frame capture...');
        frameIntervalRef.current = setInterval(() => {
          const frame = media.captureFrame();
          if (frame && session.status === 'connected') {
            session.sendImage(frame);
          }
        }, 1000 / LIVE_CONFIG.VIDEO.FRAME_RATE);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      sessionStartedRef.current = false;
    } finally {
      setIsStarting(false);
    }
  };

  // End session
  const handleEnd = async () => {
    console.log('Ending session...');

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    media.stopMedia();
    screenShare.stopSharing();
    await session.disconnect();

    sessionStartedRef.current = false;
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
    if (textInput.trim() && session.status === 'connected') {
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
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [
    screenShare.isSharing,
    session.status,
    screenShare.captureFrame,
    session.sendImage,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  // Render idle state (pre-session)
  if (session.status === 'idle' && !isStarting) {
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

          {media.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{media.error}</p>
            </div>
          )}

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
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Session'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Render connecting state
  if (session.status === 'connecting' || isStarting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to AI Tutor...</p>
          <p className="text-gray-500 text-sm mt-2">
            Please allow camera and microphone access if prompted
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (session.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Connection Error
          </h2>
          <p className="text-gray-400 mb-6">
            {session.error || 'Failed to connect to AI Tutor'}
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={onEnd} className="flex-1">
              Go Back
            </Button>
            <Button
              onClick={() => {
                sessionStartedRef.current = false;
                handleStart();
              }}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
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
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Sidebar: Video & Status */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0">
          {/* Video Preview */}
          <VideoPreview
            stream={media.videoStream}
            isEnabled={media.isVideoEnabled}
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

          {/* Session Status */}
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Status</span>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  session.status === 'connected'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400',
                )}
              >
                {session.status === 'connected' ? 'Connected' : session.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Messages</span>
              <span className="text-white">{session.messages.length}</span>
            </div>
          </div>

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
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Panel Tabs */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant={activePanel === 'transcript' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel('transcript')}
            >
              Transcript
            </Button>
            <Button
              variant={activePanel === 'whiteboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel('whiteboard')}
            >
              Whiteboard
              {whiteboardElements.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {whiteboardElements.length}
                </span>
              )}
            </Button>
            <Button
              variant={activePanel === 'code' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel('code')}
            >
              Code
              {codeData && (
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 bg-gray-800/30 rounded-xl overflow-hidden min-h-0">
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
                title={whiteboardTitle}
                onClear={() => {
                  setWhiteboardElements([]);
                  setWhiteboardTitle('');
                }}
                className="h-full"
              />
            )}

            {activePanel === 'code' && codeData && (
              <div className="h-full overflow-auto p-4">
                <CodeExecutor
                  code={codeData.code}
                  language={codeData.language}
                  explanation={codeData.explanation}
                />
              </div>
            )}

            {activePanel === 'code' && !codeData && (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>No code to display yet. Ask the AI to demonstrate code!</p>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="flex gap-2 flex-shrink-0">
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder="Type a message (or just speak)..."
              className="flex-1 bg-gray-800 border-gray-700"
              disabled={session.status !== 'connected'}
            />
            <Button
              onClick={handleSendText}
              disabled={!textInput.trim() || session.status !== 'connected'}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 flex justify-center flex-shrink-0">
        <ControlBar
          isAudioEnabled={media.isAudioEnabled}
          isVideoEnabled={media.isVideoEnabled}
          isScreenSharing={screenShare.isSharing}
          isConnected={session.status === 'connected'}
          audioLevel={media.audioLevel}
          onToggleAudio={media.toggleAudio}
          onToggleVideo={media.toggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onEndSession={handleEnd}
        />
      </div>
    </div>
  );
}
