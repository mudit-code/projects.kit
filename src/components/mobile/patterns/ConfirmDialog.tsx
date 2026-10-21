"use client";

import React, { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  isDestructive?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isDestructive = false,
  loading = false,
  icon,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="fixed inset-x-4 bottom-6 sm:max-w-sm sm:mx-auto sm:inset-y-auto sm:top-1/2 sm:-translate-y-1/2 z-50 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-neutral-200/90 dark:border-slate-800 shadow-2xl focus:outline-hidden select-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
          }}
        >
          <div className="flex flex-col items-center text-center">
            {/* Header Icon */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                isDestructive
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                  : "bg-blue-50 dark:bg-blue-950/50 text-[#0B2A6F] dark:text-blue-400"
              }`}
            >
              {icon || <AlertTriangle className="w-6 h-6" />}
            </div>

            <Dialog.Title className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </Dialog.Title>

            <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
              {description}
            </Dialog.Description>

            {/* Actions */}
            <div className="flex flex-col w-full gap-2 mt-5">
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`w-full min-h-[44px] rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer ${
                  isDestructive
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/20"
                    : "bg-[#0B2A6F] hover:bg-[#092257] text-white shadow-xs shadow-[#0B2A6F]/20"
                }`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmLabel}</span>
              </button>

              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {cancelLabel}
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
