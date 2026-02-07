'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Lightbulb,
  ListOrdered,
  Globe,
  HelpCircle,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StructuredExplanation {
  simpleAnswer?: string;
  stepByStep?: {
    step: number;
    action: string;
    explanation: string;
    formula?: string | null;
  }[];
  concept?: string | null;
  whyItMatters?: string | null;
  practiceQuestions?: string[];
  tips?: string[];
}

interface StructuredData {
  explanation?: StructuredExplanation;
  subject?: string | null;
  topic?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  keywords?: string[];
  summary?: string;
  contentType?: string;
}

interface StructuredResponseProps {
  structured: StructuredData;
  rawContent?: string;
}

// Main Explanation Card (like ExplanationCard in results)
function ExplanationSection({
  explanation,
}: {
  explanation: StructuredExplanation;
}) {
  if (!explanation.simpleAnswer) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-lg bg-[hsl(var(--primary)/0.1)] shrink-0">
          <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-wide mb-1">
            Answer
          </h4>
          <p className="text-sm leading-relaxed">{explanation.simpleAnswer}</p>
        </div>
      </div>
    </div>
  );
}

// Step by Step Section (like StepByStep in results)
function StepByStepSection({
  steps,
}: {
  steps: StructuredExplanation['stepByStep'];
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className="p-1.5 rounded-lg bg-[hsl(var(--success)/0.1)] shrink-0">
          <ListOrdered className="w-4 h-4 text-[hsl(var(--success))]" />
        </div>
        <h4 className="text-xs font-semibold text-[hsl(var(--success))] uppercase tracking-wide flex-1">
          Step-by-Step ({steps.length} steps)
        </h4>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        )}
      </button>

      {isExpanded && (
        <div className="ml-8 space-y-3 border-l-2 border-[hsl(var(--border))] pl-4">
          {steps.map((step, index) => (
            <div key={step.step || index} className="relative">
              {/* Step Number Badge */}
              <div className="absolute -left-[1.35rem] top-0 w-5 h-5 rounded-full bg-[hsl(var(--success))] text-white text-xs flex items-center justify-center font-bold">
                {step.step || index + 1}
              </div>

              <div className="space-y-1">
                <p className="font-medium text-sm">{step.action}</p>
                {step.explanation && step.explanation !== step.action && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {step.explanation}
                  </p>
                )}
                {step.formula && (
                  <code className="block mt-1.5 px-2 py-1.5 bg-[hsl(var(--muted))] rounded text-xs font-mono border border-[hsl(var(--border))]">
                    {step.formula}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Concept Section
function ConceptSection({ concept }: { concept: string }) {
  return (
    <div className="p-3 bg-[hsl(var(--primary)/0.05)] rounded-xl border-l-3 border-[hsl(var(--primary))]">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-wide mb-1">
            Key Concept
          </h4>
          <p className="text-xs leading-relaxed">{concept}</p>
        </div>
      </div>
    </div>
  );
}

// Why It Matters Section
function WhyItMattersSection({ content }: { content: string }) {
  return (
    <div className="p-3 bg-[hsl(var(--success)/0.05)] rounded-xl border-l-3 border-[hsl(var(--success))]">
      <div className="flex items-start gap-2">
        <Globe className="w-4 h-4 text-[hsl(var(--success))] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-[hsl(var(--success))] uppercase tracking-wide mb-1">
            Real-World Application
          </h4>
          <p className="text-xs leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}

// Practice Questions Section
function PracticeQuestionsSection({ questions }: { questions: string[] }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className="p-1.5 rounded-lg bg-[hsl(var(--warning)/0.1)] shrink-0">
          <HelpCircle className="w-4 h-4 text-[hsl(var(--warning))]" />
        </div>
        <h4 className="text-xs font-semibold text-[hsl(var(--warning))] uppercase tracking-wide flex-1">
          Practice Questions ({questions.length})
        </h4>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        )}
      </button>

      {isExpanded && (
        <ul className="ml-8 space-y-2">
          {questions.map((q, i) => (
            <li
              key={i}
              className="text-xs text-[hsl(var(--muted-foreground))] pl-3 border-l-2 border-[hsl(var(--warning)/0.3)]"
            >
              {q}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tips Section
function TipsSection({ tips }: { tips: string[] }) {
  if (!tips || tips.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[hsl(var(--secondary))] shrink-0">
          <BookOpen className="w-4 h-4 text-[hsl(var(--secondary-foreground))]" />
        </div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Tips
        </h4>
      </div>
      <ul className="ml-8 space-y-1">
        {tips.map((tip, i) => (
          <li
            key={i}
            className="text-xs text-[hsl(var(--muted-foreground))] flex items-start gap-2"
          >
            <span className="text-[hsl(var(--primary))]">•</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Topic/Subject Badges
function TopicBadges({
  subject,
  topic,
  difficulty,
}: {
  subject?: string | null;
  topic?: string | null;
  difficulty?: string | null;
}) {
  if (!subject && !topic && !difficulty) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[hsl(var(--border)/0.5)]">
      {subject && (
        <span className="px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-full text-xs font-medium">
          {subject}
        </span>
      )}
      {topic && (
        <span className="px-2 py-0.5 bg-[hsl(var(--muted))] rounded-full text-xs">
          {topic}
        </span>
      )}
      {difficulty && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            difficulty === 'easy' &&
              'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
            difficulty === 'medium' &&
              'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
            difficulty === 'hard' &&
              'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]',
          )}
        >
          {difficulty}
        </span>
      )}
    </div>
  );
}

// Keywords Section
function KeywordsSection({ keywords }: { keywords: string[] }) {
  if (!keywords || keywords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 pt-2 border-t border-[hsl(var(--border)/0.5)]">
      {keywords.slice(0, 6).map((keyword, i) => (
        <span
          key={i}
          className="px-2 py-0.5 bg-[hsl(var(--muted))] rounded-full text-xs"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

// Main Component
export function StructuredResponseDisplay({
  structured,
  rawContent,
}: StructuredResponseProps) {
  const [showRaw, setShowRaw] = React.useState(false);
  const explanation = structured.explanation;

  // Check if we have any meaningful structured data
  const hasStructuredData =
    explanation?.simpleAnswer ||
    (explanation?.stepByStep && explanation.stepByStep.length > 0) ||
    explanation?.concept ||
    explanation?.whyItMatters;

  if (!hasStructuredData) {
    // Fallback to raw content
    return (
      <p className="text-sm whitespace-pre-wrap leading-relaxed">
        {rawContent || structured.summary || '[No content]'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Topic Badges */}
      <TopicBadges
        subject={structured.subject}
        topic={structured.topic}
        difficulty={structured.difficulty}
      />

      {/* Main Answer */}
      {explanation?.simpleAnswer && (
        <ExplanationSection explanation={explanation} />
      )}

      {/* Step by Step */}
      {explanation?.stepByStep && explanation.stepByStep.length > 0 && (
        <StepByStepSection steps={explanation.stepByStep} />
      )}

      {/* Concept */}
      {explanation?.concept && <ConceptSection concept={explanation.concept} />}

      {/* Why It Matters */}
      {explanation?.whyItMatters && (
        <WhyItMattersSection content={explanation.whyItMatters} />
      )}

      {/* Practice Questions */}
      {explanation?.practiceQuestions &&
        explanation.practiceQuestions.length > 0 && (
          <PracticeQuestionsSection questions={explanation.practiceQuestions} />
        )}

      {/* Tips */}
      {explanation?.tips && explanation.tips.length > 0 && (
        <TipsSection tips={explanation.tips} />
      )}

      {/* Keywords */}
      {structured.keywords && structured.keywords.length > 0 && (
        <KeywordsSection keywords={structured.keywords} />
      )}

      {/* Raw Transcript Toggle */}
      {rawContent && rawContent !== explanation?.simpleAnswer && (
        <details className="pt-2 border-t border-[hsl(var(--border)/0.5)]">
          <summary className="text-xs text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))]">
            View raw transcript
          </summary>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap bg-[hsl(var(--muted)/0.5)] p-2 rounded-lg">
            {rawContent}
          </p>
        </details>
      )}
    </div>
  );
}
