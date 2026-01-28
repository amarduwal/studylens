'use client';

import { useRef, useEffect } from 'react';
import { LiveMessage } from '@/types/live.ts';
import { User, Bot, Wrench, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptPanelProps {
  messages: LiveMessage[];
  currentThought?: string | null;
  className?: string;
}

export function TranscriptPanel({
  messages,
  currentThought,
  className = '',
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThought]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      case 'tool':
        return <Wrench className="w-4 h-4" />;
      case 'system':
        return <Info className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'assistant':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'tool':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'system':
        return 'bg-gray-500/10 border-gray-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gray-900/50 rounded-xl',
        className,
      )}
    >
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-white">Conversation</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('p-3 rounded-lg border', getRoleColor(message.role))}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'p-1 rounded',
                  message.role === 'user'
                    ? 'bg-blue-500/20 text-blue-400'
                    : message.role === 'assistant'
                      ? 'bg-purple-500/20 text-purple-400'
                      : message.role === 'tool'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400',
                )}
              >
                {getRoleIcon(message.role)}
              </span>
              <span className="text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>

            <p className="text-sm text-gray-200 whitespace-pre-wrap">
              {message.content}
            </p>

            {message.metadata?.toolName && (
              <div className="mt-2 text-xs text-gray-500">
                Tool: {message.metadata.toolName}
              </div>
            )}
          </div>
        ))}

        {/* Current thought (streaming) */}
        {currentThought && (
          <div className="p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 animate-pulse">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded bg-purple-500/20 text-purple-400">
                <Bot className="w-4 h-4" />
              </span>
              <span className="text-xs text-purple-400">Thinking...</span>
            </div>
            <p className="text-sm text-gray-300">{currentThought}</p>
          </div>
        )}

        {messages.length === 0 && !currentThought && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Start talking or type a message to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
