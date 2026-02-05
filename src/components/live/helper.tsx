import { LIVE_CONFIG, VoiceId, VoiceOption } from '@/lib/live/constants';
import { LiveMessage } from '@/lib/live/live-session-service';
import { StructuredResponse } from '@/lib/live/response-parser';
import { cn } from '@/lib/utils';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Square,
  User,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

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
  // Extract metadata
  const metadata = message.metadata as
    | {
        structured?: StructuredResponse;
        voiceId?: string;
        processingTime?: number;
      }
    | undefined;
  const processingTime = metadata?.processingTime;
  const structured = metadata?.structured;
  const hasStructured =
    !isUser &&
    structured &&
    (structured.simpleAnswer ||
      structured.stepByStep?.length > 0 ||
      structured.concept);
  const voiceId = metadata?.voiceId;
  const voice = voiceId
    ? LIVE_CONFIG.VOICES.find((v) => v.id === voiceId)
    : null;

  // Truncate content for preview
  const previewLength = 50;
  const previewContent =
    hasStructured && structured?.simpleAnswer
      ? structured.simpleAnswer.length > previewLength
        ? structured.simpleAnswer.substring(0, previewLength) + '...'
        : structured.simpleAnswer
      : message.content.length > previewLength
        ? message.content.substring(0, previewLength) + '...'
        : message.content;

  const hasLongContent =
    message.content.length > previewLength || hasStructured;

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
            // Expanded View
            hasStructured && structured ? (
              <StructuredResponseDisplay structured={structured} />
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                <FormattedMessageContent
                  content={message.content}
                  isUser={isUser}
                />
              </p>
            )
          ) : (
            // Collapsed View
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
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.createdAt)}</span>

            {processingTime && (
              <>
                <span>•</span>
                <span>{processingTime}ms</span>
              </>
            )}

            {/* Voice indicator */}
            {voice && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  {voice.name}
                </span>
              </>
            )}

            {/* Audio playback button */}
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
export function AudioWaveform() {
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

// Structured Response Display Component
export function StructuredResponseDisplay({
  structured,
}: {
  structured: StructuredResponse;
}) {
  return (
    <div className="space-y-3 text-sm">
      {/* Simple Answer */}
      {structured.simpleAnswer && (
        <div>
          <p className="font-semibold text-[hsl(var(--primary))] mb-1 text-xs uppercase tracking-wide">
            Answer
          </p>
          <p>{structured.simpleAnswer}</p>
        </div>
      )}

      {/* Step by Step */}
      {structured.stepByStep.length > 0 && (
        <div>
          <p className="font-semibold text-[hsl(var(--primary))] mb-2 text-xs uppercase tracking-wide">
            Step-by-Step
          </p>
          <div className="space-y-2 ml-1">
            {structured.stepByStep.map((step) => (
              <div key={step.step} className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] text-xs flex items-center justify-center font-bold">
                  {step.step}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.action}</p>
                  {step.explanation && step.explanation !== step.action && (
                    <p className="text-[hsl(var(--muted-foreground))] text-xs mt-0.5">
                      {step.explanation}
                    </p>
                  )}
                  {step.formula && (
                    <code className="block mt-1 px-2 py-1 bg-[hsl(var(--background))] rounded text-xs font-mono border border-[hsl(var(--border))]">
                      {step.formula}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept */}
      {structured.concept && (
        <div className="p-2 bg-[hsl(var(--primary)/0.05)] rounded-lg border-l-2 border-[hsl(var(--primary))]">
          <p className="font-semibold text-[hsl(var(--primary))] text-xs mb-1">
            💡 Key Concept
          </p>
          <p className="text-xs">{structured.concept}</p>
        </div>
      )}

      {/* Why It Matters */}
      {structured.whyItMatters && (
        <div className="p-2 bg-[hsl(var(--success)/0.05)] rounded-lg border-l-2 border-[hsl(var(--success))]">
          <p className="font-semibold text-[hsl(var(--success))] text-xs mb-1">
            🌍 Real-World Application
          </p>
          <p className="text-xs">{structured.whyItMatters}</p>
        </div>
      )}

      {/* Tips */}
      {structured.tips.length > 0 && (
        <div>
          <p className="font-semibold text-[hsl(var(--warning))] text-xs mb-1">
            💡 Tips
          </p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {structured.tips.map((tip, i) => (
              <li key={i} className="text-[hsl(var(--muted-foreground))]">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Keywords */}
      {structured.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-[hsl(var(--border))]">
          {structured.keywords.slice(0, 5).map((keyword, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-[hsl(var(--muted))] rounded-full text-xs"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
