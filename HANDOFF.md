# HANDOFF.md

Short current-state note for the next developer or AI assistant.

Last reviewed: 2026-06-15.

## Current state

- Stable and default branch: `claude/brave-maxwell-66aq36`
- No `main` branch exists.
- PR #1 merged the Korean Hangul drills and core deck.
- PR #2 merged the PWA and mobile experience.
- PR #3 updated documentation, but several descriptions were later found to be inaccurate; the documentation cleanup corrects them.
- The app is running on a private VPS behind Caddy with login protection.
- Production uses `npm start`; Express serves both `client/dist` and API routes.
- Runtime data is stored in `data/app.db`. Server uploads and backups are also under `data/`.

## Recently completed

- Daylight v0.2 task model with Work/Life areas, optional task date/time, and Inbox/Next/Waiting/Done statuses
- Today task sections for Overdue, Timed, and Anytime, plus area filters across Today, Tasks, and Projects
- Project goals, Active/Paused/Done status, open-task counts, and next-action summaries
- Lightweight Daylight design system with progressive Quick Capture, shared task rows, responsive task pages, and Work/Life project groups
- Persistent sidebar display modes: Personal Photo, Minimal Gradient, and low-distraction Focus Mode
- JSON export format v2 with backward-compatible v1 import
- Daylight workspace with Today, Tasks, Projects, Study, and Settings
- English and Korean SRS flows, Hangul drills, and Korean core deck
- PWA install support and offline status UI
- Login protection and production frontend serving
- JSON import/export, manual SQLite backups, and systemd backup timer files
- Custom desktop sidebar image with browser-side optimization
- Marketing mockup route for screenshots

## Daylight v0.3 Execution Loop (in progress)

On branch `claude/modest-bardeen-qd4pc0`, added alongside the existing app; Today / Tasks / Projects / Study / Settings are unchanged.

- Phase 1 (backend): new `loop_goals`, `loop_focus_items`, `loop_checkins`, `loop_reviews` tables (additive `CREATE TABLE IF NOT EXISTS` only) and an isolated `/api/loop` router. Committed.
- Phase 2 (frontend): functional `client/src/modules/loop/` screens (Dashboard, Goals, Weekly Focus, Daily Check-in, Weekly Review) behind one new "Loop" nav entry. Functional only — final visual direction (Soft Sunrise / Calm Focus / Journal) is deferred to Phase 3. Pending acceptance after `npm test --workspace=server` and `npm run build`.

## Known issues and cautions

- Phase 3 navigation refinement: after adding the "Loop" nav entry (6 items), the mobile / narrow bottom nav wraps to two rows. Not a Phase 2 blocker; refine the bottom-nav layout in Phase 3.
- Local clones may have stale remote-tracking history. Check GitHub before pushing or restructuring branches.
- PWA caches can retain old static assets after deployments; use the troubleshooting guide when styles disappear.
- AI API modes have manual retry but no automatic retry/back-off.
- Pending AI cards use polling rather than server push.
- VPS systemd and Caddy details are partly outside this repository; unverified values are marked in `docs/DEPLOYMENT.md`.
- `language-study-app-spec.md` is referenced historically but is not committed to the repository.

## Recommended next work

1. Back up `data/app.db`, deploy v0.2 to the VPS, and verify the task migration with live data.
2. Test Today, Tasks, and Projects on a narrow mobile viewport and refine any crowded controls.
3. Confirm and document the live VPS service unit, Caddy file path, and backup timer status.

Read `AGENTS.md` before implementation and use the guides under `docs/` for operational work.
