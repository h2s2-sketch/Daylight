import { Router } from "express";
import { buildQueue } from "../study/queue.js";
import { getDb } from "../../db/connection.js";
import { getHangulProgress, hangulRules, syncCoreUnlocks } from "./progress.js";

const router = Router();
const MIN_SESSION_SIZE = 5;
const MAX_SESSION_SIZE = 10;

function choicesFor(card) {
  const db = getDb();
  const tag = card.course_stage === 1
    ? (card.tags.includes("consonant") ? "consonant" : "vowel")
    : "syllable";
  const pool = db.prepare(`
    SELECT back FROM study_cards
    WHERE course = 'hangul_foundation' AND tags LIKE ? AND id != ?
    ORDER BY ((id * 37 + ?) % 101)
    LIMIT 3
  `).all(`%${tag}%`, card.id, card.id).map((row) => row.back);
  const options = [...new Set([card.back, ...pool])];
  return options.sort((a, b) => ((a.charCodeAt(0) + card.id) % 7) - ((b.charCodeAt(0) + card.id) % 7));
}

function pronunciationHint(card) {
  if (card.course_stage === 2) {
    return `Say it as one smooth syllable: ${card.back}. Listen once, then repeat.`;
  }
  if (card.tags.includes("vowel")) {
    return `This vowel sounds like "${card.back}". Keep the sound short and steady.`;
  }
  const special = {
    "g/k": "A light sound between English g and k.",
    "d/t": "A light sound between English d and t.",
    "r/l": "A quick tongue tap between English r and l.",
    "b/p": "A light sound between English b and p.",
    "silent/ng": "Silent at the start of a syllable; ng at the end.",
  };
  return special[card.back] || `This consonant is closest to "${card.back}".`;
}

export function buildDrillSession(scheduled, practicePool) {
  const cards = scheduled.slice(0, MAX_SESSION_SIZE).map((card) => ({ ...card, scheduled: true }));
  if (cards.length < MIN_SESSION_SIZE) {
    const used = new Set(cards.map((card) => card.id));
    for (const card of practicePool) {
      if (cards.length >= MIN_SESSION_SIZE) break;
      if (!used.has(card.id)) {
        cards.push({ ...card, scheduled: false });
        used.add(card.id);
      }
    }
  }
  return cards;
}

function serializeDrillCard(card) {
  const tags = Array.isArray(card.tags) ? card.tags : JSON.parse(card.tags || "[]");
  return {
    ...card,
    tags,
    choices: choicesFor({ ...card, tags: JSON.stringify(tags) }),
    pronunciationHint: pronunciationHint({ ...card, tags }),
  };
}

router.get("/progress", (_req, res) => {
  res.json({ ...syncCoreUnlocks(), rules: hangulRules });
});

router.get("/queue", (_req, res) => {
  const db = getDb();
  const scheduled = buildQueue("kr").filter((card) => card.course === "hangul_foundation");
  const practicePool = db.prepare(`
    SELECT * FROM study_cards
    WHERE course = 'hangul_foundation' AND status = 'ready'
    ORDER BY reps ASC, interval ASC, due_date ASC, id ASC
  `).all();
  const cards = buildDrillSession(scheduled, practicePool).map(serializeDrillCard);
  res.json({
    cards,
    session: {
      total: cards.length,
      scheduled: cards.filter((card) => card.scheduled).length,
      practice: cards.filter((card) => !card.scheduled).length,
    },
    progress: getHangulProgress(),
  });
});

router.post("/cards/:id/answer", (req, res) => {
  const card = getDb().prepare(
    "SELECT * FROM study_cards WHERE id = ? AND course = 'hangul_foundation'"
  ).get(Number(req.params.id));
  if (!card) return res.status(404).json({ error: "Hangul card not found" });

  const { correct, scheduled = true } = req.body;
  if (typeof correct !== "boolean") {
    return res.status(400).json({ error: "correct must be boolean" });
  }
  if (!scheduled) {
    return res.json({ recorded: false, practice: true, progress: getHangulProgress() });
  }

  // Scheduled answers continue through the shared SRS review endpoint on the client.
  res.json({ recorded: false, practice: false, progress: getHangulProgress() });
});

router.get("/overview", (_req, res) => {
  const progress = getHangulProgress();
  const stages = getDb().prepare(`
    SELECT course_stage AS stage,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS unlocked,
      SUM(CASE WHEN reps > 0 THEN 1 ELSE 0 END) AS learned
    FROM study_cards
    WHERE course = 'korean_core'
    GROUP BY course_stage
    ORDER BY course_stage
  `).all();
  res.json({ ...progress, stages });
});

export default router;
