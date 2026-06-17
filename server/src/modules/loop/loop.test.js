import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/migrate.js";
import { addDays, isMonday, isValidISODate, isoWeekStart } from "./week.js";
import { createLoopRouter } from "./routes.js";

// ---------- Test harness ----------

function makeDb() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

async function startApp(db) {
  const app = express();
  app.use(express.json());
  app.use("/api/loop", createLoopRouter(() => db));
  const server = app.listen(0);
  await new Promise((resolve) => server.on("listening", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api/loop`;
  async function req(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    if (res.status !== 204) {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    }
    return { status: res.status, data };
  }
  return { req, close: () => new Promise((resolve) => server.close(resolve)) };
}

// ---------- Migration safety ----------

test("loop migration creates four tables and the partial unique index", () => {
  const db = makeDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  for (const name of ["loop_goals", "loop_focus_items", "loop_checkins", "loop_reviews"]) {
    assert.ok(tables.includes(name), `${name} should exist`);
  }
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((row) => row.name);
  assert.ok(indexes.includes("idx_loop_goals_one_active_per_category"));
  assert.ok(indexes.includes("idx_loop_focus_items_week"));
  db.close();
});

test("running migrations twice is a no-op for loop tables", () => {
  const db = makeDb();
  runMigrations(db);
  runMigrations(db);
  for (const table of ["loop_goals", "loop_focus_items", "loop_checkins", "loop_reviews"]) {
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
  }
  db.close();
});

test("loop migration does not touch existing task/study/settings rows", () => {
  const db = makeDb();
  db.prepare("INSERT INTO task_projects (title) VALUES ('Untouched')").run();
  db.prepare("INSERT INTO task_items (title) VALUES ('Untouched')").run();
  const projects = db.prepare("SELECT * FROM task_projects").all();
  const items = db.prepare("SELECT * FROM task_items").all();
  const settings = db.prepare("SELECT * FROM settings ORDER BY key").all();
  const cards = db.prepare("SELECT COUNT(*) AS n FROM study_cards").get().n;
  runMigrations(db);
  assert.deepEqual(db.prepare("SELECT * FROM task_projects").all(), projects);
  assert.deepEqual(db.prepare("SELECT * FROM task_items").all(), items);
  assert.deepEqual(db.prepare("SELECT * FROM settings ORDER BY key").all(), settings);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM study_cards").get().n, cards);
  db.close();
});

// ---------- week helpers ----------

test("isoWeekStart returns the Monday for any day of the week", () => {
  assert.equal(isoWeekStart("2026-06-15"), "2026-06-15"); // Monday
  assert.equal(isoWeekStart("2026-06-17"), "2026-06-15"); // Wednesday
  assert.equal(isoWeekStart("2026-06-21"), "2026-06-15"); // Sunday
  assert.equal(isoWeekStart("2026-01-01"), "2025-12-29"); // year crossing
  assert.equal(isoWeekStart("bad"), null);
});

test("isMonday and isValidISODate accept only well-formed inputs", () => {
  assert.equal(isMonday("2026-06-15"), true);
  assert.equal(isMonday("2026-06-17"), false);
  assert.equal(isMonday("2026-02-30"), false);
  assert.equal(isValidISODate("2026-06-15"), true);
  assert.equal(isValidISODate("15/06/2026"), false);
  assert.equal(addDays("2026-06-15", 6), "2026-06-21");
});

// ---------- Goals ----------

test("goals CRUD enforces fixed categories and one active per category", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    let res = await req("POST", "/goals", { category: "fitness", title: "Build a basic exercise routine" });
    assert.equal(res.status, 201);
    assert.equal(res.data.status, "active");
    const fitnessId = res.data.id;

    res = await req("POST", "/goals", { category: "fitness", title: "Second fitness goal" });
    assert.equal(res.status, 409);

    res = await req("POST", "/goals", { category: "bogus", title: "x" });
    assert.equal(res.status, 400);
    res = await req("POST", "/goals", { category: "fitness", title: "" });
    assert.equal(res.status, 400);

    // Archiving the active goal frees up the category.
    res = await req("PATCH", `/goals/${fitnessId}`, { status: "archived" });
    assert.equal(res.status, 200);
    res = await req("POST", "/goals", { category: "fitness", title: "Take 2" });
    assert.equal(res.status, 201);
    const newFitnessId = res.data.id;

    // Promoting the old one back to active should now conflict.
    res = await req("PATCH", `/goals/${fitnessId}`, { status: "active" });
    assert.equal(res.status, 409);

    // List filtering.
    res = await req("GET", "/goals?status=active");
    assert.equal(res.status, 200);
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0].id, newFitnessId);

    // Delete works.
    res = await req("DELETE", `/goals/${fitnessId}`);
    assert.equal(res.status, 204);
    res = await req("PATCH", `/goals/${fitnessId}`, { status: "active" });
    assert.equal(res.status, 404);
  } finally { await close(); db.close(); }
});

// ---------- Focus items ----------

test("focus items cap at 3 per week and auto-assign sort_order", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    const week = "2026-06-15";
    const titles = ["Ship Daylight v0.3", "Fitness 3×", "Korean 5 sessions"];
    for (const [index, title] of titles.entries()) {
      const res = await req("POST", "/focus-items", { week_start: week, title });
      assert.equal(res.status, 201);
      assert.equal(res.data.sort_order, index + 1);
    }
    const fourth = await req("POST", "/focus-items", { week_start: week, title: "Too many" });
    assert.equal(fourth.status, 409);
    assert.match(fourth.data.error, /capped at 3/);

    const bad = await req("POST", "/focus-items", { week_start: "2026-06-16", title: "Tuesday" });
    assert.equal(bad.status, 400);
    assert.match(bad.data.error, /Monday/);

    const list = await req("GET", `/focus-items?week_start=${week}`);
    assert.equal(list.status, 200);
    assert.deepEqual(list.data.map((row) => row.sort_order), [1, 2, 3]);
  } finally { await close(); db.close(); }
});

test("focus item goal_id is validated and nullified when the goal is deleted", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    const goal = await req("POST", "/goals", { category: "ai_daylight", title: "Ship Daylight" });
    const item = await req("POST", "/focus-items", {
      week_start: "2026-06-15", title: "Ship Daylight v0.3", goal_id: goal.data.id,
    });
    assert.equal(item.data.goal_id, goal.data.id);

    const bad = await req("POST", "/focus-items", { week_start: "2026-06-15", title: "x", goal_id: 9999 });
    assert.equal(bad.status, 400);

    await req("DELETE", `/goals/${goal.data.id}`);
    const refreshed = db.prepare("SELECT goal_id FROM loop_focus_items WHERE id = ?").get(item.data.id);
    assert.equal(refreshed.goal_id, null);
  } finally { await close(); db.close(); }
});

test("sort_order PATCH swaps with whichever item already holds the target slot", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    const week = "2026-06-15";
    const first = await req("POST", "/focus-items", { week_start: week, title: "First" });
    const second = await req("POST", "/focus-items", { week_start: week, title: "Second" });
    const swap = await req("PATCH", `/focus-items/${first.data.id}`, { sort_order: 2 });
    assert.equal(swap.status, 200);
    assert.equal(swap.data.sort_order, 2);
    const refreshed = db.prepare("SELECT id, sort_order FROM loop_focus_items WHERE week_start = ? ORDER BY sort_order").all(week);
    assert.deepEqual(refreshed, [{ id: second.data.id, sort_order: 1 }, { id: first.data.id, sort_order: 2 }]);
  } finally { await close(); db.close(); }
});

test("focus item status transitions through the v0.3 review vocabulary", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    const item = await req("POST", "/focus-items", { week_start: "2026-06-15", title: "Ship v0.3" });
    for (const status of ["done", "partial", "missed", "carried", "open"]) {
      const patched = await req("PATCH", `/focus-items/${item.data.id}`, { status });
      assert.equal(patched.status, 200);
      assert.equal(patched.data.status, status);
    }
    const bad = await req("PATCH", `/focus-items/${item.data.id}`, { status: "wip" });
    assert.equal(bad.status, 400);
  } finally { await close(); db.close(); }
});

// ---------- Check-ins ----------

test("check-in PUT upserts by date and validates references to focus items in the same week", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    const week = "2026-06-15";
    const a = await req("POST", "/focus-items", { week_start: week, title: "Ship v0.3" });
    const b = await req("POST", "/focus-items", { week_start: week, title: "Fitness" });
    const other = await req("POST", "/focus-items", { week_start: "2026-06-22", title: "Next week" });

    let res = await req("PUT", "/checkins", {
      date: "2026-06-17", progressed_focus_ids: [a.data.id, b.data.id], energy: 4, note: "Good day",
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.progressed_focus_ids, [a.data.id, b.data.id]);
    assert.equal(res.data.energy, 4);

    // Second PUT on same date updates the same row.
    res = await req("PUT", "/checkins", { date: "2026-06-17", progressed_focus_ids: [a.data.id] });
    assert.equal(res.data.progressed_focus_ids.length, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM loop_checkins WHERE date = '2026-06-17'").get().n, 1);

    // Different-week focus reference is rejected.
    res = await req("PUT", "/checkins", { date: "2026-06-17", progressed_focus_ids: [other.data.id] });
    assert.equal(res.status, 400);

    // Unknown id is rejected.
    res = await req("PUT", "/checkins", { date: "2026-06-17", progressed_focus_ids: [9999] });
    assert.equal(res.status, 400);

    // energy bounds.
    res = await req("PUT", "/checkins", { date: "2026-06-17", progressed_focus_ids: [], energy: 6 });
    assert.equal(res.status, 400);

    // GET by date returns null when absent.
    res = await req("GET", "/checkins?date=2026-06-18");
    assert.equal(res.status, 200);
    assert.equal(res.data, null);

    // List range works.
    res = await req("GET", "/checkins/list?since=2026-06-15&until=2026-06-21");
    assert.equal(res.status, 200);
    assert.equal(res.data.length, 1);

    // List rejects huge ranges.
    res = await req("GET", "/checkins/list?since=2024-01-01&until=2026-01-01");
    assert.equal(res.status, 400);
  } finally { await close(); db.close(); }
});

// ---------- Reviews ----------

test("review PUT upserts by week_start and uses 'slipped' not 'misses'", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    let res = await req("PUT", "/reviews", {
      week_start: "2026-06-15", wins: "Shipped v0.3", slipped: "Missed one gym day", learning: "Block Mondays",
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.wins, "Shipped v0.3");
    assert.equal(res.data.slipped, "Missed one gym day");
    assert.equal(res.data.learning, "Block Mondays");

    res = await req("PUT", "/reviews", { week_start: "2026-06-15", wins: "v2", slipped: null, learning: null });
    assert.equal(res.data.wins, "v2");

    res = await req("PUT", "/reviews", { week_start: "2026-06-17" }); // not a Monday
    assert.equal(res.status, 400);

    res = await req("GET", "/reviews?week_start=2026-06-22");
    assert.equal(res.status, 200);
    assert.equal(res.data, null);

    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM loop_reviews").get().n, 1);
  } finally { await close(); db.close(); }
});

// ---------- Dashboard ----------

test("dashboard returns derived counters and tolerates orphaned focus ids", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);

  // Freeze "today" so this week resolves deterministically by inserting rows
  // for the same ISO week as the test's reference Monday.
  const today = new Date().toISOString().slice(0, 10);
  const week = isoWeekStart(today);
  const monday = week;
  const otherDay = addDays(week, 2);

  try {
    // Set up an active goal in a category and three focus items linked to it.
    const goal = await req("POST", "/goals", { category: "ai_daylight", title: "Ship Daylight" });
    const a = await req("POST", "/focus-items", { week_start: monday, title: "Ship v0.3", goal_id: goal.data.id });
    const b = await req("POST", "/focus-items", { week_start: monday, title: "Fitness" });
    const c = await req("POST", "/focus-items", { week_start: monday, title: "Korean" });

    // Two check-ins this week, one referencing a and c, one referencing a only.
    await req("PUT", "/checkins", { date: monday, progressed_focus_ids: [a.data.id, c.data.id] });
    await req("PUT", "/checkins", { date: otherDay, progressed_focus_ids: [a.data.id] });

    // Orphan an id by deleting focus item b and faking a checkin that referenced it before deletion.
    db.prepare("UPDATE loop_checkins SET progressed_focus_ids = ? WHERE date = ?")
      .run(JSON.stringify([b.data.id, 9999]), monday);
    await req("DELETE", `/focus-items/${b.data.id}`);

    const res = await req("GET", "/dashboard");
    assert.equal(res.status, 200);
    assert.equal(res.data.week_start, monday);
    assert.equal(res.data.checkin_count, 2);
    assert.equal(res.data.active_goals.length, 1);
    assert.equal(res.data.active_goals[0].category, "ai_daylight");

    const byId = Object.fromEntries(res.data.focus_items.map((row) => [row.id, row]));
    assert.equal(byId[a.data.id].progressed_days, 1); // monday checkin no longer lists a after the orphan rewrite
    assert.equal(byId[c.data.id].progressed_days, 0); // c was only in the monday checkin, which was rewritten
    assert.ok(byId[b.data.id] === undefined); // deleted focus item is gone
    assert.equal(res.data.current_review, null);
  } finally { await close(); db.close(); }
});

test("empty dashboard returns sensible zeros and nulls", async () => {
  const db = makeDb();
  const { req, close } = await startApp(db);
  try {
    const res = await req("GET", "/dashboard");
    assert.equal(res.status, 200);
    assert.equal(res.data.checkin_count, 0);
    assert.equal(res.data.today_checkin, null);
    assert.deepEqual(res.data.focus_items, []);
    assert.deepEqual(res.data.active_goals, []);
    assert.equal(res.data.current_review, null);
    assert.equal(isMonday(res.data.week_start), true);
  } finally { await close(); db.close(); }
});
