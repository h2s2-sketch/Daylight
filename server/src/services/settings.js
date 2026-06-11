import { getDb } from "../db/connection.js";

export function getSetting(key, fallback = null) {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  getDb().prepare("INSERT OR REPLACE INTO settings(key, value) VALUES (?,?)").run(key, String(value));
}

export function getAllSettings() {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
