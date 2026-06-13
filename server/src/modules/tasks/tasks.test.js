import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/migrate.js";

test("task schema is created idempotently", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  runMigrations(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  assert.ok(tables.includes("task_items"));
  assert.ok(tables.includes("task_projects"));
  db.close();
});

test("project progress is derivable from task status", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  const project = db.prepare("INSERT INTO task_projects (title) VALUES ('Personal site')").run();
  const insert = db.prepare("INSERT INTO task_items (title, project_id, status, due_date) VALUES (?, ?, ?, '2026-06-13')");
  insert.run("Plan", project.lastInsertRowid, "done");
  insert.run("Build", project.lastInsertRowid, "todo");
  const counts = db.prepare(`
    SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed
    FROM task_items WHERE project_id = ?
  `).get(project.lastInsertRowid);
  assert.equal(counts.total, 2);
  assert.equal(Math.round((counts.completed / counts.total) * 100), 50);
  db.close();
});
