'use client';

import { useScanStore } from '@/stores/scan-store';
import { useState, useRef, useCallback, useEffect } from 'react';
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
  Bot,
  History,
  Plus,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiLiveSession } from '@/lib/live/gemini-live-client';
import { LiveMessage } from '@/lib/live/live-session-service';
import { AudioVisualizer } from './audio-visualizer';
import { Header } from '../layout/header';
import { useLiveSessions } from '@/hooks/use-live-sessions';
import { MessageBubble, VoiceSelector } from './helper';
import { LIVE_CONFIG, VoiceId } from '@/lib/live/constants';

interface AudioLiveSessionProps {
  apiKey: string;
  userId?: string;
  guestSessionId?: string;
  language?: string;
  subject?: string;
  educationLevel?: string;
  initialSessionId?: string;
  maxDurationMinutes?: number;
  remainingMinutes?: number;
  onSessionStart?: () => Promise<boolean>;
  onSessionEnd?: (durationMinutes: number) => Promise<boolean>;
  onClose?: () => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export function AudioLiveSession({
  apiKey,
  userId,
  guestSessionId,
  language: propLanguage = 'en',
  subject,
  educationLevel,
  maxDurationMinutes,
  remainingMinutes,
  onSessionStart,
  onSessionEnd,
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

  // Voice selection
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>(
    LIVE_CONFIG.DEFAULT_VOICE,
  );
  const [showSettings, setShowSettings] = useState(false);

  // Messages
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTranscript, setShowTranscript] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Refs
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isCleaningUpRef = useRef(false);
  const usedDurationRef = useRef(0);

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

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const [continuationEnabled, setContinuationEnabled] = useState(false);
  const [continuationPart, setContinuationPart] = useState(0);
  const [isAutoContinuing, setIsAutoContinuing] = useState(false);

  // Duration tracking state:
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [usedDuration, setUsedDuration] = useState(0);

  const [isPaused, setIsPaused] = useState(false);

  const {
    sessions: previousSessions,
    isLoading: isLoadingSessions,
    selectedSessionId: viewingSessionId,
    sessionMessages: viewingMessages,
    loadSessionMessages,
    clearSelection: clearViewingSession,
  } = useLiveSessions({ userId, guestSessionId });

  const [responseProgress, setResponseProgress] = useState<{
    duration: number;
    chunks: number;
  } | null>(null);

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

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height → measure scrollHeight
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;

    // Apply max height constraint
    textarea.style.height = `${Math.min(scrollHeight, 120)}px`;
  }, []);

  // Handle voice change
  const handleVoiceChange = useCallback(async (voiceId: VoiceId) => {
    setSelectedVoice(voiceId);

    // If connected, need to reconnect with new voice
    if (sessionRef.current?.connected) {
      setConnectionState('connecting');
      try {
        await sessionRef.current.changeVoice(voiceId);
        setConnectionState('connected');
      } catch (err) {
        console.error('Failed to change voice:', err);
        setError('Failed to change voice');
        setConnectionState('connected'); // Stay connected with old voice
      }
    }

    // Store preference
    localStorage.setItem('preferred-voice', voiceId);
  }, []);

  // Load preferred voice on mount
  useEffect(() => {
    const savedVoice = localStorage.getItem('preferred-voice') as VoiceId;
    if (savedVoice && LIVE_CONFIG.VOICES.some((v) => v.id === savedVoice)) {
      setSelectedVoice(savedVoice);
    }
  }, []);

  // Auto-resize on content change
  useEffect(() => {
    resizeTextarea();
  }, [textInput, resizeTextarea]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const textarea = textareaRef.current;
      if (textarea) textarea.style.height = 'auto';
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Add effect to handle tab visibility:
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && connectionState === 'connected') {
        console.log('Tab hidden - connection may be affected');
        // Optionally pause or handle background state
      } else if (!document.hidden && connectionState === 'connected') {
        console.log('Tab visible - verifying connection');
        // Could trigger a health check here
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState]);

  // Handle beforeunload to clean disconnect:
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current?.connected) {
        sessionRef.current.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
    async (stream: MediaStream) => {
      try {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // Use AudioWorklet instead of ScriptProcessor
        try {
          await audioContext.audioWorklet.addModule('/audio-processor.js');

          const workletNode = new AudioWorkletNode(
            audioContext,
            'audio-processor',
          );

          workletNode.port.onmessage = (event) => {
            if (isMuted || !sessionRef.current?.connected) return;

            const { pcmData, level } = event.data;
            sessionRef.current?.sendAudio(pcmData);
            setMicLevel(level);
          };

          source.connect(workletNode);
          workletNode.connect(audioContext.destination);
        } catch (workletError) {
          // Fallback to ScriptProcessor if AudioWorklet fails
          console.warn(
            'AudioWorklet not supported, using ScriptProcessor fallback',
          );

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;
          source.connect(analyser);

          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          audioProcessorRef.current = processor;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const levelInterval = setInterval(() => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const normalizedLevel = Math.min(1, rms / 128);
            setMicLevel(normalizedLevel);
          }, 50);

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

          (audioContextRef.current as any)._levelInterval = levelInterval;
        }
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
      setIsPaused(false);
      isCleaningUpRef.current = false;

      // Check if we can start
      if (onSessionStart) {
        const canStart = await onSessionStart();
        if (!canStart) {
          setError('Unable to start session. Please check your limits.');
          return;
        }
      }

      setSessionStartTime(new Date());

      // Get previously used duration (in seconds)
      const previouslyUsedSeconds = usedDurationRef.current;
      console.log(`📊 Previously used: ${previouslyUsedSeconds}s`);

      // Calculate max allowed time
      const maxDuration = maxDurationMinutes ?? -1;
      const isUnlimited = maxDuration === -1;
      const hasRemainingLimit =
        remainingMinutes !== undefined && remainingMinutes !== -1;

      if (isUnlimited && !hasRemainingLimit) {
        // Unlimited user
        setRemainingTime(null);
        console.log('⏱️ Unlimited session - no timer');
      } else {
        // Calculate max seconds
        let maxSeconds: number | null = null;

        if (hasRemainingLimit && remainingMinutes !== undefined) {
          // User has remaining minutes limit
          const maxFromSession = maxDuration > 0 ? maxDuration * 60 : Infinity;
          maxSeconds = Math.min(maxFromSession, remainingMinutes * 60);
        } else if (maxDuration > 0) {
          // Use session max duration
          maxSeconds = maxDuration * 60;
        }

        if (maxSeconds && maxSeconds > 0 && maxSeconds !== Infinity) {
          // Subtract already used time, ensure whole number
          const remaining = Math.floor(
            Math.max(0, maxSeconds - previouslyUsedSeconds),
          );
          setRemainingTime(remaining);
          console.log(
            `⏱️ Timer set: ${maxSeconds}s max - ${previouslyUsedSeconds}s used = ${remaining}s remaining`,
          );
        } else {
          setRemainingTime(null);
        }
      }

      // Reset ref after applying
      usedDurationRef.current = 0;
      setUsedDuration(0);

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
          voiceId: selectedVoice,
          resumeSessionId: isNewSession
            ? undefined
            : currentSessionDbId || undefined,
        },
        {
          onConnected: () => {
            setConnectionState('connected');
            setIsReconnecting(false);
            setReconnectAttempt(0);
            const dbId = session.getSessionDbId();
            if (dbId) {
              setCurrentSessionDbId(dbId);
              setIsNewSession(false);
            }
            // Set session start time for duration tracking
            setSessionStartTime(new Date());

            if (stream && stream.active) {
              startAudioCapture(stream);
            }
          },
          onDisconnected: () => {
            setConnectionState('disconnected');
            setIsThinking(false);
            setIsAiSpeaking(false);
            setIsReconnecting(false);
          },
          onError: (err) => {
            setError(err.message);
            setIsReconnecting(false);
            // Don't set disconnected if reconnecting
            if (!isReconnecting) {
              setConnectionState('disconnected');
            }
            setIsThinking(false);
            setIsAiSpeaking(false);
          },
          onAudioResponse: (audioData) => {
            setIsAiSpeaking(true);
            setIsThinking(false);
            // Track progress
            setResponseProgress((prev) => ({
              duration:
                (prev?.duration || 0) + audioData.byteLength / (24000 * 2),
              chunks: (prev?.chunks || 0) + 1,
            }));
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
            setIsAutoContinuing(false);
            setIsAiSpeaking(false);
            setResponseProgress(null);
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
          onReconnecting: (attempt) => {
            setIsReconnecting(true);
            setReconnectAttempt(attempt);
            setConnectionState('connecting');
            console.log(`Reconnecting... attempt ${attempt}`);
          },
          onReconnected: () => {
            setIsReconnecting(false);
            setReconnectAttempt(0);
            setConnectionState('connected');
            setError(null);
          },
          onContinuing: (part) => {
            setContinuationPart(part);
            setIsThinking(true);
            setIsAutoContinuing(true);
          },
        },
      );

      sessionRef.current = session;
      sessionIdRef.current = session.getSessionDbId();
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
    selectedVoice,
    currentSessionDbId,
    isNewSession,
    startAudioCapture,
    stopAudioCapture,
    addMessage,
    isReconnecting,
    maxDurationMinutes,
    onSessionStart,
    remainingMinutes,
  ]);

  // function to start fresh session:
  const startNewSession = useCallback(() => {
    setCurrentSessionDbId(null);
    setIsNewSession(true);
    setMessages([]);
    setExpandedMessages(new Set());
    usedDurationRef.current = 0;
    setUsedDuration(0);
  }, []);

  // function to load and resume a previous session:
  const resumePreviousSession = useCallback(async (sessionDbId: string) => {
    try {
      // Load session details including duration
      const sessionResponse = await fetch(`/api/live-sessions/${sessionDbId}`);
      const sessionData = await sessionResponse.json();

      if (!sessionData.success || !sessionData.session) {
        console.error('Failed to load session');
        return;
      }

      const session = sessionData.session;
      const usedSeconds = session.duration || 0; // Duration already used

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
        // Set both state and ref
        setUsedDuration(usedSeconds);
        usedDurationRef.current = usedSeconds;

        console.log(`📂 Resumed session with ${usedSeconds}s already used`);
      }
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  }, []);

  const endSession = useCallback(async () => {
    // Reset pause state
    setIsPaused(false);
    // Stop audio capture first
    stopAudioCapture();

    // Calculate actual duration used in this session
    const sessionDuration = sessionStartTime
      ? (Date.now() - sessionStartTime.getTime()) / 1000 // in seconds
      : 0;

    // Update session with duration
    if (currentSessionDbId && sessionDuration > 0) {
      try {
        await fetch(`/api/live-sessions/${currentSessionDbId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration: sessionDuration,
            status: 'paused', // Mark as paused, not ended
          }),
        });
      } catch (err) {
        console.error('Failed to update session duration:', err);
      }
    }

    // Callback for billing/tracking
    if (onSessionEnd && sessionDuration > 0) {
      await onSessionEnd(sessionDuration / 60); // Convert to minutes
    }

    setSessionStartTime(null);
    setRemainingTime(null);

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
  }, [sessionStartTime, currentSessionDbId, onSessionEnd, stopAudioCapture]);

  useEffect(() => {
    // Skip if no timer, unlimited, paused, or user actively engaged (not auto-continuation)
    const shouldPause =
      isPaused ||
      (isAiSpeaking && !isAutoContinuing) ||
      (isThinking && !isAutoContinuing);

    if (
      !sessionStartTime ||
      remainingTime === null ||
      remainingTime <= 0 ||
      shouldPause
    ) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 1) {
          endSession();
          return null;
        }
        return Math.floor(prev - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    sessionStartTime,
    remainingTime,
    isPaused,
    isAiSpeaking,
    isThinking,
    isAutoContinuing,
    endSession,
  ]);

  // pause/resume function
  const togglePause = useCallback(() => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);

    // Also mute mic when paused
    if (newPaused) {
      if (audioStreamRef.current) {
        audioStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    } else {
      if (audioStreamRef.current && !isMuted) {
        audioStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
    }
  }, [isPaused, isMuted]);

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
    try {
      await sessionRef.current.sendText(text);
    } catch (err) {
      console.error('Failed to send text:', err);
    }
  }, [textInput]);

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
    const currentSessionId = sessionIdRef.current;

    return () => {
      // Only cleanup if same session (not Fast Refresh)
      if (sessionRef.current && sessionIdRef.current === currentSessionId) {
        stopAudioCapture();
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
            {/* Voice Selector - Only show when not connected */}
            <VoiceSelector
              selectedVoice={selectedVoice}
              onVoiceChange={handleVoiceChange}
              disabled={connectionState === 'connecting'}
            />

            {/* New Session Button */}
            <button
              onClick={() => {
                startNewSession();
                setShowHistory(false);
              }}
              className="p-2 rounded-lg transition-colors
                bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)]
                hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
              title="New Session"
            >
              <Plus className="w-4 h-4 text-[hsl(var(--primary))]" />
            </button>

            {/* Audio Transcription Toggle */}
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

            {/* Live Audio Session */}
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

        {/* Show current voice when connected */}
        {connectionState === 'connected' && (
          <div className="px-4 py-1 bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))] flex items-center gap-2 text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">Voice:</span>
            <span className="font-medium">
              {LIVE_CONFIG.VOICES.find((v) => v.id === selectedVoice)?.name}
              {
                LIVE_CONFIG.VOICES.find((v) => v.id === selectedVoice)?.gender
              }{' '}
            </span>
          </div>
        )}

        {/* Add progress display in UI: */}
        {isAiSpeaking && responseProgress && responseProgress.duration > 5 && (
          <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            Recording: {responseProgress.duration.toFixed(1)}s
          </div>
        )}

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
              {connectionState === 'connecting' && !isReconnecting && (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              )}
              {connectionState === 'connecting' && isReconnecting && (
                <span className="flex items-center gap-2 text-[hsl(var(--warning))]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reconnecting... ({reconnectAttempt}/3)
                </span>
              )}
              {connectionState === 'connected' && isPaused && (
                <span className="flex items-center gap-2 text-[hsl(var(--warning))]">
                  <Pause className="w-4 h-4" />
                  Paused
                </span>
              )}
              {connectionState === 'connected' &&
                !isPaused &&
                (isThinking
                  ? 'Thinking...'
                  : isAiSpeaking
                    ? 'Speaking...'
                    : 'Listening...')}
            </p>

            {/* Show remaining time in UI (add near status): */}
            {/* Timer - only show if there's a limit */}
            {remainingTime !== null &&
              remainingTime > 0 &&
              connectionState === 'connected' && (
                <p
                  className={cn(
                    'text-xs pb-2 flex items-center gap-1',
                    remainingTime < 60
                      ? 'text-[hsl(var(--destructive))]'
                      : 'text-[hsl(var(--muted-foreground))]',
                  )}
                >
                  {isPaused && <Pause className="w-3 h-3" />}
                  {Math.floor(remainingTime / 60)}:
                  {Math.floor(remainingTime % 60)
                    .toString()
                    .padStart(2, '0')}{' '}
                  remaining
                  {isPaused && <span className="ml-1">(paused)</span>}
                </p>
              )}

            {error && (
              <p className="text-[hsl(var(--destructive))] text-xs mb-4">
                {error}
              </p>
            )}
            {/* Visualizer Circle */}
            <div className="relative w-32 h-32 mb-6 z-0">
              {/* Background Ring with Pulse */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-300',
                  connectionState === 'connected'
                    ? isPaused
                      ? 'bg-[hsl(var(--warning)/0.15)] ring-2 ring-[hsl(var(--warning))]'
                      : isThinking
                        ? 'bg-[hsl(var(--warning)/0.15)] ring-2 ring-[hsl(var(--warning))]'
                        : isAiSpeaking
                          ? 'bg-[hsl(var(--success)/0.15)] ring-2 ring-[hsl(var(--success))]'
                          : isMuted
                            ? 'bg-[hsl(var(--destructive)/0.15)] ring-2 ring-[hsl(var(--destructive))]'
                            : 'bg-[hsl(var(--primary)/0.15)] ring-2 ring-[hsl(var(--primary))]'
                    : connectionState === 'connecting'
                      ? isReconnecting
                        ? 'bg-[hsl(var(--warning)/0.15)] ring-2 ring-[hsl(var(--warning))] animate-pulse'
                        : 'bg-[hsl(var(--primary)/0.15)] ring-2 ring-[hsl(var(--primary))] animate-pulse'
                      : 'bg-[hsl(var(--muted))]',
                )}
              >
                {/* Animated pulse ring when active (not when paused) */}
                {connectionState === 'connected' &&
                  !isPaused &&
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
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                disabled={connectionState !== 'connected' || isPaused}
                className={cn(
                  'p-3 rounded-full transition-all',
                  connectionState !== 'connected' || isPaused
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

              {/* Pause/Resume Button - NEW */}
              <button
                onClick={togglePause}
                disabled={connectionState !== 'connected'}
                className={cn(
                  'p-3 rounded-full transition-all',
                  connectionState !== 'connected'
                    ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                    : isPaused
                      ? 'bg-[hsl(var(--warning))] text-white'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
                )}
                title={isPaused ? 'Resume session' : 'Pause session'}
              >
                {isPaused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
              </button>

              {/* Call Button */}
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

              {/* Speaker Button */}
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
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  const newValue = !continuationEnabled;
                  setContinuationEnabled(newValue);
                  if (sessionRef.current) {
                    if (newValue) {
                      sessionRef.current.enableContinuation();
                    } else {
                      sessionRef.current.disableContinuation();
                    }
                  }
                }}
                disabled={connectionState !== 'connected'}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-all',
                  connectionState !== 'connected'
                    ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                    : continuationEnabled
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]',
                )}
                title="Enable for longer responses"
              >
                {continuationEnabled ? '📖 Long Response' : '📄 Normal'}
              </button>
            </div>
            {!isAiSpeaking && !isThinking && messages.length > 0 && (
              <button
                onClick={() => {
                  // Unpause if paused
                  if (isPaused) {
                    setIsPaused(false);
                    // Re-enable mic if not muted
                    if (audioStreamRef.current && !isMuted) {
                      audioStreamRef.current
                        .getAudioTracks()
                        .forEach((track) => {
                          track.enabled = true;
                        });
                    }
                  }

                  if (sessionRef.current?.connected) {
                    sessionRef.current.sendText('Please continue explaining');
                  }
                }}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs
                  bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]
                  text-[hsl(var(--foreground))] pb-2"
              >
                Continue →
              </button>
            )}
            {/* Show continuation progress: */}
            {continuationPart > 0 && isThinking && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Continuing... (Part {continuationPart + 1})
              </p>
            )}
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
                <div className="flex gap-2 items-end">
                  {/* <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Send on Enter, new line on Shift+Enter
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendText();
                      }
                    }}
                    placeholder={
                      connectionState === 'connected'
                        ? 'Type a message... (Enter to send, Shift+Enter for new line)'
                        : 'Connect first'
                    }
                    disabled={connectionState !== 'connected'}
                    rows={1}
                    className="flex-1 bg-[hsl(var(--background))] rounded-lg px-3 py-2 text-sm
                 border border-[hsl(var(--input))] disabled:opacity-50
                 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
                    style={{
                      height: 'auto',
                    }}
                    onInput={(e) => {
                      // Auto-resize textarea
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                  /> */}
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendText();
                        return;
                      }
                      // Shift+Enter → new line (allow growth)
                    }}
                    placeholder={
                      connectionState === 'connected'
                        ? 'Type a message... (Enter → send, Shift+Enter → new line)'
                        : 'Connect first'
                    }
                    disabled={connectionState !== 'connected'}
                    className="flex-1 min-h-[40px] max-h-[120px] bg-[hsl(var(--background))] rounded-lg px-4 py-3 text-sm border border-[hsl(var(--input))] disabled:opacity-50 resize-none transition-all"
                    rows={1} // ✅ Start as single line input
                    style={{ height: 'auto' }}
                    ref={textareaRef} // Add ref
                  />
                  <button
                    onClick={handleSendText}
                    disabled={
                      connectionState !== 'connected' || !textInput.trim()
                    }
                    className="p-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
                 rounded-lg disabled:opacity-50 transition-colors shrink-0 h-10 w-10
                 flex items-center justify-center hover:bg-[hsl(var(--primary)/0.9)]"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 text-right">
                  Enter to send • Shift+Enter for new line
                </p>
              </div>
            </div>
          )}
        </div>
        {connectionState === 'connected' && (
          <div className="flex items-center gap-1.5 text-xs">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isReconnecting
                  ? 'bg-[hsl(var(--warning))] animate-pulse'
                  : 'bg-[hsl(var(--success))]',
              )}
            />
            <span className="text-[hsl(var(--muted-foreground))]">
              {isReconnecting ? 'Reconnecting...' : 'Connected'}
            </span>
          </div>
        )}
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
