"use client";

import React from "react";
import { getShortStream } from "@/lib/utils";

interface StreamBadgeProps {
  stream?: string;
  className?: string;
  badge?: boolean;
}

export function StreamBadge({ stream = "", className = "", badge = false }: StreamBadgeProps) {
  const short = getShortStream(stream);

  if (badge) {
    return (
      <span
        title={stream}
        className={`inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 cursor-default ${className}`}
      >
        {short}
      </span>
    );
  }

  return (
    <span
      title={stream}
      className={`cursor-default ${className}`}
    >
      {short}
    </span>
  );
}

export default StreamBadge;
