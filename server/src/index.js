import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";
import studyRouter from "./modules/study/routes.js";
import hangulRouter from "./modules/hangul/routes.js";
import { getDb } from "./db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(__dirname, "../../data"), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// All study API endpoints live under /api/study
app.use("/api/study", studyRouter);
app.use("/api/study/hangul", hangulRouter);

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

// In production, serve the built PWA from the same origin as the API.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Boot DB (migrations run on first connection)
getDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
