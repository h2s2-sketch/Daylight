import crypto from "crypto";
import { getDb } from "../../db/connection.js";

function hash(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function getCached(task, input) {
  const h = hash(input);
  const row = getDb()
    .prepare("SELECT response_json FROM study_ai_cache WHERE task = ? AND input_hash = ?")
    .get(task, h);
  return row ? JSON.parse(row.response_json) : null;
}

export function putCache(task, input, response) {
  const h = hash(input);
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO study_ai_cache (task, input_hash, response_json)
       VALUES (?, ?, ?)`
    )
    .run(task, h, JSON.stringify(response));
}
