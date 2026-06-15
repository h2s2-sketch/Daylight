# Database and backups

Daylight stores runtime data in SQLite at `data/app.db`.

Related runtime files can include:

```text
data/app.db
data/app.db-wal
data/app.db-shm
data/uploads/
data/backups/
```

These files are private and must not be committed to GitHub.

## Migrations

Migrations run automatically when the Express server opens the database. Migrations must remain idempotent so restarting the app is safe.

Back up the database before deploying a migration. Test important migration changes against a disposable copy first.

The Daylight v0.2 task migration adds task/project areas, task time, project goals, and the new workflow statuses. Existing IDs, project links, dates, completion timestamps, and task content are preserved. Because SQLite status checks must be replaced, make a backup before the first server restart after deploying this version.

## Backup methods

### Portable JSON

Settings can export and import portable study/task data. This is useful for moving data between devices or recovering selected application data.

Current exports use Daylight JSON format version 2. Imports still accept version 1 files and convert legacy task/project statuses. Missing area, date, time, and goal fields receive safe defaults; invalid imported area/date/time values are cleared rather than written to the database.

### Immediate SQLite backup

```bash
cd /var/www/lumi
npm run backup
```

The backup helper uses SQLite's backup API, which is safer than copying a database that is actively writing WAL data.

### Daily systemd backup

The repository includes `deploy/daylight-backup.service` and `deploy/daylight-backup.timer`. See `../deploy/BACKUP.md` for installation and checks. The included timer keeps 14 backups.

## Restore outline

1. Stop the Daylight service.
2. Preserve the current `data/app.db` and related WAL/SHM files.
3. Verify the selected backup before placing it at `data/app.db`.
4. Confirm file ownership and permissions.
5. Start Daylight and check `/api/health`, login, tasks, and study progress.

The exact production service user and ownership settings are **To be confirmed on VPS**.
