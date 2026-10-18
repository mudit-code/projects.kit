import fs from "fs/promises";
import path from "path";

export interface ReminderLogEntry {
  id: string;
  formId: string;
  studentId: string;
  studentAfn?: string;
  studentRollNumber?: string;
  studentEmail: string;
  studentName: string;
  sentAt: string; // ISO 8601 string
  sentBy: string; // HOD or Coordinator email
  status: "sent" | "failed";
  mode: "log" | "smtp";
  recipientActual: string;
  recipientEffective: string;
  messageId?: string;
  error?: string;
}

export interface ReminderStore {
  /**
   * Retrieves log entries for a given student and form dispatched since `sinceDate`.
   * Throws if the underlying storage cannot be read (fail-closed).
   */
  getRecentReminders(
    formId: string,
    studentId: string,
    sinceDate: Date
  ): Promise<ReminderLogEntry[]>;

  /**
   * Retrieves the most recent successful reminder for a given form.
   * Throws if the underlying storage cannot be read (fail-closed).
   */
  getLastReminderForForm(formId: string): Promise<ReminderLogEntry | null>;

  /**
   * Appends newly dispatched reminder log entries.
   * Throws if reading or writing to the storage fails (fail-closed).
   */
  appendReminders(entries: ReminderLogEntry[]): Promise<void>;

  /**
   * Retrieves summary statistics for a given form.
   * Throws if the underlying storage cannot be read (fail-closed).
   */
  getReminderStatsForForm(
    formId: string
  ): Promise<{ totalSent: number; lastSentAt: string | null }>;
}

export class JsonReminderStore implements ReminderStore {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath =
      customPath ||
      path.join(process.cwd(), "src", "data", "reminder-log.json");
  }

  /**
   * Reads all log entries from the JSON file.
   * Throws immediately on missing file, unreadable file, or invalid JSON (FAIL CLOSED).
   */
  private async readAll(): Promise<ReminderLogEntry[]> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error(
          `Reminder log at ${this.filePath} is corrupted: root is not an array.`
        );
      }
      return parsed;
    } catch (err: any) {
      // Fail closed: rethrow to abort operation
      throw new Error(
        `Failed to read reminder log store at ${this.filePath}: ${err?.message || String(err)}`
      );
    }
  }

  /**
   * Writes all log entries to the JSON file atomically.
   * Throws immediately on failure (FAIL CLOSED).
   */
  private async writeAll(entries: ReminderLogEntry[]): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      const tempPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
      await fs.writeFile(tempPath, JSON.stringify(entries, null, 2), "utf-8");
      await fs.rename(tempPath, this.filePath);
    } catch (err: any) {
      // Fail closed: rethrow so caller knows log could not be persisted
      throw new Error(
        `Failed to persist reminder log to ${this.filePath}: ${err?.message || String(err)}`
      );
    }
  }

  async getRecentReminders(
    formId: string,
    studentId: string,
    sinceDate: Date
  ): Promise<ReminderLogEntry[]> {
    const all = await this.readAll();
    const cleanFormId = formId.toUpperCase().trim();
    const cleanStudentId = String(studentId).trim();
    const thresholdMs = sinceDate.getTime();

    return all.filter((entry) => {
      const matchForm =
        entry.formId.toUpperCase().trim() === cleanFormId ||
        cleanFormId.includes(entry.formId.toUpperCase().trim()) ||
        entry.formId.toUpperCase().trim().includes(cleanFormId);

      const matchStudent =
        String(entry.studentId).trim() === cleanStudentId ||
        (entry.studentAfn && entry.studentAfn.trim() === cleanStudentId) ||
        (entry.studentRollNumber &&
          entry.studentRollNumber.trim() === cleanStudentId);

      if (!matchForm || !matchStudent) return false;

      const sentMs = new Date(entry.sentAt).getTime();
      return sentMs >= thresholdMs && entry.status === "sent";
    });
  }

  async getLastReminderForForm(formId: string): Promise<ReminderLogEntry | null> {
    const all = await this.readAll();
    const cleanFormId = formId.toUpperCase().trim();

    const matches = all.filter((entry) => {
      const entryForm = entry.formId.toUpperCase().trim();
      return (
        entryForm === cleanFormId ||
        cleanFormId.includes(entryForm) ||
        entryForm.includes(cleanFormId)
      );
    });

    if (matches.length === 0) return null;

    matches.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );

    return matches[0];
  }

  async appendReminders(entries: ReminderLogEntry[]): Promise<void> {
    if (!entries || entries.length === 0) return;
    const current = await this.readAll();
    const updated = [...current, ...entries];
    await this.writeAll(updated);
  }

  async getReminderStatsForForm(
    formId: string
  ): Promise<{ totalSent: number; lastSentAt: string | null }> {
    const all = await this.readAll();
    const cleanFormId = formId.toUpperCase().trim();

    const matches = all.filter((entry) => {
      const entryForm = entry.formId.toUpperCase().trim();
      return (
        (entryForm === cleanFormId ||
          cleanFormId.includes(entryForm) ||
          entryForm.includes(cleanFormId)) &&
        entry.status === "sent"
      );
    });

    if (matches.length === 0) {
      return { totalSent: 0, lastSentAt: null };
    }

    matches.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );

    return {
      totalSent: matches.length,
      lastSentAt: matches[0].sentAt,
    };
  }
}

// Global default singleton instance
export const reminderStore: ReminderStore = new JsonReminderStore();
