import { GoogleGenAI } from "@google/genai";
import { SupportedLanguage } from "@/types";
import { v4 as uuidv4 } from "uuid";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AudioAnalysisResult {
  id: string;
  contentType: string;
  subject: string | null;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  explanation: {
    simpleAnswer: string;
    stepByStep: {
      step: number;
      action: string;
      explanation: string;
      formula?: string | null;
    }[];
    concept: string | null;
    whyItMatters: string | null;
    practiceQuestions: string[];
    tips: string[];
  };
  keywords: string[];
  summary: string;
  createdAt: Date;
}

function getLanguageName(code: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: "English",
    hi: "Hindi",
    ne: "Nepali",
    es: "Spanish",
    fr: "French",
    ar: "Arabic",
    zh: "Chinese (Simplified)",
    bn: "Bengali",
    pt: "Portuguese",
    id: "Indonesian",
  };
  return names[code] || "English";
}

function getAudioAnalysisPrompt(
  language: SupportedLanguage,
  subject?: string,
  userQuestion?: string
): string {
  const languageInstruction =
    language !== "en"
      ? `IMPORTANT: Provide ALL your response in ${getLanguageName(language)} language. The entire response including the JSON structure values must be in ${getLanguageName(language)}. However, the following fields MUST remain in English: "contentType", "difficulty" enum values.`
      : "";

  return `You are an expert educational content analyzer. Your task is to analyze an AI tutor's spoken response and structure it into a clear, educational format.

${languageInstruction}

${subject ? `SUBJECT CONTEXT: ${subject}` : ""}
${userQuestion ? `STUDENT'S QUESTION: ${userQuestion}` : ""}

Analyze the provided tutor response and respond with a single valid JSON object.

CRITICAL JSON RULES - FOLLOW EXACTLY:
1. Return ONLY the JSON object - no markdown, no code blocks, no explanation outside JSON
2. All strings must use double quotes and escape special characters
3. Escape newlines as \\n, tabs as \\t, and quotes as \\"
4. NO trailing commas in arrays or objects
5. Arrays must be properly formatted: ["item1", "item2"] or []
6. All required fields must be present (use null for unknown optional values)

REQUIRED JSON STRUCTURE:
{
  "contentType": "<one of: explanation, solution, definition, concept, example, practice, summary, clarification, other>",
  "subject": "<academic subject or null>",
  "topic": "<specific topic or null>",
  "difficulty": "<one of: easy, medium, hard, or null>",
  "explanation": {
    "simpleAnswer": "<direct, concise answer - the key takeaway>",
    "stepByStep": [
      {
        "step": 1,
        "action": "<what is being explained in this step>",
        "explanation": "<detailed explanation>",
        "formula": "<any formula or equation mentioned, or null>"
      }
    ],
    "concept": "<the underlying concept or principle being taught, or null>",
    "whyItMatters": "<real-world application or importance, or null>",
    "practiceQuestions": ["<related practice question 1>", "<question 2>"],
    "tips": ["<helpful tip 1>", "<tip 2>"]
  },
  "keywords": ["<key term 1>", "<key term 2>"],
  "summary": "<2-3 sentence summary of the entire response>"
}

FIELD REQUIREMENTS:
- contentType: REQUIRED, categorize the type of response
- subject: OPTIONAL, infer from content or null
- topic: OPTIONAL, specific topic or null
- difficulty: OPTIONAL, assess based on complexity
- explanation.simpleAnswer: REQUIRED, extract the main answer/point
- explanation.stepByStep: REQUIRED, break down into logical steps (can be empty [])
- explanation.concept: OPTIONAL, underlying principle
- explanation.whyItMatters: OPTIONAL, real-world relevance
- explanation.practiceQuestions: REQUIRED, generate 1-3 related questions (can be empty [])
- explanation.tips: REQUIRED, extract or generate helpful tips (can be empty [])
- keywords: REQUIRED, extract important terms (can be empty [])
- summary: REQUIRED, concise summary

ANALYSIS INSTRUCTIONS:
1. Identify the main point or answer being conveyed
2. Break down complex explanations into numbered steps
3. Extract any formulas, equations, or key terms
4. Identify the educational concept being taught
5. Generate helpful practice questions if applicable
6. Extract or create useful tips for the student
7. Keep the summary concise but comprehensive`;
}

export async function analyzeAudioResponse(
  responseText: string,
  options: {
    language?: SupportedLanguage;
    subject?: string;
    userQuestion?: string;
  } = {}
): Promise<AudioAnalysisResult> {
  const { language = "en", subject, userQuestion } = options;
  const prompt = getAudioAnalysisPrompt(language, subject, userQuestion);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Audio analysis attempt ${attempt}/${MAX_RETRIES}`);

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { text: `\n\nTUTOR'S RESPONSE TO ANALYZE:\n"""${responseText}"""` },
            ],
          },
        ],
        config: {
          temperature: 0.3,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Raw response:", text);
        throw new Error("Invalid response format from AI");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Construct the AudioAnalysisResult
      const result: AudioAnalysisResult = {
        id: uuidv4(),
        contentType: parsed.contentType || "other",
        subject: parsed.subject || subject || null,
        topic: parsed.topic || null,
        difficulty: parsed.difficulty || null,
        explanation: {
          simpleAnswer: parsed.explanation?.simpleAnswer || responseText.substring(0, 200),
          stepByStep: Array.isArray(parsed.explanation?.stepByStep)
            ? parsed.explanation.stepByStep.map((step: any, index: number) => ({
              step: step.step || index + 1,
              action: step.action || "",
              explanation: step.explanation || "",
              formula: step.formula || null,
            }))
            : [],
          concept: parsed.explanation?.concept || null,
          whyItMatters: parsed.explanation?.whyItMatters || null,
          practiceQuestions: Array.isArray(parsed.explanation?.practiceQuestions)
            ? parsed.explanation.practiceQuestions
            : [],
          tips: Array.isArray(parsed.explanation?.tips)
            ? parsed.explanation.tips
            : [],
        },
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        summary: parsed.summary || responseText.substring(0, 300),
        createdAt: new Date(),
      };

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error("All audio analysis attempts failed");
  throw new Error(
    `Failed to analyze audio response after ${MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`
  );
}
