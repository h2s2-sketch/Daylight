import { useState, useEffect } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight, Chevron, Moon, Sun, Plus } from "../../shared/icons.jsx";

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night";
}

function QueueCard({ lang, data, onStart }) {
  const isEn = lang === "en";
  const accent = isEn ? "var(--en)" : "var(--kr)";
  const soft   = isEn ? "var(--en-soft)" : "var(--kr-soft)";
  return (
    <button className="tap" onClick={() => onStart(lang)}
      style={{
        display: "flex", alignItems: "center", gap: 16, width: "100%",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--r-md)", boxShadow: "var(--shadow)",
        padding: "18px 18px", textAlign: "left",
        transition: "transform .18s ease, box-shadow .18s ease",
      }}
      onPointerDown={(e) => e.currentTarget.style.transform = "scale(0.985)"}
      onPointerUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
      onPointerLeave={(e)=> e.currentTarget.style.transform = "scale(1)"}>
      <span style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
        background: soft, color: accent,
        display: "grid", placeItems: "center",
        fontWeight: 700, fontSize: 18,
        fontFamily: isEn ? "var(--font)" : "var(--font-kr)",
      }}>{isEn ? "En" : "한"}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
          {isEn ? "English" : "Korean"}
        </span>
        <span className="tnum" style={{ display: "block", marginTop: 3, fontSize: 13.5, color: "var(--muted)" }}>
          <b style={{ color: "var(--text-soft)", fontWeight: 600 }}>{data.due}</b> due
          <span style={{ margin: "0 6px", color: "var(--faint)" }}>·</span>
          <b style={{ color: accent, fontWeight: 600 }}>{data.fresh}</b> new
        </span>
      </span>
      <span style={{ color: "var(--faint)", display: "flex" }}>
        <Chevron size={20} />
      </span>
    </button>
  );
}

function HangulProgressCard({ progress, onStart }) {
  if (!progress) return null;
  const foundation = progress.foundation;
  const core = progress.core;
  return (
    <div style={{
      marginTop: 12, padding: "16px 17px", borderRadius: "var(--r-md)",
      background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--kr)" }}>
            Hangul foundation
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: "var(--text-soft)" }}>
            {foundation.complete
              ? `Complete - ${core.unlocked} of ${core.total} core cards unlocked`
              : `${foundation.introduced}/${foundation.total} seen - ${foundation.mastered}/${foundation.masteryTarget} building recall`}
          </div>
        </div>
        <span className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--kr)" }}>{foundation.percent}%</span>
      </div>
      <div style={{ marginTop: 12, height: 7, borderRadius: 99, overflow: "hidden", background: "var(--bg-sunken)" }}>
        <div style={{ width: `${foundation.percent}%`, height: "100%", borderRadius: 99, background: "var(--kr)", transition: "width .35s ease" }} />
      </div>
      <button className="tap" onClick={onStart} style={{
        marginTop: 12, width: "100%", padding: "12px", borderRadius: "var(--r-sm)",
        background: "var(--kr-soft)", color: "var(--kr)", fontSize: 14, fontWeight: 700,
      }}>{foundation.complete ? "Practice Hangul" : "Continue foundation"}</button>
      {!foundation.complete && (
        <div style={{ marginTop: 9, fontSize: 12.5, color: "var(--faint)", lineHeight: 1.4 }}>
          The 300-card Korean core deck unlocks after you have seen every foundation card and built recall on 80%.
        </div>
      )}
    </div>
  );
}

function WeekStrip({ week }) {
  const totals = week.map((w) => w.en + w.kr);
  const max = Math.max(...totals, 1);
  const BAR_MAX = 34;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "16px 18px 14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
          This week
        </span>
        <span className="tnum" style={{ fontSize: 12.5, color: "var(--faint)" }}>
          {totals.reduce((s, n) => s + n, 0)} cards
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 64 }}>
        {week.map((w, i) => {
          const isToday = i === week.length - 1;
          const n = totals[i];
          const h = n === 0 ? 0 : Math.max(10, (n / max) * BAR_MAX);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5, height: "100%" }}>
              {n > 0 ? (
                <>
                  <span className="tnum" style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1, color: isToday ? "var(--text-soft)" : "var(--faint)" }}>{n}</span>
                  <div style={{ width: "100%", maxWidth: 30, height: h, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", opacity: isToday ? 1 : 0.9 }}>
                    {w.kr > 0 && <div style={{ height: `${(w.kr / n) * 100}%`, background: "var(--kr)", opacity: 0.75 }} />}
                    {w.en > 0 && <div style={{ height: `${(w.en / n) * 100}%`, background: "var(--en)", opacity: 0.75 }} />}
                  </div>
                </>
              ) : (
                <div style={{
                  width: "100%", maxWidth: 30, height: 3, borderRadius: 99,
                  background: isToday ? "var(--border-strong)" : "var(--bg-sunken)",
                  boxShadow: isToday ? "none" : "inset 0 0 0 1px var(--border)",
                }} />
              )}
              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 600, color: isToday ? "var(--text)" : "var(--faint)" }}>{w.d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlipBanner({ language, daysSince, onStart }) {
  const label = language === "en" ? "English" : "Korean";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 13,
      background: "var(--kr-soft)", border: "1px solid color-mix(in oklch, var(--kr) 22%, transparent)",
      borderRadius: "var(--r-md)", padding: "13px 14px 13px 16px",
    }}>
      <span style={{ fontSize: 19, lineHeight: 1, flexShrink: 0 }}>🌙</span>
      <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4, color: "var(--text-soft)" }}>
        <b style={{ color: "var(--kr)", fontWeight: 700 }}>{label} is slipping</b> — {daysSince} days since your last review.
      </span>
      <button className="tap" onClick={() => onStart(language)} style={{
        flexShrink: 0, fontSize: 13, fontWeight: 600, color: "var(--kr)",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 99, padding: "7px 13px",
      }}>Catch up</button>
    </div>
  );
}

export default function Dashboard({ onStart, onHangul, onAddCard, theme, onToggleTheme }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [quickWord, setQuickWord] = useState("");
  const [quickLanguage, setQuickLanguage] = useState("en");
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickDone, setQuickDone] = useState("");

  const loadDashboard = () => {
    setError(null);
    api.getDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--pad)", textAlign: "center" }}>
      <div style={{ fontSize: 42, lineHeight: 1 }}>☁️</div>
      <h1 style={{ marginTop: 15, fontSize: 21, color: "var(--text)" }}>
        {navigator.onLine ? "Lumi cannot reach your study data" : "You are offline"}
      </h1>
      <p style={{ marginTop: 8, maxWidth: 320, color: "var(--muted)", fontSize: 14.5, lineHeight: 1.5 }}>
        {navigator.onLine
          ? "The app is open, but the study server is unavailable. Try again in a moment."
          : "Reconnect to continue reviewing and save your progress."}
      </p>
      <button className="tap" onClick={loadDashboard} style={{
        marginTop: 20, padding: "12px 20px", borderRadius: 99,
        background: "var(--text)", color: "var(--bg)", fontSize: 14.5, fontWeight: 700,
      }}>
        Try again
      </button>
    </div>
  );

  if (!data) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span className="app-spinner" aria-hidden="true" />
        <span style={{ color: "var(--faint)", fontSize: 14 }}>Loading your study plan...</span>
      </div>
    </div>
  );

  const { queue, streak, slip, week, hangul } = data;
  const totalDue = (queue.en?.due ?? 0) + (queue.kr?.due ?? 0) + (queue.en?.fresh ?? 0) + (queue.kr?.fresh ?? 0);
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const slipBanners = Object.entries(slip)
    .filter(([lang, s]) => s.slipping && !dismissed.includes(lang));

  return (
    <div className="fade-enter" s…3276 tokens truncated…       oklch(0.72 0.12 252);
  --en-soft:   oklch(0.72 0.12 252 / 0.13);
  --en-soft-2: oklch(0.72 0.12 252 / 0.20);
  --kr:        oklch(0.74 0.12 28);
  --kr-soft:   oklch(0.74 0.12 28 / 0.14);
  --kr-soft-2: oklch(0.74 0.12 28 / 0.22);

  --again:      oklch(0.70 0.13 25);
  --again-soft: oklch(0.70 0.13 25 / 0.15);
  --easy:       oklch(0.70 0.10 155);
  --easy-soft:  oklch(0.70 0.10 155 / 0.16);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }

body {
  font-family: var(--font);
  background: var(--bg-sunken);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overscroll-behavior: none;
}

#root { height: 100%; }

.app-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--kr);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.connection-banner {
  position: absolute;
  z-index: 50;
  top: env(safe-area-inset-top);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 28px);
  margin-top: 8px;
  padding: 8px 13px;
  border: 1px solid var(--border-strong);
  border-radius: 99px;
  background: var(--text);
  color: var(--bg);
  box-shadow: var(--shadow-lift);
  font-size: 12.5px;
  font-weight: 650;
  text-align: center;
}

.install-card {
  position: absolute;
  z-index: 45;
  left: var(--pad);
  right: var(--pad);
  bottom: calc(env(safe-area-inset-bottom) + 78px);
  display: grid;
  grid-template-columns: 42px 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 11px 10px 11px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: var(--shadow-lift);
  backdrop-filter: blur(14px);
}

.install-card img { width: 42px; height: 42px; border-radius: 11px; }
.install-card div { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.install-card strong { font-size: 14px; color: var(--text); }
.install-card span { font-size: 12px; color: var(--muted); line-height: 1.3; }
.install-card button:not(.install-dismiss) {
  padding: 8px 12px;
  border-radius: 99px;
  background: var(--text);
  color: var(--bg);
  font-size: 12.5px;
  font-weight: 700;
}
.install-card .install-dismiss { padding: 5px; color: var(--muted); font-size: 17px; line-height: 1; }

@media (max-width: 390px) {
  .install-card { grid-template-columns: 38px 1fr auto; }
  .install-card img { width: 38px; height: 38px; }
  .install-card .install-dismiss { display: none; }
}

button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
a { color: inherit; text-decoration: none; }

.tap { -webkit-tap-highlight-color: transparent; user-select: none; }
.tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.kr { font-family: var(--font-kr); }
.cn { font-family: var(--font-cn); }

.fade-enter { animation: fadeUp 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) both; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes ripple {
  from { opacity: 0.5; transform: scale(1); }
  to   { opacity: 0;   transform: scale(1.6); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
