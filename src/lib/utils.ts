import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STREAM_SHORT_MAP: Record<string, string> = {
  "COMPUTER SCIENCE AND ENGINEERING": "CSE",
  "ELECTRONICS AND COMMUNICATION ENGINEERING": "ECE",
  "MECHANICAL ENGINEERING": "ME",
  "Electronics & Communication Engineering": "ECE",
  "Mechanical Engineering": "ME",
  "Electrical & Electronics Engineering": "EEE",
  "Information Technology": "IT",
  "Computer Science And Engineering(Artificial Intelligence & Machine Learning)": "CSE (AI/ML)",
  "BIOTECHNOLOGY": "BT",
  "Computer Science & Engineering": "CSE",
  "CSE": "CSE",
  "ECE": "ECE",
  "ME": "ME",
  "EEE": "EEE",
  "IT": "IT",
  "BT": "BT",
};

export function getShortStream(stream?: string): string {
  if (!stream) return "";
  const trimmed = stream.trim();
  return STREAM_SHORT_MAP[trimmed] || STREAM_SHORT_MAP[stream] || stream;
}

