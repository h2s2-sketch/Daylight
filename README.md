# Daylight

Daylight is a personal web app for daily tasks, projects, and spaced-repetition study. It combines a simple life dashboard with English and Korean learning tools, and it is already deployed on a private VPS.

The current stable branch is `claude/brave-maxwell-66aq36`. There is no `main` branch at this time.

## Current features

- Today dashboard for tasks and study queues
- Task and project management
- English and Korean spaced-repetition cards
- Guided Hangul drills and a seeded Korean core deck
- AI-assisted card creation in mock, API key, or SDK mode
- Login protection, dark mode, backups, and an installable PWA
- Custom desktop sidebar image

## Tech stack

- React 18 and Vite
- Node.js and Express
- SQLite with `better-sqlite3`
- Web App Manifest and service worker
- Caddy reverse proxy on the current VPS deployment

## Project structure

```text
client/       React frontend and PWA files
server/       Express API, SQLite access, and background services
data/         Runtime database, uploads, and backups (not committed)
deploy/       Included systemd backup timer files
docs/         Architecture, deployment, database, and troubleshooting guides
```

Start with these documents:

1. `README.md` - project overview and commands
2. `docs/ARCHITECTURE.md` - how the app fits together
3. `docs/DEPLOYMENT.md` - VPS updates and checks
4. `docs/DATABASE.md` - data location and backups
5. `docs/TROUBLESHOOTING.md` - common problems
6. `AGENTS.md` and `HANDOFF.md` - rules and current context for AI assistants

## Local development

Requirements: Node.js 20 or newer and npm.

```bash
npm install --prefix server
npm install --prefix client
```

Run the API and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173`. The Vite server proxies API requests to `http://localhost:3001`.

## Environment variables

Copy `server/.env.example` to `server/.env` and edit the copy.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express port; default `3001` |
| `CLIENT_ORIGIN` | Allowed browser origin |
| `NODE_ENV` | Use `production` on the VPS |
| `AI_MODE` | `mock`, `api_key`, or `agent_sdk` |
| `ANTHROPIC_API_KEY` | Required only for `AI_MODE=api_key` |
| `AUTH_USERNAME` | Private app login name |
| `AUTH_PASSWORD` | Private app login password |
| `SESSION_SECRET` | Long random value used to sign login cookies |

## Useful commands

```bash
npm run build                  # Build client/dist
npm start                      # Start the production Express server
npm test --workspace=server    # Run server tests
npm run backup                 # Create a SQLite backup
```

## VPS updates

The production server builds the frontend into `client/dist`, then Express serves it together with the API. See `docs/DEPLOYMENT.md` before updating the VPS.

## Important warnings

- Never commit `server/.env`, passwords, API keys, or session secrets.
- Never commit `data/app.db`, `*.db-wal`, `*.db-shm`, uploaded photos, or backup files.
- Back up the database before deployment or data migrations.
- Do not delete or rename branches until their merge status has been checked.
- AI assistants must read `AGENTS.md` and `HANDOFF.md` before making changes.
