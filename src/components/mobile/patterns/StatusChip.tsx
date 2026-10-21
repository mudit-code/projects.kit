"use client";

import React from "react";
import { CheckCircle2, Clock, AlertCircle, XCircle, FileText } from "lucide-react";

export type StatusType =
  | "verified"
  | "pending"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "draft";

export interface StatusChipProps {
  status: StatusType | string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; bg: string; text: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  verified: {
    label: "Verified",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  approved: {
    label: "Approved",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending Review",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500 animate-pulse",
    icon: Clock,
  },
  changes_requested: {
    label: "Changes Requested",
    bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    icon: AlertCircle,
  },
  rejected: {
    label: "Action Needed",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    icon: XCircle,
  },
  draft: {
    label: "Saved Draft",
    bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    icon: FileText,
  },
};

export function StatusChip({
  status,
  size = "md",
  showIcon = true,
  className = "",
}: StatusChipProps) {
  const normalizedKey = (status.toLowerCase().replace(/[\s-]/g, "_") as StatusType);
  const config = STATUS_CONFIG[normalizedKey] || {
    label: status,
    bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-medium select-none ${config.bg} ${config.text} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />}
      <span className="truncate">{config.label}</span>
    </span>
  );
}
