export type SessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "ended";

export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MessageType = "text" | "audio" | "tool_call" | "tool_result";

export interface LiveMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  type: MessageType;
  metadata?: {
    audioData?: string;
    toolName?: string;
    toolArgs?: Record<string, any>;
    toolResult?: any;
  };
}

export interface SessionConfig {
  language: string;
  voiceEnabled: boolean;
  videoEnabled: boolean;
  educationLevel: string;
  subject?: string;
  systemPrompt?: string;
}

export interface LiveSessionState {
  sessionId: string | null;
  dbSessionId: string | null;
  status: SessionStatus;
  messages: LiveMessage[];
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  currentThought: string | null;
  error: string | null;
  tools: ToolState[];
  startTime: Date | null;
}

export interface ToolState {
  name: string;
  isActive: boolean;
  lastResult?: any;
}

export interface MediaState {
  hasAudioPermission: boolean;
  hasVideoPermission: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  audioLevel: number;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  error: string | null;
}

// API Response Types
export interface LiveConfigResponse {
  success: boolean;
  data?: {
    apiKey: string;
    model: string;
    maxDuration: number;
    features: {
      voiceEnabled: boolean;
      videoEnabled: boolean;
      screenShareEnabled: boolean;
      toolsEnabled: boolean;
    };
  };
  error?: string;
}

export interface CreateSessionResponse {
  success: boolean;
  data?: {
    sessionId: string;
    createdAt: string;
  };
  error?: string;
}

// Tool Types
export interface DrawingCommand {
  type: "line" | "circle" | "rectangle" | "text" | "arrow" | "clear";
  params: Record<string, any>;
}

export interface CodeExecutionRequest {
  language: "javascript" | "python";
  code: string;
}

export interface CodeExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
}

export interface GeneratedProblem {
  question: string;
  hints: string[];
  solution: string;
  difficulty: "easy" | "medium" | "hard";
}

// Gemini Live API Types
export interface GeminiLiveConfig {
  model: string;
  generationConfig: {
    responseModalities: ("TEXT" | "AUDIO")[];
    speechConfig?: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string;
        };
      };
    };
  };
  systemInstruction?: {
    parts: { text: string }[];
  };
  tools?: GeminiTool[];
}

export interface GeminiTool {
  functionDeclarations: FunctionDeclaration[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}
