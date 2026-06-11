import { getDb } from "../../db/connection.js";
import { newCardDefaults } from "./sm2.js";

// ─── Read ────────────────────────────────────────────────────────────────────

export function getCard(id) {
  return getDb().prepare("SELECT * FROM study_cards WHERE id = ?").get(id);
}

export function listCards({ language, page = 1, pageSize = 50 } = {}) {
  const offset = (page - 1) * pageSize;
  if (language) {
    return getDb()
      .prepare(
        "SELECT * FROM study_cards WHERE language = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(language, pageSize, offset);
  }
  return getDb()
    .prepare("SELECT * FROM study_cards ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(pageSize, offset);
}

export function countCards({ language } = {}) {
  if (language) {
    return getDb()
      .prepare("SELECT COUNT(*) as n FROM study_cards WHERE language = ?")
      .get(language).n;
  }
  return getDb().prepare("SELECT COUNT(*) as n FROM study_cards").get().n;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export function createCard({ language, type = "vocabulary", front, back, context = null, tags = [], status = "ready" }) {
  const defaults = newCardDefaults();
  const result = getDb()
    .prepare(
      `INSERT INTO study_cards
        (language, type, front, back, context, tags, ease, interval, reps, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      language,
      type,
      front.trim(),
      back.trim(),
      context ?? null,
      JSON.stringify(tags),
      defaults.ease,
      defaults.interval,
      defaults.reps,
      defaults.due_date,
      status
    );
  return getCard(result.lastInsertRowid);
}

export function updateCard(id, fields) {
  const allowed = ["front", "back", "context", "tags", "type"];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (k in fields) {
      sets.push(`${k} = ?`);
      vals.push(k === "tags" ? JSON.stringify(fields[k]) : fields[k]);
    }
  }
  if (!sets.length) return getCard(id);
  vals.push(id);
  getDb()
    .prepare(`UPDATE study_cards SET ${sets.join(", ")} WHERE id = ?`)
    .run(...vals);
  return getCard(id);
}

export function deleteCard(id) {
  getDb().prepare("DELETE FROM study_cards WHERE id = ?").run(id);
}

// ─── SRS update ─────────────────────────────────────────────────────────────

export function applySrsUpdate(id, easeBefore, easeAfter, intervalBefore, intervalAfter, grade, newDue) {
  const db = getDb();
  const updateCard = db.prepare(
    "UPDATE study_cards SET ease = ?, interval = ?, reps = reps + ?, due_date = ? WHERE id = ?"
  );
  const insertReview = db.prepare(
    `INSERT INTO study_reviews
       (card_id, grade, ease_before, ease_after, interval_before, interval_after)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const repsIncrement = grade === "again" ? -(db.prepare("SELECT reps FROM study_cards WHERE id=?").get(id).reps) : 1;

  db.transaction(() => {
    const card = getCard(id);
    const { ease, interval, reps } = card;
    // Use passed-in computed values
    db.prepare(
      "UPDATE study_cards SET ease=?, interval=?, reps=?, due_date=? WHERE id=?"
    ).run(easeAfter, intervalAfter, reps + (grade === "again" ? -reps : 1), newDue, id);
    insertReview.run(id, grade, easeBefore, easeAfter, intervalBefore, intervalAfter);
  })();
}
