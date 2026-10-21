"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export interface StickyActionBarProps {
  primaryLabel: string;
  onPrimaryClick: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  secondaryDisabled?: boolean;
  extra?: ReactNode;
  className?: string;
}

export function StickyActionBar({
  primaryLabel,
  onPrimaryClick,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondaryClick,
  secondaryDisabled = false,
  extra,
  className = "",
}: StickyActionBarProps) {
  const [viewportBottomOffset, setViewportBottomOffset] = useState(0);

  // Keyboard awareness via visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // Calculate height difference when virtual keyboard opens
      const offset = window.innerHeight - vv.height;
      setViewportBottomOffset(Math.max(0, offset));
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  return (
    <div
      className={`fixed left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-slate-800 p-4 transition-all duration-150 select-none ${className}`}
      style={{
        bottom: `${viewportBottomOffset}px`,
        paddingBottom:
          viewportBottomOffset > 0
            ? "12px"
            : "max(env(safe-area-inset-bottom, 0px), 14px)",
      }}
    >
      <div className="max-w-md mx-auto flex flex-col gap-2">
        {extra}

        <div className="flex items-center gap-3">
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondaryClick}
              disabled={secondaryDisabled || primaryLoading}
              className="flex-1 min-h-[46px] px-4 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-slate-750 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onPrimaryClick}
            disabled={primaryDisabled || primaryLoading}
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#0B2A6F] dark:bg-blue-600 text-white text-sm font-bold shadow-md shadow-[#0B2A6F]/15 hover:bg-[#0A245C] dark:hover:bg-blue-500 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {primaryLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{primaryLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
