# Architecture

Daylight is one repository with a browser app, an API server, and a SQLite database.

```text
Browser / installed PWA
        |
        v
React client (client/)
        |
        v
Express API (server/)
        |
        +--> SQLite: data/app.db
        +--> uploads: data/uploads/
        +--> backups: data/backups/
```

## Frontend

The React app contains Today, Tasks, Projects, Study, and Settings. Vite runs the development server and builds production files into `client/dist`.

The PWA manifest, service worker, and icons live under `client/public`. In production, Express serves the built frontend. The service worker never caches `/api/` responses.

## Backend

`server/src/index.js` starts Express, applies login protection, mounts API modules, serves uploads, and serves the production frontend.

Important API groups:

- `/api/auth/*` - login status, login, and logout
- `/api/tasks/*` - tasks and projects
- `/api/study/*` - cards, queues, reviews, dashboard, and settings
- `/api/study/hangul/*` - Hangul drills and progress
- `/api/data/*` - JSON import/export and backups
- `/api/appearance/*` - custom sidebar image

## Database

SQLite is stored at `data/app.db`. Migrations run when the server first opens the database. Study tables use the `study_*` prefix; task tables use `task_*`; shared settings are stored separately.

See `DATABASE.md` before changing migrations, backups, or data paths.

## Production request flow

The current VPS uses Caddy for HTTPS and reverse proxying. Caddy forwards Daylight requests to the Node server on port 3001. The exact VPS container and configuration paths are operational details and should be confirmed on the VPS before changing them.

