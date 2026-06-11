# Lumi — Study App (Phase 1 MVP)

A personal spaced-repetition study app for English and Korean, built with React + Vite + Node/Express + SQLite.

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

## What's built (Phase 1)

- **SM-2 spaced repetition engine** — ease factor, intervals, Again/Hard/Good/Easy grading
- **Today Dashboard** — per-language queue counts, 7-day activity strip, streak pill, slip detection banners
- **Review screen** — full-screen card, reveal animation, grade bar with real interval previews, TTS, keyboard 1–4 shortcuts
- **Summary screen** — reviewed/recalled/to-repeat stats with grade breakdown bars
- **Manual card creation** — language, type (vocab/cloze/production), front/back/context, tag picker
- **Card library** — list/edit/delete all cards with inline edit modal
- **Streak tracking** — counts a day complete if due queue cleared or ≥15 cards reviewed
- **Slip detection** — banner when a language hasn't been reviewed in 3+ days
- **Dark mode** toggle
- **Settings** — daily new-card limits, dark mode toggle

## Tech stack

- **Frontend**: React 18 + Vite, mobile-first, single-column ≤640px
- **Backend**: Node.js + Express, `/api/study/*` router
- **Database**: SQLite via better-sqlite3, namespaced tables (`study_cards`, `study_reviews`)
- **Design**: matches Lumi design reference — Figtree font, warm-neutral palette, oklch accent colors

## Project structure

```
server/src/
  db/           — SQLite connection + migrations
  services/     — settings (shared service, reusable by future modules)
  modules/study/
    sm2.js          — pure SM-2 functions
    cards.repo.js   — card CRUD
    queue.js        — daily queue builder
    streak.js       — streak + week activity
    routes.js       — /api/study/* Express router

client/src/
  styles/tokens.css       — design tokens (light + dark)
  shared/                 — icons, TTS service, API client
  shell/NavBar.jsx        — Study / Settings tabs (extensible)
  modules/study/
    Dashboard.jsx
    Review.jsx
    Summary.jsx
    AddCard.jsx
    Cards.jsx
    SettingsPage.jsx
```
