"use client";

import React, { useRef, useEffect } from "react";

export interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  disabled = false,
  hasError = false,
  className = "",
}: OtpInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, length);
    onChange(raw);
    if (raw.length === length) {
      onComplete?.(raw);
    }
  };

  const digits = value.split("");

  return (
    <div
      onClick={() => hiddenInputRef.current?.focus()}
      className={`relative flex items-center justify-center gap-2 sm:gap-2.5 cursor-text select-none ${className}`}
    >
      {/* Hidden native input with one-time-code and numeric input mode */}
      <input
        ref={hiddenInputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
        aria-label="One-time verification code"
      />

      {/* Visual digit boxes */}
      {Array.from({ length }).map((_, idx) => {
        const digit = digits[idx] || "";
        const isFocused = value.length === idx;
        const isFilled = Boolean(digit);

        return (
          <div
            key={idx}
            className={`w-11 sm:w-12 h-14 rounded-xl border flex items-center justify-center text-xl font-bold transition-all ${
              hasError
                ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                : isFocused
                ? "border-[#0B2A6F] dark:border-blue-400 ring-2 ring-[#0B2A6F]/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white scale-102"
                : isFilled
                ? "border-neutral-300 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-400"
            }`}
          >
            {digit}
            {isFocused && !digit && (
              <span className="w-0.5 h-6 bg-[#0B2A6F] dark:bg-blue-400 animate-pulse rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}
