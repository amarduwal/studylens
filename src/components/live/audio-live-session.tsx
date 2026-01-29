'use client';

import { useScanStore } from '@/stores/scan-store';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  X,
  Loader2,
  Play,
  Square,
  User,
  Bot,
  History,
  ChevronDown,
  Clock,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiLiveSession } from '@/lib/live/gemini-live-client';
import { LiveMessage } from '@/lib/live/live-session-service';
import { AudioVisualizer } from './audio-visualizer';
import { Header } from '../layout/header';
import { useLiveSessions } from '@/hooks/use-live-sessions';

interface AudioLiveSessionProps {
  apiKey: string;
  userId?: string;
  guestSessionId?: string;
  language?: string;
  subject?: string;
  educationLevel?: string;
  onClose?: () => void;
  initialSessionId?: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export function AudioLiveSession({
  apiKey,
  userId,
  guestSessionId,
  language: propLanguage = 'en',
  subject,
  educationLevel,
  onClose,
}: AudioLiveSessionProps) {
  const { selectedLanguage } = useScanStore();
  const language = selectedLanguage || propLanguage;
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Messages
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTranscript, setShowTranscript] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Refs
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isCleaningUpRef = useRef(false);

  const [audioLevel, setAudioLevel] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  const [showHistory, setShowHistory] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );

  const [currentSessionDbId, setCurrentSessionDbId] = useState<string | null>(
    null,
  );
  const [isNewSession, setIsNewSession] = useState(true);

  const {
    sessions: previousSessions,
    isLoading: isLoadingSessions,
    selectedSessionId: viewingSessionId,
    sessionMessages: viewingMessages,
    loadSessionMessages,
    clearSelection: clearViewingSession,
  } = useLiveSessions({ userId, guestSessionId });

  const toggleMessageExpand = useCallback((messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const addMessage = useCallback((message: LiveMessage) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (message.id && prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const startAudioCapture = useCallback(
    (stream: MediaStream) => {
      try {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // Add analyser for mic visualization
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Separate interval for smoother visualization
        const levelInterval = setInterval(() => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);

          // Calculate RMS for more accurate level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalizedLevel = Math.min(1, rms / 128);

          setMicLevel(normalizedLevel);
        }, 50); // Update every 50ms

        processor.onaudioprocess = (e) => {
          if (isMuted || !sessionRef.current?.connected) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);

          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(
              -32768,
              Math.min(32767, inputData[i] * 32768),
            );
          }

          sessionRef.current?.sendAudio(pcmData.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        // Store interval for cleanup
        (audioContextRef.current as any)._levelInterval = levelInterval;
      } catch (err) {
        console.error('Audio capture error:', err);
      }
    },
    [isMuted],
  );

  // Update stopAudioCapture to clear interval:
  const stopAudioCapture = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
      // Clear level interval
      if (
        audioContextRef.current &&
        (audioContextRef.current as any)._levelInterval
      ) {
        clearInterval((audioContextRef.current as any)._levelInterval);
      }

      if (audioProcessorRef.current) {
        try {
          audioProcessorRef.current.disconnect();
        } catch (e) {}
        audioProcessorRef.current = null;
      }

      if (audioContextRef.current) {
        const state = audioContextRef.current.state;
        if (state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        audioContextRef.current = null;
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
        audioStreamRef.current = null;
      }

      setMicLevel(0);
      setAudioLevel(0);
    } finally {
      isCleaningUpRef.current = false;
    }
  }, []);

  const startSession = useCallback(async () => {
    try {
      setConnectionState('connecting');
      setError(null);
      setMessages([]);
      isCleaningUpRef.current = false;

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      audioStreamRef.current = stream;

      // Create session
      const session = new GeminiLiveSession(
        apiKey,
        {
          userId,
          guestSessionId,
          language,
          subject,
          educationLevel,
          resumeSessionId: isNewSession
            ? undefined
            : currentSessionDbId || undefined,
        },
        {
          onConnected: () => {
            setConnectionState('connected');
            const dbId = session.getSessionDbId();
            if (dbId) {
              setCurrentSessionDbId(dbId);
              setIsNewSession(false);
            }
            startAudioCapture(stream);
          },
          onDisconnected: () => {
            setConnectionState('disconnected');
            setIsThinking(false);
            setIsAiSpeaking(false);
          },
          onError: (err) => {
            setError(err.message);
            setConnectionState('disconnected');
            setIsThinking(false);
            setIsAiSpeaking(false);
          },
          onAudioResponse: () => {
            setIsAiSpeaking(true);
            setIsThinking(false);
          },
          onTextResponse: () => {
            // Text is handled via onMessageSaved
          },
          onTranscript: () => {
            // Transcripts are saved via onMessageSaved
          },
          onInterrupted: () => {
            setIsAiSpeaking(false);
            setIsThinking(false);
          },
          onTurnComplete: () => {
            setIsAiSpeaking(false);
          },
          onMessageSaved: (message: LiveMessage) => {
            addMessage(message);
          },
          onThinkingStart: () => {
            setIsThinking(true);
          },
          onThinkingEnd: () => {
            setIsThinking(false);
          },
          onAudioLevel: (level: number) => {
            setAudioLevel(level);
          },
        },
      );

      sessionRef.current = session;
      await session.connect();
    } catch (err) {
      console.error('Failed to start:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setConnectionState('disconnected');
      stopAudioCapture();
    }
  }, [
    apiKey,
    userId,
    guestSessionId,
    language,
    subject,
    educationLevel,
    currentSessionDbId,
    isNewSession,
    startAudioCapture,
    stopAudioCapture,
    addMessage,
  ]);

  // function to start fresh session:
  const startNewSession = useCallback(() => {
    setCurrentSessionDbId(null);
    setIsNewSession(true);
    setMessages([]);
    setExpandedMessages(new Set());
  }, []);

  // function to load and resume a previous session:
  const resumePreviousSession = useCallback(async (sessionDbId: string) => {
    try {
      // Load messages first
      const response = await fetch(
        `/api/live-sessions/${sessionDbId}/messages`,
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
        setCurrentSessionDbId(sessionDbId);
        setIsNewSession(false);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  }, []);

  const endSession = useCallback(async () => {
    // Stop audio capture first
    stopAudioCapture();

    // Then disconnect session
    if (sessionRef.current) {
      try {
        await sessionRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting session:', e);
      }
      sessionRef.current = null;
    }

    setConnectionState('disconnected');
    setIsThinking(false);
    setIsAiSpeaking(false);
  }, [stopAudioCapture]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
  }, [isMuted]);

  const handleSendText = useCallback(async () => {
    if (!textInput.trim() || !sessionRef.current?.connected) return;

    const text = textInput.trim();
    setTextInput('');
    await sessionRef.current.sendText(text);
  }, [textInput]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText],
  );

  // Audio playback for stored audio
  const playStoredAudio = useCallback((messageId: string, audioUrl: string) => {
    // Stop current playback
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    playbackAudioRef.current = audio;
    setCurrentlyPlaying(messageId);

    audio.onended = () => {
      setCurrentlyPlaying(null);
      playbackAudioRef.current = null;
    };

    audio.onerror = () => {
      setCurrentlyPlaying(null);
      playbackAudioRef.current = null;
      console.error('Error playing audio');
    };

    audio.play().catch((err) => {
      console.error('Failed to play audio:', err);
      setCurrentlyPlaying(null);
    });
  }, []);

  const stopStoredAudio = useCallback(() => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setCurrentlyPlaying(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
      if (sessionRef.current) {
        sessionRef.current.disconnect().catch(() => {});
        sessionRef.current = null;
      }
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current = null;
      }
    };
  }, [stopAudioCapture]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      {/* Centered Container */}
      <div className="mx-auto w-full max-w-2xl flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 backdrop-blur">
          <div>
            <h1 className="text-lg font-bold text-gradient">AI Study Tutor</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {subject || 'General Study Help'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showTranscript
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]',
              )}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                startNewSession();
                setShowHistory(false);
              }}
              className="w-full p-3 rounded-lg text-left transition-colors mb-2
             bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)]
             hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span className="text-sm font-medium text-[hsl(var(--primary))]">
                  Start New Session
                </span>
              </div>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showHistory
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]',
              )}
              title="Session history"
            >
              <History className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                onClick={() => {
                  endSession();
                  onClose();
                }}
                className="p-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--destructive))] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content - Stacked on Mobile, Side by Side on Desktop */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Audio Section */}
          <div
            className={cn(
              'flex flex-col items-center justify-center p-6 transition-all',
              showTranscript ? 'flex-shrink-0' : 'flex-1',
            )}
          >
            {/* Status */}
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {connectionState === 'disconnected' && 'Tap to start'}
              {connectionState === 'connecting' && (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              )}
              {connectionState === 'connected' &&
                (isThinking
                  ? 'Thinking...'
                  : isAiSpeaking
                    ? 'Speaking...'
                    : 'Listening...')}
            </p>
            {error && (
              <p className="text-[hsl(var(--destructive))] text-xs mb-4">
                {error}
              </p>
            )}

            {/* Visualizer Circle */}
            <div className="relative w-32 h-32 mb-6">
              {/* Background Ring with Pulse */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-300',
                  connectionState === 'connected'
                    ? isThinking
                      ? 'bg-[hsl(var(--warning)/0.15)] ring-2 ring-[hsl(var(--warning))]'
                      : isAiSpeaking
                        ? 'bg-[hsl(var(--success)/0.15)] ring-2 ring-[hsl(var(--success))]'
                        : isMuted
                          ? 'bg-[hsl(var(--destructive)/0.15)] ring-2 ring-[hsl(var(--destructive))]'
                          : 'bg-[hsl(var(--primary)/0.15)] ring-2 ring-[hsl(var(--primary))]'
                    : 'bg-[hsl(var(--muted))]',
                )}
              >
                {/* Animated pulse ring when active */}
                {connectionState === 'connected' &&
                  (isAiSpeaking || (!isMuted && !isThinking)) && (
                    <div
                      className={cn(
                        'absolute inset-0 rounded-full animate-ping opacity-20',
                        isAiSpeaking
                          ? 'bg-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--primary))]',
                      )}
                      style={{ animationDuration: '1.5s' }}
                    />
                  )}
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                {connectionState === 'connected' &&
                (isAiSpeaking || (!isMuted && !isThinking)) ? (
                  // Show visualizer when speaking or listening
                  <div className="w-20 h-12">
                    <AudioVisualizer
                      audioLevel={isAiSpeaking ? audioLevel : micLevel}
                      isActive={true}
                      isSpeaking={isAiSpeaking}
                    />
                  </div>
                ) : (
                  // Show icon otherwise
                  <>
                    {isThinking ? (
                      <Loader2 className="w-10 h-10 text-[hsl(var(--warning))] animate-spin" />
                    ) : connectionState === 'connecting' ? (
                      <Loader2 className="w-10 h-10 text-[hsl(var(--primary))] animate-spin" />
                    ) : isMuted ? (
                      <MicOff className="w-10 h-10 text-[hsl(var(--destructive))]" />
                    ) : (
                      <Mic
                        className={cn(
                          'w-10 h-10',
                          connectionState === 'connected'
                            ? 'text-[hsl(var(--primary))]'
                            : 'text-[hsl(var(--muted-foreground))]',
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                disabled={connectionState !== 'connected'}
                className={cn(
                  'p-3 rounded-full transition-all',
                  connectionState !== 'connected'
                    ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                    : isMuted
                      ? 'bg-[hsl(var(--destructive))] text-white'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
                )}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={
                  connectionState === 'disconnected' ? startSession : endSession
                }
                disabled={connectionState === 'connecting'}
                className={cn(
                  'p-4 rounded-full transition-all glow-hover',
                  connectionState === 'disconnected'
                    ? 'bg-[hsl(var(--success))] text-white'
                    : connectionState === 'connecting'
                      ? 'bg-[hsl(var(--warning))] text-white cursor-not-allowed'
                      : 'bg-[hsl(var(--destructive))] text-white',
                )}
              >
                {connectionState === 'disconnected' ? (
                  <Phone className="w-6 h-6" />
                ) : connectionState === 'connecting' ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <PhoneOff className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={() => setIsSpeakerOn((prev) => !prev)}
                disabled={connectionState !== 'connected'}
                className={cn(
                  'p-3 rounded-full transition-all',
                  connectionState !== 'connected'
                    ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                    : isSpeakerOn
                      ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]'
                      : 'bg-[hsl(var(--destructive))] text-white',
                )}
              >
                {isSpeakerOn ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {showHistory && (
            <div className="flex-1 flex flex-col border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-0">
              <div className="p-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <History className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Previous Sessions
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded hover:bg-[hsl(var(--muted))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoadingSessions ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-[hsl(var(--muted-foreground))]" />
                  </div>
                ) : previousSessions.length === 0 ? (
                  <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No previous sessions</p>
                  </div>
                ) : (
                  previousSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => resumePreviousSession(session.id)}
                      className={cn(
                        'w-full p-3 rounded-lg text-left transition-colors',
                        'bg-[hsl(var(--background))] border border-[hsl(var(--border))]',
                        'hover:border-[hsl(var(--primary))]',
                        currentSessionDbId === session.id &&
                          'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {session.subject || 'General'}
                        </span>
                        <div className="flex items-center gap-2">
                          {currentSessionDbId === session.id && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                              Current
                            </span>
                          )}
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              session.status === 'ended'
                                ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                                : 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
                            )}
                          >
                            {session.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <MessageSquare className="w-3 h-3" />
                        <span>{session.messageCount} messages</span>
                        <span>•</span>
                        <span>
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Show selected session messages */}
              {viewingSessionId && viewingMessages.length > 0 && (
                <div className="border-t border-[hsl(var(--border))]">
                  <div className="p-2 bg-[hsl(var(--muted)/0.3)] flex items-center justify-between">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {viewingMessages.length} messages
                    </span>
                    <button
                      onClick={clearViewingSession}
                      className="text-xs text-[hsl(var(--primary))] hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-3 space-y-2">
                    {viewingMessages.map((msg, i) => (
                      <div
                        key={msg.id || i}
                        className={cn(
                          'text-xs p-2 rounded',
                          msg.role === 'user'
                            ? 'bg-[hsl(var(--primary)/0.1)] ml-4'
                            : 'bg-[hsl(var(--muted))] mr-4',
                        )}
                      >
                        <p className="line-clamp-2">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversation Section */}
          {showTranscript && (
            <div className="flex-1 flex flex-col border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-0">
              {/* Messages Header */}
              <div className="p-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Conversation
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    ({messages.length})
                  </span>
                </h3>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && !isThinking ? (
                  <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Start speaking or type</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => (
                      <MessageBubble
                        key={msg.id || `${msg.role}-${index}`}
                        message={msg}
                        isPlaying={currentlyPlaying === msg.id}
                        isExpanded={expandedMessages.has(
                          msg.id || `${msg.role}-${index}`,
                        )}
                        onToggleExpand={() =>
                          toggleMessageExpand(msg.id || `${msg.role}-${index}`)
                        }
                        onPlay={() =>
                          msg.audioUrl &&
                          msg.id &&
                          playStoredAudio(msg.id, msg.audioUrl)
                        }
                        onStop={stopStoredAudio}
                      />
                    ))}

                    {isThinking && <ThinkingIndicator />}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Text Input */}
              <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      connectionState === 'connected'
                        ? 'Type a message...'
                        : 'Connect first'
                    }
                    disabled={connectionState !== 'connected'}
                    className="flex-1 bg-[hsl(var(--background))] rounded-lg px-3 py-2 text-sm
                           border border-[hsl(var(--input))] focus:outline-none focus:ring-2
                           focus:ring-[hsl(var(--ring))] disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendText}
                    disabled={
                      connectionState !== 'connected' || !textInput.trim()
                    }
                    className="p-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
                           rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Thinking Indicator Component - Grey/Subtle
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 opacity-70">
      <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="flex-1 p-3 rounded-2xl rounded-tl-sm bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.5)]">
        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
          <div className="flex gap-1">
            <span
              className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs italic">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

interface MessageWithThinking extends LiveMessage {
  thinkingContext?: string;
  processingTime?: number;
}

// Message Bubble Component
interface MessageBubbleProps {
  message: LiveMessage;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPlay: () => void;
  onStop: () => void;
}

function MessageBubble({
  message,
  isPlaying,
  isExpanded,
  onToggleExpand,
  onPlay,
  onStop,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const processingTime = (message.metadata as any)?.processingTime;

  // Truncate content for preview
  const previewLength = 50;
  const hasLongContent = message.content.length > previewLength;
  const previewContent = hasLongContent
    ? message.content.substring(0, previewLength) + '...'
    : message.content;

  return (
    <div className={cn('flex items-start gap-2', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary))]',
        )}
      >
        {isUser ? (
          <User className="w-3 h-3 text-[hsl(var(--primary-foreground))]" />
        ) : (
          <Bot className="w-3 h-3 text-[hsl(var(--secondary-foreground))]" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          isUser && 'flex flex-col items-end',
        )}
      >
        {/* Clickable Message Bubble */}
        <button
          onClick={onToggleExpand}
          className={cn(
            'px-3 py-2 rounded-2xl text-sm text-left w-full transition-all',
            isUser
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-sm'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-tl-sm',
            !isExpanded && 'hover:opacity-90',
          )}
        >
          {isExpanded ? (
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <p className="truncate flex-1 opacity-70">{previewContent}</p>
              {hasLongContent && (
                <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
              )}
            </div>
          )}
        </button>

        {/* Expanded Meta & Audio */}
        {isExpanded && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.createdAt)}</span>

            {processingTime && (
              <>
                <span>•</span>
                <span>{processingTime}ms</span>
              </>
            )}

            {!isUser && message.audioUrl && (
              <>
                <span>•</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isPlaying ? onStop() : onPlay();
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors',
                    'bg-[hsl(var(--background))] border border-[hsl(var(--border))]',
                    'hover:border-[hsl(var(--primary))]',
                    isPlaying &&
                      'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]',
                  )}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-3 h-3 text-[hsl(var(--primary))]" />
                      <AudioWaveform />
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Play</span>
                      {message.duration && (
                        <span className="opacity-60">
                          {formatDuration(message.duration)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="ml-auto"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Collapsed: Just show play button if audio */}
        {!isExpanded && !isUser && message.audioUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              isPlaying ? onStop() : onPlay();
            }}
            className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]"
          >
            {isPlaying ? (
              <>
                <Square className="w-3 h-3 text-[hsl(var(--primary))]" />
                <AudioWaveform />
              </>
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Audio Waveform Animation
function AudioWaveform() {
  return (
    <div className="flex items-center gap-0.5 ml-1">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-[hsl(var(--primary))] rounded-full animate-pulse"
          style={{
            height: `${6 + Math.random() * 6}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.5s',
          }}
        />
      ))}
    </div>
  );
}

// Utility Functions
function formatTime(date?: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
