import { Router } from "express";
import { getDb } from "../../db/connection.js";

const router = Router();
const TASK_FIELDS = new Set(["title", "project_id", "status", "priority", "due_date", "notes", "tags", "recurrence"]);
const PROJECT_FIELDS = new Set(["title", "description", "status", "color"]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function serializeTask(row) {
  return { ...row, tags: JSON.parse(row.tags || "[]") };
}

function findTask(id) {
  return getDb().prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color
    FROM task_items t LEFT JOIN task_projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(id);
}

router.get("/dashboard", (_req, res) => {
  const db = getDb();
  const date = today();
  const tasks = db.prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color
    FROM task_items t LEFT JOIN task_projects p ON p.id = t.project_id
    WHERE t.due_date = ?
    ORDER BY t.due_date ASC,
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.created_at ASC
  `).all(date).map(serializeTask);
  const overdue = db.prepare("SELECT COUNT(*) AS n FROM task_items WHERE status != 'done' AND due_date < ?").get(date).n;
  res.json({ today: date, tasks, overdue });
});

router.get("/", (req, res) => {
  const clauses = [];
  const params = [];
  if (req.query.status) { clauses.push("t.status = ?"); params.push(req.query.status); }
  if (req.query.project_id) { clauses.push("t.project_id = ?"); params.push(Number(req.query.project_id)); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color
    FROM task_items t LEFT JOIN task_projects p ON p.id = t.project_id
    ${where}
    ORDER BY
      CASE WHEN t.status = 'done' THEN 1 ELSE 0 END,
      CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
      t.due_date ASC,
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.created_at DESC
  `).all(...params);
  res.json(rows.map(serializeTask));
});

router.post("/", (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const projectId = req.body.project_id == null ? null : Number(req.body.project_id);
  const priority = req.body.priority || "low";
  const dueDate = req.body.due_date === undefined ? today() : req.body.due_date;
  if (!["low", "medium", "high"].includes(priority)) return res.status(400).json({ error: "invalid priority" });
  if (projectId && !getDb().prepare("SELECT id FROM task_projects WHERE id = ?").get(projectId)) {
    return res.status(400).json({ error: "project not found" });
  }
  const result = getDb().prepare(`
    INSERT INTO task_items (title, project_id, priority, due_date, notes, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, projectId, priority, dueDate || null, req.body.notes || null, JSON.stringify(req.body.tags || []));
  res.status(201).json(serializeTask(findTask(result.lastInsertRowid)));
});

router.patch("/items/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!findTask(id)) return res.status(404).json({ error: "not found" });
  const updates = [];
  const values = [];
  for (const [key, raw] of Object.entries(req.body || {})) {
    if (!TASK_FIELDS.has(key)) continue;
    let value = key === "tags" ? JSON.stringify(raw || []) : raw;
    if (key === "project_id") value = value == null ? null : Number(value);
    updates.push(`${key} = ?`);
    values.push(value);
  }
  if (!updates.length) return res.status(400).json({ error: "no valid fields" });
  if (req.body.status && !["todo", "doing", "done"].includes(req.body.status)) return res.status(400).json({ error: "invalid status" });
  if (req.body.priority && !["low", "medium", "high"].includes(req.body.priority)) return res.status(400).json({ error: "invalid priority" });
  if (req.body.status === "done") { updates.push("completed_at = datetime('now')"); }
  if (req.body.status && req.body.status !== "done") { updates.push("completed_at = NULL"); }
  updates.push("updated_at = datetime('now')");
  getDb().prepare(`UPDATE task_items SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
  res.json(serializeTask(findTask(id)));
});

router.delete("/items/:id", (req, res) => {
  const result = getDb().prepare("DELETE FROM task_items WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

router.get("/projects/list", (_req, res) => {
  const rows = getDb().prepare(`
    SELECT p.*,
      COUNT(t.id) AS total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
      SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) AS open_tasks,
      MIN(CASE WHEN t.status != 'done' THEN t.due_date END) AS next_due
    FROM task_projects p LEFT JOIN task_items t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, p.updated_at DESC
  `).all().map((row) => ({
    ...row,
    total_tasks: Number(row.total_tasks || 0),
    completed_tasks: Number(row.completed_tasks || 0),
    open_tasks: Number(row.open_tasks || 0),
    percent: row.total_tasks ? Math.round((row.completed_tasks / row.total_tasks) * 100) : 0,
  }));
  res.json(rows);
});

router.post("/projects", (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const result = getDb().prepare(`
    INSERT INTO task_projects (title, description, color) VALUES (?, ?, ?)
  `).run(title, req.body.description || null, req.body.color || "#4F46E5");
  res.status(201).json(getDb().prepare("SELECT * FROM task_projects WHERE id = ?").get(result.lastInsertRowid));
});

router.patch("/projects/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!getDb().prepare("SELECT id FROM task_projects WHERE id = ?").get(id)) return res.status(404).json({ error: "not found" });
  const updates = [];
  const values = [];
  for (const [key, value] of Object.entries(req.body || {})) {
    if (!PROJECT_FIELDS.has(key)) continue;
    updates.push(`${key} = ?`); values.push(value);
  }
  if (!updates.length) return res.status(400).json({ error: "no valid fields" });
  updates.push("updated_at = datetime('now')");
  getDb().prepare(`UPDATE task_projects SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
  res.json(getDb().prepare("SELECT * FROM task_projects WHERE id = ?").get(id));
});

router.delete("/projects/:id", (req, res) => {
  const result = getDb().prepare("DELETE FROM task_projects WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

export default router;
