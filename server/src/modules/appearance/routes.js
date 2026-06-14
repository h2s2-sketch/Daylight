import fs from "fs";
import path from "path";
import { Router } from "express";
import { fileURLToPath } from "url";
import { getAllSettings, setSetting } from "../../services/settings.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, "../../../../data/uploads");
const PHOTO_PREFIX = "sidebar-photo";

function imageExtension(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

function removePreviousPhoto(except = "") {
  if (!fs.existsSync(UPLOAD_DIR)) return;
  for (const name of fs.readdirSync(UPLOAD_DIR)) {
    if (name.startsWith(`${PHOTO_PREFIX}.`) && name !== except) fs.unlinkSync(path.join(UPLOAD_DIR, name));
  }
}

function replaceFile(temporary, destination) {
  const previous = `${destination}.previous`;
  if (!fs.existsSync(destination)) {
    fs.renameSync(temporary, destination);
    return;
  }

  if (fs.existsSync(previous)) fs.unlinkSync(previous);
  fs.renameSync(destination, previous);
  try {
    fs.renameSync(temporary, destination);
    fs.unlinkSync(previous);
  } catch (error) {
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
    fs.renameSync(previous, destination);
    throw error;
  }
}

router.post("/sidebar-photo", (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Image file required" });
  const extension = imageExtension(req.body);
  if (!extension) return res.status(415).json({ error: "Use a PNG, JPEG, or WebP image" });

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${PHOTO_PREFIX}.${extension}`;
  const temporary = path.join(UPLOAD_DIR, `${filename}.uploading`);
  const destination = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(temporary, req.body);
  replaceFile(temporary, destination);
  removePreviousPhoto(filename);

  const url = `/uploads/${filename}?v=${Date.now()}`;
  setSetting("sidebar_photo_url", url);
  res.status(201).json({ url, settings: getAllSettings() });
});

router.delete("/sidebar-photo", (_req, res) => {
  removePreviousPhoto();
  setSetting("sidebar_photo_url", "");
  res.json({ url: "", settings: getAllSettings() });
});

export default router;
