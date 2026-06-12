import { getDb } from "../../db/connection.js";

const FOUNDATION_MASTERY_RATIO = 0.8;
const CORE_STAGE_SIZE = 30;
const CORE_UNLOCK_STEP = 24;

export function getHangulProgress() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const foundation = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM study_reviews r WHERE r.card_id = study_cards.id
      ) THEN 1 ELSE 0 END) AS introduced,
      SUM(CASE WHEN reps >= 2 THEN 1 ELSE 0 END) AS mastered
    FROM study_cards
    WHERE course = 'hangul_foundation'
  `).get();

  const total = foundation.total || 0;
  const introduced = foundation.introduced || 0;
  const mastered = foundation.mastered || 0;
  const masteryTarget = Math.ceil(total * FOUNDATION_MASTERY_RATIO);
  const complete = total > 0 && introduced === total && mastered >= masteryTarget;

  const core = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS unlocked,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM study_reviews r WHERE r.card_id = study_cards.id
      ) THEN 1 ELSE 0 END) AS introduced,
      SUM(CASE WHEN reps > 0 THEN 1 ELSE 0 END) AS learned
    FROM study_cards
    WHERE course = 'korean_core'
  `).get();

  const todayActivity = db.prepare(`
    SELECT COUNT(*) AS attempts, COUNT(DISTINCT r.card_id) AS cards
    FROM study_reviews r
    JOIN study_cards c ON c.id = r.card_id
    WHERE c.course = 'hangul_foundation'
      AND date(r.reviewed_at) = ?
  `).get(today);

  return {
    foundation: {
      total,
      introduced,
      mastered,
      masteryTarget,
      complete,
      percent: total ? Math.min(100, Math.round(((introduced + mastered) / (total + masteryTarget)) * 100)) : 0,
      todayAttempts: todayActivity.attempts || 0,
      todayCards: todayActivity.cards || 0,
    },
    core: {
      total: core.total || 0,
      unlocked: core.unlocked || 0,
      introduced: core.introduced || 0,
      learned: core.learned || 0,
      locked: !complete,
    },
  };
}

export function syncCoreUnlocks() {
  const db = getDb();
  const progress = getHangulProgress();
  if (!progress.foundation.complete) return progress;

  const highestStage = Math.min(
    10,
    1 + Math.floor(progress.core.introduced / CORE_UNLOCK_STEP)
  );
  db.prepare(`
    UPDATE study_cards
    SET status = 'ready'
    WHERE course = 'korean_core'
      AND course_stage <= ?
      AND status = 'locked'
  `).run(highestStage);

  return getHangulProgress();
}

export const hangulRules = {
  foundationMasteryRatio: FOUNDATION_MASTERY_RATIO,
  coreStageSize: CORE_STAGE_SIZE,
  coreUnlockStep: CORE_UNLOCK_STEP,
};
