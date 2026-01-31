'use client';

import {
  Lightbulb,
  BookOpen,
  Target,
  HelpCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanResult } from '@/types';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '../common/markdown-parser';
import { useState } from 'react';

interface ExplanationCardProps {
  result: ScanResult;
}

export function ExplanationCard({ result }: ExplanationCardProps) {
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const { explanation, subject, topic, difficulty, extractedText } = result;

  return (
    <div className="space-y-4">
      {/* Topic Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-sm font-medium text-[hsl(var(--primary))]">
          {subject}
        </span>
        <span className="rounded-full bg-[hsl(var(--secondary))]/10 px-3 py-1 text-sm text-[hsl(var(--secondary))]">
          {topic}
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm',
            difficulty === 'easy' &&
              'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            difficulty === 'medium' &&
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
            difficulty === 'hard' &&
              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
          )}
        >
          {difficulty
            ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
            : 'Unknown'}
        </span>
      </div>

      {/* Extracted Text */}
      <Card>
        <CardHeader
          className="pt-3 pb-3 cursor-pointer"
          onClick={() => setShowExtractedText(!showExtractedText)}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              What I see
            </div>
            {showExtractedText ? (
              <ChevronUp className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            )}
          </CardTitle>
        </CardHeader>
        {showExtractedText && (
          <CardContent>
            <div className="text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
              {renderMarkdown(extractedText)}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Simple Answer */}
      <Card className="border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5">
        <CardHeader
          className="pb-3 pt-3 cursor-pointer"
          onClick={() => setShowAnswer(!showAnswer)}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[hsl(var(--primary))]" />
              Answer
            </div>
            {showAnswer ? (
              <ChevronUp className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            )}
          </CardTitle>
        </CardHeader>
        {showAnswer && (
          <CardContent>
            <p className="text-lg font-semibold">{explanation.simpleAnswer}</p>
          </CardContent>
        )}
      </Card>

      {/* Concept Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Concept
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[hsl(var(--muted-foreground))]">
            {renderMarkdown(explanation.concept)}
          </div>
        </CardContent>
      </Card>

      {/* Why It Matters */}
      {explanation.whyItMatters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              Why It Matters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[hsl(var(--muted-foreground))]">
              {renderMarkdown(explanation.whyItMatters)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {explanation.tips && explanation.tips.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {explanation.tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-[hsl(var(--muted-foreground))]"
                >
                  <span className="text-[hsl(var(--primary))]">•</span>
                  {renderMarkdown(tip)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Practice Questions */}
      {explanation.practiceQuestions &&
        explanation.practiceQuestions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📝 Practice Problems</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {explanation.practiceQuestions.map((question, index) => (
                  <li
                    key={index}
                    className="rounded-lg bg-[hsl(var(--muted))]/50 p-3 text-sm"
                  >
                    {index + 1}. {question}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
