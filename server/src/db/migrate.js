import { HANGUL_FOUNDATION, KOREAN_CORE_DECK } from "../modules/hangul/data.js";

function addColumn(db, table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
  if (!columns.includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

function seedKoreanCourse(db) {
  const today = new Date().toISOString().slice(0, 10);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO study_cards
      (language, type, front, back, context, tags, ease, interval, reps, due_date,
       status, source_key, course, course_stage)
    VALUES ('kr', ?, ?, ?, ?, ?, 2.5, 0, 0, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    HANGUL_FOUNDATION.forEach(([kind, front, sound, context], index) => {
      insert.run(
        "recognition",
        front,
        sound,
        context,
        JSON.stringify(["hangul", "foundation", kind]),
        today,
        "ready",
        `hangul-foundation-${String(index + 1).padStart(3, "0")}`,
        "hangul_foundation",
        kind === "syllable" ? 2 : 1
      );
    });

    KOREAN_CORE_DECK.forEach((entry) => {
      insert.run(
        entry.type,
        entry.front,
        entry.back,
        `Korean core deck - stage ${entry.stage}`,
        JSON.stringify(["korean-core", `stage-${entry.stage}`, entry.type]),
        today,
        "locked",
        entry.key,
        "korean_core",
        entry.stage
      );
    });
  })();
}

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_cards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      language    TEXT    NOT NULL CHECK(language IN ('en','kr')),
      type        TEXT    NOT NULL DEFAULT 'vocabulary',
      front       TEXT    NOT NULL,
      back        TEXT    NOT NULL,
      context     TEXT,
      tags        TEXT    NOT NULL DEFAULT '[]',
      ease        REAL    NOT NULL DEFAULT 2.5,
      interval    INTEGER NOT NULL DEFAULT 0,
      reps        INTEGER NOT NULL DEFAULT 0,
      due_date    TEXT    NOT NULL,
      source_id   INTEGER,
      status      TEXT    NOT NULL DEFAULT 'ready',
      source_key  TEXT,
      course      TEXT,
      course_stage INTEGER,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id     INTEGER NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,
      grade       TEXT    NOT NULL CHECK(grade IN ('again','hard','good','easy')),
      ease_before REAL    NOT NULL,
      ease_after  REAL    NOT NULL,
      interval_before INTEGER NOT NULL,
      interval_after  INTEGER NOT NULL,
      reviewed_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_ai_cache (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task          TEXT NOT NULL,
      input_hash    TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Guarded upgrades for databases created before Phase 2.
  addColumn(db, "study_cards", "status", "TEXT NOT NULL DEFAULT 'ready'");
  addColumn(db, "study_cards", "source_key", "TEXT");
  addColumn(db, "study_cards", "course", "TEXT");
  addColumn(db, "study_cards", "course_stage", "INTEGER");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_study_cards_due ON study_cards(due_date);
    CREATE INDEX IF NOT EXISTS idx_study_cards_lang ON study_cards(language);
    CREATE INDEX IF NOT EXISTS idx_study_cards_course ON study_cards(course, course_stage);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_study_cards_source_key
      ON study_cards(source_key) WHERE source_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_study_reviews_card ON study_reviews(card_id);
    CREATE INDEX IF NOT EXISTS idx_study_reviews_date ON study_reviews(reviewed_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_cache_task_hash
      ON study_ai_cache(task, input_hash);

    INSERT OR IGNORE INTO settings VALUES ('study_new_en_daily', '10');
    INSERT OR IGNORE INTO settings VALUES ('study_new_kr_daily', '5');
    INSERT OR IGNORE INTO settings VALUES ('study_notify_time', '20:00');
  `);

  seedKoreanCourse(db);
}
