import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { speak } from "../../shared/tts.js";
import { ChevronLeft, Speaker, Check } from "../../shared/icons.jsx";

export default function HangulDrill({ onDone }) {
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getHangulQueue().then(setSession).catch((err) => setError(err.message));
  }, []);

  if (error) return <Message text={`Could not load Hangul drills: ${error}`} onDone={onDone} />;
  if (!session) return <Message text="Loading Hangul drills..." onDone={onDone} />;
  if (summary) return <DrillSummary summary={summary} onDone={onDone} />;

  const cards = session.cards || [];
  if (cards.length === 0) {
    return <Message title="Ready for a break" text="No Hangul cards are available yet." onDone={onDone} />;
  }

  const card = cards[index];
  const isAnswered = answer !== null;
  const isCorrect = answer === card.back;
  const progress = ((index + (isAnswered ? 1 : 0)) / cards.length) * 100;

  async function choose(option) {
    if (isAnswered || submitting) return;
    const correctAnswer = option === card.back;
    setAnswer(option);
    if (correctAnswer) setCorrect((value) => value + 1);
    setSubmitting(true);
    try {
      if (card.scheduled) {
        await api.reviewCard(card.id, correctAnswer ? "good" : "again");
      } else {
        await api.answerHangulCard(card.id, correctAnswer, false);
      }
    } catch (_) {
      // Keep the session moving if a write briefly fails; dashboard refresh will expose it.
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    if (submitting) return;
    if (index + 1 >= cards.length) {
      let latest = session.progress;
      try { latest = await api.getHangulProgress(); } catch (_) {}
      setSummary({
        total: cards.length,
        correct,
        scheduled: session.session?.scheduled || 0,
        practice: session.session?.practice || 0,
        progress: latest,
      });
      return;
    }
    setIndex((value) => value + 1);
    setAnswer(null);
  }

  return (
    <div className="fade-enter" style={{
      flex: 1, display: "flex", flexDirection: "column",
      padding: "calc(env(safe-area-inset-top) + 16px) var(--pad) calc(env(safe-area-inset-bottom) + 18px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="tap" onClick={() => onDone(null)} aria-label="Exit Hangul drill" style={{
          width: 34, height: 34, marginLeft: -6, borderRadius: 99,
          display: "grid", placeItems: "center", color: "var(--muted)",
        }}><ChevronLeft size={22} /></button>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--kr)", borderRadius: 99, transition: "width .3s ease" }} />
        </div>
        <span className="tnum" style={{ minWidth: 44, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
          {index + 1}/{cards.length}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--kr)" }}>
            {card.course_stage === 1 ? "Hangul letter" : "Hangul syllable"}
          </span>
          {!card.scheduled && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", background: "var(--bg-sunken)", borderRadius: 99, padding: "3px 7px" }}>
              Extra practice
            </span>
          )}
        </div>
        <div className="kr" style={{ marginTop: 22, fontSize: "clamp(76px, 24vw, 112px)", lineHeight: 1, fontWeight: 700 }}>
          {card.front}
        </div>
        <button className="tap" onClick={() => speak(card.front, "kr")} aria-label="Play Korean pronunciation" style={{
          marginTop: 24, width: 46, height: 46, borderRadius: 99, display: "grid", placeItems: "center",
          color: "var(--kr)", background: "var(--kr-soft)", border: "1px solid color-mix(in oklch, var(--kr) 20%, transparent)",
        }}><Speaker size={21} /></button>
        <p style={{ marginTop: 18, fontSize: 14, color: "var(--muted)" }}>Choose the matching sound</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {card.choices.map((option) => {
          const selected = answer === option;
          const revealCorrect = isAnswered && option === card.back;
          const wrong = selected && !isCorrect;
          return (
            <button key={option} className="tap" onClick={() => choose(option)} disabled={isAnswered} style={{
              minHeight: 62, padding: "14px 8px", borderRadius: "var(--r-md)",
              background: revealCorrect ? "var(--easy-soft)" : wrong ? "var(--again-soft)" : "var(--surface)",
              color: revealCorrect ? "var(--easy)" : wrong ? "var(--again)" : "var(--text)",
              border: `1px solid ${revealCorrect ? "color-mix(in oklch, var(--easy) 35%, transparent)" : wrong ? "color-mix(in oklch, var(--again) 35%, transparent)" : "var(--border)"}`,
              boxShadow: "var(--shadow)", fontSize: 17, fontWeight: 700,
            }}>{option}</button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="fade-enter" style={{ marginTop: 12 }}>
          <div style={{ textAlign: "center", color: isCorrect ? "var(--easy)" : "var(--again)", marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>
              {isCorrect ? "Correct" : `Answer: ${card.back}`}
            </div>
            {!isCorrect && (
              <div style={{ margin: "7px auto 0", maxWidth: 360, fontSize: 12.5, lineHeight: 1.4, color: "var(--text-soft)" }}>
                {card.pronunciationHint}
              </div>
            )}
          </div>
          <button className="tap" onClick={next} disabled={submitting} style={{
            width: "100%", padding: 16, borderRadius: "var(--r-md)", background: "var(--text)", color: "var(--bg)",
            fontSize: 16, fontWeight: 700, boxShadow: "var(--shadow-lift)", opacity: submitting ? 0.6 : 1,
          }}>{index + 1 === cards.length ? "See results" : "Next"}</button>
        </div>
      )}
    </div>
  );
}

function DrillSummary({ summary, onDone }) {
  const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
  const foundation = summary.progress?.foundation || {};
  return (
    <div className="fade-enter" style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "calc(env(safe-area-inset-top) + 28px) var(--pad) calc(env(safe-area-inset-bottom) + 24px)", textAlign: "center",
    }}>
      <div style={{ width: 68, height: 68, borderRadius: 99, display: "grid", placeItems: "center", background: "var(--easy-soft)", color: "var(--easy)", marginBottom: 18 }}>
        <Check size={32} sw={2.2} />
      </div>
      <h1 style={{ fontSize: 27, letterSpacing: "-.02em" }}>Hangul session complete</h1>
      <p style={{ marginTop: 8, color: "var(--text-soft)", lineHeight: 1.45 }}>
        You got <b style={{ color: "var(--text)" }}>{summary.correct} of {summary.total}</b> correct.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, width: "100%", maxWidth: 380, marginTop: 24 }}>
        <SummaryStat value={`${pct}%`} label="Accuracy" accent="var(--easy)" />
        <SummaryStat value={foundation.todayAttempts || 0} label="Today" accent="var(--kr)" />
      </div>

      <div style={{ width: "100%", maxWidth: 380, marginTop: 10, padding: "16px 17px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
          <span style={{ color: "var(--text-soft)" }}>Foundation progress</span>
          <b className="tnum" style={{ color: "var(--kr)" }}>{foundation.percent || 0}%</b>
        </div>
        <div style={{ marginTop: 10, height: 7, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
          <div style={{ width: `${foundation.percent || 0}%`, height: "100%", borderRadius: 99, background: "var(--kr)" }} />
        </div>
        <div style={{ marginTop: 9, fontSize: 12.5, lineHeight: 1.4, color: "var(--muted)" }}>
          {foundation.introduced || 0}/{foundation.total || 0} seen · {foundation.mastered || 0}/{foundation.masteryTarget || 0} building recall
          {summary.practice > 0 ? ` · ${summary.practice} extra practice` : ""}
        </div>
      </div>

      <button className="tap" onClick={() => onDone(summary)} style={{
        marginTop: 22, width: "100%", maxWidth: 380, padding: 16, borderRadius: "var(--r-md)",
        background: "var(--text)", color: "var(--bg)", fontSize: 16, fontWeight: 700, boxShadow: "var(--shadow-lift)",
      }}>Back to today</button>
    </div>
  );
}

function SummaryStat({ value, label, accent }) {
  return (
    <div style={{ padding: "16px 12px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      <div className="tnum" style={{ fontSize: 29, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

function Message({ title, text, onDone }) {
  return (
    <div className="fade-enter" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--pad)", textAlign: "center" }}>
      {title && <div style={{ width: 58, height: 58, borderRadius: 99, display: "grid", placeItems: "center", background: "var(--easy-soft)", color: "var(--easy)", marginBottom: 18 }}><Check size={28} /></div>}
      {title && <h1 style={{ fontSize: 25 }}>{title}</h1>}
      <p style={{ marginTop: title ? 8 : 0, color: "var(--muted)", lineHeight: 1.5, maxWidth: 340 }}>{text}</p>
      <button className="tap" onClick={() => onDone(null)} style={{ marginTop: 24, width: "100%", maxWidth: 360, padding: 15, borderRadius: "var(--r-md)", background: "var(--text)", color: "var(--bg)", fontWeight: 700 }}>Back to today</button>
    </div>
  );
}
