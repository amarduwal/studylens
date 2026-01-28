"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  LiveSessionState,
  LiveMessage,
  SessionConfig,
  SessionStatus
} from "@/types/live.ts";
import { GeminiLiveSession, GeminiLiveCallbacks } from "@/lib/live/gemini-live-client";
import { LIVE_CONFIG } from "@/lib/live/constants";

interface UseLiveSessionReturn extends LiveSessionState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendAudio: (audioData: ArrayBuffer) => void;
  sendImage: (imageData: string) => void;
  sendText: (text: string) => void;
  executeToolResult: (toolName: string, result: any) => void;
  clearMessages: () => void;
}

export function useLiveSession(
  apiKey: string,
  config: SessionConfig
): UseLiveSessionReturn {
  const [state, setState] = useState<LiveSessionState>({
    sessionId: null,
    status: "idle",
    messages: [],
    isAiSpeaking: false,
    isUserSpeaking: false,
    currentThought: null,
    error: null,
    tools: [],
  });

  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const currentTextRef = useRef<string>("");
  const pendingToolCallRef = useRef<{ name: string; id: string } | null>(null);

  const addMessage = useCallback((message: Omit<LiveMessage, "id" | "timestamp">) => {
    const newMessage: LiveMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));

    return newMessage;
  }, []);

  const updateStatus = useCallback((status: SessionStatus, error?: string) => {
    setState(prev => ({
      ...prev,
      status,
      error: error || null,
    }));
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current?.connected) {
      console.warn("Already connected");
      return;
    }

    updateStatus("connecting");

    const callbacks: GeminiLiveCallbacks = {
      onConnected: () => {
        const sessionId = uuidv4();
        setState(prev => ({
          ...prev,
          sessionId,
          status: "connected",
          error: null,
        }));

        addMessage({
          role: "system",
          content: "Connected to AI Tutor. You can start speaking or show me what you're working on!",
          type: "text",
        });
      },

      onDisconnected: () => {
        updateStatus("ended");
        addMessage({
          role: "system",
          content: "Session ended.",
          type: "text",
        });
      },

      onError: (error) => {
        console.error("Live session error:", error);
        updateStatus("error", error.message);
      },

      onAudioResponse: (audioData) => {
        setState(prev => ({ ...prev, isAiSpeaking: true }));
      },

      onTextResponse: (text, isPartial) => {
        if (isPartial) {
          currentTextRef.current += text;
          setState(prev => ({
            ...prev,
            currentThought: currentTextRef.current,
          }));
        } else {
          const fullText = currentTextRef.current + text;
          currentTextRef.current = "";

          if (fullText.trim()) {
            addMessage({
              role: "assistant",
              content: fullText,
              type: "text",
            });
          }

          setState(prev => ({
            ...prev,
            currentThought: null,
          }));
        }
      },

      onToolCall: (toolName, args) => {
        const toolCallId = uuidv4();
        pendingToolCallRef.current = { name: toolName, id: toolCallId };

        addMessage({
          role: "assistant",
          content: `Using ${toolName}...`,
          type: "tool_call",
          metadata: {
            toolName,
            toolArgs: args,
          },
        });

        setState(prev => ({
          ...prev,
          tools: prev.tools.map(t =>
            t.name === toolName ? { ...t, isActive: true } : t
          ),
        }));

        // Emit event for tool execution
        window.dispatchEvent(new CustomEvent("live:tool_call", {
          detail: { toolName, args, toolCallId },
        }));
      },

      onThinking: (thought) => {
        setState(prev => ({
          ...prev,
          currentThought: thought,
        }));
      },

      onInterrupted: () => {
        setState(prev => ({
          ...prev,
          isAiSpeaking: false,
          currentThought: null,
        }));
        currentTextRef.current = "";
      },

      onTurnComplete: () => {
        setState(prev => ({
          ...prev,
          isAiSpeaking: false,
        }));
      },
    };

    try {
      sessionRef.current = new GeminiLiveSession(apiKey, config, callbacks);
      await sessionRef.current.connect();
    } catch (error) {
      console.error("Failed to connect:", error);
      updateStatus("error", error instanceof Error ? error.message : "Connection failed");
    }
  }, [apiKey, config, addMessage, updateStatus]);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    updateStatus("ended");
  }, [updateStatus]);

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (sessionRef.current?.connected) {
      sessionRef.current.sendAudio(audioData);
      setState(prev => ({ ...prev, isUserSpeaking: true }));

      // Reset user speaking state after a delay
      setTimeout(() => {
        setState(prev => ({ ...prev, isUserSpeaking: false }));
      }, 500);
    }
  }, []);

  const sendImage = useCallback((imageData: string) => {
    if (sessionRef.current?.connected) {
      sessionRef.current.sendImage(imageData);
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (sessionRef.current?.connected && text.trim()) {
      addMessage({
        role: "user",
        content: text,
        type: "text",
      });
      sessionRef.current.sendText(text);
    }
  }, [addMessage]);

  const executeToolResult = useCallback((toolName: string, result: any) => {
    if (sessionRef.current?.connected && pendingToolCallRef.current) {
      sessionRef.current.sendToolResult(pendingToolCallRef.current.id, result);

      addMessage({
        role: "tool",
        content: `${toolName} completed`,
        type: "tool_result",
        metadata: {
          toolName,
          toolResult: result,
        },
      });

      setState(prev => ({
        ...prev,
        tools: prev.tools.map(t =>
          t.name === toolName ? { ...t, isActive: false, lastResult: result } : t
        ),
      }));

      pendingToolCallRef.current = null;
    }
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      currentThought: null,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendAudio,
    sendImage,
    sendText,
    executeToolResult,
    clearMessages,
  };
}
