import { Router } from "express";
import { createCard, deleteCard, getCard, listCards, updateCard } from "./cards.repo.js";
import { applyReview, previewIntervals } from "./sm2.js";
import { buildQueue, getQueueCounts } from "./queue.js";
import { getStreak, getSlipStatus, getWeekActivity } from "./streak.js";
import { getDb } from "../../db/connection.js";
import { getAllSettings, setSetting } from "../../services/settings.js";
import { runTask } from "../../shared/ai.js";
import { getCached, putCache } from "./ai.repo.js";

const router = Router();

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get("/dashboard", (req, res) => {
  res.json({
    queue: getQueueCounts(),
    streak: getStreak(),
    slip: getSlipStatus(),
    week: getWeekActivity(),
  });
});

// ─── Queue ───────────────────────────────────────────────────────────────────

router.get("/queue", (req, res) => {
  const { language } = req.query;
  const cards = buildQueue(language || null);
  res.json(cards.map(serializeCard));
});

// ─── Cards CRUD ───────────────────────────────────────────────────────────────

router.get("/cards", (req, res) => {
  const { language, page, pageSize } = req.query;
  const cards = listCards({ language, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  res.json(cards.map(serializeCard));
});

router.get("/cards/:id", (req, res) => {
  const card = getCard(Number(req.params.id));
  if (!card) return res.status(404).json({ error: "Not found" });
  res.json(serializeCard(card));
});

router.post("/cards", (req, res) => {
  const { language, type, front, back, context, tags } = req.body;
  if (!language || !front || !back) {
    return res.status(400).json({ error: "language, front, back required" });
  }
  const card = createCard({ language, type, front, back, context, tags });
  res.status(201).json(serializeCard(card));
});

// ─── AI Quick-Add ─────────────────────────────────────────────────────────────

router.post("/cards/quick-add", (req, res) => {
  const { word } = req.body;
  if (!word || !word.trim()) {
    return res.status(400).json({ error: "word required" });
  }
  const card = createCard({
    language: "en",
    type: "vocabulary",
    front: word.trim(),
    back: "…",
    context: null,
    tags: [],
    status: "pending",
  });
  // Fill in background — intentionally not awaited
  fillCard(card.id, word.trim()).catch(() => {});
  res.status(201).json(serializeCard(card));
});

router.post("/cards/:id/retry", async (req, res) => {
  const id = Number(req.params.id);
  const card = getCard(id);
  if (!card) return res.status(404).json({ error: "Not found" });
  if (card.status !== "failed") {
    return res.status(400).json({ error: "Card is not in failed state" });
  }
  getDb().prepare("UPDATE study_cards SET status='pending' WHERE id=?").run(id);
  fillCard(id, card.front).catch(() => {});
  res.json(serializeCard(getCard(id)));
});

async function fillCard(id, word) {
  const db = getDb();
  const input = { word };
  try {
    let result = getCached("autofill", input);
    if (!result) {
      result = await runTask("autofill", input);
      putCache("autofill", input, result);
    }
    db.prepare(
      `UPDATE study_cards
       SET back=?, context=?, tags=?, status='ready'
       WHERE id=?`
    ).run(
      [result.definition, result.ipa ? `/${result.ipa.replace(/^\/|\/$/g, "")}/` : null, result.translation_zh_tw]
        .filter(Boolean).join(" · "),
      result.example_general
        ? `${result.example_general}\n${result.example_civil_eng || ""}`.trim()
        : null,
      JSON.stringify(result.tags || []),
      id
    );
  } catch (err) {
    console.error(`[ai] fillCard(${id}) failed:`, err.message);
    db.prepare("UPDATE study_cards SET status='failed' WHERE id=?").run(id);
  }
}

router.patch("/cards/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!getCard(id)) return res.status(404).json({ error: "Not found" });
  const card = updateCard(id, req.body);
  res.json(serializeCard(card));
});

router.delete("/cards/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!getCard(id)) return res.status(404).json({ error: "Not found" });
  deleteCard(id);
  res.status(204).end();
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

router.post("/cards/:id/review", (req, res) => {
  const id = Number(req.params.id);
  const card = getCard(id);
  if (!card) return res.status(404).json({ error: "Not found" });

  const { grade } = req.body;
  if (!["again", "hard", "good", "easy"].includes(grade)) {
    return res.status(400).json({ error: "grade must be again|hard|good|easy" });
  }

  const { ease: easeAfter, interval: intervalAfter, reps, due_date } = applyReview(card, grade);
  const db = getDb();

  db.transaction(() => {
    db.prepare(
      "UPDATE study_cards SET ease=?, interval=?, reps=?, due_date=? WHERE id=?"
    ).run(easeAfter, intervalAfter, reps, due_date, id);
    db.prepare(
      `INSERT INTO study_reviews (card_id, grade, ease_before, ease_after, interval_before, interval_after)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, grade, card.ease, easeAfter, card.interval, intervalAfter);
  })();

  res.json(serializeCard(getCard(id)));
});

// ─── Interval preview (for grade-bar hints) ──────────────────────────────────

router.get("/cards/:id/intervals", (req, res) => {
  const card = getCard(Number(req.params.id));
  if (!card) return res.status(404).json({ error: "Not found" });
  res.json(previewIntervals(card));
});

// ─── Settings ────────────────────────────────────────────────────────────────

router.get("/settings", (req, res) => {
  res.json(getAllSettings());
});

router.patch("/settings", (req, res) => {
  const allowed = ["study_new_en_daily", "study_new_kr_daily", "study_notify_time"];
  for (const [key, value] of Object.entries(req.body)) {
    if (allowed.includes(key)) setSetting(key, value);
  }
  res.json(getAllSettings());
});

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get("/stats", (req, res) => {
  const db = getDb();
  const stats = {};
  for (const lang of ["en", "kr"]) {
    const total   = db.prepare("SELECT COUNT(*) AS n FROM study_cards WHERE language=?").get(lang).n;
    const mature  = db.prepare("SELECT COUNT(*) AS n FROM study_cards WHERE language=? AND interval > 21").get(lang).n;
    const learned = db.prepare(
      "SELECT COUNT(*) AS n FROM study_cards WHERE language=? AND reps > 0"
    ).get(lang).n;
    stats[lang] = { total, learned, mature };
  }
  res.json(stats);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeCard(c) {
  return { ...c, tags: JSON.parse(c.tags || "[]") };
}

export default router;
