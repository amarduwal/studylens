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
  storageKey: string;
  contentType: ContentType;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  extractedText: string;
  extractedLatex?: string;
  detectedLanguage?: string;
  explanation: Explanation;
  createdAt: Date;
  explanationLanguage: SupportedLanguage;
  targetEducationLevel?: string;
  tokenCount: number;
  isBookmarked?: boolean;
}

export interface ScanBookmarkResult {
  id: string;
  bookmarkId: string;
  storageKey: string;
  contentType: ContentType;
  detectedLanguage: string;
  extractedText: string;
  imageUrl: string;
  subject: string;
  subjectIcon: string;
  subjectColor: string;
  difficulty: Difficulty;
  topic: string;
  notes: string;
  tags: string[];
  isPinned: boolean;
  sortOrder: number;
  folderName: string;
  isBookmarked: boolean;
  createdAt: Date;
  bookmarkedAt: Date;
  pagination?: Pagination
}

export interface BookmarkResponse {
  success: boolean;
  authRequired?: boolean;
  message?: string;
  isBookmarked?: boolean
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
  data?: ScanResult & {
    usage?: {
      remaining: number;
      limit: number;
    };
  };
  error?: {
    code: string;
    message: string;
    remaining?: number;
    limit?: number;
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
    usage?: {
      remaining: number;
      limit: number;
    };
  };
  error?: {
    code: string;
    message: string;
    remaining?: number;
    limit?: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentHtml?: string | null;
  attachments?: string;
  tokenCount?: number | null;
  processingTimeMs?: number | null;
  modelUsed?: string | null;
  wasHelpful?: boolean | null;
  feedbackType?: string | null;
  status?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface LimitError {
  code: string;
  message: string;
  remaining: number;
  limit: number;
  resetsAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number
  hasMore: boolean,
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
