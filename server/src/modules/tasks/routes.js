import { Router } from "express";
import { getDb } from "../../db/connection.js";

const router = Router();
const TASK_FIELDS = new Set(["title", "project_id", "area", "status", "priority", "due_date", "due_time", "notes", "tags", "recurrence"]);
const PROJECT_FIELDS = new Set(["title", "description", "area", "status", "goal", "color"]);
const TASK_STATUSES = new Set(["inbox", "next", "waiting", "done"]);
const PROJECT_STATUSES = new Set(["active", "paused", "done"]);
const AREAS = new Set(["work", "life"]);

export function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

export function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function validArea(value) {
  return value == null || value === "" || AREAS.has(value);
}

function requestedDate(req) {
  return validDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
}

function taskDate(body) {
  return body.date !== undefined ? body.date : body.due_date;
}

function taskTime(body) {
  return body.time !== undefined ? body.time : body.due_time;
}

export function taskValidationError(body, { partial = false } = {}) {
  if (!partial || body.title !== undefined) {
    if (!String(body.title || "").trim()) return "Task title is required.";
  }
  if (body.area !== undefined && !validArea(body.area)) return "Invalid area. Expected work, life, or null.";
  const date = taskDate(body);
  const time = taskTime(body);
  if (date !== undefined && date !== null && date !== "" && !validDate(date)) return "Invalid date format. Expected YYYY-MM-DD.";
  if (time !== undefined && time !== null && time !== "" && !validTime(time)) return "Invalid time format. Expected HH:mm.";
  const effectiveDate = date === undefined ? undefined : date || null;
  if (time && effectiveDate === null) return "Task time requires a task date.";
  if (body.status !== undefined && !TASK_STATUSES.has(body.status)) return "Invalid task status.";
  if (body.priority !== undefined && !["low", "medium", "high"].includes(body.priority)) return "Invalid priority.";
  return null;
}

function serializeTask(row) {
  return {
    ...row,
    date: row.due_date,
    time: row.due_time,
    tags: JSON.parse(row.tags || "[]"),
  };
}

function serializeProject(row) {
  return { ...row, name: row.title };
}

function findTask(id) {
  return getDb().prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color, p.area AS project_area
    FROM task_items t LEFT JOIN task_projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(id);
}

function findProject(id) {
  return getDb().prepare("SELECT * FROM task_projects WHERE id = ?").get(id);
}

router.get("/dashboard", (req, res) => {
  const date = requestedDate(req);
  const clauses = ["t.status != 'done'", "t.due_date <= ?"];
  const params = [date];
  if (req.query.area) {
    if (!AREAS.has(req.query.area)) return res.status(400).json({ error: "Invalid area. Expected work, life, or null." });
    clauses.push("t.area = ?");
    params.push(req.query.area);
  }
  const tasks = getDb().prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color, p.area AS project_area
    FROM task_items t LEFT JOIN task_projects p ON p.id = t.project_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY t.due_date ASC,
      CASE WHEN t.due_time IS NULL THEN 1 ELSE 0 END, t.due_time ASC,
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.created_at ASC
  `).all(...params).map(serializeTask);
  const overdue = tasks.filter((task) => task.due_date < date).length;
  res.json({ today: date, tasks, overdue });
});

router.get("/", (req, res) => {
  const clauses = [];
  const params = [];
  const today = requestedDate(req);
  if (req.query.area) {
    if (!AREAS.has(req.query.area)) return res.status(400).json({ error: "Invalid area. Expected work, life, or null." });
    clauses.push("t.area = ?"); params.push(req.query.area);
  }
  if (req.query.status) {
    if (!TASK_STATUSES.has(req.query.status)) return res.status(400).json({ error: "Invalid task status." });
    clauses.push("t.status = ?"); params.push(req.query.status);
  }
  if (req.query.project_id) { clauses.push("t.project_id = ?"); params.push(Number(req.query.project_id)); }
  const category = req.query.category || req.query.date_category;
  if (category === "inbox") clauses.push("t.status = 'inbox'");
  else if (category === "today") { clauses.push("t.status != 'done' AND t.due_date = ?"); params.push(today); }
  else if (category === "upcoming") { clauses.push("t.status != 'done' AND t.due_date > ?"); params.push(today); }
  else if (category === "overdue") { clauses.push("t.status != 'done' AND t.due_date < ?"); params.push(today); }
  else if (category === "waiting") clauses.push("t.status = 'waiting'");
  else if (category === "done") clauses.push("t.status = 'done'");
  else if (category && category !== "all") return res.status(400).json({ error: "Invalid task category." });
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color, p.area AS project_area
    FROM task_items t LEFT JOIN task_projects p ON p.id = t.project_id
    ${where}
    ORDER BY CASE WHEN t.status = 'done' THEN 1 ELSE 0 END,
      CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC,
      CASE WHEN t.due_time IS NULL THEN 1 ELSE 0 END, t.due_time ASC,
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.created_at DESC
  `).all(...params);
  res.json(rows.map(serializeTask));
});

router.post("/", (req, res) => {
  const body = req.body || {};
  const error = taskValidationError(body);
  if (error) return res.status(400).json({ error });
  const projectId = body.project_id == null || body.project_id === "" ? null : Number(body.project_id);
  const project = projectId ? findProject(projectId) : null;
  const area = body.area || project?.area || null;
  const result = getDb().prepare(`
    INSERT INTO task_items (title, project_id, area, status, priority, due_date, due_time, notes, tags, recurrence, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END)
  `).run(
    String(body.title).trim(), project?.id || null, area, body.status || "inbox", body.priority || "low",
    taskDate(body) || null, taskTime(body) || null, body.notes || null, JSON.stringify(body.tags || []), body.recurrence || null,
    body.status || "inbox"
  );
  res.status(201).json(serializeTask(findTask(result.lastInsertRowid)));
});

router.patch("/items/:id", (req, res) => {
  const id = Number(req.params.id);
  const current = findTask(id);
  if (!current) return res.status(404).json({ error: "not found" });
  const body = { ...(req.body || {}) };
  if (body.date !== undefined) body.due_date = body.date;
  if (body.time !== undefined) body.due_time = body.time;
  const validationBody = { ...body };
  if (body.due_date !== undefined || body.due_time !== undefined) {
    if (body.due_date === undefined) validationBody.due_date = current.due_date;
    if (body.due_time === undefined) validationBody.due_time = current.due_time;
  }
  const error = taskValidationError(validationBody, { partial: true });
  if (error) return res.status(400).json({ error });
  if (body.project_id !== undefined) {
    const project = body.project_id == null || body.project_id === "" ? null : findProject(Number(body.project_id));
    body.project_id = project?.id || null;
  }
  const updates = [];
  const values = [];
  for (const [key, raw] of Object.entries(body)) {
    if (!TASK_FIELDS.has(key)) continue;
    let value = key === "tags" ? JSON.stringify(raw || []) : raw;
    if (["project_id", "area", "due_date", "due_time"].includes(key) && (value === "" || value === undefined)) value = null;
    if (key === "title") value = String(value).trim();
    updates.push(`${key} = ?`); values.push(value);
  }
  if (!updates.length) return res.status(400).json({ error: "no valid fields" });
  if (body.status === "done") updates.push("completed_at = datetime('now')");
  if (body.status && body.status !== "done") updates.push("completed_at = NULL");
  updates.push("updated_at = datetime('now')");
  getDb().prepare(`UPDATE task_items SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
  res.json(serializeTask(findTask(id)));
});

router.delete("/items/:id", (req, res) => {
  const result = getDb().prepare("DELETE FROM task_items WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

router.get("/projects/list", (req, res) => {
  const clauses = [];
  const params = [];
  if (req.query.area) {
    if (!AREAS.has(req.query.area)) return res.status(400).json({ error: "Invalid area. Expected work, life, or null." });
    clauses.push("p.area = ?"); params.push(req.query.area);
  }
  if (req.query.status) {
    if (!PROJECT_STATUSES.has(req.query.status)) return res.status(400).json({ error: "Invalid project status." });
    clauses.push("p.status = ?"); params.push(req.query.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`
    SELECT p.*, COUNT(t.id) AS total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
      SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) AS open_tasks,
      MIN(CASE WHEN t.status != 'done' THEN t.due_date END) AS next_due,
      (SELECT ti.title FROM task_items ti WHERE ti.project_id = p.id AND ti.status != 'done'
       ORDER BY CASE WHEN ti.due_date IS NULL THEN 1 ELSE 0 END, ti.due_date,
         CASE WHEN ti.due_time IS NULL THEN 1 ELSE 0 END, ti.due_time, ti.created_at LIMIT 1) AS next_action
    FROM task_projects p LEFT JOIN task_items t ON t.project_id = p.id
    ${where}
    GROUP BY p.id
    ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, p.updated_at DESC
  `).all(...params).map((row) => serializeProject({
    ...row,
    total_tasks: Number(row.total_tasks || 0),
    completed_tasks: Number(row.completed_tasks || 0),
    open_tasks: Number(row.open_tasks || 0),
    percent: row.total_tasks ? Math.round((row.completed_tasks / row.total_tasks) * 100) : 0,
  }));
  res.json(rows);
});

router.post("/projects", (req, res) => {
  const body = req.body || {};
  const title = String(body.title || body.name || "").trim();
  if (!title) return res.status(400).json({ error: "Project name is required." });
  if (!validArea(body.area)) return res.status(400).json({ error: "Invalid area. Expected work, life, or null." });
  if (body.status && !PROJECT_STATUSES.has(body.status)) return res.status(400).json({ error: "Invalid project status." });
  const result = getDb().prepare(`
    INSERT INTO task_projects (title, description, area, status, goal, color) VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, body.description || null, body.area || null, body.status || "active", body.goal || null, body.color || "#4F46E5");
  res.status(201).json(serializeProject(findProject(result.lastInsertRowid)));
});

router.patch("/projects/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!findProject(id)) return res.status(404).json({ error: "not found" });
  const body = { ...(req.body || {}) };
  if (body.name !== undefined && body.title === undefined) body.title = body.name;
  if (body.title !== undefined && !String(body.title).trim()) return res.status(400).json({ error: "Project name is required." });
  if (body.area !== undefined && !validArea(body.area)) return res.status(400).json({ error: "Invalid area. Expected work, life, or null." });
  if (body.status !== undefined && !PROJECT_STATUSES.has(body.status)) return res.status(400).json({ error: "Invalid project status." });
  const updates = [];
  const values = [];
  for (const [key, raw] of Object.entries(body)) {
    if (!PROJECT_FIELDS.has(key)) continue;
    let value = raw;
    if (["area", "goal", "description"].includes(key) && value === "") value = null;
    if (key === "title") value = String(value).trim();
    updates.push(`${key} = ?`); values.push(value);
  }
  if (!updates.length) return res.status(400).json({ error: "no valid fields" });
  updates.push("updated_at = datetime('now')");
  getDb().prepare(`UPDATE task_projects SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
  res.json(serializeProject(findProject(id)));
});

router.delete("/projects/:id", (req, res) => {
  const result = getDb().prepare("DELETE FROM task_projects WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

export default router;
