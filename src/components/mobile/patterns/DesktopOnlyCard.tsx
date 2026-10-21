"use client";

import React, { useState } from "react";
import { Monitor, Copy, Check, ExternalLink } from "lucide-react";

export interface DesktopOnlyCardProps {
  featureName: string;
  description?: string;
  actionUrl?: string;
  className?: string;
}

export function DesktopOnlyCard({
  featureName,
  description = "This advanced administrative workspace includes extensive tables, file parsers, and batch tools designed specifically for larger desktop displays.",
  actionUrl,
  className = "",
}: DesktopOnlyCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const url = actionUrl || window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`p-6 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col items-center text-center select-none ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A6F] dark:text-blue-400 flex items-center justify-center mb-4">
        <Monitor className="w-7 h-7" />
      </div>

      <span className="inline-block px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
        Best on Desktop
      </span>

      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">
        {featureName}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-5">
        {description}
      </p>

      <button
        type="button"
        onClick={handleCopyLink}
        className="w-full max-w-xs min-h-[44px] px-4 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-slate-750 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Link Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy Link for Desktop</span>
          </>
        )}
      </button>
    </div>
  );
}
