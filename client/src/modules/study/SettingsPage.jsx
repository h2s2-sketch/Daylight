import { useState, useEffect } from "react";
import { api } from "../../shared/api.js";

function Row({ label, description, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "16px 18px",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {description && (
          <div style={{ marginTop: 2, fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage({ theme, onToggleTheme }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  async function save(key, value) {
    setSaving(true);
    const updated = await api.patchSettings({ [key]: value });
    setSettings(updated);
    setSaving(false);
  }

  const numInput = (key, min = 1, max = 50) => (
    <input type="number" min={min} max={max}
      value={settings?.[key] ?? ""}
      onChange={(e) => save(key, e.target.value)}
      style={{
        width: 64, padding: "8px 10px", borderRadius: "var(--r-sm)", textAlign: "center",
        background: "var(--bg-sunken)", border: "1px solid var(--border-strong)",
        fontSize: 15, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font)",
        outline: "none",
      }}
    />
  );

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: "calc(env(safe-area-inset-top) + 20px) var(--pad) 28px",
    }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 22 }}>Settings</h2>

      <section style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
          Daily new cards
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="English — new cards / day" description="Default 10. Overdue cards always take priority.">
            {settings ? numInput("study_new_en_daily") : <span style={{ color: "var(--faint)", fontSize: 14 }}>…</span>}
          </Row>
          <Row label="Korean — new cards / day" description="Default 5.">
            {settings ? numInput("study_new_kr_daily") : <span style={{ color: "var(--faint)", fontSize: 14 }}>…</span>}
          </Row>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
          Appearance
        </div>
        <Row label="Dark mode" description="Toggle between light and dark theme.">
          <button className="tap" onClick={onToggleTheme}
            style={{
              width: 48, height: 28, borderRadius: 99, position: "relative",
              background: theme === "dark" ? "var(--text)" : "var(--bg-sunken)",
              border: "1px solid var(--border-strong)",
              transition: "background .2s ease",
            }}>
            <span style={{
              position: "absolute", top: 3, left: theme === "dark" ? "calc(100% - 25px)" : 3,
              width: 20, height: 20, borderRadius: 99,
              background: theme === "dark" ? "var(--bg)" : "var(--faint)",
              transition: "left .2s ease",
            }} />
          </button>
        </Row>
      </section>

      <section>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
          About
        </div>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 18px",
          fontSize: 13.5, color: "var(--text-soft)", lineHeight: 1.6,
        }}>
          <b style={{ color: "var(--text)" }}>Lumi</b> — Phase 1 MVP<br />
          SM-2 spaced repetition · English + Korean · SQLite<br />
          <span style={{ color: "var(--faint)" }}>A streak counts when the due queue is cleared or ≥15 cards reviewed.</span>
        </div>
      </section>
    </div>
  );
}
