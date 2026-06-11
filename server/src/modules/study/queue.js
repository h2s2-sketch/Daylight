import { getDb } from "../../db/connection.js";
import { getSetting } from "../../services/settings.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Count new cards already introduced today for a language.
 * "New" = reps was 0 before first review (we track this via study_reviews joined to reps=0 initial state;
 * simpler: count cards that had their FIRST ever review today).
 */
function newCardsReviewedToday(db, language) {
  const today = todayIso();
  return db
    .prepare(
      `SELECT COUNT(DISTINCT r.card_id) AS n
       FROM study_reviews r
       JOIN study_cards c ON c.id = r.card_id
       WHERE c.language = ?
         AND date(r.reviewed_at) = ?
         AND r.id = (
           SELECT MIN(id) FROM study_reviews WHERE card_id = r.card_id
         )
         AND r.interval_before = 0`
    )
    .get(language, today).n;
}

/**
 * Build the daily queue for one or both languages.
 * Returns array of card rows ordered: overdue → due today → new.
 */
export function buildQueue(language = null) {
  const db = getDb();
  const today = todayIso();

  const languages = language ? [language] : ["en", "kr"];
  const queue = [];

  for (const lang of languages) {
    const limitNew = parseInt(getSetting(`study_new_${lang}_daily`, lang === "en" ? "10" : "5"), 10);
    const alreadyNew = newCardsReviewedToday(db, lang);
    const remainingNew = Math.max(0, limitNew - alreadyNew);

    // Overdue and due-today cards (already graduated or in learning)
    const due = db
      .prepare(
        `SELECT * FROM study_cards
         WHERE language = ? AND due_date <= ? AND reps > 0
         ORDER BY due_date ASC, id ASC`
      )
      .all(lang, today);

    // Learning resets (again cards sitting at interval=0, reps=0)
    const relearning = db
      .prepare(
        `SELECT * FROM study_cards
         WHERE language = ? AND interval = 0 AND reps = 0 AND due_date <= ?
           AND id IN (SELECT DISTINCT card_id FROM study_reviews)
         ORDER BY id ASC`
      )
      .all(lang, today);

    // New cards (never reviewed)
    const fresh = db
      .prepare(
        `SELECT * FROM study_cards
         WHERE language = ? AND id NOT IN (SELECT DISTINCT card_id FROM study_reviews)
         ORDER BY id ASC
         LIMIT ?`
      )
      .all(lang, remainingNew);

    queue.push(...due, ...relearning, ...fresh);
  }

  return queue;
}

/**
 * Queue counts for dashboard (per language).
 */
export function getQueueCounts() {
  const db = getDb();
  const today = todayIso();
  const result = {};

  for (const lang of ["en", "kr"]) {
    const limitNew = parseInt(getSetting(`study_new_${lang}_daily`, lang === "en" ? "10" : "5"), 10);
    const alreadyNew = newCardsReviewedToday(db, lang);
    const remainingNew = Math.max(0, limitNew - alreadyNew);

    const due = db
      .prepare(
        `SELECT COUNT(*) AS n FROM study_cards
         WHERE language = ? AND due_date <= ? AND reps > 0`
      )
      .get(lang, today).n;

    const relearning = db
      .prepare(
        `SELECT COUNT(*) AS n FROM study_cards
         WHERE language = ? AND interval = 0 AND reps = 0 AND due_date <= ?
           AND id IN (SELECT DISTINCT card_id FROM study_reviews)`
      )
      .get(lang, today).n;

    const fresh = db
      .prepare(
        `SELECT COUNT(*) AS n FROM study_cards
         WHERE language = ?
           AND id NOT IN (SELECT DISTINCT card_id FROM study_reviews)
         LIMIT ?`
      )
      .get(lang, remainingNew).n;

    const totalCards = db
      .prepare("SELECT COUNT(*) AS n FROM study_cards WHERE language = ?")
      .get(lang).n;

    result[lang] = {
      due: due + relearning,
      fresh: Math.min(fresh, remainingNew),
      total: totalCards,
    };
  }

  return result;
}
