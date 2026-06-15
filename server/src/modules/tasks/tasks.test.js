import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/migrate.js";
import { taskValidationError, validDate, validTime } from "./routes.js";
import { normalizeImportRow } from "../data/routes.js";

test("task schema is created idempotently", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  runMigrations(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  assert.ok(tables.includes("task_items"));
  assert.ok(tables.includes("task_projects"));
  const taskColumns = db.prepare("PRAGMA table_info(task_items)").all().map((row) => row.name);
  const projectColumns = db.prepare("PRAGMA table_info(task_projects)").all().map((row) => row.name);
  assert.ok(taskColumns.includes("area"));
  assert.ok(taskColumns.includes("due_time"));
  assert.ok(projectColumns.includes("area"));
  assert.ok(projectColumns.includes("goal"));
  db.close();
});

test("legacy task data migrates to the v0.2 status model", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE task_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','done','archived')),
      color TEXT NOT NULL DEFAULT '#4F46E5', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE task_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      project_id INTEGER REFERENCES task_projects(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','doing','done')),
      priority TEXT NOT NULL DEFAULT 'low' CHECK(priority IN ('low','medium','high')),
      due_date TEXT, notes TEXT, tags TEXT NOT NULL DEFAULT '[]', recurrence TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    INSERT INTO task_projects (id, title, status) VALUES (7, 'Old project', 'archived');
    INSERT INTO task_items (id, title, project_id, status, due_date) VALUES
      (11, 'Inbox item', 7, 'todo', NULL),
      (12, 'Next item', 7, 'doing', '2026-06-15'),
      (13, 'Done item', 7, 'done', '2026-06-14');
  `);

  runMigrations(db);

  assert.equal(db.prepare("SELECT status FROM task_projects WHERE id = 7").get().status, "paused");
  assert.deepEqual(
    db.prepare("SELECT id, status FROM task_items ORDER BY id").all(),
    [{ id: 11, status: "inbox" }, { id: 12, status: "next" }, { id: 13, status: "done" }]
  );
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  runMigrations(db);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM task_items").get().n, 3);
  db.close();
});

test("project progress is derivable from task status", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  const project = db.prepare("INSERT INTO task_projects (title) VALUES ('Personal site')").run();
  const insert = db.prepare("INSERT INTO task_items (title, project_id, status, due_date) VALUES (?, ?, ?, '2026-06-13')");
  insert.run("Plan", project.lastInsertRowid, "done");
  insert.run("Build", project.lastInsertRowid, "inbox");
  const counts = db.prepare(`
    SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed
    FROM task_items WHERE project_id = ?
  `).get(project.lastInsertRowid);
  assert.equal(counts.total, 2);
  assert.equal(Math.round((counts.completed / counts.total) * 100), 50);
  db.close();
});

test("task date, time, area, and title validation follows the v0.2 contract", () => {
  assert.equal(validDate("2026-06-15"), true);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validTime("21:15"), true);
  assert.equal(validTime("24:00"), false);
  assert.equal(taskValidationError({ title: "" }), "Task title is required.");
  assert.equal(taskValidationError({ title: "Test", area: "home" }), "Invalid area. Expected work, life, or null.");
  assert.equal(taskValidationError({ title: "Test", date: "15/06/2026" }), "Invalid date format. Expected YYYY-MM-DD.");
  assert.equal(taskValidationError({ title: "Test", date: "2026-06-15", time: "9pm" }), "Invalid time format. Expected HH:mm.");
  assert.equal(taskValidationError({ title: "Test", date: null, time: "21:00" }), "Task time requires a task date.");
  assert.equal(taskValidationError({ title: "Test", area: "work", date: "2026-06-15", time: "21:00" }), null);
});

test("old backup rows normalize without losing task dates", () => {
  assert.deepEqual(
    normalizeImportRow("task_items", { title: "Legacy", status: "doing", due_date: "2026-06-15" }),
    { title: "Legacy", status: "next", due_date: "2026-06-15", area: null }
  );
  assert.deepEqual(
    normalizeImportRow("task_items", { title: "New", status: "inbox", area: "work", date: "2026-06-16", time: "09:30" }),
    { title: "New", status: "inbox", area: "work", due_date: "2026-06-16", due_time: "09:30" }
  );
  assert.deepEqual(
    normalizeImportRow("task_projects", { title: "Old", status: "archived" }),
    { title: "Old", status: "paused", area: null }
  );
  assert.deepEqual(
    normalizeImportRow("task_items", { title: "Bad date", date: "2026-02-30", time: "25:00" }),
    { title: "Bad date", status: "inbox", area: null, due_date: null, due_time: null }
  );
});
