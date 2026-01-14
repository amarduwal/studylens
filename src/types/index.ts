// Content types detected by AI
export type ContentType =
  | "math_problem"
  | "science_diagram"
  | "text_passage"
  | "handwritten_notes"
  | "graph_chart"
  | "code_snippet"
  | "other";

export type Difficulty = "easy" | "medium" | "hard";

export type SupportedLanguage =
  | "en"
  | "hi"
  | "ne"
  | "es"
  | "fr"
  | "ar"
  | "zh"
  | "bn"
  | "pt"
  | "id";

export interface StepByStep {
  step: number;
  action: string;
  explanation: string;
  formula?: string;
}

export interface Explanation {
  simpleAnswer: string;
  stepByStep: StepByStep[];
  concept: string;
  whyItMatters?: string;
  practiceQuestions?: string[];
  tips?: string[];
}

export interface ScanResult {
  id: string;
  imageUrl: string;
  contentType: ContentType;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  extractedText: string;
  extractedLatex?: string;
  detectedLanguage?: string;
  explanation: Explanation;
  language: SupportedLanguage;
  createdAt: Date;
  isBookmarked?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AnalyzeRequest {
  image: string; // Base64 encoded
  language: SupportedLanguage;
  educationLevel?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: ScanResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface FollowUpRequest {
  scanId: string;
  question: string;
  conversationHistory: ConversationMessage[];
}

export interface FollowUpResponse {
  success: boolean;
  data?: {
    answer: string;
    messageId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Language configuration
export const LANGUAGES: Record<SupportedLanguage, { name: string; nativeName: string; direction: "ltr" | "rtl" }> = {
  en: { name: "English", nativeName: "English", direction: "ltr" },
  hi: { name: "Hindi", nativeName: "हिंदी", direction: "ltr" },
  ne: { name: "Nepali", nativeName: "नेपाली", direction: "ltr" },
  es: { name: "Spanish", nativeName: "Español", direction: "ltr" },
  fr: { name: "French", nativeName: "Français", direction: "ltr" },
  ar: { name: "Arabic", nativeName: "العربية", direction: "rtl" },
  zh: { name: "Chinese", nativeName: "简体中文", direction: "ltr" },
  bn: { name: "Bengali", nativeName: "বাংলা", direction: "ltr" },
  pt: { name: "Portuguese", nativeName: "Português", direction: "ltr" },
  id: { name: "Indonesian", nativeName: "Bahasa Indonesia", direction: "ltr" },
};
