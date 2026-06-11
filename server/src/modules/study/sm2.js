const EASE_MIN = 1.3;
const EASE_START = 2.5;

const GRADE_QUALITY = { again: 0, hard: 3, good: 4, easy: 5 };
const EASE_DELTA    = { again: -0.20, hard: -0.15, good: 0, easy: 0.15 };

/**
 * Apply one SM-2 review cycle.
 * Returns updated { ease, interval, reps, due_date }.
 *
 * @param {object} card  - { ease, interval, reps }
 * @param {string} grade - 'again' | 'hard' | 'good' | 'easy'
 */
export function applyReview(card, grade) {
  let { ease, interval, reps } = card;
  const quality = GRADE_QUALITY[grade];

  // Update ease factor (floors at EASE_MIN)
  ease = Math.max(EASE_MIN, ease + EASE_DELTA[grade]);

  let newInterval;
  if (quality < 3) {
    // Fail — reset learning
    reps = 0;
    newInterval = 0; // due again today (learning queue)
  } else {
    reps += 1;
    if (reps === 1) {
      newInterval = 1;
    } else if (reps === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * ease);
      if (grade === "easy") newInterval = Math.round(newInterval * 1.3);
      if (grade === "hard") newInterval = Math.max(interval + 1, Math.round(interval * 1.2));
    }
  }

  const due_date = addDays(todayIso(), newInterval);

  return { ease, interval: newInterval, reps, due_date };
}

/**
 * Initial state for a brand-new card.
 */
export function newCardDefaults() {
  return {
    ease: EASE_START,
    interval: 0,
    reps: 0,
    due_date: todayIso(),
  };
}

/**
 * Predict the interval (days) each grade would produce for a given card.
 * Used by the client to show "8m / 1d / 3d / 7d" hints in the grade bar.
 */
export function previewIntervals(card) {
  return Object.fromEntries(
    ["again", "hard", "good", "easy"].map((g) => [g, applyReview(card, g).interval])
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
