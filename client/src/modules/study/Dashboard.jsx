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
        {navigator.onLine ? "Daylight cannot reach your study data" : "You are offline"}
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
    <div className="fade-enter" style={{
      flex: 1, display: "flex", flexDirection: "column", overflowY: "auto",
      padding: "calc(env(safe-area-inset-top) + 20px) var(--pad) 28px",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>{dateStr}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 3, color: "var(--text)", lineHeight: 1.15 }}>
            {greeting()}.
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
          <div className="tnum tap" style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--surface)", border: "1px solid var(--border)",
            boxShadow: "var(--shadow)", borderRadius: 99, padding: "7px 12px 7px 10px",
            fontSize: 14.5, fontWeight: 700, color: "var(--text)",
          }}>
            <span style={{ fontSize: 15 }}>🔥</span>
            <span>{streak.current}</span>
          </div>
          <button className="tap" onClick={onToggleTheme} aria-label="Toggle theme" style={{
            width: 38, height: 38, borderRadius: 99, display: "grid", placeItems: "center",
            background: "var(--surface)", border: "1px solid var(--border)",
            boxShadow: "var(--shadow)", color: "var(--text-soft)",
          }}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* summary line */}
      <p className="tnum" style={{ marginTop: 18, fontSize: 15, color: "var(--text-soft)", lineHeight: 1.45 }}>
        {totalDue > 0
          ? <>You have <b style={{ color: "var(--text)", fontWeight: 700 }}>{totalDue} cards</b> waiting across two languages.</>
          : <>All caught up for today. 🎉</>}
      </p>

      {/* queue cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        <QueueCard lang="en" data={queue.en} onStart={onStart} />
        <QueueCard lang="kr" data={queue.kr} onStart={hangul?.foundation?.complete ? onStart : onHangul} />
      </div>

      <HangulProgressCard progress={hangul} onStart={onHangul} />

      {/* primary CTA */}
      <button className="tap" onClick={() => {
        if (!hangul?.foundation?.complete && (queue.kr?.due || queue.kr?.fresh)) onHangul();
        else onStart(null);
      }} disabled={totalDue === 0}
        style={{
          marginTop: 18, width: "100%", padding: "17px", borderRadius: "var(--r-md)",
          background: totalDue === 0 ? "var(--bg-sunken)" : "var(--text)",
          color: totalDue === 0 ? "var(--faint)" : "var(--bg)",
          fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          boxShadow: totalDue === 0 ? "none" : "var(--shadow-lift)",
          transition: "transform .16s ease, opacity .16s ease",
          cursor: totalDue === 0 ? "default" : "pointer",
        }}
        onPointerDown={(e) => totalDue > 0 && (e.currentTarget.style.transform = "scale(0.985)")}
        onPointerUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
        onPointerLeave={(e)=> e.currentTarget.style.transform = "scale(1)"}>
        Start Review
        <ArrowRight size={19} sw={2} />
      </button>

      {/* AI quick-add */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[{ id: "en", label: "English" }, { id: "kr", label: "Korean" }].map((option) => {
            const disabled = option.id === "kr" && !hangul?.foundation?.complete;
            const active = quickLanguage === option.id;
            return (
              <button key={option.id} type="button" className="tap" disabled={disabled}
                onClick={() => setQuickLanguage(option.id)}
                title={disabled ? "Complete Hangul foundation first" : undefined}
                style={{
                  padding: "6px 11px", borderRadius: 99, fontSize: 12.5, fontWeight: 650,
                  color: active ? "var(--bg)" : disabled ? "var(--faint)" : "var(--text-soft)",
                  background: active ? (option.id === "en" ? "var(--en)" : "var(--kr)") : "var(--surface)",
                  border: "1px solid var(--border)", opacity: disabled ? 0.55 : 1,
                }}>
                {option.label}{disabled ? " - locked" : ""}
              </button>
            );
          })}
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const word = quickWord.trim();
          if (!word || quickAdding) return;
          setQuickAdding(true);
          setQuickDone("");
          try {
            await api.quickAddCard(word, quickLanguage);
            setQuickWord("");
            setQuickDone(`"${word}" added — AI filling in background`);
            setTimeout(() => setQuickDone(""), 3000);
          } catch (err) {
            setQuickDone(`Error: ${err.message}`);
          } finally {
            setQuickAdding(false);
          }
        }} style={{ display: "flex", gap: 8 }}>
          <input
            value={quickWord}
            onChange={(e) => setQuickWord(e.target.value)}
            placeholder={quickLanguage === "kr" ? "Quick-add Korean word..." : "Quick-add English word..."}
            disabled={quickAdding}
            style={{
              flex: 1, padding: "13px 14px", borderRadius: "var(--r-md)",
              background: "var(--surface)", border: "1px solid var(--border)",
              boxShadow: "var(--shadow)", fontSize: 15, color: "var(--text)",
              fontFamily: "var(--font)", outline: "none",
              opacity: quickAdding ? 0.6 : 1,
            }}
          />
          <button type="submit" disabled={quickAdding || !quickWord.trim()} className="tap"
            style={{
              padding: "13px 18px", borderRadius: "var(--r-md)",
              background: quickLanguage === "kr" ? "var(--kr)" : "var(--en)", color: "#fff",
              fontSize: 15, fontWeight: 700,
              opacity: (quickAdding || !quickWord.trim()) ? 0.5 : 1,
              flexShrink: 0,
            }}>
            {quickAdding ? "…" : "Add"}
          </button>
        </form>
        {quickDone && (
          <div style={{ marginTop: 7, fontSize: 13, color: "var(--muted)", paddingLeft: 2 }}>
            {quickDone}
          </div>
        )}
        <button className="tap" onClick={onAddCard}
          style={{
            marginTop: 8, width: "100%", padding: "11px", borderRadius: "var(--r-md)",
            background: "transparent", border: "none",
            fontSize: 13.5, fontWeight: 500, color: "var(--faint)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
          <Plus size={14} />
          Manual card form
        </button>
      </div>

      {/* below the fold */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 26 }}>
        <WeekStrip week={week} />
        {slipBanners.map(([lang, s]) => (
          <SlipBanner key={lang} language={lang} daysSince={s.daysSince} onStart={onStart}
            onDismiss={() => setDismissed((d) => [...d, lang])} />
        ))}
      </div>
    </div>
  );
}
