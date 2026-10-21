"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export interface MobileTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeColor?: "red" | "amber" | "blue";
}

export interface MobileTabBarProps {
  tabs: MobileTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: MobileTabBarProps) {
  return (
    <nav
      role="navigation"
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-slate-800 transition-transform select-none ${className}`}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 6px)",
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-1">
        {tabs.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 cursor-pointer group active:scale-95 transition-transform"
              aria-label={tab.label}
              aria-selected={isActive}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center w-6 h-6 mb-0.5">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-[#0B2A6F] dark:text-blue-400 stroke-[2.25]"
                      : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 stroke-[1.75]"
                  }`}
                />

                {/* Badge counter */}
                {tab.badge !== undefined && tab.badge !== 0 && (
                  <span
                    className={`absolute -top-1 -right-2 px-1.5 min-w-[16px] h-4 text-[10px] font-bold rounded-full flex items-center justify-center text-white ${
                      tab.badgeColor === "amber"
                        ? "bg-amber-500"
                        : tab.badgeColor === "blue"
                        ? "bg-[#0B2A6F]"
                        : "bg-red-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Label (always visible) */}
              <span
                className={`text-[10px] font-medium tracking-tight truncate max-w-[64px] transition-colors ${
                  isActive
                    ? "text-[#0B2A6F] dark:text-blue-400 font-semibold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#0B2A6F] dark:bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
