"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X, LucideIcon } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  fullForm?: string;
  badge?: string;
  subtitle?: string;
}

export interface DynamicSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function DynamicSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  icon: Icon,
  disabled = false,
  className = "",
}: DynamicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt, description: opt };
    }
    return {
      ...opt,
      description: opt.description || opt.fullForm,
    };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const activeTooltip =
    selectedOption?.description || selectedOption?.fullForm || displayLabel;

  // Screen width detection for adaptive mobile/web layout
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close when clicking outside on desktop
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  // Lock body scroll when mobile sheet is open & listen for Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    if (isMobile) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setIsOpen(false);
    },
    [onChange]
  );

  /* ─── Render Options Content (Minimalist, Single-Line, with Hover Description) ─── */
  const renderOptionsList = () => (
    <div className="space-y-1">
      {normalizedOptions.map((opt) => {
        const isSelected = opt.value === value;
        const hoverText = opt.description || opt.fullForm || opt.label;
        return (
          <button
            key={opt.value}
            type="button"
            title={hoverText}
            onClick={() => handleSelect(opt.value)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer select-none group ${
              isSelected
                ? "bg-blue-50/90 text-[#0D3481] border border-blue-200/80 font-bold shadow-2xs"
                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent font-medium"
            }`}
          >
            <div className="truncate pr-2">
              <span className="text-xs sm:text-sm font-semibold block truncate">
                {opt.label}
              </span>
              {opt.description && opt.description !== opt.label && (
                <span className="text-[11px] text-slate-400 block truncate font-normal">
                  {opt.description}
                </span>
              )}
            </div>

            <div className="shrink-0 flex items-center pl-2">
              {isSelected ? (
                <div className="w-5 h-5 rounded-full bg-[#0D3481] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300/80 group-hover:border-slate-400" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-30" : "z-auto"} ${className}`}
    >
      {/* ─── Trigger Button ─── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        title={activeTooltip}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none text-left ${
          isOpen
            ? "bg-white border-[#0D3481] ring-2 ring-[#0D3481]/20 shadow-xs text-slate-900"
            : "bg-slate-50/90 hover:bg-white hover:border-slate-300 border-slate-200/90 text-slate-800 shadow-2xs"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {Icon && (
            <div
              className={`p-1 rounded-lg transition-colors shrink-0 ${
                isOpen
                  ? "bg-blue-50 text-[#0D3481]"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="truncate text-slate-800 font-medium whitespace-nowrap">
            {displayLabel}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#0D3481]" : ""
          }`}
        />
      </button>

      {/* ─── Desktop Anchored Dropdown (Screens >= 640px, Minimalist without duplicate headers) ─── */}
      {isOpen && !isMobile && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 p-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 origin-top min-w-full"
        >
          {renderOptionsList()}
        </div>
      )}

      {/* ─── Mobile Dynamic Bottom Sheet (Screens < 640px, Minimalist Header) ─── */}
      {isOpen &&
        isMobile &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-[28px] shadow-2xl border-t border-slate-200/90 p-5 pb-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 text-left"
            >
              {/* Swipe/Pull Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300/80 mx-auto mb-4" />

              {/* Minimalist Drawer Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  {Icon && (
                    <div className="p-1.5 rounded-xl bg-blue-50 text-[#0D3481]">
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <h3 className="text-sm font-bold text-[#10334A]">
                    {label ? `Select ${label}` : "Select Option"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {renderOptionsList()}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default DynamicSelect;

