# HANDOFF.md

Current state of the Lumi Study App, for the next coding agent. Read this
alongside `AGENTS.md` (conventions & how-to-run) and
`language-study-app-spec.md` (source of truth).

## What's complete

### Phase 1 — MVP (done)
- **SM-2 spaced-repetition engine** (`server/src/modules/study/sm2.js`) —
  pure functions, no DB coupling.
- **Card CRUD** (`cards.repo.js`, `routes.js`) — create/read/update/delete,
  language (`en`/`kr`), type, front/back/context/tags.
- **Today dashboard** (`Dashboard.jsx` + `GET /dashboard`) — per-language
  due/new counts, 7-day activity strip, streak pill, slip-detection banners.
- **Review flow** (`Review.jsx`) — full-screen card, reveal animation, grade
  bar with real SM-2 interval previews, TTS, keyboard shortcuts (Space/Enter
  to reveal, 1–4 to grade).
- **Summary** (`Summary.jsx`) — reviewed / recalled% / to-repeat with
  per-grade bars.
- **Manual card creation** (`AddCard.jsx`), **card library** (`Cards.jsx`),
  **streak tracking** (`streak.js`), **settings** (daily new-card limits,
  dark mode).

### Phase 2 — AI quick-add, English module (done)
- **Shared AI client** (`server/src/shared/ai.js`) — three modes via
  `AI_MODE` env var: `mock` (default), `api_key` (Anthropic API), `agent_sdk`
  (Claude Agent SDK / user subscription). Mock returns realistic fake data
  with simulated latency; no credentials required.
- **Quick-add UI** (Dashboard) — single input + Add button, one tap from the
  dashboard. Creates the card immediately in `pending` state; AI fills it in
  the background without blocking.
- **Background fill** (`fillCard()` in `routes.js`) — checks the AI cache,
  calls `runTask("autofill", { word })`, writes back the English definition,
  IPA, Traditional-Chinese translation (into `back`), and two example
  sentences — one general, one civil-engineering (into `context`) — plus
  tags; sets status to `ready`. On error, status becomes `failed`.
- **Pending / failed UX** (`Cards.jsx`) — spinner while `pending`, "AI
  failed" badge + **Retry** button while `failed`, light 2s polling while any
  card is pending. `POST /cards/:id/retry` re-runs the fill.
- **Response caching** (`study_ai_cache` via `ai.repo.js`) — keyed by SHA-256
  of `{ task, input }`, so re-adding the same word never re-calls the API.

## Key implementation decisions

- **SM-2 specifics** (`sm2.js`): ease starts at 2.5, floors at 1.3. Ease
  deltas: again −0.20, hard −0.15, good 0, easy +0.15. Grade→quality: again
  0, hard 3, good 4, easy 5. Quality < 3 fails the card → `reps` reset to 0,
  `interval` 0 (drops into the learning/relearning queue, due today). On
  pass: reps 1 → 1 day, reps 2 → 6 days, then `round(interval × ease)`, with
  easy ×1.3 and hard clamped to `max(interval+1, round(interval×1.2))`. Dates
  are ISO `YYYY-MM-DD` computed in UTC.
- **Card status** (`pending` / `ready` / `failed`): added as a guarded
  `ALTER TABLE` in `migrate.js` defaulting to `ready` (so all Phase 1 cards
  stay reviewable). Queue builder and counts (`queue.js`) filter to
  `status IS NULL OR status='ready'`, so pending/failed cards never enter
  review until the AI fill succeeds.
- **AI cache table** (`study_ai_cache`): `(task, input_hash UNIQUE per task,
  response_json, created_at)`. `INSERT OR REPLACE` on the
  `(task, input_hash)` unique index. Cache is consulted before every AI call.
- **Model map config** (`MODELS` in `ai.js`): per-task model selection. The
  `autofill` task defaults to `claude-haiku-4-5`. Add new tasks here rather
  than hard-coding model ids at call sites.
- **AI mode boundary**: `api_key` mode uses `fetch` against the Messages API
  with a json_schema `output_config`; `agent_sdk` mode dynamically imports
  `@anthropic-ai/sdk` so the server still boots when the SDK isn't installed.
- **better-sqlite3 is synchronous** — repos return rows directly; the only
  async surface is the AI fill, which is fired-and-not-awaited from the
  quick-add route so the HTTP response returns immediately.

## What remains

### Rest of Phase 2
- **Korean Hangul drills** — character/syllable recognition module
  (`modules/study/` sibling or a new module). Reuse the AI client via a new
  task in the `MODELS` map.
- **Korean core deck** — seeded/curated starter vocabulary for `kr`, plus an
  AI quick-add path for Korean (the current quick-add is hard-coded to
  `language: "en"` in `routes.js` — generalize it).

### Phase 3 & Phase 4
- Per `language-study-app-spec.md` (not yet started). Confirm scope against
  the spec before building.

### Production / ops
- **`npm start` production setup** — `server/package.json` has a `start`
  script but there's no production serving of the built client. Decide
  whether Express serves `client/dist` or the client is deployed separately,
  and wire a single production entry. Add a root `start` script.
- **Tests** — no automated suite exists yet. Add unit tests for `sm2.js`
  (deterministic, pure — good first target) and the queue builder.

## Known issues / TODOs

- **Quick-add is English-only**: `POST /cards/quick-add` and `fillCard()`
  assume English. Generalize for Korean before shipping the Korean module.
- **Polling, not push**: `Cards.jsx` polls every 2s while cards are pending.
  Fine for personal use; consider SSE/websocket if card volume grows.
- **No retry/back-off in AI client**: `api_key` / `agent_sdk` failures go
  straight to `status='failed'`. Manual Retry button exists; no automatic
  retry or rate-limit handling.
- **`mock` is the default `AI_MODE`** — set `AI_MODE=api_key` (and
  `ANTHROPIC_API_KEY`) or `AI_MODE=agent_sdk` to exercise real AI. See
  `server/.env.example`.
- **Spec file not committed**: `language-study-app-spec.md` is referenced as
  the source of truth but lives outside the repo (it was provided as an
  upload). Add it to the repo root so future agents have it inline.
- **npm registry access**: in some sandboxed environments the npm registry
  is blocked; installs must happen in an environment with network access
  (the Claude Code session-start hook handles this for web sessions).
