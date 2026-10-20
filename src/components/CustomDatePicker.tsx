"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";

/**
 * Robust local date helpers avoiding UTC timezone shifts
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatToIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return formatToIsoDate(new Date());
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr || "Select date";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getDayName(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

export function daysBetween(startStr: string, endStr: string): number {
  const d1 = parseLocalDate(startStr);
  const d2 = parseLocalDate(endStr);
  if (!d1 || !d2) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export interface DatePreset {
  label: string;
  daysFromBase?: number; // Added to base (minDate or today)
  exactIso?: string;
}

export interface CustomDatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  ruleBadge?: string;
  presets?: DatePreset[];
  highlightRange?: {
    start?: string;
    end?: string;
  };
  required?: boolean;
  name?: string;
  popoverPlacement?: "top" | "bottom";
}

export function CustomDatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  disabled = false,
  className = "",
  helperText,
  ruleBadge,
  presets,
  highlightRange,
  required = false,
  name,
  popoverPlacement = "top",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Active view date (Month & Year currently browsed)
  const initialDate = useMemo(() => {
    return parseLocalDate(value) || parseLocalDate(minDate || "") || new Date();
  }, [value, minDate]);

  const [currentYear, setCurrentYear] = useState(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => initialDate.getMonth());

  // Keep viewed month in sync when value changes from outside
  useEffect(() => {
    if (value) {
      const parsed = parseLocalDate(value);
      if (parsed) {
        setCurrentYear(parsed.getFullYear());
        setCurrentMonth(parsed.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode("days");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  // Lock body scroll on mobile bottom sheet & handle Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setViewMode("days");
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

  const todayIso = useMemo(() => getTodayIso(), []);

  // Navigation limits
  const minDateParsed = useMemo(() => (minDate ? parseLocalDate(minDate) : null), [minDate]);
  const maxDateParsed = useMemo(() => (maxDate ? parseLocalDate(maxDate) : null), [maxDate]);

  const canGoPrev = useMemo(() => {
    if (!minDateParsed) return true;
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const minMonthDate = new Date(minDateParsed.getFullYear(), minDateParsed.getMonth(), 1);
    return prevMonthDate >= minMonthDate;
  }, [currentYear, currentMonth, minDateParsed]);

  const canGoNext = useMemo(() => {
    if (!maxDateParsed) return true;
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const maxMonthDate = new Date(maxDateParsed.getFullYear(), maxDateParsed.getMonth(), 1);
    return nextMonthDate <= maxMonthDate;
  }, [currentYear, currentMonth, maxDateParsed]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calendar Day Grid Computation (Monday to Sunday)
  const calendarDays = useMemo(() => {
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // In JS: 0=Sun, 1=Mon, ..., 6=Sat
    // We want 0=Mon, 1=Tue, ..., 6=Sun
    const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    const cells: {
      day: number;
      month: number;
      year: number;
      iso: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
      isInRange: boolean;
      isRangeStart: boolean;
      isRangeEnd: boolean;
    }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        day,
        month: m,
        year: y,
        iso,
        isCurrentMonth: false,
        isDisabled: true, // inactive
        isToday: iso === todayIso,
        isSelected: iso === value,
        isInRange: false,
        isRangeStart: false,
        isRangeEnd: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isDisabled =
        Boolean(minDate && iso < minDate) || Boolean(maxDate && iso > maxDate);

      const isSelected = iso === value;
      const isRangeStart = highlightRange?.start === iso;
      const isRangeEnd = highlightRange?.end === iso;
      const isInRange = Boolean(
        highlightRange?.start &&
          highlightRange?.end &&
          iso >= highlightRange.start &&
          iso <= highlightRange.end
      );

      cells.push({
        day,
        month: currentMonth,
        year: currentYear,
        iso,
        isCurrentMonth: true,
        isDisabled,
        isToday: iso === todayIso,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
      });
    }

    // Trailing days to complete standard grid (fill up to 35 or 42 cells)
    const totalFilled = cells.length;
    const targetLength = totalFilled > 35 ? 42 : 35;
    const trailingCount = targetLength - totalFilled;

    for (let day = 1; day <= trailingCount; day++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        day,
        month: m,
        year: y,
        iso,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: iso === todayIso,
        isSelected: iso === value,
        isInRange: false,
        isRangeStart: false,
        isRangeEnd: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth, minDate, maxDate, todayIso, value, highlightRange]);

  const handleSelectDate = useCallback(
    (iso: string, isDisabled: boolean) => {
      if (isDisabled || disabled) return;
      onChange(iso);
      setIsOpen(false);
      setViewMode("days");
    },
    [disabled, onChange]
  );

  const handleSelectPreset = (preset: DatePreset) => {
    if (disabled) return;
    let targetIso = "";

    if (preset.exactIso) {
      targetIso = preset.exactIso;
    } else if (preset.daysFromBase !== undefined) {
      const baseIso = minDate || todayIso;
      const baseDate = parseLocalDate(baseIso) || new Date();
      baseDate.setDate(baseDate.getDate() + preset.daysFromBase);
      targetIso = formatToIsoDate(baseDate);
    }

    if (targetIso) {
      // Validate against rules
      if (minDate && targetIso < minDate) targetIso = minDate;
      if (maxDate && targetIso > maxDate) targetIso = maxDate;
      onChange(targetIso);
      setIsOpen(false);
      setViewMode("days");
    }
  };

  const handleQuickToday = () => {
    if (minDate && todayIso < minDate) return;
    onChange(todayIso);
    setIsOpen(false);
    setViewMode("days");
  };

  // Year range for year picker view
  const yearsList = useMemo(() => {
    const startY = minDateParsed ? minDateParsed.getFullYear() : currentYear - 2;
    const list: number[] = [];
    for (let y = startY; y <= startY + 11; y++) {
      list.push(y);
    }
    return list;
  }, [minDateParsed, currentYear]);

  /* ──────────────────────────────────────────────────────────────────────────
     CALENDAR BODY CONTENT
  ────────────────────────────────────────────────────────────────────────── */
  const renderCalendarContent = () => (
    <div className="space-y-3.5 select-none">
      {/* Calendar Top Navigation Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "days" ? "months" : "days")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 hover:text-[#0D3481] hover:bg-[#0D3481]/8 transition-all cursor-pointer"
          >
            <span>{MONTH_NAMES[currentMonth]}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 hover:text-[#0D3481] hover:bg-[#0D3481]/8 transition-all cursor-pointer"
          >
            <span>{currentYear}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {viewMode === "days" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={handlePrevMonth}
              title={canGoPrev ? "Previous month" : "Earlier dates restricted"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={handleNextMonth}
              title={canGoNext ? "Next month" : "Later dates restricted"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preset Quick Chips at Top (immediately visible without scrolling) */}
      {viewMode === "days" && presets && presets.length > 0 && (
        <div className="pb-2 mb-1 border-b border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#0D3481]" />
            <span>Quick Presets</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-[#0D3481] hover:text-white text-slate-700 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Month Selection Grid */}
      {viewMode === "months" && (
        <div className="grid grid-cols-3 gap-2 py-2">
          {MONTH_NAMES.map((name, idx) => {
            const isSelected = idx === currentMonth;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setCurrentMonth(idx);
                  setViewMode("days");
                }}
                className={`py-2 px-2.5 text-xs font-semibold rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#0D3481] text-white shadow-xs"
                    : "text-slate-700 hover:bg-[#0D3481]/10 hover:text-[#0D3481]"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      {/* Year Selection Grid */}
      {viewMode === "years" && (
        <div className="grid grid-cols-3 gap-2 py-2">
          {yearsList.map((y) => {
            const isSelected = y === currentYear;
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setCurrentYear(y);
                  setViewMode("days");
                }}
                className={`py-2 px-2.5 text-xs font-semibold rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#0D3481] text-white shadow-xs"
                    : "text-slate-700 hover:bg-[#0D3481]/10 hover:text-[#0D3481]"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}

      {/* Days View Grid */}
      {viewMode === "days" && (
        <div>
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 mb-1.5 text-center">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Numbers Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`overflow-${idx}`}
                    className="h-8 flex items-center justify-center text-[11px] text-slate-300 select-none opacity-40 font-mono"
                  >
                    {cell.day}
                  </div>
                );
              }

              // Selected style
              if (cell.isSelected) {
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => handleSelectDate(cell.iso, cell.isDisabled)}
                    className="h-8 rounded-xl bg-[#0D3481] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-[#0D3481]/30 transition-transform active:scale-95 cursor-pointer relative"
                  >
                    <span>{cell.day}</span>
                    <span className="w-1 h-1 rounded-full bg-white absolute bottom-1" />
                  </button>
                );
              }

              // Range edges and range middle
              let rangeClass = "";
              if (cell.isRangeStart) {
                rangeClass = "bg-blue-100 text-[#0D3481] font-bold rounded-l-xl";
              } else if (cell.isRangeEnd) {
                rangeClass = "bg-blue-100 text-[#0D3481] font-bold rounded-r-xl";
              } else if (cell.isInRange) {
                rangeClass = "bg-blue-50/80 text-[#0D3481] font-medium";
              }

              // Disabled day (e.g. before minDate or after maxDate)
              if (cell.isDisabled) {
                return (
                  <div
                    key={cell.iso}
                    title="Not selectable under institutional policy"
                    className="h-8 rounded-xl flex items-center justify-center text-[11px] font-medium text-slate-300 bg-slate-50/70 select-none cursor-not-allowed line-through decoration-slate-300/70"
                  >
                    {cell.day}
                  </div>
                );
              }

              // Available Normal Day
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectDate(cell.iso, false)}
                  className={`h-8 rounded-xl text-xs font-semibold text-slate-700 hover:bg-[#0D3481]/10 hover:text-[#0D3481] transition-all cursor-pointer flex items-center justify-center relative ${rangeClass} ${
                    cell.isToday
                      ? "ring-1.5 ring-[#0D3481]/40 text-[#0D3481] font-bold bg-[#0D3481]/4"
                      : ""
                  }`}
                >
                  <span>{cell.day}</span>
                  {cell.isToday && !cell.isSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#0D3481] absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}



      {/* Bottom Status / Actions Bar */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          type="button"
          disabled={Boolean(minDate && todayIso < minDate)}
          onClick={handleQuickToday}
          className="text-[11px] font-bold text-[#0D3481] hover:underline disabled:opacity-30 disabled:no-underline cursor-pointer flex items-center gap-1"
        >
          <Clock className="w-3 h-3" />
          <span>Select Today</span>
        </button>

        {ruleBadge && (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[170px]">
            {ruleBadge}
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setViewMode("days");
          }}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );

  const displayFormatted = value ? formatDisplayDate(value) : placeholder;
  const weekdayFormatted = value ? getDayName(value) : "";
  const isSelectedToday = value === todayIso;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 block mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input for standard forms */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button Field */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full text-left px-3.5 py-2.5 rounded-xl border bg-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs group ${
          isOpen
            ? "border-[#0D3481] ring-2 ring-[#0D3481]/20 shadow-xs"
            : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isOpen || value
                ? "bg-[#0D3481]/10 text-[#0D3481]"
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs sm:text-sm font-semibold truncate ${
                  value ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {displayFormatted}
              </span>

              {value && weekdayFormatted && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  ({weekdayFormatted})
                </span>
              )}
            </div>

            {isSelectedToday && (
              <span className="inline-block text-[10px] font-bold text-emerald-700 leading-tight">
                ● Today
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#0D3481]" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      {/* Helper text under trigger */}
      {helperText && (
        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <span>{helperText}</span>
        </p>
      )}

      {/* ─── Desktop Anchored Popover (Screens >= 640px, opens above trigger so no scrolling needed) ─── */}
      {isOpen && !isMobile && (
        <div
          role="dialog"
          aria-label={label || "Calendar"}
          className={`absolute left-0 z-50 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200/90 p-4 w-[330px] animate-in fade-in zoom-in-95 duration-150 text-left ${
            popoverPlacement === "bottom"
              ? "top-full mt-2 origin-top"
              : "bottom-full mb-2 origin-bottom"
          }`}
        >
          {renderCalendarContent()}
        </div>
      )}

      {/* ─── Mobile Bottom Sheet Modal (Screens < 640px) ─── */}
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
              if (e.target === e.currentTarget) {
                setIsOpen(false);
                setViewMode("days");
              }
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-[28px] shadow-2xl border-t border-slate-200/90 p-5 pb-8 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 text-left"
            >
              {/* Swipe/Pull Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300/80 mx-auto mb-4" />

              {/* Mobile Drawer Title */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-blue-50 text-[#0D3481]">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#10334A]">
                      {label || "Select Date"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {value ? formatDisplayDate(value) : "Choose a valid date"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setViewMode("days");
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderCalendarContent()}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
