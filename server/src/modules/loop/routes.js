import { Router } from "express";
import { getDb as defaultGetDb } from "../../db/connection.js";
import { addDays, daysBetween, isMonday, isValidISODate, isoWeekStart, todayUTC } from "./week.js";

export const GOAL_CATEGORIES = new Set([
  "eng_planning", "ai_daylight", "work_english",
  "fitness", "korean", "finance", "portfolio",
]);
export const GOAL_STATUSES = new Set(["active", "paused", "archived"]);
export const FOCUS_STATUSES = new Set(["open", "done", "partial", "missed", "carried"]);
const CHECKIN_LIST_MAX_DAYS = 90;

function parseProgressedIds(value) {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item) || item <= 0) return null;
    out.push(item);
  }
  return out;
}

function serializeCheckin(row) {
  if (!row) return null;
  let ids = [];
  try { ids = JSON.parse(row.progressed_focus_ids || "[]"); } catch { ids = []; }
  if (!Array.isArray(ids)) ids = [];
  return { ...row, progressed_focus_ids: ids };
}

export function createLoopRouter(getDb = defaultGetDb) {
  const router = Router();

  // ---------- Goals ----------

  router.get("/goals", (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.status) {
      if (!GOAL_STATUSES.has(req.query.status)) return res.status(400).json({ error: "Invalid goal status." });
      clauses.push("status = ?"); params.push(req.query.status);
    }
    if (req.query.category) {
      if (!GOAL_CATEGORIES.has(req.query.category)) return res.status(400).json({ error: "Invalid goal category." });
      clauses.push("category = ?"); params.push(req.query.category);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb().prepare(`SELECT * FROM loop_goals ${where} ORDER BY category ASC, id ASC`).all(...params);
    res.json(rows);
  });

  router.post("/goals", (req, res) => {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Goal title is required." });
    if (!GOAL_CATEGORIES.has(body.category)) return res.status(400).json({ error: "Invalid goal category." });
    const status = body.status || "active";
    if (!GOAL_STATUSES.has(status)) return res.status(400).json({ error: "Invalid goal status." });
    const db = getDb();
    if (status === "active") {
      const existing = db.prepare("SELECT id FROM loop_goals WHERE category = ? AND status = 'active'").get(body.category);
      if (existing) return res.status(409).json({ error: "Category already has an active goal." });
    }
    try {
      const result = db.prepare("INSERT INTO loop_goals (category, title, status) VALUES (?, ?, ?)").run(body.category, title, status);
      res.status(201).json(db.prepare("SELECT * FROM loop_goals WHERE id = ?").get(result.lastInsertRowid));
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) return res.status(409).json({ error: "Category already has an active goal." });
      throw err;
    }
  });

  router.patch("/goals/:id", (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    const current = db.prepare("SELECT * FROM loop_goals WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ error: "not found" });
    const body = req.body || {};
    const updates = [];
    const values = [];
    let nextCategory = current.category;
    let nextStatus = current.status;
    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return res.status(400).json({ error: "Goal title is required." });
      updates.push("title = ?"); values.push(title);
    }
    if (body.category !== undefined) {
      if (!GOAL_CATEGORIES.has(body.category)) return res.status(400).json({ error: "Invalid goal category." });
      nextCategory = body.category;
      updates.push("category = ?"); values.push(body.category);
    }
    if (body.status !== undefined) {
      if (!GOAL_STATUSES.has(body.status)) return res.status(400).json({ error: "Invalid goal status." });
      nextStatus = body.status;
      updates.push("status = ?"); values.push(body.status);
    }
    if (nextStatus === "active" && (nextStatus !== current.status || nextCategory !== current.category)) {
      const existing = db.prepare("SELECT id FROM loop_goals WHERE category = ? AND status = 'active' AND id != ?").get(nextCategory, id);
      if (existing) return res.status(409).json({ error: "Category already has an active goal." });
    }
    if (!updates.length) return res.status(400).json({ error: "no valid fields" });
    updates.push("updated_at = datetime('now')");
    try {
      db.prepare(`UPDATE loop_goals SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) return res.status(409).json({ error: "Category already has an active goal." });
      throw err;
    }
    res.json(db.prepare("SELECT * FROM loop_goals WHERE id = ?").get(id));
  });

  router.delete("/goals/:id", (req, res) => {
    const result = getDb().prepare("DELETE FROM loop_goals WHERE id = ?").run(Number(req.params.id));
    if (!result.changes) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  });

  // ---------- Focus items ----------

  function findFocusItem(id) {
    return getDb().prepare(`
      SELECT f.*, g.title AS goal_title, g.category AS goal_category
      FROM loop_focus_items f LEFT JOIN loop_goals g ON g.id = f.goal_id
      WHERE f.id = ?
    `).get(id);
  }

  router.get("/focus-items", (req, res) => {
    const weekStart = req.query.week_start || isoWeekStart(todayUTC());
    if (!isValidISODate(weekStart) || !isMonday(weekStart)) {
      return res.status(400).json({ error: "Invalid week_start. Expected YYYY-MM-DD (Monday)." });
    }
    const rows = getDb().prepare(`
      SELECT f.*, g.title AS goal_title, g.category AS goal_category
      FROM loop_focus_items f LEFT JOIN loop_goals g ON g.id = f.goal_id
      WHERE f.week_start = ?
      ORDER BY f.sort_order ASC, f.id ASC
    `).all(weekStart);
    res.json(rows);
  });

  router.post("/focus-items", (req, res) => {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Focus item title is required." });
    if (!isValidISODate(body.week_start) || !isMonday(body.week_start)) {
      return res.status(400).json({ error: "Invalid week_start. Expected YYYY-MM-DD (Monday)." });
    }
    const db = getDb();
    let goalId = null;
    if (body.goal_id !== undefined && body.goal_id !== null && body.goal_id !== "") {
      goalId = Number(body.goal_id);
      if (!Number.isInteger(goalId) || !db.prepare("SELECT id FROM loop_goals WHERE id = ?").get(goalId)) {
        return res.status(400).json({ error: "Goal does not exist." });
      }
    }
    const used = db.prepare("SELECT sort_order FROM loop_focus_items WHERE week_start = ?").all(body.week_start).map((row) => row.sort_order);
    if (used.length >= 3) return res.status(409).json({ error: "Weekly Focus is capped at 3." });
    let sortOrder;
    if (body.sort_order === undefined || body.sort_order === null || body.sort_order === "") {
      sortOrder = [1, 2, 3].find((slot) => !used.includes(slot));
    } else {
      sortOrder = Number(body.sort_order);
      if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 3 || used.includes(sortOrder)) {
        return res.status(400).json({ error: "Invalid sort_order." });
      }
    }
    const status = body.status || "open";
    if (!FOCUS_STATUSES.has(status)) return res.status(400).json({ error: "Invalid focus status." });
    const result = db.prepare(`
      INSERT INTO loop_focus_items (week_start, goal_id, title, status, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(body.week_start, goalId, title, status, sortOrder);
    res.status(201).json(findFocusItem(result.lastInsertRowid));
  });

  router.patch("/focus-items/:id", (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    const current = db.prepare("SELECT * FROM loop_focus_items WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ error: "not found" });
    const body = req.body || {};

    let nextWeek = current.week_start;
    if (body.week_start !== undefined) {
      if (!isValidISODate(body.week_start) || !isMonday(body.week_start)) {
        return res.status(400).json({ error: "Invalid week_start. Expected YYYY-MM-DD (Monday)." });
      }
      nextWeek = body.week_start;
    }

    let nextGoalId;
    if (body.goal_id !== undefined) {
      if (body.goal_id === null || body.goal_id === "") {
        nextGoalId = null;
      } else {
        const gid = Number(body.goal_id);
        if (!Number.isInteger(gid) || !db.prepare("SELECT id FROM loop_goals WHERE id = ?").get(gid)) {
          return res.status(400).json({ error: "Goal does not exist." });
        }
        nextGoalId = gid;
      }
    }

    let nextTitle;
    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return res.status(400).json({ error: "Focus item title is required." });
      nextTitle = title;
    }

    let nextStatus;
    if (body.status !== undefined) {
      if (!FOCUS_STATUSES.has(body.status)) return res.status(400).json({ error: "Invalid focus status." });
      nextStatus = body.status;
    }

    let nextSort;
    if (body.sort_order !== undefined) {
      const target = Number(body.sort_order);
      if (!Number.isInteger(target) || target < 1 || target > 3) {
        return res.status(400).json({ error: "Invalid sort_order." });
      }
      nextSort = target;
    }

    if (
      body.title === undefined && body.status === undefined && body.goal_id === undefined
      && body.sort_order === undefined && body.week_start === undefined
    ) {
      return res.status(400).json({ error: "no valid fields" });
    }

    // Cap check if moving into a different week.
    if (nextWeek !== current.week_start) {
      const count = db.prepare("SELECT COUNT(*) AS n FROM loop_focus_items WHERE week_start = ?").get(nextWeek).n;
      if (count >= 3) return res.status(409).json({ error: "Weekly Focus is capped at 3." });
    }

    db.transaction(() => {
      const currentSort = current.sort_order;
      const targetSort = nextSort ?? currentSort;
      const targetWeek = nextWeek;

      // If a sort_order swap is requested inside the same week, bump the other row first.
      if (body.sort_order !== undefined && targetWeek === current.week_start && targetSort !== currentSort) {
        const other = db.prepare(
          "SELECT id FROM loop_focus_items WHERE week_start = ? AND sort_order = ? AND id != ?"
        ).get(targetWeek, targetSort, id);
        if (other) {
          // Move the displaced item to the row we are vacating.
          db.prepare(
            "UPDATE loop_focus_items SET sort_order = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(currentSort, other.id);
        }
      } else if (body.week_start !== undefined && targetWeek !== current.week_start && body.sort_order === undefined) {
        // Moving to a new week without an explicit slot — pick the next free slot.
        const used = db.prepare("SELECT sort_order FROM loop_focus_items WHERE week_start = ?").all(targetWeek).map((row) => row.sort_order);
        const slot = [1, 2, 3].find((n) => !used.includes(n));
        if (slot === undefined) throw new Error("CAP_FULL");
        nextSort = slot;
      }

      const sets = [];
      const vals = [];
      if (nextTitle !== undefined) { sets.push("title = ?"); vals.push(nextTitle); }
      if (nextStatus !== undefined) { sets.push("status = ?"); vals.push(nextStatus); }
      if (body.goal_id !== undefined) { sets.push("goal_id = ?"); vals.push(nextGoalId); }
      if (body.week_start !== undefined) { sets.push("week_start = ?"); vals.push(targetWeek); }
      if (nextSort !== undefined) { sets.push("sort_order = ?"); vals.push(nextSort); }
      sets.push("updated_at = datetime('now')");
      db.prepare(`UPDATE loop_focus_items SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    })();

    res.json(findFocusItem(id));
  });

  router.delete("/focus-items/:id", (req, res) => {
    const result = getDb().prepare("DELETE FROM loop_focus_items WHERE id = ?").run(Number(req.params.id));
    if (!result.changes) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  });

  // ---------- Check-ins ----------

  router.get("/checkins", (req, res) => {
    const date = req.query.date || todayUTC();
    if (!isValidISODate(date)) return res.status(400).json({ error: "Invalid date. Expected YYYY-MM-DD." });
    const row = getDb().prepare("SELECT * FROM loop_checkins WHERE date = ?").get(date);
    res.json(serializeCheckin(row));
  });

  router.get("/checkins/list", (req, res) => {
    const since = req.query.since;
    const until = req.query.until;
    if (!since || !isValidISODate(since)) return res.status(400).json({ error: "Invalid since. Expected YYYY-MM-DD." });
    if (!until || !isValidISODate(until)) return res.status(400).json({ error: "Invalid until. Expected YYYY-MM-DD." });
    const diff = daysBetween(since, until);
    if (diff === null || diff < 0 || diff + 1 > CHECKIN_LIST_MAX_DAYS) {
      return res.status(400).json({ error: `Range must be 0–${CHECKIN_LIST_MAX_DAYS} days, since <= until.` });
    }
    const rows = getDb().prepare(`
      SELECT * FROM loop_checkins WHERE date BETWEEN ? AND ? ORDER BY date DESC
    `).all(since, until);
    res.json(rows.map(serializeCheckin));
  });

  router.put("/checkins", (req, res) => {
    const body = req.body || {};
    if (!isValidISODate(body.date)) return res.status(400).json({ error: "Invalid date. Expected YYYY-MM-DD." });
    const ids = parseProgressedIds(body.progressed_focus_ids);
    if (ids === null) return res.status(400).json({ error: "progressed_focus_ids must be an array of positive integer ids." });
    if (body.energy !== undefined && body.energy !== null) {
      const energy = Number(body.energy);
      if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
        return res.status(400).json({ error: "energy must be an integer 1-5." });
      }
    }
    const db = getDb();
    if (ids.length) {
      const weekStart = isoWeekStart(body.date);
      const placeholders = ids.map(() => "?").join(",");
      const rows = db.prepare(`SELECT id, week_start FROM loop_focus_items WHERE id IN (${placeholders})`).all(...ids);
      if (rows.length !== new Set(ids).size) return res.status(400).json({ error: "Some focus items do not exist." });
      for (const row of rows) {
        if (row.week_start !== weekStart) {
          return res.status(400).json({ error: "Focus items must belong to the same ISO week as the check-in date." });
        }
      }
    }
    const energy = body.energy == null ? null : Number(body.energy);
    const note = body.note == null ? null : String(body.note);
    db.prepare(`
      INSERT INTO loop_checkins (date, progressed_focus_ids, energy, note)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        progressed_focus_ids = excluded.progressed_focus_ids,
        energy = excluded.energy,
        note = excluded.note,
        updated_at = datetime('now')
    `).run(body.date, JSON.stringify(ids), energy, note);
    res.json(serializeCheckin(db.prepare("SELECT * FROM loop_checkins WHERE date = ?").get(body.date)));
  });

  // ---------- Reviews ----------

  router.get("/reviews", (req, res) => {
    const weekStart = req.query.week_start;
    if (!weekStart || !isValidISODate(weekStart) || !isMonday(weekStart)) {
      return res.status(400).json({ error: "Invalid week_start. Expected YYYY-MM-DD (Monday)." });
    }
    const row = getDb().prepare("SELECT * FROM loop_reviews WHERE week_start = ?").get(weekStart);
    res.json(row || null);
  });

  router.put("/reviews", (req, res) => {
    const body = req.body || {};
    if (!isValidISODate(body.week_start) || !isMonday(body.week_start)) {
      return res.status(400).json({ error: "Invalid week_start. Expected YYYY-MM-DD (Monday)." });
    }
    const db = getDb();
    const wins = body.wins == null ? null : String(body.wins);
    const slipped = body.slipped == null ? null : String(body.slipped);
    const learning = body.learning == null ? null : String(body.learning);
    db.prepare(`
      INSERT INTO loop_reviews (week_start, wins, slipped, learning)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(week_start) DO UPDATE SET
        wins = excluded.wins,
        slipped = excluded.slipped,
        learning = excluded.learning,
        updated_at = datetime('now')
    `).run(body.week_start, wins, slipped, learning);
    res.json(db.prepare("SELECT * FROM loop_reviews WHERE week_start = ?").get(body.week_start));
  });

  // ---------- Dashboard ----------

  router.get("/dashboard", (_req, res) => {
    const db = getDb();
    const today = todayUTC();
    const weekStart = isoWeekStart(today);
    const weekEnd = addDays(weekStart, 6);

    const checkinRows = db.prepare(`
      SELECT date, progressed_focus_ids FROM loop_checkins
      WHERE date BETWEEN ? AND ?
    `).all(weekStart, weekEnd);

    const todayCheckin = serializeCheckin(db.prepare("SELECT * FROM loop_checkins WHERE date = ?").get(today));

    const focusRows = db.prepare(`
      SELECT f.*, g.title AS goal_title, g.category AS goal_category
      FROM loop_focus_items f LEFT JOIN loop_goals g ON g.id = f.goal_id
      WHERE f.week_start = ?
      ORDER BY f.sort_order ASC, f.id ASC
    `).all(weekStart);

    const focusIds = new Set(focusRows.map((row) => row.id));
    const progressed = new Map();
    for (const row of checkinRows) {
      let ids = [];
      try { ids = JSON.parse(row.progressed_focus_ids || "[]"); } catch { ids = []; }
      if (!Array.isArray(ids)) continue;
      const seen = new Set();
      for (const id of ids) {
        if (!focusIds.has(id) || seen.has(id)) continue;
        seen.add(id);
        progressed.set(id, (progressed.get(id) || 0) + 1);
      }
    }
    const focus_items = focusRows.map((row) => ({ ...row, progressed_days: progressed.get(row.id) || 0 }));

    const active_goals = db.prepare(`
      SELECT id, category, title FROM loop_goals WHERE status = 'active' ORDER BY category ASC, id ASC
    `).all();

    const current_review = db.prepare("SELECT * FROM loop_reviews WHERE week_start = ?").get(weekStart) || null;

    res.json({
      today,
      week_start: weekStart,
      checkin_count: checkinRows.length,
      today_checkin: todayCheckin,
      focus_items,
      active_goals,
      current_review,
    });
  });

  return router;
}

export default createLoopRouter();
