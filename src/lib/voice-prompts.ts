import { SupportedLanguage } from "@/types";

export const VOICE_SYSTEM_PROMPT = `You are StudyLens Voice Assistant, a friendly and patient AI tutor specializing in helping students understand educational content through voice conversation.

VOICE INTERACTION PRINCIPLES:
1. Keep responses concise and conversational - suitable for speech
2. Use natural language without complex formatting
3. Pause naturally between concepts (use commas and periods effectively)
4. Be warm, encouraging, and patient
5. Avoid long lists - summarize or offer to go deeper
6. Use simple analogies and relatable examples

RESPONSE STYLE FOR VOICE:
- Speak naturally as if talking to a student in person
- Limit responses to 2-3 short paragraphs for clarity
- Use transitional phrases like "Let me explain...", "Think of it this way..."
- Confirm understanding: "Does that make sense?" or "Should I explain further?"
- Avoid markdown, bullet points, or visual formatting
- Spell out numbers and mathematical expressions verbally

CONVERSATION FLOW:
- Listen carefully to the student's question
- Acknowledge their question before answering
- Provide clear, step-by-step explanations when needed
- Check for understanding periodically
- Encourage follow-up questions`;

export function getVoiceSystemPromptWithContext(params: {
  language?: string;
  subject?: string;
  educationLevel?: string;
  previousContext?: string;
}): string {
  let prompt = VOICE_SYSTEM_PROMPT;

  if (params.subject) {
    prompt += `\n\nCURRENT SUBJECT FOCUS: ${params.subject}
    Tailor your explanations to this subject area.`;
  }

  if (params.educationLevel) {
    prompt += `\n\nSTUDENT LEVEL: ${params.educationLevel}
    Adjust complexity and vocabulary accordingly.`;
  }

  if (params.language && params.language !== "en") {
    const langName = getLanguageName(params.language as SupportedLanguage);
    prompt += `\n\nLANGUAGE REQUIREMENT: Respond entirely in ${langName}.
    Speak naturally as a native ${langName} speaker would.`;
  }

  if (params.previousContext) {
    prompt += `\n\nPREVIOUS CONTEXT:\n${params.previousContext}`;
  }

  return prompt;
}

export function getVoiceAnalysisContext(analysisData: {
  subject?: string;
  topic?: string;
  extractedText?: string;
  explanation?: {
    simpleAnswer?: string;
    concept?: string;
  };
}): string {
  return `
CONTEXT FROM ANALYZED CONTENT:
- Subject: ${analysisData.subject || "Unknown"}
- Topic: ${analysisData.topic || "Unknown"}
- Key Content: ${analysisData.extractedText?.substring(0, 500) || "No text extracted"}
- Main Explanation: ${analysisData.explanation?.simpleAnswer || "No explanation available"}
- Core Concept: ${analysisData.explanation?.concept || "Not specified"}
`.trim();
}

export function getVoiceFollowUpPrompt(
  originalContext: string,
  question: string,
  conversationHistory: { role: string; content: string }[],
  language: SupportedLanguage
): string {
  const languageName = getLanguageName(language);
  const formattedHistory = formatVoiceHistory(conversationHistory);

  const languageInstruction = language !== "en"
    ? `IMPORTANT: Respond entirely in ${languageName}. Speak naturally as a tutor would in ${languageName}.`
    : "";

  return `${VOICE_SYSTEM_PROMPT}

═══════════════════════════════════════════════════════════════
📚 STUDY CONTEXT
═══════════════════════════════════════════════════════════════
${originalContext}

═══════════════════════════════════════════════════════════════
💬 PREVIOUS CONVERSATION
═══════════════════════════════════════════════════════════════
${formattedHistory}

═══════════════════════════════════════════════════════════════
🎤 STUDENT'S VOICE QUESTION
═══════════════════════════════════════════════════════════════
"${question}"

═══════════════════════════════════════════════════════════════
📝 YOUR RESPONSE TASK
═══════════════════════════════════════════════════════════════
${languageInstruction}

Respond naturally to the student's voice question. Remember:
- This will be spoken aloud, so keep it conversational
- Be concise but thorough (2-3 paragraphs max)
- Use simple language appropriate for voice
- No bullet points, headers, or markdown formatting
- Encourage further questions

Respond now as a friendly tutor speaking directly to the student:`;
}

function formatVoiceHistory(
  conversationHistory: { role: string; content: string }[]
): string {
  if (!conversationHistory || conversationHistory.length === 0) {
    return "This is the start of our conversation.";
  }

  const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges

  return recentHistory
    .map((msg) => {
      const role = msg.role === "user" ? "Student" : "Tutor";
      const content = msg.content.length > 300
        ? msg.content.substring(0, 300) + "..."
        : msg.content;
      return `${role}: "${content}"`;
    })
    .join("\n\n");
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
