"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { MobileAppBar, MobileAppBarProps } from "./patterns/MobileAppBar";
import { MobileTabBar, MobileTabItem } from "./patterns/MobileTabBar";

export interface MobileShellProps {
  // App Bar props
  title: string;
  subtitle?: string;
  largeTitle?: boolean;
  onBack?: () => void;
  headerActions?: ReactNode;

  // Tab Bar props
  tabs?: MobileTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;

  // Focus flow mode (hides bottom tabs, for full-page wizards like forms, uploads, OTP)
  isFocusFlow?: boolean;

  // Top banner (e.g., offline banner)
  topBanner?: ReactNode;

  // Main children content
  children: ReactNode;

  className?: string;
}

export function MobileShell({
  title,
  subtitle,
  largeTitle = false,
  onBack,
  headerActions,
  tabs = [],
  activeTab = "",
  onTabChange = () => {},
  isFocusFlow = false,
  topBanner,
  children,
  className = "",
}: MobileShellProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll listener for collapsing large title
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 24 && !isScrolled) {
      setIsScrolled(true);
    } else if (scrollTop <= 24 && isScrolled) {
      setIsScrolled(false);
    }
  };

  return (
    <div
      className={`mobile-shell-root relative flex flex-col w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F6F5F2] dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${className}`}
    >
      {/* Top Banner (e.g. Offline status) */}
      {topBanner}

      {/* Fixed Mobile App Bar */}
      <MobileAppBar
        title={title}
        subtitle={subtitle}
        largeTitle={largeTitle}
        onBack={onBack}
        actions={headerActions}
        isScrolled={isScrolled}
      />

      {/* Scrollable Content Region */}
      <main
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overscroll-none touch-manipulation min-h-0 ${
          isFocusFlow || tabs.length === 0
            ? "pb-safe"
            : "pb-[calc(max(env(safe-area-inset-bottom,0px),8px)+56px)]"
        }`}
      >
        {children}
      </main>

      {/* Fixed Bottom Tab Bar (hidden during focus flows) */}
      {!isFocusFlow && tabs.length > 0 && (
        <MobileTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
}
