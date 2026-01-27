'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  User,
  Bot,
  Copy,
  Minimize2,
  Maximize2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScanStore } from '@/stores/scan-store';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '../common/markdown-parser';
import { useToast } from '../ui/toast';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

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
  const { data: session, status } = useSession();
  const [input, setInput] = useState('');
  const { showToast, ToastComponent } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
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
    sessionId,
    deviceFingerprint,
  } = useScanStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

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
          sessionId,
          deviceFingerprint,
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

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy', 'error');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownloadMarkdown = async (content: string) => {
    try {
      // Add markdown formatting
      const markdownContent = `# StudyLens Chat Response\n\nGenerated: ${new Date().toLocaleString()}\n\n${content}`;

      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studylens-chat-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast('Downloaded as Markdown file', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download', 'error');
    }
  };

  const suggestedQuestions = practiceQuestions?.slice(0, 4) || [
    'Can you explain this differently?',
    'Why does this work?',
    'Give me another example',
    'What if the numbers were different?',
  ];

  // Fullscreen container
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[hsl(var(--background))]">
        <main className="flex-1 overflow-y-auto pb-20 md:pb-20">
          <div className="mx-auto w-full max-w-2xl py-6 px-4">
            <div className="space-y-6">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">
                    <span className="text-xl">💬 </span>
                    Ask Follow-up Questions
                  </h2>
                  {usage && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {usage.remaining}/{usage.limit} remaining
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="h-9 w-9"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat Container */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <div className="max-w-md text-center">
                      <div className="mb-6 text-6xl">💬</div>
                      <h3 className="mb-3 text-xl font-semibold">
                        Ask Follow-up Questions
                      </h3>
                      <p className="mb-6 text-[hsl(var(--muted-foreground))]">
                        Continue the conversation about this problem
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {suggestedQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(question)}
                            className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-4xl space-y-6">
                    {messages.map((message) => (
                      <div key={message.id} className="group">
                        <div
                          className={cn(
                            'flex gap-4',
                            message.role === 'user' && 'flex-row-reverse'
                          )}
                        >
                          {/* Avatar */}
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                              message.role === 'user' &&
                                !session?.user?.avatarUrl
                                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                : ''
                            )}
                          >
                            {message.role === 'user' ? (
                              <>
                                {session?.user && session.user.avatarUrl ? (
                                  <div className="relative w-10 h-10">
                                    <Image
                                      src={session.user.avatarUrl}
                                      alt={session.user.name || 'User'}
                                      fill
                                      className="rounded-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </>
                            ) : (
                              <div className="relative h-10 w-10">
                                <Image
                                  src="/icon-192.png"
                                  alt="StudyLens"
                                  fill
                                  className="object-contain"
                                  priority
                                />
                              </div>
                            )}
                          </div>

                          {/* Message Content */}
                          <div className="flex-1">
                            <div
                              className={cn(
                                'relative rounded-2xl px-5 py-3',
                                message.role === 'user'
                                  ? 'bg-[hsl(var(--primary))]/5'
                                  : 'bg-[hsl(var(--muted))]/30'
                              )}
                            >
                              {/* Message Text */}
                              <div
                                className={cn(
                                  'prose prose-sm max-w-none dark:prose-invert',
                                  message.role === 'user' ? 'ml-7' : 'mr-7'
                                )}
                              >
                                {renderMarkdown(message.content)}
                              </div>
                            </div>

                            {/* Timestamp and Action Buttons */}
                            <div
                              className={cn(
                                'mt-2 flex items-center gap-2 text-xs',
                                message.role === 'user'
                                  ? 'justify-end'
                                  : 'justify-start'
                              )}
                            >
                              {/* For user: Copy button comes first */}
                              {message.role === 'user' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleCopyMessage(message.content)
                                    }
                                    className="h-6 w-6 rounded-full bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 transition-all opacity-100 group-hover/message:opacity-100"
                                  >
                                    <Copy className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                  </Button>
                                  <span className="text-[hsl(var(--muted-foreground))]">
                                    {new Date(
                                      message.timestamp
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </>
                              )}

                              {/* For assistant: Timestamp first, then buttons */}
                              {message.role === 'assistant' && (
                                <>
                                  <span className="text-[hsl(var(--muted-foreground))]">
                                    {new Date(
                                      message.timestamp
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleCopyMessage(message.content)
                                    }
                                    className="h-6 w-6 rounded-full bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/90 transition-all opacity-100 group-hover/message:opacity-100"
                                  >
                                    <Copy className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDownloadMarkdown(message.content)
                                    }
                                    className="h-6 w-6 rounded-full bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/90 transition-all opacity-100 group-hover/message:opacity-100"
                                  >
                                    <Download className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoadingResponse && (
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--secondary))]">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted))]/30 px-5 py-3">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form (Fixed at bottom) */}
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto flex max-w-4xl gap-3"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question here..."
                    className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-base focus:outline-none"
                    disabled={isLoadingResponse}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoadingResponse}
                    className="rounded-xl px-6"
                  >
                    {isLoadingResponse ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </main>
        {ToastComponent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
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
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      message.role === 'user' && !session?.user?.avatarUrl
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : ''
                    )}
                  >
                    {message.role === 'user' ? (
                      <>
                        {session?.user && session.user.avatarUrl ? (
                          <div className="relative w-8 h-8">
                            <Image
                              src={session.user.avatarUrl}
                              alt={session.user.name || 'User'}
                              fill
                              className="rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </>
                    ) : (
                      <div className="relative h-8 w-8">
                        <Image
                          src="/icon-192.png"
                          alt="StudyLens"
                          fill
                          className="object-contain"
                          priority
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary-foreground))]'
                        : 'bg-[hsl(var(--background))] border border-[hsl(var(--border))]'
                    )}
                  >
                    <span className="text-sm whitespace-pre-wrap">
                      {renderMarkdown(message.content)}
                    </span>
                  </div>
                </div>

                {/* Timestamp and Action Buttons */}
                <div
                  className={cn(
                    'mt-1 flex items-center gap-2 text-[10px]',
                    message.role === 'user'
                      ? 'justify-end mr-11'
                      : 'justify-start ml-11'
                  )}
                >
                  {/* For user: Copy button comes first */}
                  {message.role === 'user' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyMessage(message.content)}
                        className="h-5 w-5 rounded-full bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 transition-all opacity-100 group-hover/message:opacity-100"
                      >
                        <Copy className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                      </Button>
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}

                  {/* For assistant: Timestamp first, then buttons */}
                  {message.role === 'assistant' && (
                    <>
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyMessage(message.content)}
                        className="h-5 w-5 rounded-full bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 transition-all opacity-100 group-hover/message:opacity-100"
                      >
                        <Copy className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadMarkdown(message.content)}
                        className="h-5 w-5 rounded-full bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 transition-all opacity-100 group-hover/message:opacity-100"
                      >
                        <Download className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                      </Button>
                    </>
                  )}
                </div>
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
      {ToastComponent}
    </Card>
  );
}
