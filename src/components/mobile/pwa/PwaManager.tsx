"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Download, Share, X, Check } from "lucide-react";
import { registerServiceWorker, applyServiceWorkerUpdate } from "@/lib/pwa/serviceWorkerRegistration";
import { useOnlineStatus } from "@/lib/pwa/offlineDrafts";
import { BottomSheet } from "../patterns/BottomSheet";

declare global {
  interface Window {
    __deferredPwaPrompt?: any;
    triggerPwaInstall?: () => void;
  }
}

export function PwaManager() {
  const isOnline = useOnlineStatus();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Register Service Worker and listen for updates
    registerServiceWorker(() => {
      setUpdateAvailable(true);
    });

    if (typeof window === "undefined") return;

    // Detect if running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // Capture Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__deferredPwaPrompt = e;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Global trigger for install after student's first successful submission
    window.triggerPwaInstall = () => {
      const alreadyDismissed = localStorage.getItem("kit_pwa_install_dismissed");
      if (alreadyDismissed || isStandaloneMode) return;
      setShowInstallSheet(true);
    };

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (window.__deferredPwaPrompt) {
      window.__deferredPwaPrompt.prompt();
      const choice = await window.__deferredPwaPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowInstallSheet(false);
      }
      window.__deferredPwaPrompt = null;
    }
  };

  const handleDismissInstall = () => {
    setShowInstallSheet(false);
    try {
      localStorage.setItem("kit_pwa_install_dismissed", "true");
    } catch {}
  };

  return (
    <>
      {/* 1. Offline Mode Banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-neutral-900 text-white text-xs py-2 px-4 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-200">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium">
            Offline mode — Your input is saved locally in drafts
          </span>
        </div>
      )}

      {/* 2. New Version Available Toast */}
      {updateAvailable && (
        <div className="fixed bottom-18 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 p-3.5 bg-[#0B2A6F] text-white rounded-2xl shadow-xl border border-blue-400/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-250">
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw className="w-4 h-4 text-blue-200 shrink-0" />
            <span className="text-xs font-semibold truncate">
              New version available
            </span>
          </div>
          <button
            type="button"
            onClick={applyServiceWorkerUpdate}
            className="px-3 py-1 bg-white text-[#0B2A6F] rounded-lg text-xs font-bold hover:bg-neutral-100 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      )}

      {/* 3. Install UX Sheet (Triggered after first successful submission) */}
      <BottomSheet
        open={showInstallSheet}
        onOpenChange={setShowInstallSheet}
        title="Install projects.kit"
        description="Fast access directly from your home screen"
      >
        <div className="space-y-4 py-2 text-left">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-slate-800 border border-neutral-200/80 dark:border-slate-700 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0B2A6F] flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm">
              P
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                projects.kit
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install as a lightweight app with offline draft support.
              </p>
            </div>
          </div>

          {/* Android vs iOS instructions */}
          {isIos ? (
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#0B2A6F] dark:text-blue-300">
                <Share className="w-4 h-4" />
                <span>How to install on iOS:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              </ol>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-blue-200/50">
                Note: Since iOS keeps separate storage for Home Screen apps, you may be asked to quickly verify your AFN once after launching.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallAndroid}
              className="w-full min-h-[46px] rounded-xl bg-[#0B2A6F] text-white text-xs font-bold shadow-md hover:bg-[#092257] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Add to Home Screen</span>
            </button>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleDismissInstall}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
