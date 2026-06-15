import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../db/migrate.js";
import { validSidebarStyle } from "./settings.js";

test("sidebar style validation accepts only supported modes", () => {
  assert.equal(validSidebarStyle("personal_photo"), true);
  assert.equal(validSidebarStyle("minimal_gradient"), true);
  assert.equal(validSidebarStyle("focus_mode"), true);
  assert.equal(validSidebarStyle("photo"), false);
  assert.equal(validSidebarStyle(null), false);
});

test("sidebar style defaults to personal photo", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  assert.equal(db.prepare("SELECT value FROM settings WHERE key = 'sidebar_style'").get().value, "personal_photo");
  db.close();
});
