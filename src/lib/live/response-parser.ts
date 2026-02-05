import { SupportedLanguage } from "@/types";

export interface StructuredResponse {
  simpleAnswer: string;
  stepByStep: {
    step: number;
    action: string;
    explanation: string;
    formula?: string | null;
  }[];
  concept: string | null;
  whyItMatters: string | null;
  tips: string[];
  subject: string | null;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  keywords: string[];
  summary: string;
}

/**
 * Parse raw assistant text into structured educational format
 * This uses pattern matching and NLP-like parsing
 */
export function parseResponseToStructured(
  rawText: string,
  context?: {
    subject?: string;
    question?: string;
  }
): StructuredResponse {
  const text = rawText.trim();

  // Extract steps if present (numbered patterns)
  const stepByStep = extractSteps(text);

  // Extract simple answer (first sentence or paragraph)
  const simpleAnswer = extractSimpleAnswer(text, stepByStep.length > 0);

  // Extract concept explanation
  const concept = extractConcept(text);

  // Extract tips or advice
  const tips = extractTips(text);

  // Extract keywords
  const keywords = extractKeywords(text);

  // Generate summary
  const summary = generateSummary(text);

  // Determine difficulty based on content complexity
  const difficulty = assessDifficulty(text);

  return {
    simpleAnswer,
    stepByStep,
    concept,
    whyItMatters: extractWhyItMatters(text),
    tips,
    subject: context?.subject || inferSubject(text),
    topic: inferTopic(text, context?.question),
    difficulty,
    keywords,
    summary,
  };
}

function extractSimpleAnswer(text: string, hasSteps: boolean): string {
  // If the response has steps, the simple answer is usually before the steps
  if (hasSteps) {
    const beforeSteps = text.split(/(?:step\s*1|first|1\.|1\))/i)[0];
    if (beforeSteps && beforeSteps.trim().length > 20) {
      return cleanText(beforeSteps.trim().split('\n')[0]);
    }
  }

  // Otherwise, take the first meaningful sentence
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    return cleanText(sentences[0].trim());
  }

  // Fallback: first 200 characters
  return cleanText(text.substring(0, 200));
}

function extractSteps(text: string): StructuredResponse["stepByStep"] {
  const steps: StructuredResponse["stepByStep"] = [];

  // Pattern 1: "Step 1:", "Step 2:", etc.
  const stepPattern1 = /step\s*(\d+)[:\s]+([^]*?)(?=step\s*\d+|$)/gi;

  // Pattern 2: "1.", "2.", etc. at start of line
  const stepPattern2 = /(?:^|\n)\s*(\d+)[.)]\s+([^]*?)(?=(?:^|\n)\s*\d+[.)]|$)/g;

  // Pattern 3: "First,", "Second,", "Third,", etc.
  const ordinalPattern = /(?:^|\n)\s*(first|second|third|fourth|fifth|finally)[,:\s]+([^]*?)(?=(?:^|\n)\s*(?:first|second|third|fourth|fifth|finally)|$)/gi;

  let matches = text.matchAll(stepPattern1);
  for (const match of matches) {
    const stepNum = parseInt(match[1]);
    const content = match[2].trim();
    if (content.length > 5) {
      const { action, explanation, formula } = parseStepContent(content);
      steps.push({ step: stepNum, action, explanation, formula });
    }
  }

  // If no steps found, try pattern 2
  if (steps.length === 0) {
    matches = text.matchAll(stepPattern2);
    for (const match of matches) {
      const stepNum = parseInt(match[1]);
      const content = match[2].trim();
      if (content.length > 5) {
        const { action, explanation, formula } = parseStepContent(content);
        steps.push({ step: stepNum, action, explanation, formula });
      }
    }
  }

  // If still no steps, try ordinal pattern
  if (steps.length === 0) {
    const ordinalMap: Record<string, number> = {
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5, finally: 99
    };
    matches = text.matchAll(ordinalPattern);
    for (const match of matches) {
      const ordinal = match[1].toLowerCase();
      const content = match[2].trim();
      if (content.length > 5) {
        const { action, explanation, formula } = parseStepContent(content);
        steps.push({
          step: ordinalMap[ordinal] || steps.length + 1,
          action,
          explanation,
          formula
        });
      }
    }
  }

  // Sort by step number and renumber if needed
  steps.sort((a, b) => a.step - b.step);
  steps.forEach((s, i) => s.step = i + 1);

  return steps;
}

function parseStepContent(content: string): { action: string; explanation: string; formula: string | null } {
  const lines = content.split('\n').filter(l => l.trim());

  // First line is usually the action
  const action = cleanText(lines[0] || content.substring(0, 100));

  // Rest is explanation
  const explanation = cleanText(lines.slice(1).join(' ') || content);

  // Look for formulas (LaTeX or mathematical expressions) - Fixed regex
  let formula: string | null = null;

  // Match $...$ style LaTeX
  const dollarMatch = content.match(/\$([^$]+)\$/);
  if (dollarMatch) {
    formula = dollarMatch[1].trim();
  }

  // Match \[...\] style LaTeX (if not found above)
  if (!formula) {
    const bracketMatch = content.match(/\\\[([^\]]+)\\\]/);
    if (bracketMatch) {
      formula = bracketMatch[1].trim();
    }
  }

  // Match "formula:" or "equation:" text style (if not found above)
  if (!formula) {
    const textMatch = content.match(/(?:formula|equation)[:\s]+([^\n]+)/i);
    if (textMatch) {
      formula = textMatch[1].trim();
    }
  }

  return { action, explanation, formula };
}

function extractConcept(text: string): string | null {
  const conceptPatterns = [
    /(?:the\s+(?:key\s+)?concept|underlying\s+principle|main\s+idea|this\s+works\s+because)[:\s]+([^.]+\.)/i,
    /(?:essentially|fundamentally|basically)[,\s]+([^.]+\.)/i,
    /(?:the\s+reason|this\s+is\s+because)[:\s]+([^.]+\.)/i,
  ];

  for (const pattern of conceptPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function extractWhyItMatters(text: string): string | null {
  const patterns = [
    /(?:this\s+is\s+(?:important|useful)|in\s+real\s+life|practical\s+application|you(?:'ll)?\s+use\s+this)[:\s]+([^.]+\.)/i,
    /(?:for\s+example|in\s+the\s+real\s+world)[,\s]+([^.]+\.)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function extractTips(text: string): string[] {
  const tips: string[] = [];

  const tipPatterns = [
    /(?:tip|hint|remember|note|important|watch\s+out|be\s+careful|don't\s+forget)[:\s]+([^.!]+[.!])/gi,
    /(?:a\s+(?:good|helpful|useful)\s+(?:tip|trick|strategy))[:\s]+([^.]+\.)/gi,
  ];

  for (const pattern of tipPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 10) {
        tips.push(cleanText(match[1]));
      }
    }
  }

  // Also look for bullet points that might be tips
  const bulletPoints = text.match(/(?:^|\n)\s*[-•*]\s+([^\n]+)/g);
  if (bulletPoints && tips.length === 0) {
    bulletPoints.slice(0, 3).forEach(bp => {
      const cleaned = bp.replace(/^[\s\-•*]+/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        tips.push(cleanText(cleaned));
      }
    });
  }

  return tips.slice(0, 5); // Max 5 tips
}

function extractKeywords(text: string): string[] {
  // Common educational/technical terms to look for
  const technicalTerms = text.match(/\*\*([^*]+)\*\*/g) || [];
  const keywords = technicalTerms.map(t => t.replace(/\*\*/g, '').trim());

  // Also extract capitalized terms that might be important
  const capitalizedTerms = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const filtered = capitalizedTerms.filter(t =>
    t.length > 3 &&
    !['The', 'This', 'That', 'Step', 'First', 'Second', 'Third', 'Then', 'Next', 'Finally'].includes(t)
  );

  return [...new Set([...keywords, ...filtered])].slice(0, 10);
}

function generateSummary(text: string): string {
  // Take first 2-3 sentences as summary
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const summary = sentences.slice(0, 3).join('. ').trim();
  return cleanText(summary.length > 300 ? summary.substring(0, 300) + '...' : summary);
}

function assessDifficulty(text: string): "easy" | "medium" | "hard" | null {
  const lowerText = text.toLowerCase();

  // Hard indicators
  const hardPatterns = [
    /advanced|complex|sophisticated|rigorous|in-depth|comprehensive/,
    /calculus|differential|integral|matrix|vector|theorem|proof/,
    /quantum|relativity|molecular|cellular|biochem/,
  ];

  // Easy indicators
  const easyPatterns = [
    /simple|basic|fundamental|introductory|beginner/,
    /add|subtract|multiply|divide|count/,
    /primary|elementary/,
  ];

  let hardScore = 0;
  let easyScore = 0;

  for (const pattern of hardPatterns) {
    if (pattern.test(lowerText)) hardScore++;
  }

  for (const pattern of easyPatterns) {
    if (pattern.test(lowerText)) easyScore++;
  }

  // Also consider word complexity
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  if (avgWordLength > 7) hardScore++;
  if (avgWordLength < 5) easyScore++;

  if (hardScore > easyScore + 1) return "hard";
  if (easyScore > hardScore + 1) return "easy";
  return "medium";
}

function inferSubject(text: string): string | null {
  const subjectPatterns: Record<string, RegExp> = {
    "Mathematics": /math|algebra|geometry|calculus|equation|formula|theorem|number|calculate/i,
    "Physics": /physics|force|energy|velocity|acceleration|momentum|wave|particle|quantum/i,
    "Chemistry": /chemistry|chemical|element|compound|reaction|molecule|atom|bond/i,
    "Biology": /biology|cell|organism|dna|gene|evolution|ecosystem|species/i,
    "History": /history|historical|century|war|civilization|empire|revolution/i,
    "English": /grammar|vocabulary|literature|writing|essay|sentence|paragraph/i,
    "Computer Science": /code|programming|algorithm|software|computer|data structure/i,
  };

  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    if (pattern.test(text)) return subject;
  }

  return null;
}

function inferTopic(text: string, question?: string): string | null {
  // Try to extract topic from the question first
  if (question) {
    const topicPatterns = [
      /(?:about|regarding|on)\s+([^?]+)/i,
      /(?:explain|what\s+is|how\s+does?)\s+([^?]+)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        return cleanText(match[1].substring(0, 50));
      }
    }
  }

  // Extract from response - look for topic indicators
  const topicMatch = text.match(/(?:this\s+is\s+(?:about|called)|we're\s+(?:discussing|looking\s+at)|the\s+topic\s+of)\s+([^.,]+)/i);
  if (topicMatch) {
    return cleanText(topicMatch[1]);
  }

  return null;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s*[-•*]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

/**
 * Format structured response for display
 */
export function formatStructuredForDisplay(structured: StructuredResponse): string {
  let output = '';

  if (structured.simpleAnswer) {
    output += `**Answer:** ${structured.simpleAnswer}\n\n`;
  }

  if (structured.stepByStep.length > 0) {
    output += `**Step-by-Step:**\n`;
    for (const step of structured.stepByStep) {
      output += `${step.step}. **${step.action}**\n`;
      output += `   ${step.explanation}\n`;
      if (step.formula) {
        output += `   Formula: \`${step.formula}\`\n`;
      }
      output += '\n';
    }
  }

  if (structured.concept) {
    output += `**Concept:** ${structured.concept}\n\n`;
  }

  if (structured.whyItMatters) {
    output += `**Why It Matters:** ${structured.whyItMatters}\n\n`;
  }

  if (structured.tips.length > 0) {
    output += `**Tips:**\n`;
    for (const tip of structured.tips) {
      output += `• ${tip}\n`;
    }
  }

  return output;
}
