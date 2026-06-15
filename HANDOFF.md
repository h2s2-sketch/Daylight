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

- Daylight workspace with Today, Tasks, Projects, Study, and Settings
- English and Korean SRS flows, Hangul drills, and Korean core deck
- PWA install support and offline status UI
- Login protection and production frontend serving
- JSON import/export, manual SQLite backups, and systemd backup timer files
- Custom desktop sidebar image with browser-side optimization
- Marketing mockup route for screenshots

## Known issues and cautions

- Local clones may have stale remote-tracking history. Check GitHub before pushing or restructuring branches.
- PWA caches can retain old static assets after deployments; use the troubleshooting guide when styles disappear.
- AI API modes have manual retry but no automatic retry/back-off.
- Pending AI cards use polling rather than server push.
- VPS systemd and Caddy details are partly outside this repository; unverified values are marked in `docs/DEPLOYMENT.md`.
- `language-study-app-spec.md` is referenced historically but is not committed to the repository.

## Recommended next work

1. Confirm and document the live VPS service unit, Caddy file path, and backup timer status.
2. Test a complete database backup and restore procedure using a disposable copy.
3. Continue product work only after choosing the next priority: Tasks/Projects polish, mobile PWA testing, or Korean learning improvements.

Read `AGENTS.md` before implementation and use the guides under `docs/` for operational work.

