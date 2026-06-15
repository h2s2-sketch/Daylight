import { Router } from "express";
import { getDb } from "../../db/connection.js";
import { createDatabaseBackup } from "../../services/backup.js";

const router = Router();
const TABLES = ["settings", "study_cards", "study_reviews", "study_ai_cache", "task_projects", "task_items"];
const VALID_AREAS = new Set(["work", "life"]);

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function exportRows(table, rows) {
  if (table !== "task_items") return rows;
  return rows.map((row) => ({ ...row, date: row.due_date, time: row.due_time }));
}

export function normalizeImportRow(table, source) {
  const row = { ...source };
  if (table === "task_items") {
    if (row.due_date === undefined && row.date !== undefined) row.due_date = row.date;
    if (row.due_time === undefined && row.time !== undefined) row.due_time = row.time;
    delete row.date;
    delete row.time;
    if (!VALID_AREAS.has(row.area)) row.area = null;
    if (row.due_date != null && !validDate(row.due_date)) row.due_date = null;
    if (row.due_time != null && !validTime(row.due_time)) row.due_time = null;
    if (!row.due_date) row.due_time = null;
    if (row.status === "todo") row.status = "inbox";
    if (row.status === "doing") row.status = "next";
    if (!["inbox", "next", "waiting", "done"].includes(row.status)) row.status = "inbox";
  }
  if (table === "task_projects") {
    if (!VALID_AREAS.has(row.area)) row.area = null;
    if (row.status === "archived") row.status = "paused";
    if (!["active", "paused", "done"].includes(row.status)) row.status = "active";
  }
  return row;
}

function exportPayload() {
  const db = getDb();
  return {
    format: "daylight-data",
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: Object.fromEntries(TABLES.map((table) => [table, exportRows(table, db.prepare(`SELECT * FROM ${table}`).all())])),
  };
}

router.get("/export", (_req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="daylight-data-${date}.json"`);
  res.json(exportPayload());
});

router.post("/backup", async (_req, res, next) => {
  try { res.status(201).json(await createDatabaseBackup("manual")); } catch (err) { next(err); }
});

router.post("/import", async (req, res, next) => {
  try {
    const payload = req.body;
    if (payload?.format !== "daylight-data" || ![1, 2].includes(payload?.version) || !payload.tables) {
      return res.status(400).json({ error: "Invalid Daylight backup file" });
    }
    for (const table of TABLES) {
      if (payload.tables[table] !== undefined && !Array.isArray(payload.tables[table])) {
        return res.status(400).json({ error: `Invalid table data: ${table}` });
      }
    }

    const safetyBackup = await createDatabaseBackup("pre-import");
    const db = getDb();
    db.transaction(() => {
      for (const table of [...TABLES].reverse()) db.prepare(`DELETE FROM ${table}`).run();
      for (const table of TABLES) {
        const rows = payload.tables[table] || [];
        const allowed = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
        for (const source of rows) {
          const row = normalizeImportRow(table, source);
          const columns = Object.keys(row).filter((key) => allowed.has(key));
          if (!columns.length) continue;
          const placeholders = columns.map(() => "?").join(", ");
          db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`).run(...columns.map((column) => row[column]));
        }
      }
    })();
    res.json({ ok: true, safetyBackup: safetyBackup.filename });
  } catch (err) { next(err); }
});

export default router;
