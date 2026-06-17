// Shared constants and small pure helpers for the Execution Loop frontend.
// No styling here; reuse existing ds-* classes in the views.

export const CATEGORY_ORDER = [
  "eng_planning",
  "ai_daylight",
  "work_english",
  "fitness",
  "korean",
  "finance",
  "portfolio",
];

export const CATEGORY_LABELS = {
  eng_planning: "Engineering Planning",
  ai_daylight: "AI / Daylight",
  work_english: "Work English",
  fitness: "Fitness / Energy",
  korean: "Korean Learning",
  finance: "Personal Finance",
  portfolio: "Portfolio / Side Income",
};

export const GOAL_STATUSES = ["active", "paused", "archived"];
export const GOAL_STATUS_LABELS = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const FOCUS_STATUSES = ["open", "done", "partial", "missed", "carried"];
export const FOCUS_STATUS_LABELS = {
  open: "Open",
  done: "Done",
  partial: "Partial",
  missed: "Missed",
  carried: "Carried",
};

export const MAX_FOCUS_PER_WEEK = 3;

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Local-date ISO string, matching the convention used by taskUtils.localISODate.
export function localISODate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

// Monday (ISO week start) for the given YYYY-MM-DD, computed in local time.
export function isoWeekStart(value = localISODate()) {
  const [y, m, d] = String(value).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + offset);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function addDays(value, n) {
  const [y, m, d] = String(value).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function nextWeekStart(weekStart = isoWeekStart()) {
  return addDays(weekStart, 7);
}

export function prevWeekStart(weekStart = isoWeekStart()) {
  return addDays(weekStart, -7);
}

// "Week of June 15" style label for a week_start (Monday).
export function weekLabel(weekStart) {
  const [y, m, d] = String(weekStart).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `Week of ${dt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

export function relativeWeekLabel(weekStart, today = localISODate()) {
  const current = isoWeekStart(today);
  if (weekStart === current) return "This week";
  if (weekStart === nextWeekStart(current)) return "Next week";
  if (weekStart === prevWeekStart(current)) return "Last week";
  return weekLabel(weekStart);
}
