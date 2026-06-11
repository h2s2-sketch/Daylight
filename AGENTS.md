# AGENTS.md

Project instructions for any coding agent working on this repository.

## What this app is

**Lumi Study App** is a personal spaced-repetition study app for learning
English and Korean. It schedules vocabulary/phrase cards using the SM-2
algorithm, presents a daily "Today" dashboard with per-language queues and
streak tracking, and supports an AI-powered quick-add flow that fills in a
card's definition, translation, IPA, part of speech, CEFR level, tags, and
example sentences in the background. It is mobile-first (single column,
≤640px) and matches the visual style of the Lumi design reference exactly.

## Tech stack

- **Frontend**: React 18 + Vite, mobile-first single-column. Inline styles
  driven by CSS custom properties (design tokens).
- **Backend**: Node.js + Express (ESM, `"type": "module"`), `/api/study/*`
  router.
- **Database**: SQLite via `better-sqlite3`, WAL mode, foreign keys ON.
  Namespaced tables (`study_*`). DB lives at `server/data/app.db`.
- **AI**: Anthropic API / Claude Agent SDK, accessed only through
  `server/src/shared/ai.js`. Default mode is `mock` (no credentials needed).

## Repo structure

```
package.json              — npm workspaces root (server, client)
README.md                 — quick start + Phase 1 feature list
AGENTS.md                 — this file
HANDOFF.md                — current state, decisions, what remains

server/
  .env.example            — PORT, CLIENT_ORIGIN, AI_MODE, ANTHROPIC_API_KEY
  src/
    index.js              — Express app entry
    db/
      connection.js       — SQLite connection, WAL, runs migrations
      migrate.js          — schema (idempotent / guarded migrations)
    services/
      settings.js         — shared key/value settings store (reusable)
    shared/
      ai.js               — AI client: mock | api_key | agent_sdk modes
    modules/study/
      sm2.js              — pure SM-2 functions
      cards.repo.js       — card CRUD
      ai.repo.js          — AI response cache get/put
      queue.js            — daily queue builder + counts
      streak.js           — streak, slip status, week activity
      routes.js           — /api/study/* Express router

client/
  src/
    styles/tokens.css     — design tokens (light + dark) + base styles
    shared/               — api.js (fetch client), tts.js, icons.jsx
    shell/NavBar.jsx      — Study / Settings tabs (extensible)
    modules/study/
      Dashboard.jsx       — Today screen + AI quick-add
      Review.jsx          — full-screen review with SM-2 grade bar
      Summary.jsx         — post-session stats
      AddCard.jsx         — manual card form
      Cards.jsx           — card library (edit/delete, pending spinner, retry)
      SettingsPage.jsx    — daily limits, dark mode
```

## How to run

This is an npm workspaces monorepo. Install dependencies first:

```bash
npm install --prefix server
npm install --prefix client
```

Run dev (two terminals):

```bash
# Terminal 1 — API on :3001
npm run dev:server      # or: npm run dev --workspace=server

# Terminal 2 — Vite on :5173, proxies /api → :3001
npm run dev:client      # or: npm run dev --workspace=client
```

Open `http://localhost:5173`.

Production build of the client:

```bash
npm run build           # builds client (Vite) → client/dist
```

> **Note on Claude Code:** `.claude/hooks/session-start.sh` is
> Claude-Code-on-the-web specific — it runs the two `npm install` commands
> automatically when a fresh web session starts. **Other coding agents
> should ignore that hook and just run the `npm install` commands above
> themselves.**

## Tests

There is no automated test suite yet. Verify changes by running the app
(see above) and exercising the flow manually:
- Quick-add an English word on the dashboard → card appears in the library
  with a spinner → fills within ~1s in mock mode.
- Start Review → grade cards → check SM-2 intervals on the grade bar.

When adding tests, prefer colocating them per module under
`server/src/modules/study/` and wire a `test` script into
`server/package.json`.

## Key conventions

- **Feature modules**: study logic lives under `modules/study/`. New
  domains (e.g. Korean Hangul drills, future learning modes) get their own
  module folder following the same `*.repo.js` / `queue.js` / `routes.js`
  shape. Keep cross-cutting helpers in `services/` or `shared/`.
- **Namespaced tables**: every table this app owns is prefixed `study_*`
  (e.g. `study_cards`, `study_reviews`, `study_ai_cache`). Shared
  infrastructure tables (e.g. `settings`) are unprefixed. Migrations in
  `db/migrate.js` must be idempotent — guard `ALTER TABLE` with a
  `PRAGMA table_info` check, use `CREATE TABLE IF NOT EXISTS`.
- **All AI calls go through `shared/ai.js`**: never call the Anthropic API
  or Agent SDK directly from a route or component. Add new AI tasks to the
  `MODELS` map and the `runTask(taskName, input)` switch, and route every
  call through it. This keeps mode selection (`mock` / `api_key` /
  `agent_sdk`) and model config in one place. Cache responses via
  `ai.repo.js`.
- **Match the design reference**: use the existing tokens in
  `client/src/styles/tokens.css` (oklch accent colors `--en` / `--kr`,
  warm-neutral palette, Figtree + Noto Sans KR/TC fonts, radii like
  `--r-md`). Don't introduce new hard-coded colors or spacing — extend the
  token set if needed and keep both light and dark variants in sync.
- **Mobile-first**: single column, max width `--maxw` (640px). Respect
  safe-area insets and `prefers-reduced-motion`.

## Source of truth

`language-study-app-spec.md` is the authoritative product/engineering spec
(sections: 3.1 SRS, 3.2 dashboard, 3.5 stats, 4 tech stack & caching, 8
future expansion). When the spec and code disagree, follow the spec and
flag the discrepancy. See `HANDOFF.md` for what's built versus what
remains.
