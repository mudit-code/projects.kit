"use client";

import { get, set, del, keys } from "idb-keyval";
import { useEffect, useState } from "react";

const DRAFT_PREFIX = "kit_form_draft_";

export interface FormDraft<T = any> {
  formId: string;
  data: T;
  lastUpdated: number;
  idempotencyKey: string;
}

/**
 * Generate a unique client idempotency key to prevent duplicate submissions on retry
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Save draft to local IndexedDB (never lost if browser crashes or goes offline)
 */
export async function saveFormDraft<T = any>(
  formId: string,
  data: T,
  existingKey?: string
): Promise<FormDraft<T>> {
  const idempotencyKey = existingKey || generateIdempotencyKey();
  const draft: FormDraft<T> = {
    formId,
    data,
    lastUpdated: Date.now(),
    idempotencyKey,
  };

  try {
    await set(`${DRAFT_PREFIX}${formId}`, draft);
  } catch (err) {
    console.warn("Failed to persist draft to IndexedDB:", err);
  }

  return draft;
}

/**
 * Retrieve saved draft from local IndexedDB
 */
export async function getFormDraft<T = any>(
  formId: string
): Promise<FormDraft<T> | null> {
  try {
    const val = await get<FormDraft<T>>(`${DRAFT_PREFIX}${formId}`);
    return val || null;
  } catch (err) {
    console.warn("Failed to retrieve draft from IndexedDB:", err);
    return null;
  }
}

/**
 * Clear draft after successful submission
 */
export async function clearFormDraft(formId: string): Promise<void> {
  try {
    await del(`${DRAFT_PREFIX}${formId}`);
  } catch (err) {
    console.warn("Failed to delete draft from IndexedDB:", err);
  }
}

/**
 * React hook to listen for online / offline status changes
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.navigator) return true;
    return window.navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
