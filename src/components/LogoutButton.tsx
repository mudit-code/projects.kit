"use client";

import { LogOut, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { clearActiveSession } from "@/lib/auth";

export function LogoutButton({ 
  className,
  buttonText = "Logout",
  showIcon = true,
  children,
}: { 
  className?: string;
  buttonText?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal]);

  const handleConfirmLogout = () => {
    setShowModal(false);
    clearActiveSession();
    window.location.href = "/";
  };

  const modalContent = (
    <div 
      id="logout-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowModal(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div 
        className="relative w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
          <LogOut size={22} className="translate-x-0.5" />
        </div>

        <h3 id="logout-dialog-title" className="font-bold text-[#10334A] text-lg mb-1.5">
          Log out
        </h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Are you sure you want to log out of projects.kit?
        </p>

        <div className="flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            onClick={handleConfirmLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-sm shadow-red-600/20 transition-all cursor-pointer"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button 
        type="button" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        className={className || "text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-xl flex items-center transition-colors cursor-pointer"}
      >
        {children || (
          <>
            {showIcon && <LogOut size={16} className="mr-2" />}
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {mounted && showModal && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}
