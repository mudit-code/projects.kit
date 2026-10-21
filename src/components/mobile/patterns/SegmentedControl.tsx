"use client";

import React from "react";

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex items-center p-1 bg-neutral-100 dark:bg-slate-800 rounded-xl select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isSelected
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isSelected
                    ? "bg-[#0B2A6F] text-white"
                    : "bg-neutral-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface FilterPill<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface FilterPillBarProps<T extends string = string> {
  pills: FilterPill<T>[];
  activePill: T;
  onSelectPill: (id: T) => void;
  className?: string;
}

export function FilterPillBar<T extends string = string>({
  pills,
  activePill,
  onSelectPill,
  className = "",
}: FilterPillBarProps<T>) {
  return (
    <div
      className={`w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 px-4 py-2 select-none ${className}`}
    >
      {pills.map((pill) => {
        const isActive = activePill === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => onSelectPill(pill.id)}
            className={`shrink-0 flex items-center gap-1.5 min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer active:scale-95 ${
              isActive
                ? "bg-[#0B2A6F] border-[#0B2A6F] text-white shadow-xs"
                : "bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-750"
            }`}
          >
            <span>{pill.label}</span>
            {pill.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {pill.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
