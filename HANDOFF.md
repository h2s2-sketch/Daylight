# HANDOFF.md

Current state of the Lumi Study App. Read alongside `AGENTS.md` (conventions
& how-to-run) and `language-study-app-spec.md` (source of truth).

Last updated: 2026-06-14, reflecting work across three branches:
- `claude/brave-maxwell-66aq36` — Phase 1 MVP + Phase 2 English AI quick-add
- `codex/korean-phase-2` — Phase 2 Korean Hangul drills + core deck
- `codex/pwa-mobile-experience` — PWA shell (current tip, most complete)

## What's complete

### Phase 1 — Core SRS MVP
- **SM-2 engine** (`server/src/modules/study/sm2.js`) — pure functions,
  ease/interval/reps updates, interval previews for the grade bar.
- **Card CRUD** (`cards.repo.js`, `routes.js`) — language (`en`/`kr`), type,
  front/back/context/tags, `status` field.
- **Today dashboard** — per-language due/new counts, 7-day activity strip,
  streak pill, slip-detection banners.
- **Review flow** — full-screen card, reveal animation, SM-2 interval previews,
  TTS, keyboard shortcuts (Space/Enter to reveal, 1–4 to grade).
- **Summary** — reviewed / recalled% / to-repeat with per-grade bars.
- **Manual card creation**, **card library** (edit/delete), **streak tracking**,
  **settings** (daily new-card limits, dark mode).

### Phase 2 — AI Quick-Add (English)
- **Shared AI client** (`server/src/shared/ai.js`) — `AI_MODE=mock` (default),
  `api_key`, `agent_sdk`. Mock returns realistic data with simulated latency.
- **Quick-add UI** (Dashboard) — single input, one tap from the dashboard.
  Card created instantly in `pending` state; AI fills it in the background.
- **Background fill** — checks AI cache → calls `runTask("autofill", { word })`
  → writes definition · IPA · translation to `back`, example sentences to
  `context`, tags; sets `status='ready'`. On error → `status='failed'`.
- **Retry UX** — spinner on pending cards, Retry button on failed cards,
  2s polling in `Cards.jsx` while any card is pending.
- **Response cache** (`study_ai_cache` via `ai.repo.js`) — keyed by SHA-256
  of input; re-adding the same word never re-calls the API.

### Phase 2 — AI Quick-Add (Korean)
- Korean quick-add available in Dashboard, gated behind Hangul foundation
  completion. Uses the same `runTask` / `study_ai_cache` flow as English.

### Phase 2 — Hangul Drills
- **Foundation course** (`modules/hangul/`) — vowels → consonants → syllable
  blocks, tracked per character in dedicated DB tables.
- **Drill UI** (`HangulDrill.jsx`) — tap-to-answer recognition drill.
- **Core Korean deck** — seeded via `hangul/data.js`.
- **Unlock gate** — `hangul.foundation.complete` flag in dashboard response;
  Korean vocabulary review and Korean quick-add are disabled until this is true.
- **Unit tests** (`hangul/hangul.test.js`) — first automated test file in the
  project.

### PWA
- Web App Manifest (`client/public/manifest.webmanifest`) — standalone
  portrait, `#FAFAF8` theme/background.
- Service worker (`client/public/sw.js`) — app shell cached as
  `lumi-shell-v1`; `/api/` always bypasses cache; network-first navigation.
- App icons — `lumi.svg`, `lumi-192.png`, `lumi-512.png`.
- **`AppStatus.jsx`** — offline banner + dismissable install prompt card
  (Android `beforeinstallprompt` + iOS Share instructions).
- `theme-color` meta tag updates dynamically with dark/light mode.
- `display-mode: standalone` CSS removes desktop chrome padding.

## Key implementation decisions

- **SM-2 specifics**: ease starts at 2.5, floors at 1.3. Deltas: again −0.20,
  hard −0.15, good 0, easy +0.15. Quality < 3 fails the card → reps reset to 0,
  interval 0 (due today). Pass: reps 1 → 1d, reps 2 → 6d, then
  `round(interval × ease)` with easy ×1.3 and hard clamped to
  `max(interval+1, round(interval×1.2))`.
- **Card status** (`pending` / `ready` / `failed`): added as a guarded ALTER
  TABLE defaulting to `ready`. Queue builder filters to `status='ready'` so
  pending/failed cards never enter review.
- **AI model map** (`MODELS` in `ai.js`): per-task model selection, currently
  `{ autofill: "claude-haiku-4-5" }`. Add new tasks here rather than
  hard-coding model IDs at call sites.
- **Hangul gating**: the `hangul.foundation.complete` boolean is computed
  server-side in `modules/hangul/progress.js` and included in every
  `GET /api/study/dashboard` response. The queue builder also respects it.
- **SW cache versioning**: bump `lumi-shell-v1` in `sw.js` whenever the app
  shell file list changes, so stale caches are evicted on activate.
- **better-sqlite3 is synchronous**: repos return rows directly. The only
  async surface is the AI fill, which is fire-and-not-awaited from the
  quick-add route so the HTTP response returns immediately.

## What remains

### Phase 3 & Phase 4
Not yet started — refer to `language-study-app-spec.md` for scope.

### Production / ops
- No production entry point yet. Decide whether Express serves `client/dist`
  or the client is deployed separately. Add a root `start` script.
- Consider adding a `Dockerfile` or deployment notes for self-hosting.

### Polish / known issues
- **CRLF line endings** crept into several files during Codex edits
  (notably `tokens.css`, `Dashboard.jsx`, `App.jsx`). Run
  `git config core.autocrlf input` and re-normalise if it causes diffs.
- **Spec file not committed**: `language-study-app-spec.md` is the source of
  truth but lives outside the repo. Add it to the repo root.
- **No retry / back-off in AI client**: failures go straight to
  `status='failed'`. The manual Retry button exists; no automatic retry or
  rate-limit handling.
- **Polling, not push**: `Cards.jsx` polls every 2s while cards are pending.
  Fine for personal use; consider SSE if card volume grows.
- **npm registry access**: in some sandboxed environments the npm registry
  is blocked. The Claude Code session-start hook handles this for web
  sessions; other environments need network access before running
  `npm install`.
