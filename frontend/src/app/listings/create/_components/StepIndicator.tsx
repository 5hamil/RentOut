'use client';

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Details', icon: '📋' },
  { label: 'Photos', icon: '📷' },
  { label: 'Pricing', icon: '💰' },
  { label: 'Location', icon: '📍' },
  { label: 'Availability', icon: '📅' },
];

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <Card className="px-6 py-5">
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const num = i + 1;
          const isCompleted = num < currentStep;
          const isActive = num === currentStep;

          return (
            <div key={step.label} className="flex flex-1 items-start">
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-2" style={{ minWidth: 0 }}>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                    isCompleted
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : isActive
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-gray-100 text-muted'
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    num
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-center leading-tight",
                    isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < totalSteps - 1 && (
                <div className="mt-4 mx-1 flex-1">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-all duration-500",
                      num < currentStep ? 'bg-primary' : 'bg-gray-100'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
