"use client";

import React from "react";

export function SkeletonRow() {
  return (
    <div className="w-full flex items-center min-h-[58px] px-4 py-3 bg-white dark:bg-slate-900 border-b border-neutral-100 dark:border-slate-800 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-slate-800 mr-3 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-neutral-200 dark:bg-slate-800 rounded-md w-3/4" />
        <div className="h-2.5 bg-neutral-150 dark:bg-slate-850 rounded-md w-1/2" />
      </div>
      <div className="w-14 h-5 rounded-full bg-neutral-200 dark:bg-slate-800 shrink-0 ml-2" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="w-full divide-y divide-neutral-100 dark:divide-slate-800">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonRow key={idx} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-neutral-200 dark:bg-slate-800 rounded-md w-1/3" />
        <div className="h-5 bg-neutral-200 dark:bg-slate-800 rounded-full w-16" />
      </div>
      <div className="h-3 bg-neutral-150 dark:bg-slate-850 rounded-md w-4/5" />
      <div className="h-3 bg-neutral-150 dark:bg-slate-850 rounded-md w-2/3" />
      <div className="h-9 bg-neutral-200 dark:bg-slate-800 rounded-xl w-full mt-2" />
    </div>
  );
}
