import {
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Coffee,
} from "lucide-react";

type TimeResult = { phrase: string; icon: typeof Sun };

// Student phrases — casual, fun, relatable
const STUDENT_PHRASES = {
  earlyMorning: [
    "Early bird catches the code ☕",
    "Dawn of a productive day",
    "Up before the sun? Let's build.",
    "Fresh start, fresh commits",
  ],
  morning: [
    "Rise and build something great",
    "Morning momentum — let's go",
    "Bright ideas, bright morning ☀️",
    "Ready to make progress?",
    "A new day, new possibilities",
  ],
  noon: [
    "Midday check-in 🕐",
    "Halfway through — keep the energy",
    "Noon surge — you're on a roll",
    "Peak hours, peak focus",
  ],
  afternoon: [
    "Afternoon focus mode",
    "Steady progress this afternoon",
    "Keep the momentum going",
    "Afternoon deep work session",
    "The grind continues 💪",
  ],
  evening: [
    "Evening wind-down or wind-up?",
    "Golden hour for golden code ✨",
    "Wrapping up or just getting started?",
    "Evening productivity unlocked",
    "Sunset vibes, deadline drives",
  ],
  night: [
    "Moonlit session? 🌙",
    "Night owl mode activated",
    "Burning the midnight oil",
    "Late night, great code",
    "The night is young — and so is your project",
  ],
} as const;

// HOD phrases — respectful, dignified, with subtle warmth
const HOD_PHRASES = {
  earlyMorning: [
    "An early start sets the standard",
    "The department awakens under your watch",
    "Leading by example — even at dawn",
    "First light, first decisions",
  ],
  morning: [
    "A fine morning to shape futures",
    "The department is in capable hands",
    "Ready to orchestrate excellence?",
    "Another morning, another milestone ahead",
    "Good things begin with good leadership",
  ],
  noon: [
    "Midday review — all on course?",
    "The day's momentum is in your hands",
    "Steady at the helm, as always",
    "A productive morning well-spent",
  ],
  afternoon: [
    "Afternoon oversight in session",
    "Guiding the department, one decision at a time",
    "The afternoon is yours to command",
    "Charting the course this afternoon",
    "Excellence doesn't take a break",
  ],
  evening: [
    "Wrapping up — the department thanks you",
    "An evening well-earned, Sir",
    "Still going strong this evening?",
    "Twilight hours, steady leadership",
    "The day's work speaks for itself",
  ],
  night: [
    "Dedication that transcends the clock",
    "Burning bright, even after hours",
    "The quiet hours — perfect for big decisions",
    "Still at it? The department is lucky to have you",
    "Night-time planning, daytime results",
  ],
} as const;

// Faculty/Coordinator phrases — respectful, warm, collegial
const FACULTY_PHRASES = {
  earlyMorning: [
    "Early prep makes perfect lectures",
    "The academic engine starts with you",
    "Dawn patrol — shaping tomorrow's engineers",
    "A quiet start for a productive day",
  ],
  morning: [
    "A fine morning to inspire minds",
    "Ready to guide the next batch?",
    "Morning briefing — projects await your expertise",
    "Another day of academic excellence",
    "The classroom awaits your wisdom",
  ],
  noon: [
    "Midday checkpoint — projects on track?",
    "A well-paced morning, Professor",
    "Noon pause — reflect and recalibrate",
    "Halfway there — steady as she goes",
  ],
  afternoon: [
    "Afternoon evaluations in progress?",
    "Guiding projects, one review at a time",
    "The afternoon shift of mentorship",
    "Deep into the day — deep into the work",
    "Precision and patience, as always",
  ],
  evening: [
    "Wrapping up a day of mentorship",
    "Evening review — all projects accounted for?",
    "The day's teaching is done, but the impact stays",
    "A well-spent day, Professor",
    "Twilight reflections on today's progress",
  ],
  night: [
    "Reviewing submissions after hours?",
    "Dedication that students will remember",
    "The quiet hours — ideal for grading",
    "Night-time review, daytime difference",
    "Still at the desk? Your students are fortunate",
  ],
} as const;

type RoleType = "HOD" | "COORDINATOR";

function pickRandom(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function getDeterministicPhrase(pool: readonly string[], hour: number): string {
  return pool[hour % pool.length];
}

function getIcon(hour: number): typeof Sun {
  if (hour >= 4 && hour < 7) return Sunrise;
  if (hour >= 7 && hour < 12) return Sun;
  if (hour >= 12 && hour < 14) return Coffee;
  if (hour >= 14 && hour < 17) return Sun;
  if (hour >= 17 && hour < 21) return Sunset;
  return Moon;
}

function getTimeSlot(hour: number): string {
  if (hour >= 4 && hour < 7) return "earlyMorning";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "noon";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function getTimePhrase(hour: number, role: RoleType = "HOD", randomize: boolean = false): TimeResult {
  const slot = getTimeSlot(hour) as keyof typeof HOD_PHRASES;
  const icon = getIcon(hour);

  const phrases = role === "COORDINATOR" ? FACULTY_PHRASES : HOD_PHRASES;
  const pool = phrases[slot];

  const phrase = randomize ? pickRandom(pool) : getDeterministicPhrase(pool, hour);
  return { phrase, icon };
}
