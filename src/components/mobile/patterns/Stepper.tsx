"use client";

import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: string | number;
  label: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  className?: string;
}

export function Stepper({
  steps,
  currentStepIndex,
  className = "",
}: StepperProps) {
  const currentStep = steps[currentStepIndex];

  return (
    <div className={`w-full py-2.5 px-4 select-none ${className}`}>
      {/* Top summary row: Step X of Y + Current Label */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          {currentStep?.label}
        </span>
      </div>

      {/* Progress Bars Row */}
      <div className="flex items-center gap-1.5 w-full">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={step.id}
              className="flex-1 h-1.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-slate-700 transition-colors"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "w-full bg-[#0B2A6F] dark:bg-blue-400"
                    : isCurrent
                    ? "w-full bg-[#0B2A6F] dark:bg-blue-500 animate-pulse"
                    : "w-0"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
