import { Router } from "express";
import { getDb } from "../../db/connection.js";
import { createDatabaseBackup } from "../../services/backup.js";

const router = Router();
const TABLES = ["settings", "study_cards", "study_reviews", "study_ai_cache", "task_projects", "task_items"];

function exportPayload() {
  const db = getDb();
  return {
    format: "daylight-data",
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: Object.fromEntries(TABLES.map((table) => [table, db.prepare(`SELECT * FROM ${table}`).all()])),
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
    if (payload?.format !== "daylight-data" || payload?.version !== 1 || !payload.tables) {
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
        for (const row of rows) {
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
