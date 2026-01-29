"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  LiveSessionState,
  LiveMessage,
  SessionConfig,
  SessionStatus
} from "@/types/live";
import { GeminiLiveSession, GeminiLiveCallbacks } from "@/lib/live/gemini-live-client-old";

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
    dbSessionId: null,
    status: "idle",
    messages: [],
    isAiSpeaking: false,
    isUserSpeaking: false,
    currentThought: null,
    error: null,
    tools: [],
    startTime: null,
  });


  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const currentTextRef = useRef<string>("");
  const pendingToolCallsRef = useRef<Map<string, { name: string; id: string }>>(
    new Map()
  );

  const addMessage = useCallback(
    (message: Omit<LiveMessage, "id" | "timestamp">): LiveMessage => {
      const newMessage: LiveMessage = {
        ...message,
        id: uuidv4(),
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
      }));

      return newMessage;
    },
    []
  );

  const updateStatus = useCallback((status: SessionStatus, error?: string) => {
    setState(prev => ({
      ...prev,
      status,
      error: error || null,
    }));
  }, []);

  const createDbSession = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: config.language,
          educationLevel: config.educationLevel,
          subject: config.subject,
          voiceEnabled: config.voiceEnabled,
          videoEnabled: config.videoEnabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return data.data.sessionId;
      }
      console.error("Failed to create DB session:", data.error);
      return null;
    } catch (error) {
      console.error("Error creating DB session:", error);
      return null;
    }
  }, [config]);

  const updateDbSession = useCallback(
    async (updates: Record<string, any>) => {
      if (!state.dbSessionId) return;

      try {
        await fetch("/api/live/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.dbSessionId,
            ...updates,
          }),
        });
      } catch (error) {
        console.error("Error updating DB session:", error);
      }
    },
    [state.dbSessionId]
  );

  const connect = useCallback(async () => {
    if (sessionRef.current?.connected) {
      console.warn("Already connected");
      return;
    }

    if (!apiKey) {
      updateStatus("error", "API key not provided");
      return;
    }

    updateStatus("connecting");

    // Create database session
    const dbSessionId = await createDbSession();

    const callbacks: GeminiLiveCallbacks = {
      onConnected: () => {
        console.log("Gemini Live connected");
        const sessionId = uuidv4();
        setState((prev) => ({
          ...prev,
          sessionId,
          dbSessionId: dbSessionId || null,
          status: "connected",
          error: null,
          startTime: new Date(),
        }));

        // Update DB session status
        if (dbSessionId) {
          fetch("/api/live/session", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: dbSessionId,
              status: "connected",
            }),
          }).catch(console.error);
        }

        addMessage({
          role: "system",
          content:
            "Connected to AI Tutor! You can start speaking or show me what you're working on.",
          type: "text",
        });
      },

      onDisconnected: (reason) => {
        console.log("Gemini Live disconnected:", reason);
        updateStatus("ended");

        // Update DB session
        if (dbSessionId) {
          const duration = state.startTime
            ? Math.floor((Date.now() - state.startTime.getTime()) / 1000)
            : 0;

          fetch("/api/live/session", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: dbSessionId,
              status: "ended",
              endedAt: new Date().toISOString(),
              duration,
            }),
          }).catch(console.error);
        }
      },

      onError: (error) => {
        console.error("Live session error:", error);
        updateStatus("error", error.message);
      },

      onAudioResponse: () => {
        setState((prev) => ({ ...prev, isAiSpeaking: true }));
      },

      onTextResponse: (text, isPartial) => {
        if (isPartial) {
          currentTextRef.current += text;
          setState((prev) => ({
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

          setState((prev) => ({
            ...prev,
            currentThought: null,
          }));
        }
      },

      onToolCall: (toolName, args, toolCallId) => {
        console.log("Tool call:", toolName, args);
        pendingToolCallsRef.current.set(toolName, { name: toolName, id: toolCallId });

        addMessage({
          role: "assistant",
          content: `Using ${toolName}...`,
          type: "tool_call",
          metadata: { toolName, toolArgs: args },
        });

        setState((prev) => ({
          ...prev,
          tools: prev.tools.some((t) => t.name === toolName)
            ? prev.tools.map((t) =>
              t.name === toolName ? { ...t, isActive: true } : t
            )
            : [...prev.tools, { name: toolName, isActive: true }],
        }));

        // Emit event for tool execution
        window.dispatchEvent(
          new CustomEvent("live:tool_call", {
            detail: { toolName, args, toolCallId },
          })
        );
      },

      onInterrupted: () => {
        setState((prev) => ({
          ...prev,
          isAiSpeaking: false,
          currentThought: null,
        }));
        currentTextRef.current = "";
      },

      onTurnComplete: () => {
        setState((prev) => ({
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
      updateStatus(
        "error",
        error instanceof Error ? error.message : "Connection failed"
      );
    }
  }, [apiKey, config, addMessage, updateStatus, createDbSession, state.startTime]);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.disconnect();
      sessionRef.current = null;
    }

    // Update DB session
    if (state.dbSessionId && state.startTime) {
      const duration = Math.floor(
        (Date.now() - state.startTime.getTime()) / 1000
      );

      await fetch("/api/live/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.dbSessionId,
          status: "ended",
          endedAt: new Date().toISOString(),
          duration,
          messageCount: state.messages.length,
        }),
      }).catch(console.error);
    }

    updateStatus("ended");
  }, [updateStatus, state.dbSessionId, state.startTime, state.messages.length]);

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (sessionRef.current?.connected) {
      sessionRef.current.sendAudio(audioData);
    }
  }, []);

  const sendImage = useCallback((imageData: string) => {
    if (sessionRef.current?.connected) {
      sessionRef.current.sendImage(imageData);
    }
  }, []);

  const sendText = useCallback(
    (text: string) => {
      if (sessionRef.current?.connected && text.trim()) {
        addMessage({
          role: "user",
          content: text,
          type: "text",
        });
        sessionRef.current.sendText(text);
      }
    },
    [addMessage]
  );

  const executeToolResult = useCallback(
    (toolName: string, result: any) => {
      const toolCall = pendingToolCallsRef.current.get(toolName);
      if (sessionRef.current?.connected && toolCall) {
        sessionRef.current.sendToolResult(toolCall.id, result);

        addMessage({
          role: "tool",
          content: `${toolName} completed`,
          type: "tool_result",
          metadata: { toolName, toolResult: result },
        });

        setState((prev) => ({
          ...prev,
          tools: prev.tools.map((t) =>
            t.name === toolName ? { ...t, isActive: false, lastResult: result } : t
          ),
        }));

        pendingToolCallsRef.current.delete(toolName);
      }
    },
    [addMessage]
  );

  const clearMessages = useCallback(() => {
    setState((prev) => ({
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
