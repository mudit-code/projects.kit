"use client";

import React, { ReactNode } from "react";
import { ChevronRight, Check } from "lucide-react";
import { StatusChip, StatusType } from "./StatusChip";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  caption?: string;
  leading?: ReactNode;
  status?: StatusType | string;
  trailingMeta?: string;
  showChevron?: boolean;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  caption,
  leading,
  status,
  trailingMeta,
  showChevron = true,
  selectable = false,
  isSelected = false,
  onSelect,
  onClick,
  className = "",
}: ListRowProps) {
  return (
    <div
      role={onClick ? "button" : "listitem"}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={`relative w-full flex items-center min-h-[58px] px-4 py-3 bg-white dark:bg-slate-900 border-b border-neutral-100 dark:border-slate-800/80 active:bg-neutral-50 dark:active:bg-slate-800/60 transition-colors select-none ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Checkbox for selection mode */}
      {selectable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          className={`w-5 h-5 mr-3 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isSelected
              ? "bg-[#0B2A6F] border-[#0B2A6F] text-white"
              : "border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          }`}
          aria-label={isSelected ? "Deselect row" : "Select row"}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>
      )}

      {/* Leading Icon / Avatar */}
      {leading && <div className="shrink-0 mr-3">{leading}</div>}

      {/* Primary content region (2 lines) */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight">
            {title}
          </h2>
          {status && <StatusChip status={status} size="sm" showIcon={false} />}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </p>
        )}

        {caption && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
            {caption}
          </p>
        )}
      </div>

      {/* Trailing side: Meta info & Chevron */}
      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-slate-500">
        {trailingMeta && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {trailingMeta}
          </span>
        )}
        {showChevron && (
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        )}
      </div>
    </div>
  );
}
