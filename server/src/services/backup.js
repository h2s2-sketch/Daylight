import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BACKUP_DIR = path.resolve(__dirname, "../../../data/backups");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function createDatabaseBackup(label = "automatic", directory = DEFAULT_BACKUP_DIR) {
  fs.mkdirSync(directory, { recursive: true });
  const safeLabel = String(label).replace(/[^a-z0-9_-]/gi, "-");
  const filename = `daylight-${safeLabel}-${stamp()}.db`;
  const destination = path.join(directory, filename);
  await getDb().backup(destination);
  return { filename, path: destination, size: fs.statSync(destination).size, createdAt: new Date().toISOString() };
}

export function pruneBackups(keep = 14, directory = DEFAULT_BACKUP_DIR) {
  if (!fs.existsSync(directory)) return [];
  const files = fs.readdirSync(directory)
    .filter((name) => /^daylight-.*\.db$/.test(name))
    .map((name) => ({ name, path: path.join(directory, name), mtime: fs.statSync(path.join(directory, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const removed = [];
  for (const file of files.slice(Math.max(0, keep))) {
    fs.unlinkSync(file.path);
    removed.push(file.name);
  }
  return removed;
}
