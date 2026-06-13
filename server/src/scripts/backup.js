import { createDatabaseBackup, pruneBackups } from "../services/backup.js";

const keep = Math.max(1, Number(process.env.BACKUP_KEEP || 14));
const directory = process.env.BACKUP_DIR;

try {
  const backup = await createDatabaseBackup("scheduled", directory);
  const removed = pruneBackups(keep, directory);
  console.log(JSON.stringify({ ok: true, backup, removed }));
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
