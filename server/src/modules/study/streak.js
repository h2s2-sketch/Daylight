import { getDb } from "../../db/connection.js";
import { getSetting } from "../../services/settings.js";

const MIN_CARDS_FOR_STREAK = 15;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function prevDay(iso) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns { current, best, completedToday }
 */
export function getStreak() {
  const db = getDb();
  const today = todayIso();

  // Aggregate reviews per day
  const days = db
    .prepare(
      `SELECT date(reviewed_at) AS day, COUNT(*) AS n
       FROM study_reviews
       GROUP BY day
       ORDER BY day DESC`
    )
    .all();

  const byDay = Object.fromEntries(days.map((r) => [r.day, r.n]));

  // Check if today is "complete" — due queue cleared OR ≥15 reviewed
  const todayCount = byDay[today] ?? 0;
  const completedToday = todayCount >= MIN_CARDS_FOR_STREAK;

  // Walk back from today counting consecutive complete days
  let current = 0;
  let cursor = today;

  while (true) {
    const n = byDay[cursor] ?? 0;
    if (n >= MIN_CARDS_FOR_STREAK) {
      current++;
      cursor = prevDay(cursor);
    } else {
      break;
    }
  }

  // Best streak (sliding window O(n))
  let best = current;
  let run = 0;
  const sortedDays = [...days].sort((a, b) => a.day.localeCompare(b.day));
  let prev = null;
  for (const { day, n } of sortedDays) {
    if (n < MIN_CARDS_FOR_STREAK) { run = 0; prev = null; continue; }
    if (prev && day === addDay(prev, 1)) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = day;
  }

  return { current, best, completedToday };
}

/**
 * Per-language slip detection: last review date per language.
 */
export function getSlipStatus() {
  const db = getDb();
  const today = todayIso();
  const result = {};
  for (const lang of ["en", "kr"]) {
    const row = db
      .prepare(
        `SELECT date(MAX(r.reviewed_at)) AS last_day
         FROM study_reviews r
         JOIN study_cards c ON c.id = r.card_id
         WHERE c.language = ?`
      )
      .get(lang);
    const lastDay = row?.last_day;
    if (!lastDay) {
      result[lang] = { slipping: false, daysSince: null };
      continue;
    }
    const diff = Math.floor((new Date(today) - new Date(lastDay)) / 86400000);
    result[lang] = { slipping: diff >= 3, daysSince: diff };
  }
  return result;
}

/**
 * Last 7 days of review activity broken down by language.
 */
export function getWeekActivity() {
  const db = getDb();
  const days = [];
  let d = new Date();
  for (let i = 6; i >= 0; i--) {
    const t = new Date(d);
    t.setDate(d.getDate() - i);
    days.push(t.toISOString().slice(0, 10));
  }

  const rows = db
    .prepare(
      `SELECT date(r.reviewed_at) AS day, c.language, COUNT(*) AS n
       FROM study_reviews r
       JOIN study_cards c ON c.id = r.card_id
       WHERE date(r.reviewed_at) >= ?
       GROUP BY day, c.language`
    )
    .all(days[0]);

  const byDayLang = {};
  for (const row of rows) {
    if (!byDayLang[row.day]) byDayLang[row.day] = {};
    byDayLang[row.day][row.language] = row.n;
  }

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((iso) => ({
    date: iso,
    d: DOW[new Date(iso + "T12:00:00Z").getUTCDay()].slice(0, 1),
    en: byDayLang[iso]?.en ?? 0,
    kr: byDayLang[iso]?.kr ?? 0,
  }));
}

function addDay(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
