'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StepByStep as StepType } from '@/types';
import { renderMarkdown } from '../common/markdown-parser';

interface StepByStepProps {
  steps: StepType[];
}

export function StepByStep({ steps }: StepByStepProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    new Set(steps.map((_, i) => i)) // All expanded by default
  );

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          Step-by-Step Solution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const isExpanded = expandedSteps.has(index);

          return (
            <div
              key={index}
              className={cn(
                'rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all',
                isExpanded && 'bg-[hsl(var(--primary))]/5'
              )}
            >
              {/* Step header */}
              <button
                onClick={() => toggleStep(index)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold">
                  {step.step}
                </div>
                <div className="flex-1 font-medium">{step.action}</div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                )}
              </button>

              {/* Step content */}
              {isExpanded && (
                <div className="border-t border-[hsl(var(--border))] px-4 py-4 pl-16">
                  <div className="text-[hsl(var(--muted-foreground))]">
                    {renderMarkdown(step.explanation)}
                  </div>
                  {step.formula && (
                    <div className="mt-3 rounded-lg bg-[hsl(var(--muted))]/50 p-3 font-mono text-sm">
                      {renderMarkdown(step.formula)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
