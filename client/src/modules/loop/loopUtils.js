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

// Cool, calm category hues from the Final UI Direction. Shown as a dot or a
// 3px bar, never as a fill. Drive via inline style: style={{ "--cat": color }}.
export const CATEGORY_COLORS = {
  eng_planning: "#4B5B9E",
  ai_daylight: "#7E5AAE",
  work_english: "#3F6FA6",
  fitness: "#C25A6B",
  korean: "#3E8E6E",
  finance: "#A98A3C",
  portfolio: "#A65592",
};

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Time-aware greeting, keyed off local time.
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// "16–22 June" / "29 June – 5 July" range for a week_start (Monday).
export function weekRangeLabel(weekStart) {
  const end = addDays(weekStart, 6);
  const [, sm, sd] = weekStart.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
  if (sm === em) return `${sd}–${ed} ${monthName(sm)}`;
  return `${sd} ${monthName(sm)} – ${ed} ${monthName(em)}`;
}

// The weekend review nudge: current week, unreviewed, and it's Fri/Sat/Sun.
export function shouldShowReviewBanner(weekStart, hasReview, today = localISODate()) {
  if (hasReview) return false;
  if (weekStart !== isoWeekStart(today)) return false;
  const [y, m, d] = today.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  return day === 5 || day === 6 || day === 0;
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
