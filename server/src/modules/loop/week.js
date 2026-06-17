// ISO week helpers. All math is done in UTC to keep dates stable across timezones.

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }

function format(dt) {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function parseISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (dt.getUTCFullYear() !== Number(match[1])) return null;
  if (dt.getUTCMonth() !== Number(match[2]) - 1) return null;
  if (dt.getUTCDate() !== Number(match[3])) return null;
  return dt;
}

export function isValidISODate(value) {
  return parseISODate(value) !== null;
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function isoWeekStart(value) {
  const dt = value instanceof Date ? new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())) : parseISODate(value);
  if (!dt) return null;
  const day = dt.getUTCDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + offset);
  return format(dt);
}

export function isMonday(value) {
  const dt = parseISODate(value);
  return dt !== null && dt.getUTCDay() === 1;
}

export function addDays(value, n) {
  const dt = parseISODate(value);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() + n);
  return format(dt);
}

export function daysBetween(since, until) {
  const a = parseISODate(since);
  const b = parseISODate(until);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
