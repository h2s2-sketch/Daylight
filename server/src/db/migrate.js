import { HANGUL_FOUNDATION, KOREAN_CORE_DECK } from "../modules/hangul/data.js";

function addColumn(db, table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
  if (!columns.includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

function tableColumns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
}

function migrateTaskSystemV2(db) {
  const projectColumns = tableColumns(db, "task_projects");
  const taskColumns = tableColumns(db, "task_items");
  const projectSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'task_projects'").get()?.sql || "";
  const taskSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'task_items'").get()?.sql || "";
  const needsMigration =
    !projectColumns.has("area") || !projectColumns.has("goal") || projectSql.includes("archived") ||
    !taskColumns.has("area") || !taskColumns.has("due_time") || taskSql.includes("todo");

  if (!needsMigration) return;

  const foreignKeysEnabled = db.pragma("foreign_keys", { simple: true });
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(`
        DROP TABLE IF EXISTS task_items_v2;
        DROP TABLE IF EXISTS task_projects_v2;

        CREATE TABLE task_projects_v2 (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          title       TEXT NOT NULL,
          description TEXT,
          area        TEXT DEFAULT NULL CHECK(area IN ('work','life') OR area IS NULL),
          status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','done')),
          goal        TEXT,
          color       TEXT NOT NULL DEFAULT '#4F46E5',
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE task_items_v2 (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          title        TEXT NOT NULL,
          project_id   INTEGER REFERENCES task_projects_v2(id) ON DELETE SET NULL,
          area         TEXT DEFAULT NULL CHECK(area IN ('work','life') OR area IS NULL),
          status       TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox','next','waiting','done')),
          priority     TEXT NOT NULL DEFAULT 'low' CHECK(priority IN ('low','medium','high')),
          due_date     TEXT,
          due_time     TEXT,
          notes        TEXT,
          tags         TEXT NOT NULL DEFAULT '[]',
          recurrence   TEXT,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        );
      `);

      const projectArea = projectColumns.has("area") ? "CASE WHEN area IN ('work','life') THEN area ELSE NULL END" : "NULL";
      const projectGoal = projectColumns.has("goal") ? "goal" : "NULL";
      db.exec(`
        INSERT INTO task_projects_v2
          (id, title, description, area, status, goal, color, created_at, updated_at)
        SELECT id, title, description, ${projectArea},
          CASE status WHEN 'archived' THEN 'paused' WHEN 'done' THEN 'done' ELSE 'active' END,
          ${projectGoal}, color, created_at, updated_at
        FROM task_projects;
      `);

      const taskArea = taskColumns.has("area") ? "CASE WHEN area IN ('work','life') THEN area ELSE NULL END" : "NULL";
      const taskTime = taskColumns.has("due_time") ? "due_time" : "NULL";
      db.exec(`
        INSERT INTO task_items_v2
          (id, title, project_id, area, status, priority, due_date, due_time, notes, tags,
           recurrence, created_at, updated_at, completed_at)
        SELECT id, title, project_id, ${taskArea},
          CASE status WHEN 'done' THEN 'done' WHEN 'doing' THEN 'next'
            WHEN 'waiting' THEN 'waiting' WHEN 'next' THEN 'next' ELSE 'inbox' END,
          priority, due_date, ${taskTime}, notes, tags, recurrence, created_at, updated_at, completed_at
        FROM task_items;

        DROP TABLE task_items;
        DROP TABLE task_projects;
        ALTER TABLE task_projects_v2 RENAME TO task_projects;
        ALTER TABLE task_items_v2 RENAME TO task_items;
      `);
    })();
  } finally {
    db.pragma(`foreign_keys = ${foreignKeysEnabled ? "ON" : "OFF"}`);
  }

  const violations = db.pragma("foreign_key_check");
  if (violations.length) throw new Error("Task system migration failed foreign key validation");
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

    CREATE TABLE IF NOT EXISTS task_projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT,
      area        TEXT DEFAULT NULL CHECK(area IN ('work','life') OR area IS NULL),
      status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','done')),
      goal        TEXT,
      color       TEXT NOT NULL DEFAULT '#4F46E5',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      project_id  INTEGER REFERENCES task_projects(id) ON DELETE SET NULL,
      area        TEXT DEFAULT NULL CHECK(area IN ('work','life') OR area IS NULL),
      status      TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox','next','waiting','done')),
      priority    TEXT NOT NULL DEFAULT 'low' CHECK(priority IN ('low','medium','high')),
      due_date    TEXT,
      due_time    TEXT,
      notes       TEXT,
      tags        TEXT NOT NULL DEFAULT '[]',
      recurrence  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);

  // Guarded upgrades for databases created before Phase 2.
  addColumn(db, "study_cards", "status", "TEXT NOT NULL DEFAULT 'ready'");
  addColumn(db, "study_cards", "source_key", "TEXT");
  addColumn(db, "study_cards", "course", "TEXT");
  addColumn(db, "study_cards", "course_stage", "INTEGER");

  migrateTaskSystemV2(db);

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
    CREATE INDEX IF NOT EXISTS idx_task_items_due ON task_items(due_date, status);
    CREATE INDEX IF NOT EXISTS idx_task_items_project ON task_items(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_task_projects_status ON task_projects(status);

    INSERT OR IGNORE INTO settings VALUES ('study_new_en_daily', '10');
    INSERT OR IGNORE INTO settings VALUES ('study_new_kr_daily', '5');
    INSERT OR IGNORE INTO settings VALUES ('study_notify_time', '20:00');
    INSERT OR IGNORE INTO settings VALUES ('sidebar_photo_url', '');
    INSERT OR IGNORE INTO settings VALUES ('sidebar_style', 'personal_photo');
  `);

  seedKoreanCourse(db);

  // Daylight v0.3 Execution Loop tables. Additive only; never alters existing tables.
  db.exec(`
    CREATE TABLE IF NOT EXISTS loop_goals (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      category   TEXT NOT NULL CHECK(category IN
                   ('eng_planning','ai_daylight','work_english',
                    'fitness','korean','finance','portfolio')),
      title      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'active'
                   CHECK(status IN ('active','paused','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loop_focus_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      goal_id    INTEGER REFERENCES loop_goals(id) ON DELETE SET NULL,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open'
                   CHECK(status IN ('open','done','partial','missed','carried')),
      sort_order INTEGER NOT NULL CHECK(sort_order BETWEEN 1 AND 3),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loop_checkins (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      date                  TEXT NOT NULL UNIQUE,
      progressed_focus_ids  TEXT NOT NULL DEFAULT '[]',
      energy                INTEGER CHECK(energy IS NULL OR (energy BETWEEN 1 AND 5)),
      note                  TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loop_reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      wins       TEXT,
      slipped    TEXT,
      learning   TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_loop_goals_category ON loop_goals(category);
    CREATE INDEX IF NOT EXISTS idx_loop_goals_status   ON loop_goals(status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_loop_goals_one_active_per_category
      ON loop_goals(category) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_loop_focus_items_week ON loop_focus_items(week_start);
    CREATE INDEX IF NOT EXISTS idx_loop_focus_items_goal ON loop_focus_items(goal_id);
  `);
}
