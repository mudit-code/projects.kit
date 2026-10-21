"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RotateCcw, X } from "lucide-react";

export interface FilePickerProps {
  label: string;
  accept?: string;
  maxSizeMb?: number;
  onFileSelect?: (file: File) => void;
  onFileRemove?: () => void;
  progress?: number;
  status?: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
  className?: string;
}

export function FilePicker({
  label,
  accept = ".pdf,.doc,.docx,.zip",
  maxSizeMb = 10,
  onFileSelect,
  onFileRemove,
  progress = 0,
  status = "idle",
  errorMessage,
  className = "",
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileRemove?.();
  };

  const handleTriggerClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* When no file is selected */}
      {!selectedFile && (
        <button
          type="button"
          onClick={handleTriggerClick}
          className="w-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-800/40 hover:bg-neutral-100/50 dark:hover:bg-slate-800 active:scale-99 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0B2A6F] dark:text-blue-400 flex items-center justify-center mb-2.5">
            <UploadCloud className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {label}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Tap to browse (Max {maxSizeMb}MB)
          </span>
        </button>
      )}

      {/* When file is selected */}
      {selectedFile && (
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-[#0B2A6F] dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {status === "error" && (
                <button
                  type="button"
                  onClick={handleTriggerClick}
                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer"
                  title="Retry upload"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-neutral-100 dark:hover:bg-slate-700 cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar during upload */}
          {status === "uploading" && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-[#0B2A6F] dark:bg-blue-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success indicator */}
          {status === "success" && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready for submission</span>
            </div>
          )}

          {/* Error indicator */}
          {status === "error" && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage || "Upload failed. Tap retry to try again."}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
