# AGENTS.md

Project instructions for any coding agent working on this repository.

## What this app is

**Lumi Study App** is a personal spaced-repetition study app for learning
English and Korean. It schedules vocabulary/phrase cards using the SM-2
algorithm, presents a daily "Today" dashboard with per-language queues and
streak tracking, supports an AI-powered quick-add flow that fills in a
card's definition, translation, IPA, part of speech, CEFR level, tags, and
example sentences in the background, includes a guided Hangul drill course
for Korean beginners, and is installable as a PWA. It is mobile-first
(single column, ≤640px) and matches the visual style of the Lumi design
reference exactly.

## Tech stack

- **Frontend**: React 18 + Vite, mobile-first single-column. Inline styles
  driven by CSS custom properties (design tokens).
- **Backend**: Node.js + Express (ESM, `"type": "module"`), `/api/study/*`
  and `/api/hangul/*` routers.
- **Database**: SQLite via `better-sqlite3`, WAL mode, foreign keys ON.
  Namespaced tables (`study_*`, `hangul_*`). DB lives at `server/data/app.db`.
- **AI**: Anthropic API / Claude Agent SDK, accessed only through
  `server/src/shared/ai.js`. Default mode is `mock` (no credentials needed).
- **PWA**: Web App Manifest + vanilla service worker (`client/public/sw.js`).
  Service worker caches the app shell; `/api/` routes always bypass the cache.

## Repo structure

```
package.json              — npm workspaces root (server, client)
README.md                 — quick start + feature list
AGENTS.md                 — this file
HANDOFF.md                — current state, decisions, what remains

server/
  .env.example            — PORT, CLIENT_ORIGIN, AI_MODE, ANTHROPIC_API_KEY
  src/
    index.js              — Express app entry; mounts study + hangul routers
    db/
      connection.js       — SQLite connection, WAL, runs migrations
      migrate.js          — schema (idempotent / guarded migrations)
    services/
      settings.js         — shared key/value settings store
    shared/
      ai.js               — AI client: mock | api_key | agent_sdk modes
    modules/
      study/
        sm2.js            — pure SM-2 functions
        cards.repo.js     — card CRUD
        ai.repo.js        — AI response cache get/put
        queue.js          — daily queue builder + counts
        streak.js         — streak, slip status, week activity
        routes.js         — /api/study/* Express router
      hangul/
        data.js           — Hangul character/syllable core deck data
        progress.js       — drill progress tracking helpers
        routes.js         — /api/hangul/* Express router
        hangul.test.js    — unit tests

client/
  public/
    manifest.webmanifest  — PWA manifest
    sw.js                 — service worker (app shell cache)
    icons/                — lumi.svg, lumi-192.png, lumi-512.png
  src/
    styles/tokens.css     — design tokens (light + dark) + base styles
    shared/               — api.js (fetch client), tts.js, icons.jsx
    shell/
      NavBar.jsx          — Study / Settings tabs (extensible)
      AppStatus.jsx       — offline banner + PWA install prompt card
    modules/study/
      Dashboard.jsx       — Today screen, AI quick-add, Hangul progress card
      Review.jsx          — full-screen review with SM-2 grade bar
      Summary.jsx         — post-session stats
      AddCard.jsx         — manual card form
      Cards.jsx           — card library (edit/delete, pending spinner, retry)
      HangulDrill.jsx     — Hangul recognition drill UI
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
npm run dev:server

# Terminal 2 — Vite on :5173, proxies /api → :3001
npm run dev:client
```

Open `http://localhost:5173`.

Run tests:

```bash
npm test --workspace=server
```

> **Note on Claude Code:** `.claude/hooks/session-start.sh` is
> Claude-Code-on-the-web specific — it runs the two `npm install` commands
> automatically when a fresh web session starts. **Other coding agents
> should ignore that hook and just run the `npm install` commands above
> themselves.**

## Key conventions

- **Feature modules**: study logic lives under `modules/study/`, Hangul logic
  under `modules/hangul/`. New domains get their own module folder following
  the same `*.repo.js` / `routes.js` shape. Keep cross-cutting helpers in
  `services/` or `shared/`.

- **Namespaced tables**: every table this app owns is prefixed with its module
  name (`study_*`, `hangul_*`). Shared infrastructure (e.g. `settings`) is
  unprefixed. Migrations in `db/migrate.js` must be idempotent — guard
  `ALTER TABLE` with a `PRAGMA table_info` check, use
  `CREATE TABLE IF NOT EXISTS`.

- **All AI calls go through `shared/ai.js`**: never call the Anthropic API
  or Agent SDK directly from a route or component. Add new AI tasks to the
  `MODELS` map and the `runTask(taskName, input)` switch. This keeps mode
  selection (`mock` / `api_key` / `agent_sdk`) and model config in one place.
  Cache responses via `ai.repo.js`.

- **Match the design reference**: use the existing tokens in
  `client/src/styles/tokens.css` (oklch accent colors `--en` / `--kr`,
  warm-neutral palette, Figtree + Noto Sans KR/TC fonts, radii like
  `--r-md`). Don't introduce new hard-coded colors or spacing — extend the
  token set if needed and keep both light and dark variants in sync.

- **Hangul gating**: Korean vocabulary review and Korean quick-add are gated
  behind `hangul.foundation.complete`. Check this flag (returned by
  `GET /api/study/dashboard` in the `hangul` field) before enabling Korean
  features in the UI. Do not remove this gate without explicit instruction.

- **Mobile-first**: single column, max width `--maxw` (640px). Respect
  safe-area insets (`env(safe-area-inset-top/bottom)`) and
  `prefers-reduced-motion`. PWA `display-mode: standalone` removes the
  desktop padding — the `main.jsx` media query handles this.

- **Service worker cache key**: the SW cache is named `lumi-shell-v1`.
  If you add files to the app shell, update the `APP_SHELL` array in
  `client/public/sw.js` AND bump the cache version string so old caches
  are evicted on next activation.

## Source of truth

`language-study-app-spec.md` is the authoritative product/engineering spec.
When the spec and code disagree, follow the spec and flag the discrepancy.
See `HANDOFF.md` for what's built versus what remains.

> Note: the spec file was provided as an upload and is not yet committed
> to the repo. Add it to the repo root so future agents have it inline.
