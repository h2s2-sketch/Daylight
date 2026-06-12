import crypto from "crypto";
import { Router } from "express";

const COOKIE_NAME = "lumi_session";
const SESSION_DAYS = 30;
const attempts = new Map();

function config() {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  const enabled = Boolean(username || password || secret);

  if (enabled && (!username || !password || !secret)) {
    throw new Error("AUTH_USERNAME, AUTH_PASSWORD, and SESSION_SECRET must all be set");
  }
  return { enabled, username, password, secret };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createToken(username, secret) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${username}.${expires}`;
  return `${payload}.${sign(payload, secret)}`;
}

function readCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return [part.trim(), ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }).filter(([key]) => key));
}

function validSession(req) {
  const { enabled, username, secret } = config();
  if (!enabled) return true;

  const token = readCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenUser, expires, signature] = parts;
  const payload = `${tokenUser}.${expires}`;
  return tokenUser === username
    && Number(expires) > Date.now()
    && safeEqual(signature, sign(payload, secret));
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function blocked(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.started > 15 * 60 * 1000) {
    attempts.set(ip, { count: 0, started: now });
    return false;
  }
  return entry.count >= 10;
}

function recordFailure(ip) {
  const entry = attempts.get(ip) || { count: 0, started: Date.now() };
  entry.count += 1;
  attempts.set(ip, entry);
}

export const authRouter = Router();

authRouter.get("/status", (req, res) => {
  const { enabled } = config();
  res.json({ enabled, authenticated: validSession(req) });
});

authRouter.post("/login", (req, res) => {
  const { enabled, username, password, secret } = config();
  if (!enabled) return res.json({ authenticated: true });
  if (blocked(req.ip)) return res.status(429).json({ error: "Too many attempts. Try again later." });

  if (!safeEqual(req.body?.username, username) || !safeEqual(req.body?.password, password)) {
    recordFailure(req.ip);
    return res.status(401).json({ error: "Incorrect username or password" });
  }

  attempts.delete(req.ip);
  res.cookie(COOKIE_NAME, createToken(username, secret), cookieOptions());
  res.json({ authenticated: true });
});

authRouter.post("/logout", (_, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

export function requireAuth(req, res, next) {
  if (validSession(req)) return next();
  res.status(401).json({ error: "Authentication required" });
}
