import { useState, useEffect, useCallback } from "react";
import { api } from "../../shared/api.js";
import { speak } from "../../shared/tts.js";
import { Close, Speaker } from "../../shared/icons.jsx";

function LangBadge({ lang }) {
  const isEn = lang === "en";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontSize: 12.5, fontWeight: 600, letterSpacing: "0.02em",
      color: isEn ? "var(--en)" : "var(--kr)",
      background: isEn ? "var(--en-soft)" : "var(--kr-soft)",
      borderRadius: 99, padding: "6px 12px 6px 10px",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: "currentColor" }} />
      {isEn ? "English" : "Korean"}
    </span>
  );
}

function SpeakerBtn({ onPlay, accent }) {
  const [ping, setPing] = useState(false);
  return (
    <button className="tap" aria-label="Play audio"
      onClick={() => { setPing(true); onPlay(); setTimeout(() => setPing(false), 600); }}
      style={{
        width: 48, height: 48, borderRadius: 99, display: "grid", placeItems: "center",
        background: "var(--surface)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow)", color: accent, position: "relative",
        transform: ping ? "scale(0.92)" : "scale(1)", transition: "transform .2s ease",
      }}>
      {ping && (
        <span style={{
          position: "absolute", inset: 0, borderRadius: 99,
          border: `2px solid ${accent}`, animation: "ripple .6s ease-out forwards",
        }} />
      )}
      <Speaker size={21} />
    </button>
  );
}

function intervalLabel(days) {
  if (days === 0) return "<1m";
  if (days === 1) return "1d";
  if (days < 30)  return `${days}d`;
  const m = Math.round(days / 30);
  return `${m}mo`;
}

function GradeBar({ onGrade, intervals }) {
  const GRADES = [
    { key: "again", label: "Again", kind: "again" },
    { key: "hard",  label: "Hard",  kind: "neutral" },
    { key: "good",  label: "Good",  kind: "neutral" },
    { key: "easy",  label: "Easy",  kind: "easy" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
      {GRADES.map((g) => {
        const c  = g.kind === "again" ? "var(--again)" : g.kind === "easy" ? "var(--easy)" : "var(--text-soft)";
        const bg = g.kind === "again" ? "var(--again-soft)" : g.kind === "easy" ? "var(--easy-soft)" : "var(--bg-sunken)";
        const bd = g.kind === "neutral"
          ? "var(--border)"
          : `color-mix(in oklch, ${c} 26%, transparent)`;
        return (
          <button key={g.key} className="tap" onClick={() => onGrade(g.key)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "15px 4px 13px", borderRadius: "var(--r-sm)",
              background: bg, border: `1px solid ${bd}`, color: c,
              transition: "transform .14s ease",
            }}
            onPointerDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onPointerUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
            onPointerLeave={(e)=> e.currentTarget.style.transform = "scale(1)"}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{g.label}</span>
            <span className="tnum" style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>
              {intervals ? intervalLabel(intervals[g.key]) : "…"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Review({ queue, onGrade, onExit }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [intervals, setIntervals] = useState(null);
  const [tally, setTally] = useState({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 });
  const [submitting, setSubmitting] = useState(false);

  const card = queue[index];
  const total = queue.length;
  const accent = card?.language === "en" ? "var(--en)" : "var(--kr)";
  const isKr = card?.language === "kr";

  // Reset on card change
  useEffect(() => {
    setRevealed(false);
    setIntervals(null);
    if (card) {
      api.getIntervals(card.id).then(setIntervals).catch(() => {});
      const t = setTimeout(() => speak(card.front, card.language), 260);
      return () => clearTimeout(t);
    }
  }, [index, card?.id]);

  // Keyboard shortcuts 1–4
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (!revealed) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRevealed(true); }
        return;
      }
      const map = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      if (map[e.key]) handleGrade(map[e.key]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, index]);

  async function handleGrade(grade) {
    if (submitting || !card) return;
    setSubmitting(true);
    const newTally = { ...tally, reviewed: tally.reviewed + 1, [grade]: tally[grade] + 1 };
    setTally(newTally);
    try {
      await api.reviewCard(card.id, grade);
    } catch (_) { /* best effort */ }
    if (index + 1 >= total) {
      onGrade(newTally);
    } else {
      setIndex((i) => i + 1);
      setSubmitting(false);
    }
  }

  if (!card) return null;

  const progress = (index / total) * 100;
  const tags = Array.isArray(card.tags) ? card.tags : [];
  const isNew = card.reps === 0;

  // Parse back: "front\nback" or just back
  const backLines = (card.back || "").split("\n").filter(Boolean);
  const mainBack = backLines[0] || card.back;
  const contextBack = backLines.slice(1).join(" ");

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      padding: "calc(env(safe-area-inset-top) + 16px) var(--pad) calc(env(safe-area-inset-bottom) + 18px)",
    }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="tap" onClick={onExit} aria-label="Exit review" style={{
          width: 34, height: 34, marginLeft: -6, borderRadius: 99, display: "grid", placeItems: "center",
          color: "var(--muted)",
        }}>
          <Close size={20} />
        </button>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`, borderRadius: 99,
            background: accent, transition: "width .45s cubic-bezier(.22,.61,.36,1), background .3s ease",
          }} />
        </div>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", minWidth: 44, textAlign: "right" }}>
          {index + 1}/{total}
        </span>
      </div>

      {/* lang badge */}
      <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
        <LangBadge lang={card.language} />
      </div>

      {/* card body */}
      <div key={card.id} className="fade-enter" style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "12px 6px",
      }}>
        {isNew && (
          <span style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            color: accent, marginBottom: 18, opacity: 0.85,
          }}>New card</span>
        )}

        {/* front */}
        <div className={isKr ? "kr" : ""} style={{
          fontSize: isKr ? "clamp(52px, 16vw, 76px)" : "clamp(38px, 11vw, 56px)",
          fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, color: "var(--text)",
        }}>
          {card.front}
        </div>

        {/* speaker */}
        <div style={{ marginTop: 26 }}>
          <SpeakerBtn accent={accent} onPlay={() => speak(card.front, card.language)} />
        </div>

        {/* back reveal */}
        <div style={{
          display: "grid", gridTemplateRows: revealed ? "1fr" : "0fr",
          transition: "grid-template-rows .42s cubic-bezier(.22,.61,.36,1)",
          width: "100%", marginTop: revealed ? 26 : 0,
        }}>
          <div style={{ overflow: "hidden", minHeight: 0 }}>
            <div style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(8px)",
              transition: "opacity .4s ease .06s, transform .4s ease .06s",
            }}>
              <div style={{ width: 40, height: 1, background: "var(--border-strong)", margin: "0 auto 22px" }} />
              <div style={{ fontSize: 23, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                {mainBack}
              </div>
              {contextBack && (
                <div style={{ marginTop: 9, fontSize: 14, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                  {contextBack}
                </div>
              )}
              {card.context && (
                <div style={{ marginTop: 12, fontSize: 14, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                  {card.context}
                </div>
              )}
              {tags.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {tags.map((t) => (
                    <span key={t} style={{
                      fontSize: 11.5, fontWeight: 600, color: "var(--muted)",
                      background: "var(--bg-sunken)", borderRadius: 99, padding: "3px 9px",
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* bottom action */}
      <div style={{ marginTop: "auto" }}>
        {!revealed ? (
          <button className="tap" onClick={() => setRevealed(true)} style={{
            width: "100%", padding: "17px", borderRadius: "var(--r-md)",
            background: "var(--text)", color: "var(--bg)", fontSize: 16.5, fontWeight: 700,
            boxShadow: "var(--shadow-lift)", letterSpacing: "-0.01em",
            transition: "transform .16s ease",
          }}
          onPointerDown={(e) => e.currentTarget.style.transform = "scale(0.985)"}
          onPointerUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
          onPointerLeave={(e)=> e.currentTarget.style.transform = "scale(1)"}>
            Show answer
          </button>
        ) : (
          <div className="fade-enter">
            <GradeBar onGrade={handleGrade} intervals={intervals} />
          </div>
        )}
      </div>
    </div>
  );
}
