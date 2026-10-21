"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

export interface MobileAppBarProps {
  title: string;
  subtitle?: string;
  largeTitle?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  showFullscreenToggle?: boolean;
  isScrolled?: boolean;
  className?: string;
}

export function MobileAppBar({
  title,
  subtitle,
  largeTitle = false,
  onBack,
  actions,
  showFullscreenToggle = false,
  isScrolled = false,
  className = "",
}: MobileAppBarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          (document.documentElement as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document.exitFullscreen as any).webkitExitFullscreen) {
          (document.exitFullscreen as any).webkitExitFullscreen();
        }
      }
    } catch {}
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800 transition-shadow select-none ${
        isScrolled ? "shadow-xs" : ""
      } ${className}`}
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 8px)",
      }}
    >
      <div className="flex items-center justify-between h-13 px-4">
        {/* Left: Back button or placeholder */}
        <div className="w-10 flex items-center justify-start shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center: Compact Title (visible on compact mode or when scrolled) */}
        <div className="flex-1 text-center min-w-0 px-2">
          {(!largeTitle || isScrolled) && (
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight transition-opacity duration-200">
              {title}
            </h1>
          )}
        </div>

        {/* Right: Contextual actions or Fullscreen toggle */}
        <div className="w-10 flex items-center justify-end shrink-0 gap-1">
          {actions ? (
            actions
          ) : showFullscreenToggle ? (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Large Title region below app bar if largeTitle enabled */}
      {largeTitle && (
        <div className={`px-5 pb-3 transition-all duration-200 ${isScrolled ? "hidden" : "block"}`}>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
