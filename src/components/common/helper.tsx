import { cn } from '@/lib/utils';
import { EducationLevel, Explanation, StepByStep } from '@/types';

// ✅ StatItem Component (React.FC)
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
  className?: string;
}

export function StatItem({
  icon,
  label,
  value,
  color = 'text-foreground',
  className = '',
}: StatItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/50 hover:bg-[hsl(var(--muted))]/75 transition-colors',
        className
      )}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className={cn('font-bold text-lg truncate', color)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-tight">
          {label}
        </p>
      </div>
    </div>
  );
}

// ✅ Format Hour Helper
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// ✅ Format Date Helper
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ✅ Format Percentage Helper
export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

// ✅ Difficulty Badge Helper
export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    medium:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors[difficulty as keyof typeof colors] ||
          'bg-gray-100 text-gray-700 dark:bg-gray-900/50'
      )}
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

export function UpgradeBenefit({
  emoji,
  text,
  color,
}: {
  emoji: string;
  text: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses = {
    emerald:
      'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    purple:
      'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
    amber:
      'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]',
        colorClasses[color]
      )}
    >
      <span className="text-lg">{emoji}</span>
      <span className="font-medium text-sm">{text}</span>
    </div>
  );
}

export function getTimeUntilReset(resetTime?: string): string {
  if (!resetTime) return 'midnight';

  const reset = new Date(resetTime);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();

  if (diffMs <= 0) return 'soon';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

// export function sanitizeExplanation(explanation: Explanation): Explanation {
//   if (!explanation || typeof explanation !== 'object') {
//     return {
//       simpleAnswer: 'Unable to analyze content',
//       stepByStep: [],
//       concept: '',
//       whyItMatters: '',
//       practiceQuestions: [],
//       tips: [],
//     };
//   }

//   return {
//     simpleAnswer: String(
//       explanation.simpleAnswer || 'Unable to analyze content'
//     ),
//     stepByStep: Array.isArray(explanation.stepByStep)
//       ? explanation.stepByStep.map((step: StepByStep, index: number) => ({
//           step: typeof step.step === 'number' ? step.step : index + 1,
//           action: String(step.action || ''),
//           explanation: String(step.explanation || ''),
//           formula: step.formula ? String(step.formula) : null,
//         }))
//       : [],
//     concept: String(explanation.concept || ''),
//     whyItMatters: explanation.whyItMatters
//       ? String(explanation.whyItMatters)
//       : null,
//     practiceQuestions: Array.isArray(explanation.practiceQuestions)
//       ? explanation.practiceQuestions.map((q: any) => String(q))
//       : [],
//     tips: Array.isArray(explanation.tips)
//       ? explanation.tips.map((t: any) => String(t))
//       : [],
//   };
// }

/**
 * Sanitize a string for database storage
 * Removes null bytes and other problematic characters
 */
export function sanitizeString(str: string | null | undefined): string | null {
  if (str === null || str === undefined) {
    return null;
  }

  return (
    String(str)
      // Remove null bytes (PostgreSQL doesn't like these)
      .replace(/\x00/g, '')
      // Remove other control characters except newlines, tabs, carriage returns
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
  );
}

/**
 * Sanitize the explanation object for database storage
 */
export function sanitizeExplanation(explanation: Explanation): Explanation {
  if (!explanation || typeof explanation !== 'object') {
    return {
      simpleAnswer: 'Unable to analyze content',
      stepByStep: [],
      concept: '',
      whyItMatters: '',
      practiceQuestions: [],
      tips: [],
    };
  }

  const sanitized = {
    simpleAnswer:
      sanitizeString(explanation.simpleAnswer) || 'Unable to analyze content',
    stepByStep: Array.isArray(explanation.stepByStep)
      ? explanation.stepByStep.map((step: StepByStep, index: number) => ({
          step: typeof step.step === 'number' ? step.step : index + 1,
          action: sanitizeString(step.action) || '',
          explanation: sanitizeString(step.explanation) || '',
          formula: step.formula
            ? sanitizeString(step.formula) || undefined
            : undefined,
        }))
      : [],
    concept: explanation.concept
      ? sanitizeString(explanation.concept) || ''
      : '',
    whyItMatters: explanation.whyItMatters
      ? sanitizeString(explanation.whyItMatters) ?? undefined
      : undefined,
    practiceQuestions: Array.isArray(explanation.practiceQuestions)
      ? explanation.practiceQuestions.map(
          (q: string) => sanitizeString(String(q)) || ''
        )
      : [],
    tips: Array.isArray(explanation.tips)
      ? explanation.tips.map((t: string) => sanitizeString(String(t)) || '')
      : [],
  };

  return sanitized;
}

/**
 * Deep sanitize any object to ensure valid JSON serialization and database storage
 */
export function deepSanitize(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number') {
    // Handle NaN and Infinity which aren't valid JSON
    if (Number.isNaN(obj) || !Number.isFinite(obj)) {
      return null;
    }
    return obj;
  }

  if (typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepSanitize(value);
    }
    return result;
  }

  // Convert anything else to string
  return sanitizeString(String(obj));
}

/**
 * Prepare explanation for JSONB column insertion
 * This ensures the object can be properly serialized
 */
export function prepareExplanationForDb(explanation: Explanation): Explanation {
  const sanitized = sanitizeExplanation(explanation);
  const deepSanitized = deepSanitize(sanitized);

  // Verify it can be serialized
  try {
    const serialized = JSON.stringify(deepSanitized);
    // Parse it back to ensure it's valid
    JSON.parse(serialized);
    return deepSanitized;
  } catch (error) {
    console.error('Failed to serialize explanation:', error);
    // Return a safe fallback
    return {
      simpleAnswer: 'Content analysis completed',
      stepByStep: [],
      concept: '',
      whyItMatters: '',
      practiceQuestions: [],
      tips: [],
    };
  }
}

/**
 * Truncate text to a maximum length while preserving word boundaries
 */
export function truncateText(
  text: string | null,
  maxLength: number = 50000
): string | null {
  if (!text) return null;
  if (text.length <= maxLength) return text;

  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

const validEducationLevels: EducationLevel[] = [
  'elementary',
  'middle',
  'high',
  'undergraduate',
  'graduate',
  'professional',
  'other',
] as const;

export function getValidEducationLevel(
  level: string | undefined
): EducationLevel {
  if (!level) return 'other';
  const normalized = level.toLowerCase().trim();
  if (validEducationLevels.includes(normalized as EducationLevel)) {
    return normalized as EducationLevel;
  }
  return 'other';
}
