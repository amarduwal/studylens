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

/**
 * Analyze an educational image and generate explanation
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  language: SupportedLanguage = "en"
): Promise<ScanResult> {
  const prompt = getAnalysisPrompt(language);

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
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
      imageUrl: "", // Will be set after storage
      storageKey: parsed.storageKey,
      contentType: parsed.contentType as ContentType,
      subject: parsed.subject || "General",
      topic: parsed.topic || "Unknown",
      difficulty: (parsed.difficulty as Difficulty) || "medium",
      extractedText: parsed.extractedText || "",
      extractedLatex: parsed.extractedLatex || null,
      detectedLanguage: parsed.detectedLanguage || language,
      explanation: {
        simpleAnswer: parsed.explanation?.simpleAnswer || "Unable to determine answer",
        stepByStep: parsed.explanation?.stepByStep || [],
        concept: parsed.explanation?.concept || "",
        whyItMatters: parsed.explanation?.whyItMatters,
        practiceQuestions: parsed.explanation?.practiceQuestions,
        tips: parsed.explanation?.tips,
      },
      language,
      createdAt: new Date(),
    };

    return scanResult;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
    throw new Error("Failed to analyze image. Please try again.");
  }
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
    console.error("Gemini follow-up error:", error);
    throw new Error("Failed to process your question. Please try again.");
  }
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
