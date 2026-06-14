# Lumi — Study App

A personal spaced-repetition study app for English and Korean, built with React + Vite + Node/Express + SQLite. Installable as a PWA.

## Running locally

```bash
# 1. Install dependencies
npm install --prefix server
npm install --prefix client

# 2. Start the server (terminal 1)
npm run dev --workspace=server   # runs on :3001

# 3. Start the client (terminal 2)
npm run dev --workspace=client   # runs on :5173, proxies /api → :3001
```

Open `http://localhost:5173`.

## What's built

### Core SRS engine
- **SM-2 spaced repetition** — ease factor, intervals, Again/Hard/Good/Easy grading
- **Review screen** — full-screen card, reveal animation, grade bar with real interval previews, TTS, keyboard 1–4 shortcuts
- **Summary screen** — reviewed/recalled%/to-repeat stats with grade breakdown bars

### Today Dashboard
- Per-language queue counts (due + new), 7-day activity strip, streak pill
- Slip-detection banners when a language hasn't been reviewed in 3+ days
- Hangul progress card showing foundation unlock state

### AI Quick-Add
- Single input on the dashboard — type a word, tap Add, card is created instantly
- AI fills in the back (definition · IPA · translation), context (example sentences), tags, CEFR level in the background
- Supports English and Korean (Korean gated behind Hangul foundation completion)
- Pending cards show a spinner; failed cards show a Retry button
- AI responses cached in DB — re-adding the same word never re-calls the API
- Three modes via `AI_MODE` env var: `mock` (default, no credentials), `api_key`, `agent_sdk`

### Hangul Drills
- Guided foundation course: vowels → consonants → syllable blocks
- Recognition drill with tap-to-answer UI
- Progress tracked per character; unlocks Korean vocabulary review once foundation is complete
- Core Korean deck seeded automatically

### Card management
- Manual card creation — language, type (vocab/cloze/production), front/back/context, tag picker
- Card library — list/edit/delete all cards with inline edit modal
- Streak tracking — counts a day complete if due queue cleared or ≥15 cards reviewed

### PWA
- Installable on Android and iOS (manifest + service worker)
- App shell cached for fast load; `/api/` always hits the network
- Offline banner when connection is lost
- Install prompt card (dismissable); iOS users see Share → Add to Home Screen instructions
- `theme-color` meta tag updates with dark/light mode

### Settings
- Daily new-card limits per language
- Dark mode toggle

## Tech stack

- **Frontend**: React 18 + Vite, mobile-first single-column ≤640px
- **Backend**: Node.js + Express (ESM), `/api/study/*` and `/api/hangul/*` routers
- **Database**: SQLite via better-sqlite3, WAL mode, namespaced tables (`study_*`, `hangul_*`)
- **AI**: Anthropic API / Claude Agent SDK via `server/src/shared/ai.js`; default mock mode
- **PWA**: Web App Manifest + vanilla service worker in `client/public/`
- **Design**: Figtree + Noto Sans KR/TC, warm-neutral palette, oklch accent colors

## Project structure

```
server/src/
  db/                   — SQLite connection + migrations
  services/             — settings (shared key/value store)
  shared/
    ai.js               — AI client (mock | api_key | agent_sdk)
  modules/
    study/
      sm2.js            — pure SM-2 functions
      cards.repo.js     — card CRUD
      ai.repo.js        — AI response cache
      queue.js          — daily queue builder
      streak.js         — streak + week activity
      routes.js         — /api/study/* router
    hangul/
      data.js           — Hangul character/syllable core deck
      progress.js       — drill progress tracking
      routes.js         — /api/hangul/* router
      hangul.test.js    — unit tests

client/src/
  styles/tokens.css     — design tokens (light + dark) + base styles
  shared/               — api.js, tts.js, icons.jsx
  shell/
    NavBar.jsx          — Study / Settings tabs
    AppStatus.jsx       — offline banner + PWA install prompt
  modules/study/
    Dashboard.jsx       — Today screen + AI quick-add + Hangul progress card
    Review.jsx          — full-screen card review
    Summary.jsx         — post-session stats
    AddCard.jsx         — manual card form
    Cards.jsx           — card library
    HangulDrill.jsx     — Hangul recognition drill UI
    SettingsPage.jsx

client/public/
  manifest.webmanifest  — PWA manifest
  sw.js                 — service worker
  icons/                — lumi.svg, lumi-192.png, lumi-512.png
```

## Environment

Copy `server/.env.example` to `server/.env`:

```
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
AI_MODE=mock
# AI_MODE=api_key
# ANTHROPIC_API_KEY=sk-ant-...
```
