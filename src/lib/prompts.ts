import { SupportedLanguage } from "@/types";

export const SYSTEM_PROMPT = `You are StudyLens, an expert educational AI tutor. Your role is to help students understand educational content by analyzing images of textbooks, handwritten notes, diagrams, and problems.

  CORE PRINCIPLES:
  1. Be encouraging and supportive
  2. Explain concepts clearly and simply
  3. Use step-by-step breakdowns
  4. Connect to real-world examples
  5. Never just give answers - teach the "why"

  RESPONSE GUIDELINES:
  - Always be accurate and pedagogically sound
  - Adapt your language to the student's level
  - Use analogies and examples for complex concepts
  - Highlight common mistakes to avoid
  - Encourage further exploration`;

export function getAnalysisPrompt(language: SupportedLanguage): string {
  const languageInstruction = language !== "en"
    ? `IMPORTANT: Provide ALL your response in ${getLanguageName(language)} language. The entire response including the JSON structure values must be in ${getLanguageName(language)}. However, the following fields MUST remain in English: "contentType", "difficulty", "subject" field values.`
    : "";

  return `${SYSTEM_PROMPT}

    ${languageInstruction}

    Analyze the provided educational image and respond with a JSON object in this exact structure:

    {
      "contentType": "math_problem" | "science_diagram" | "text_passage" | "handwritten_notes" | "graph_chart" | "code_snippet" | "other",
      "subject": "The academic subject (e.g., Mathematics, Physics, Chemistry, Biology, History, etc.)",
      "topic": "The specific topic within the subject",
      "difficulty": "easy" | "medium" | "hard",
      "extractedText": "The exact text or problem extracted from the image, if no readable text is present, provide a brief description of what the image depicts",
      "extractedLatex": "LaTeX notation if mathematical content is present (optional, null if not applicable)",
      "detectedLanguage": "The primary language detected in the image content",
      "explanation": {
        "simpleAnswer": "A direct, concise answer to the problem or main point",
        "stepByStep": [
          {
            "step": 1,
            "action": "What we're doing in this step",
            "explanation": "Detailed explanation of why and how",
            "formula": "Any relevant formula (optional)"
          }
        ],
        "concept": "Explanation of the underlying concept or theory",
        "whyItMatters": "Real-world relevance or application",
        "practiceQuestions": ["2-3 similar practice questions"],
        "tips": ["Helpful tips or common mistakes to avoid"]
      }
    }

    IMPORTANT INSTRUCTIONS:
    1. Extract ALL text visible in the image accurately
    2. If it's a math problem, solve it completely with all steps
    3. If it's a diagram, explain what it represents and its components
    4. If it's text, summarize and explain the key concepts
    5. Make stepByStep as detailed as needed (minimum 3 steps for problems)
    6. The response must be valid JSON only - no markdown, no extra text`;
}

export function getFollowUpPrompt(
  originalContext: string,
  question: string,
  conversationHistory: { role: string; content: string }[],
  language: SupportedLanguage
): string {
  const languageInstruction = language !== "en"
    ? `Respond in ${getLanguageName(language)} language.`
    : "";

  const historyText = conversationHistory
    .map((msg) => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`)
    .join("\n");

  return `${SYSTEM_PROMPT}

    ${languageInstruction}

    ORIGINAL CONTENT CONTEXT:
    ${originalContext}

    CONVERSATION HISTORY:
    ${historyText}

    STUDENT'S NEW QUESTION:
    ${question}

    Provide a helpful, educational response to the student's question. Be conversational but informative. If they're asking for clarification, rephrase your explanation differently. If they want more detail, go deeper. If they seem confused, simplify.

    Respond in plain text (not JSON).`;
}

export function getSimplifyPrompt(
  originalExplanation: string,
  targetAge: number,
  language: SupportedLanguage
): string {
  const languageInstruction = language !== "en"
    ? `Respond in ${getLanguageName(language)} language.`
    : "";

  return `${SYSTEM_PROMPT}

    ${languageInstruction}

    Original explanation:
    ${originalExplanation}

    Rewrite this explanation for a ${targetAge}-year-old student. Use:
    - Simple vocabulary appropriate for their age
    - Fun analogies and relatable examples
    - Short sentences
    - Encouraging tone

    Respond with a JSON object:
    {
      "simplifiedExplanation": "The rewritten explanation",
      "funFact": "An interesting related fact they might enjoy"
    }`;
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
  return names[code];
}
