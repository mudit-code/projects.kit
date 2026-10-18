export interface TrashedFormItem {
  id: string;
  form: any;
  submissions?: any[];
  deletedAt: number;
  deletedBy?: string;
  expiresAt: number;
}

export const TRASH_RETENTION_DAYS = 7;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const TRASH_STORAGE_KEY = "kit_trash_forms";

/**
 * Loads all trashed forms from server or local cache and purges expired items.
 */
export function getCleanTrashForms(): TrashedFormItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];

    const items: TrashedFormItem[] = JSON.parse(raw);
    if (!Array.isArray(items)) return [];

    const now = Date.now();
    // Filter out items older than 7 days
    const validItems = items.filter((item) => {
      const age = now - (item.deletedAt || 0);
      return age < TRASH_RETENTION_MS;
    });

    if (validItems.length !== items.length) {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(validItems));
      window.dispatchEvent(new Event("kit-trash-change"));
    }

    return validItems;
  } catch (err) {
    console.error("Failed to load trash forms:", err);
    return [];
  }
}

/**
 * Moves a form to trash in both the database and client state.
 */
export async function moveFormToTrash(
  formId: string,
  formObj?: any,
  submissions?: any[],
  deletedBy?: string
): Promise<boolean> {
  const cleanId = String(formId).trim();

  // 1. Call server API to mark form as trashed in Prisma database
  try {
    await fetch(`/api/forms/${encodeURIComponent(cleanId)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Could not sync trash to server API:", err);
  }

  // 2. Update local state
  if (typeof window !== "undefined") {
    try {
      const currentTrash = getCleanTrashForms();
      const now = Date.now();

      const newItem: TrashedFormItem = {
        id: cleanId,
        form: formObj || { id: cleanId, title: "Untitled Form" },
        submissions: submissions || [],
        deletedAt: now,
        deletedBy: deletedBy || "Faculty Administrator",
        expiresAt: now + TRASH_RETENTION_MS,
      };

      const updatedTrash = [newItem, ...currentTrash.filter((t) => t.id !== cleanId)];
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));

      const rawInit = localStorage.getItem("kit_published_initiatives");
      if (rawInit) {
        const initList: any[] = JSON.parse(rawInit);
        const filtered = initList.filter(
          (f) => String(f.id) !== cleanId && String(f.subjectCode) !== cleanId
        );
        localStorage.setItem("kit_published_initiatives", JSON.stringify(filtered));
      }

      window.dispatchEvent(new Event("kit-trash-change"));
      window.dispatchEvent(new Event("kit-initiatives-change"));
    } catch {
      // ignore
    }
  }

  return true;
}

/**
 * Restores a form from trash in both database and client state.
 */
export async function restoreFormFromTrash(formId: string): Promise<boolean> {
  const cleanId = String(formId).trim();

  // 1. Call server API to restore form in Prisma database
  try {
    await fetch(`/api/forms/trash/${encodeURIComponent(cleanId)}`, {
      method: "POST",
    });
  } catch (err) {
    console.warn("Could not restore via server API:", err);
  }

  // 2. Update local state
  if (typeof window !== "undefined") {
    try {
      const currentTrash = getCleanTrashForms();
      const target = currentTrash.find((t) => String(t.id) === cleanId);

      const remaining = currentTrash.filter((t) => String(t.id) !== cleanId);
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));

      if (target) {
        const rawInit = localStorage.getItem("kit_published_initiatives");
        const initList: any[] = rawInit ? JSON.parse(rawInit) : [];
        if (!initList.some((f) => String(f.id) === String(target.form?.id || target.id))) {
          initList.unshift(target.form);
          localStorage.setItem("kit_published_initiatives", JSON.stringify(initList));
        }
      }

      window.dispatchEvent(new Event("kit-trash-change"));
      window.dispatchEvent(new Event("kit-initiatives-change"));
    } catch {
      // ignore
    }
  }

  return true;
}

/**
 * Permanently deletes a single form from trash in both database and client state.
 */
export async function permanentlyDeleteFromTrash(formId: string): Promise<boolean> {
  const cleanId = String(formId).trim();

  // 1. Call server API to permanently purge
  try {
    await fetch(`/api/forms/trash/${encodeURIComponent(cleanId)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Could not purge via server API:", err);
  }

  // 2. Update local state
  if (typeof window !== "undefined") {
    try {
      const currentTrash = getCleanTrashForms();
      const remaining = currentTrash.filter((t) => String(t.id) !== cleanId);
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));
      window.dispatchEvent(new Event("kit-trash-change"));
    } catch {
      // ignore
    }
  }

  return true;
}

/**
 * Empties all items from trash in both database and client state.
 */
export async function emptyAllTrash(): Promise<boolean> {
  // 1. Call server API
  try {
    await fetch("/api/forms/trash", {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Could not empty trash via server API:", err);
  }

  // 2. Clear local storage
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(TRASH_STORAGE_KEY);
      window.dispatchEvent(new Event("kit-trash-change"));
    } catch {
      // ignore
    }
  }

  return true;
}

export function getRemainingDays(expiresAt: number | string | Date): number {
  const expTime = typeof expiresAt === "number" ? expiresAt : new Date(expiresAt).getTime();
  const diff = expTime - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
