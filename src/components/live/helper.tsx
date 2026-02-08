import { LIVE_CONFIG, VoiceId, VoiceOption } from '@/lib/live/constants';
import { LiveMessage } from '@/lib/live/live-session-service';
import { cn } from '@/lib/utils';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MessageSquare,
  Mic,
  Play,
  Square,
  User,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { StructuredResponseDisplay } from './structured-response';

// Message Bubble Component
interface MessageBubbleProps {
  message: LiveMessage;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPlay: () => void;
  onStop: () => void;
}

export function MessageBubble({
  message,
  isPlaying,
  isExpanded,
  onToggleExpand,
  onPlay,
  onStop,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Parse metadata safely
  const metadata = (message.metadata || {}) as {
    structured?: {
      explanation?: {
        simpleAnswer?: string;
        stepByStep?: {
          step: number;
          action: string;
          explanation: string;
          formula?: string | null;
        }[];
        concept?: string | null;
        whyItMatters?: string | null;
        practiceQuestions?: string[];
        tips?: string[];
      };
      subject?: string | null;
      topic?: string | null;
      difficulty?: 'easy' | 'medium' | 'hard' | null;
      keywords?: string[];
      summary?: string;
    };
    analysisComplete?: boolean;
    voiceId?: string;
    processingTime?: number;
    audioDuration?: number;
    inputType?: 'voice' | 'text';
    hasTranscript?: boolean;
  };

  const structured = metadata.structured;
  const analysisComplete = metadata.analysisComplete;
  const isVoiceInput =
    isUser && (metadata.inputType === 'voice' || message.type === 'audio');
  const voiceId = metadata.voiceId;
  const voice = voiceId
    ? LIVE_CONFIG.VOICES.find((v) => v.id === voiceId)
    : null;

  // Check for valid structured data - be more thorough
  const hasValidStructured =
    !isUser &&
    structured &&
    structured.explanation &&
    (structured.explanation.simpleAnswer ||
      (structured.explanation.stepByStep &&
        structured.explanation.stepByStep.length > 0));

  const hasAnyStructured = structured && Object.keys(structured).length > 0;

  // Check if analysis pending
  const isAnalyzing =
    !isUser &&
    !analysisComplete &&
    !hasValidStructured &&
    !hasAnyStructured &&
    message.content &&
    message.content.length > 30 &&
    !message.content.startsWith('[Audio response');

  // Get display content for preview
  const getPreviewContent = (): string => {
    if (isUser) {
      if (isVoiceInput && !message.content) {
        return '🎤 Voice input';
      }
      return message.content || 'Voice input';
    }

    // For AI: prefer structured data
    if (hasValidStructured && structured?.explanation?.simpleAnswer) {
      return structured.explanation.simpleAnswer;
    }
    if (structured?.summary) {
      return structured.summary;
    }
    return message.content || '[Processing...]';
  };

  const previewLength = 60;
  const displayContent = getPreviewContent();
  const previewContent =
    displayContent.length > previewLength
      ? displayContent.substring(0, previewLength) + '...'
      : displayContent;
  const hasLongContent =
    displayContent.length > previewLength || hasValidStructured;

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
          isVoiceInput ? (
            <Mic className="w-3 h-3 text-[hsl(var(--primary-foreground))]" />
          ) : (
            <User className="w-3 h-3 text-[hsl(var(--primary-foreground))]" />
          )
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
        {/* Voice Input Label */}
        {isUser && isVoiceInput && (
          <div className="flex items-center gap-1 mb-1 text-xs text-[hsl(var(--muted-foreground))]">
            <Mic className="w-3 h-3" />
            <span>Voice Input</span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          onClick={onToggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
          className={cn(
            'px-3 py-2 rounded-2xl text-sm text-left w-full transition-all',
            isUser
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-sm'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-tl-sm',
            !isExpanded && 'hover:opacity-90',
          )}
        >
          {isExpanded ? (
            // ===== EXPANDED VIEW =====
            <div className="space-y-2">
              {/* AI Response with Structured Data */}
              {!isUser && hasValidStructured && structured ? (
                <StructuredResponseDisplay
                  structured={structured}
                  rawContent={message.content}
                />
              ) : !isUser && !hasValidStructured ? (
                // AI response without structured data
                <div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    <FormattedMessageContent
                      content={message.content || ''}
                      isUser={false}
                    />
                  </p>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] pt-2 mt-2 border-t border-[hsl(var(--border)/0.5)]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">
                        Analyzing for better formatting...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                // User message
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {isVoiceInput && !message.content ? (
                    <span className="flex items-center gap-2 italic opacity-70">
                      <Mic className="w-4 h-4" />
                      Voice input (no transcript available)
                    </span>
                  ) : (
                    <FormattedMessageContent
                      content={message.content || ''}
                      isUser={true}
                    />
                  )}
                </p>
              )}
            </div>
          ) : (
            // ===== COLLAPSED VIEW =====
            <div className="flex items-center gap-2">
              {isUser && isVoiceInput && !message.content ? (
                <span className="flex items-center gap-1.5 opacity-70">
                  <Mic className="w-3 h-3" />
                  <span>Voice input</span>
                </span>
              ) : (
                <p className="truncate flex-1 opacity-70">{previewContent}</p>
              )}
              {hasLongContent && (
                <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
              )}
              {isAnalyzing && (
                <Loader2 className="w-3 h-3 shrink-0 animate-spin opacity-50" />
              )}
            </div>
          )}
        </div>

        {/* Expanded Meta */}
        {isExpanded && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.createdAt)}</span>

            {isUser && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {isVoiceInput ? (
                    <>
                      <Mic className="w-3 h-3" /> Voice
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3 h-3" /> Text
                    </>
                  )}
                </span>
              </>
            )}

            {!isUser && metadata.processingTime && (
              <>
                <span>•</span>
                <span>{metadata.processingTime}ms</span>
              </>
            )}

            {!isUser && metadata.audioDuration && (
              <>
                <span>•</span>
                <span>{metadata.audioDuration.toFixed(1)}s</span>
              </>
            )}

            {!isUser && voice && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  {voice.name}
                </span>
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

        {/* Collapsed audio play */}
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
export function AudioWaveform() {
  const heights = [4, 8, 6, 10, 7, 5, 9];
  return (
    <div className="flex items-center gap-0.5 ml-1">
      {heights.map((height, i) => (
        <div
          key={i}
          className="w-0.5 bg-[hsl(var(--primary))] rounded-full animate-pulse"
          style={{
            height: `${height}px`,
            animationDelay: `${(i % 4) * 0.1}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}

// Utility Functions
export function formatTime(date?: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function FormattedMessageContent({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  // Simple formatting: handle line breaks and basic patterns
  const formatContent = (text: string) => {
    // Split by line breaks
    const lines = text.split('\n');

    return lines.map((line, index) => {
      // Process each line for basic formatting
      let formattedLine: React.ReactNode = line;

      // Bold: **text** or __text__
      formattedLine = processInlineFormatting(line);

      return (
        <React.Fragment key={index}>
          {formattedLine}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const processInlineFormatting = (text: string): React.ReactNode => {
    // Match **bold**, *italic*, `code`, and regular text
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for bold **text**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={key++} className="font-semibold">
            {boldMatch[1]}
          </strong>,
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Check for italic *text*
      const italicMatch = remaining.match(/^\*(.+?)\*/);
      if (italicMatch) {
        parts.push(
          <em key={key++} className="italic">
            {italicMatch[1]}
          </em>,
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Check for inline code `text`
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={key++}
            className={cn(
              'px-1 py-0.5 rounded text-xs font-mono',
              isUser
                ? 'bg-[hsl(var(--primary-foreground)/0.2)]'
                : 'bg-[hsl(var(--background))]',
            )}
          >
            {codeMatch[1]}
          </code>,
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Check for links [text](url) - simplified
      const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        parts.push(
          <span key={key++} className="underline">
            {linkMatch[1]}
          </span>,
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Regular text - find next special character or take all
      const nextSpecial = remaining.search(/[\*`\[]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Special char but didn't match pattern, treat as regular
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts.length > 0 ? parts : text;
  };

  return <>{formatContent(content)}</>;
}

// Voice Selector Component
export function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  disabled,
}: {
  selectedVoice: VoiceId;
  onVoiceChange: (voiceId: VoiceId) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentVoice =
    LIVE_CONFIG.VOICES.find((v) => v.id === selectedVoice) ||
    LIVE_CONFIG.VOICES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
          'border border-[hsl(var(--border))]',
          disabled
            ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
            : 'bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] cursor-pointer',
        )}
      >
        <Volume2 className="w-4 h-4" />
        <span className="font-medium hidden sm:inline">
          {currentVoice.name} ({currentVoice.description},{' '}
          {currentVoice.gender === 'male' ? 'Male' : 'Female'})
        </span>
        <span className="font-medium sm:hidden">{currentVoice.name}</span>
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-w-[90vw] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg z-60 overflow-hidden">
          <div className="p-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Select Voice
            </p>
          </div>

          {/* Scrollable container */}
          <div className="max-h-64 overflow-y-auto">
            {/* Male Voices */}
            <div className="p-1">
              <p className="px-2 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase sticky top-0 bg-[hsl(var(--card))]">
                Male Voices
              </p>
              {LIVE_CONFIG.VOICES.filter((v) => v.gender === 'male').map(
                (voice) => (
                  <VoiceOptionItem
                    key={voice.id}
                    voice={voice}
                    isSelected={voice.id === selectedVoice}
                    onSelect={() => {
                      onVoiceChange(voice.id);
                      setIsOpen(false);
                    }}
                  />
                ),
              )}
            </div>

            {/* Female Voices */}
            <div className="p-1 border-t border-[hsl(var(--border))]">
              <p className="px-2 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase sticky top-0 bg-[hsl(var(--card))]">
                Female Voices
              </p>
              {LIVE_CONFIG.VOICES.filter((v) => v.gender === 'female').map(
                (voice) => (
                  <VoiceOptionItem
                    key={voice.id}
                    voice={voice}
                    isSelected={voice.id === selectedVoice}
                    onSelect={() => {
                      onVoiceChange(voice.id);
                      setIsOpen(false);
                    }}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function VoiceOptionItem({
  voice,
  isSelected,
  onSelect,
}: {
  voice: VoiceOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
        isSelected
          ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
          : 'hover:bg-[hsl(var(--muted))]',
      )}
    >
      <div className="flex-1 text-left">
        <p className="font-medium text-sm">
          {voice.name}
          <span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">
            ({voice.gender === 'male' ? 'Male' : 'Female'})
          </span>
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {voice.description}
        </p>
      </div>
      {isSelected && <Check className="w-4 h-4 text-[hsl(var(--primary))]" />}
    </button>
  );
}
