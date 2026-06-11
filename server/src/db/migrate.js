export function runMigrations(db) {
  // Phase 2 migrations (guarded — safe to run on existing DB)
  const cols = db.prepare("PRAGMA table_info(study_cards)").all().map((c) => c.name);
  if (!cols.includes("status")) {
    db.exec("ALTER TABLE study_cards ADD COLUMN status TEXT NOT NULL DEFAULT 'ready'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS study_ai_cache (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      task         TEXT NOT NULL,
      input_hash   TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_cache_task_hash ON study_ai_cache(task, input_hash);
  `);

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
      -- SM-2 fields
      ease        REAL    NOT NULL DEFAULT 2.5,
      interval    INTEGER NOT NULL DEFAULT 0,
      reps        INTEGER NOT NULL DEFAULT 0,
      due_date    TEXT    NOT NULL,
      -- source linkage for future modules
      source_id   INTEGER,
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

    CREATE INDEX IF NOT EXISTS idx_study_cards_due      ON study_cards(due_date);
    CREATE INDEX IF NOT EXISTS idx_study_cards_lang     ON study_cards(language);
    CREATE INDEX IF NOT EXISTS idx_study_reviews_card   ON study_reviews(card_id);
    CREATE INDEX IF NOT EXISTS idx_study_reviews_date   ON study_reviews(reviewed_at);

    INSERT OR IGNORE INTO settings VALUES ('study_new_en_daily', '10');
    INSERT OR IGNORE INTO settings VALUES ('study_new_kr_daily', '5');
    INSERT OR IGNORE INTO settings VALUES ('study_notify_time', '20:00');
  `);
}
