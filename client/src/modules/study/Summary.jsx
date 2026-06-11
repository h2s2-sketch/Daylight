import { Check } from "../../shared/icons.jsx";

function Stat({ value, label, accent }) {
  return (
    <div style={{
      flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
      boxShadow: "var(--shadow)", borderRadius: "var(--r-md)", padding: "16px 14px",
      textAlign: "center",
    }}>
      <div className="tnum" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: accent || "var(--text)" }}>
        {value}
      </div>
      <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function Summary({ tally, streak, onDone }) {
  const { reviewed = 0, again = 0, hard = 0, good = 0, easy = 0 } = tally;
  const retained = reviewed - again;
  const pct = reviewed ? Math.round((retained / reviewed) * 100) : 0;

  return (
    <div className="fade-enter" style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center",
      padding: "calc(env(safe-area-inset-top) + 28px) var(--pad) calc(env(safe-area-inset-bottom) + 24px)",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 99, display: "grid", placeItems: "center",
        background: "var(--easy-soft)", color: "var(--easy)", marginBottom: 22,
      }}>
        <Check size={34} sw={2.2} />
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
        Session complete
      </h1>
      <p style={{ marginTop: 8, fontSize: 15, color: "var(--text-soft)", lineHeight: 1.45, maxWidth: 320 }}>
        You reviewed <b style={{ color: "var(--text)" }}>{reviewed} cards</b>
        {streak?.current > 0 && (
          <> and kept your <b style={{ color: "var(--text)" }}>🔥 {streak.current}-day</b> streak alive</>
        )}.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 28, width: "100%", maxWidth: 380 }}>
        <Stat value={reviewed} label="Reviewed" />
        <Stat value={pct + "%"} label="Recalled" accent="var(--easy)" />
        <Stat value={again} label="To repeat" accent={again > 0 ? "var(--again)" : null} />
      </div>

      <div style={{
        marginTop: 12, width: "100%", maxWidth: 380,
        background: "var(--surface)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow)", borderRadius: "var(--r-md)", padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 11,
      }}>
        {[
          { label: "Again", n: again, c: "var(--again)" },
          { label: "Hard",  n: hard,  c: "var(--text-soft)" },
          { label: "Good",  n: good,  c: "var(--text-soft)" },
          { label: "Easy",  n: easy,  c: "var(--easy)" },
        ].map((row) => {
          const w = reviewed ? (row.n / reviewed) * 100 : 0;
          return (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 46, textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>{row.label}</span>
              <span style={{ flex: 1, height: 7, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${w}%`, background: row.c, borderRadius: 99, transition: "width .6s ease" }} />
              </span>
              <span className="tnum" style={{ width: 18, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{row.n}</span>
            </div>
          );
        })}
      </div>

      <button className="tap" onClick={onDone} style={{
        marginTop: 26, width: "100%", maxWidth: 380, padding: "16px", borderRadius: "var(--r-md)",
        background: "var(--text)", color: "var(--bg)", fontSize: 16, fontWeight: 700,
        boxShadow: "var(--shadow-lift)", letterSpacing: "-0.01em",
      }}
      onPointerDown={(e) => e.currentTarget.style.transform = "scale(0.985)"}
      onPointerUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
      onPointerLeave={(e)=> e.currentTarget.style.transform = "scale(1)"}>
        Back to today
      </button>
    </div>
  );
}
