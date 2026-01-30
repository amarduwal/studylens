import { LiveMessage } from '@/lib/live/live-session-service';
import { cn } from '@/lib/utils';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Square,
  User,
} from 'lucide-react';
import React from 'react';

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
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              <FormattedMessageContent
                content={message.content}
                isUser={isUser}
              />
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
