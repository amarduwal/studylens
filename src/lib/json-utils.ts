/**
 * Attempts to repair and parse malformed JSON from LLM responses
 */
export function safeJsonParse<T>(text: string): T {
  // Extract JSON from the response (handles markdown code blocks too)
  let jsonStr = extractJsonString(text);

  // Attempt 1: Direct parse
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.log("Direct JSON parse failed, attempting repairs...");
  }

  // Attempt 2: Basic cleanup and retry
  try {
    jsonStr = basicJsonCleanup(jsonStr);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.log("Basic cleanup failed, attempting advanced repairs...");
  }

  // Attempt 3: Advanced repairs
  try {
    jsonStr = advancedJsonRepair(jsonStr);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.log("Advanced repair failed, attempting aggressive fixes...");
  }

  // Attempt 4: Aggressive fixes
  try {
    jsonStr = aggressiveJsonFix(jsonStr);
    return JSON.parse(jsonStr);
  } catch (error) {
    // Log the problematic JSON for debugging
    console.error("All JSON parse attempts failed");
    console.error("Problematic JSON (first 500 chars):", jsonStr.substring(0, 500));
    console.error("Problematic JSON (last 500 chars):", jsonStr.substring(jsonStr.length - 500));
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts JSON object string from text that may contain markdown or other content
 */
function extractJsonString(text: string): string {
  // Remove markdown code blocks if present
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('No valid JSON object found in response');
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
}

/**
 * Basic JSON cleanup for common issues
 */
function basicJsonCleanup(jsonStr: string): string {
  return jsonStr
    // Remove control characters except whitespace
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix trailing commas before ] or }
    .replace(/,(\s*[}\]])/g, '$1')
    // Remove any BOM or zero-width characters
    .replace(/[\uFEFF\u200B-\u200D\uFFFE\uFFFF]/g, '');
}

/**
 * Advanced JSON repair for more complex issues
 */
function advancedJsonRepair(jsonStr: string): string {
  let result = basicJsonCleanup(jsonStr);

  // Fix unescaped newlines within string values
  result = fixUnescapedNewlines(result);

  // Fix unescaped quotes within strings
  result = fixUnescapedQuotes(result);

  // Fix common escape sequence issues
  result = fixEscapeSequences(result);

  return result;
}

/**
 * Fix unescaped newlines within JSON string values
 */
function fixUnescapedNewlines(jsonStr: string): string {
  // This regex finds strings and replaces unescaped newlines within them
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    const prevChar = i > 0 ? jsonStr[i - 1] : '';

    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
    } else if (inString && (char === '\n' || char === '\r')) {
      // Replace with escaped version
      result += char === '\n' ? '\\n' : '\\r';
    } else if (inString && char === '\t') {
      result += '\\t';
    } else {
      result += char;
    }

    escaped = inString && char === '\\' && !escaped;
  }

  return result;
}

/**
 * Fix unescaped quotes within string values
 */
function fixUnescapedQuotes(jsonStr: string): string {
  // This is a simplified approach - handles common cases
  // Replace sequences like ": "..." with proper escaping
  return jsonStr.replace(
    /:\s*"([^"]*?)(?<!\\)"([^"]*?)"/g,
    (match, before, after) => {
      if (after && !after.match(/^[\s,}\]]/)) {
        // There's an unescaped quote in the middle
        return `: "${before}\\"${after}"`;
      }
      return match;
    }
  );
}

/**
 * Fix invalid escape sequences
 */
function fixEscapeSequences(jsonStr: string): string {
  // Fix invalid escape sequences by double-escaping them
  return jsonStr.replace(
    /\\(?!["\\/bfnrtu])/g,
    '\\\\'
  );
}

/**
 * Aggressive JSON fixes as a last resort
 */
function aggressiveJsonFix(jsonStr: string): string {
  let result = advancedJsonRepair(jsonStr);

  // Try to balance braces and brackets
  result = balanceBrackets(result);

  // Remove any text after the last complete object
  const lastBrace = findMatchingBrace(result);
  if (lastBrace > 0) {
    result = result.substring(0, lastBrace + 1);
  }

  return result;
}

/**
 * Balance brackets by removing incomplete trailing content
 */
function balanceBrackets(jsonStr: string): string {
  let braceCount = 0;
  let bracketCount = 0;
  let lastValidIndex = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (char === '"' && !escaped) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;

      if (braceCount >= 0 && bracketCount >= 0) {
        lastValidIndex = i;
      }
    }

    escaped = char === '\\' && !escaped;
  }

  // If unbalanced, truncate to last valid position
  if (braceCount !== 0 || bracketCount !== 0) {
    return jsonStr.substring(0, lastValidIndex + 1) + '}'.repeat(Math.max(0, braceCount));
  }

  return jsonStr;
}

/**
 * Find the position of the matching closing brace for the first opening brace
 */
function findMatchingBrace(jsonStr: string): number {
  let braceCount = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (char === '"' && !escaped) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }

    escaped = char === '\\' && !escaped;
  }

  return -1;
}

/**
 * Validates that all required fields exist in the parsed result
 */
export function validateAnalysisResult(parsed: any): void {
  const requiredFields = [
    'contentType',
    'subject',
    'topic',
    'difficulty',
    'extractedText',
    'explanation'
  ];

  const missingFields = requiredFields.filter(field =>
    parsed[field] === undefined
  );

  if (missingFields.length > 0) {
    console.warn(`Missing fields in response: ${missingFields.join(', ')}`);
  }

  // Validate explanation structure
  if (parsed.explanation && typeof parsed.explanation !== 'object') {
    throw new Error('explanation must be an object');
  }

  // Ensure arrays are arrays
  if (parsed.explanation) {
    if (parsed.explanation.stepByStep && !Array.isArray(parsed.explanation.stepByStep)) {
      parsed.explanation.stepByStep = [];
    }
    if (parsed.explanation.practiceQuestions && !Array.isArray(parsed.explanation.practiceQuestions)) {
      parsed.explanation.practiceQuestions = [];
    }
    if (parsed.explanation.tips && !Array.isArray(parsed.explanation.tips)) {
      parsed.explanation.tips = [];
    }
  }
}
