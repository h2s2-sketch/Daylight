# AGENTS.md

Instructions for Codex, Claude Code, and other coding assistants working on Daylight.

## Read before changing anything

1. Read `README.md` and this file.
2. Read `HANDOFF.md` for the current state and pending work.
3. Read the relevant guide in `docs/` for architecture, deployment, database, or troubleshooting work.
4. Inspect the current code and Git state. Do not assume an old handoff or local remote-tracking ref is current.

## Repository state

- Stable and default branch: `claude/brave-maxwell-66aq36`
- There is currently no `main` branch.
- `codex/korean-phase-2` and `codex/pwa-mobile-experience` were merged through PR #1 and PR #2. Do not delete, rename, or reuse branches without explicit approval.
- Never change the default branch unless explicitly requested.

## Architecture rules

- Frontend: React 18 and Vite under `client/`.
- Backend: Express ESM under `server/`; production serves `client/dist` and the API from one process.
- Database: SQLite at `data/app.db`, with WAL and foreign keys enabled.
- API namespaces include `/api/study/*`, `/api/study/hangul/*`, `/api/tasks/*`, `/api/data/*`, `/api/appearance/*`, and `/api/auth/*`.
- Domain code belongs in a feature module. Shared infrastructure belongs in `services/` or `shared/`.
- Database migrations must be idempotent. Use `CREATE TABLE IF NOT EXISTS` and guard column changes.

## AI and study rules

- All AI provider calls go through `server/src/shared/ai.js`.
- Current task names are `autofill_en` and `autofill_kr`; do not hard-code provider calls in routes or React components.
- Cache AI responses through the existing study cache.
- Korean vocabulary and quick-add remain gated by Hangul foundation progress unless the product requirement explicitly changes.
- Preserve the existing SM-2 behavior and add focused tests when changing scheduling or queue logic.

## Frontend and PWA rules

- Reuse design tokens from `client/src/styles/tokens.css` instead of adding isolated colors and spacing.
- Keep desktop and mobile behavior working; respect safe-area insets and reduced-motion preferences.
- The service worker cache is currently `daylight-assets-v3`.
- The service worker precaches the manifest and icons. Other same-origin static assets are cached after use; API requests always use the network.
- When changing cached PWA behavior, bump the cache key and test update behavior so stale CSS or JavaScript is not retained.

## Data and security rules

- Never commit `.env`, credentials, `data/app.db`, WAL/SHM files, uploads, or backups.
- Back up SQLite before migrations or deployment work.
- Keep authentication enabled for the public VPS deployment.
- Do not expose secrets in logs, docs, screenshots, commits, or test fixtures.

## Validation

Run the checks relevant to the change. For normal code or configuration changes, use:

```bash
npm test --workspace=server
npm run build
```

For documentation-only work, also verify commands, links, paths, environment names, and statements against the current code.

## Editing discipline

- Keep changes scoped and preserve unrelated user work.
- Do not rewrite Git history, force-push, delete branches, or change the default branch without explicit approval.
- Update `HANDOFF.md` when completed work materially changes the current state or next recommended task.

