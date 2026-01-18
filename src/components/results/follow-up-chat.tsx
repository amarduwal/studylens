'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScanStore } from '@/stores/scan-store';
import { cn } from '@/lib/utils';

interface FollowUpChatProps {
  scanId: string;
  originalContext: string;
  practiceQuestions?: string[];
}

export function FollowUpChat({
  scanId,
  originalContext,
  practiceQuestions,
}: FollowUpChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
  } | null>(null);

  const {
    messages,
    isLoadingResponse,
    selectedLanguage,
    addMessage,
    setIsLoadingResponse,
  } = useScanStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoadingResponse) return;

    const userQuestion = input.trim();
    setInput('');

    // Add user message
    addMessage({ role: 'user', content: userQuestion });
    setIsLoadingResponse(true);

    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId,
          question: userQuestion,
          originalContext,
          conversationHistory: messages,
          language: selectedLanguage,
          sessionId: useScanStore.getState().sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addMessage({ role: 'assistant', content: data.data.answer });
        setUsage(data.data.usage);
      } else {
        // Handle limit exceeded
        if (data.error?.code === 'LIMIT_EXCEEDED') {
          addMessage({
            role: 'assistant',
            content: data.error.message,
          });
        } else {
          addMessage({
            role: 'assistant',
            content:
              "Sorry, I couldn't process your question. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error('Follow-up error:', error);
      addMessage({
        role: 'assistant',
        content: 'An error occurred. Please try again.',
      });
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
  };

  const suggestedQuestions = practiceQuestions?.slice(0, 4) || [
    'Can you explain this differently?',
    'Why does this work?',
    'Give me another example',
    'What if the numbers were different?',
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            Ask Follow-up Questions
          </span>
          {usage && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {usage.remaining}/{usage.limit} remaining
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {messages.length > 0 && (
          <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg bg-[hsl(var(--muted))]/50 p-4">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1">
                <div
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      message.role === 'user'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'bg-[hsl(var(--secondary))]'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'bg-[hsl(var(--background))] border border-[hsl(var(--border))]'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-[10px] text-[hsl(var(--muted-foreground))]',
                    message.role === 'user' ? 'text-right mr-11' : 'ml-11'
                  )}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoadingResponse && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--secondary))]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Suggested questions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-sm focus:outline-none"
            disabled={isLoadingResponse}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoadingResponse}
            className="shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
