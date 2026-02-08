import { GoogleGenAI } from "@google/genai";
import {
  SupportedLanguage,
  ScanResult,
  ContentType,
  Difficulty,
  ConversationMessage,
} from "@/types";
import { getAnalysisPrompt, getFollowUpPrompt, getSimplifyPrompt } from "./prompts";
import { v4 as uuidv4 } from 'uuid';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

// Model to use - Gemini 2.5 Flash for speed, or gemini-1.5-pro for complex analysis
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
const PREMIUM_MODEL_NAME = process.env.GOOGLE_PREMIUM_AI_MODEL || "gemini-3-pro-preview";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analyze an educational image and generate explanation
 */
export async function analyzeImage(
  imageBase64: string | string[],
  mimeType: string | string[],
  language: SupportedLanguage = "en",
  isPremium: boolean
): Promise<ScanResult> {
  const prompt = getAnalysisPrompt(language);

  // Prepare image parts for single or multiple images
  const imageParts = Array.isArray(imageBase64)
    ? imageBase64.map((base64, index) => ({
      inlineData: {
        mimeType: (Array.isArray(mimeType) ? mimeType[index] : mimeType) as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/heic"
          | "image/heif",
        data: base64,
      },
    }))
    : [
      {
        inlineData: {
          mimeType: mimeType as
            | "image/jpeg"
            | "image/png"
            | "image/webp"
            | "image/heic"
            | "image/heif",
          data: imageBase64,
        },
      },
    ];

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Gemini API attempt ${attempt}/${MAX_RETRIES}`);
      const modelToUse = isPremium ? PREMIUM_MODEL_NAME : MODEL_NAME;
      console.log("Model used:", modelToUse);

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, ...imageParts],
          },
        ],
        config: {
          // Lower temperature for more consistent JSON output
          temperature: 0.3,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 8192,
          // Request JSON output format if supported
          responseMimeType: "application/json",
        },
      });

      console.log(response);

      const text = response.text || "";

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Raw response:", text);
        throw new Error("Invalid response format from AI");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Construct the ScanResult
      const scanResult: ScanResult = {
        id: uuidv4(),
        imageUrls: [],
        storageKey: parsed.storageKey || null,
        contentType: (parsed.contentType as ContentType) || "other",
        subject: parsed.subject || "General",
        topic: parsed.topic || "Unknown",
        difficulty: (parsed.difficulty as Difficulty) || "medium",
        extractedText: parsed.extractedText || "",
        extractedLatex: parsed.extractedLatex || null,
        detectedLanguage: parsed.detectedLanguage || language,
        explanation: {
          simpleAnswer:
            parsed.explanation?.simpleAnswer || "Unable to determine answer",
          stepByStep: Array.isArray(parsed.explanation?.stepByStep)
            ? parsed.explanation.stepByStep
            : [],
          concept: parsed.explanation?.concept || "",
          whyItMatters: parsed.explanation?.whyItMatters || undefined,
          practiceQuestions: Array.isArray(parsed.explanation?.practiceQuestions)
            ? parsed.explanation.practiceQuestions
            : undefined,
          tips: Array.isArray(parsed.explanation?.tips)
            ? parsed.explanation.tips
            : undefined,
        },
        explanationLanguage: parsed.explanationLanguage || language,
        targetEducationLevel: parsed.targetEducationLevel || "other",
        tokenCount: response?.usageMetadata?.totalTokenCount || 0,
        createdAt: new Date(),
      };

      return scanResult;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      // If it's a JSON parsing error and we have retries left, try again
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  console.error("All Gemini API attempts failed");
  throw new Error(
    `Failed to analyze image after ${MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Handle follow-up questions with conversation context
 */
export async function handleFollowUp(
  originalContext: string,
  question: string,
  conversationHistory: ConversationMessage[],
  language: SupportedLanguage = "en"
): Promise<string> {
  const prompt = getFollowUpPrompt(
    originalContext,
    question,
    conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    language
  );

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        config: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      });

      return response.text || "I apologize, but I couldn't generate a response. Please try again.";
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

  // All retries failed
  console.error("All Gemini API attempts failed");
  throw new Error(
    `Failed to analyze image after ${MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Simplify explanation for a specific age group
 */
export async function simplifyExplanation(
  originalExplanation: string,
  targetAge: number,
  language: SupportedLanguage = "en"
): Promise<{ simplifiedExplanation: string; funFact: string }> {
  const prompt = getSimplifyPrompt(originalExplanation, targetAge, language);

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const text = response.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Gemini simplify error:", error);
    throw new Error("Failed to simplify explanation.");
  }
}

/**
 * Generate practice problems based on the original content
 */
export async function generatePracticeProblems(
  subject: string,
  topic: string,
  difficulty: Difficulty,
  originalProblem: string,
  count: number = 3,
  language: SupportedLanguage = "en"
): Promise<{ question: string; hint: string; solution: string }[]> {
  const languageInstruction = language !== "en"
    ? `Respond in ${language} language.`
    : "";

  const prompt = `You are an expert ${subject} teacher. Generate ${count} practice problems similar to the following:

Original problem: ${originalProblem}
Topic: ${topic}
Difficulty: ${difficulty}

${languageInstruction}

Respond with a JSON array:
[
  {
    "question": "The practice problem",
    "hint": "A helpful hint without giving away the answer",
    "solution": "Complete step-by-step solution"
  }
]

Only output valid JSON, no other text.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    });

    const text = response.text || "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Gemini practice generation error:", error);
    throw new Error("Failed to generate practice problems.");
  }
}
