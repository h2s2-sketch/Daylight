import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/migrate.js";
import { HANGUL_FOUNDATION, KOREAN_CORE_DECK } from "./data.js";
import { buildDrillSession } from "./routes.js";

test("Korean course data has the expected size and stable keys", () => {
  assert.equal(HANGUL_FOUNDATION.length, 64);
  assert.equal(KOREAN_CORE_DECK.length, 300);
  assert.equal(new Set(KOREAN_CORE_DECK.map((entry) => entry.key)).size, 300);
});

test("Korean course seed is idempotent and keeps the core deck locked", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  runMigrations(db);

  const foundation = db.prepare("SELECT COUNT(*) AS n FROM study_cards WHERE course='hangul_foundation'").get().n;
  const core = db.prepare("SELECT COUNT(*) AS n FROM study_cards WHERE course='korean_core'").get().n;
  const unlockedCore = db.prepare("SELECT COUNT(*) AS n FROM study_cards WHERE course='korean_core' AND status='ready'").get().n;

  assert.equal(foundation, 64);
  assert.equal(core, 300);
  assert.equal(unlockedCore, 0);
  db.close();
});

test("Hangul sessions contain 5 to 10 cards and mark filler as practice", () => {
  const scheduled = [{ id: 1 }, { id: 2 }];
  const practice = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
  const shortSession = buildDrillSession(scheduled, practice);

  assert.equal(shortSession.length, 5);
  assert.equal(shortSession.filter((card) => card.scheduled).length, 2);
  assert.equal(shortSession.filter((card) => !card.scheduled).length, 3);
  assert.equal(new Set(shortSession.map((card) => card.id)).size, 5);

  const longSession = buildDrillSession(practice, []);
  assert.equal(longSession.length, 10);
  assert.ok(longSession.every((card) => card.scheduled));
});
