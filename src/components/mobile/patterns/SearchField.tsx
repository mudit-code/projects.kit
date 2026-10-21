"use client";

import React, { useRef } from "react";
import { Search, X } from "lucide-react";

export interface SearchFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmit?: () => void;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
  onSubmit,
  className = "",
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none shrink-0" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-9 bg-neutral-100 dark:bg-slate-800 border border-neutral-200/80 dark:border-slate-700/80 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0B2A6F]/20 focus:border-[#0B2A6F] transition-all"
        style={{ fontSize: "16px" }}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
          aria-label="Clear search text"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
