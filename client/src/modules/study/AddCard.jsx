import { useState } from "react";
import { api } from "../../shared/api.js";
import { ChevronLeft } from "../../shared/icons.jsx";

const TAGS_EN = ["work", "tender", "site", "email", "general", "phrasal-verb"];
const TAGS_KR = ["core", "song", "slang", "grammar"];

export default function AddCard({ onBack, onCreated }) {
  const [language, setLanguage] = useState("en");
  const [type, setType]         = useState("vocabulary");
  const [front, setFront]       = useState("");
  const [back, setBack]         = useState("");
  const [context, setContext]   = useState("");
  const [tags, setTags]         = useState([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const tagOptions = language === "en" ? TAGS_EN : TAGS_KR;

  function toggleTag(t) {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      setError("Front and back are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const card = await api.createCard({ language, type, front, back, context: context || null, tags });
      onCreated(card);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "13px 14px", borderRadius: "var(--r-sm)",
    background: "var(--surface)", border: "1px solid var(--border-strong)",
    fontSize: 15, color: "var(--text)", fontFamily: "var(--font)",
    outline: "none", resize: "vertical",
  };

  const labelStyle = {
    display: "block", fontSize: 12.5, fontWeight: 600,
    letterSpacing: "0.04em", textTransform: "uppercase",
    color: "var(--muted)", marginBottom: 7,
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflowY: "auto",
      padding: "calc(env(safe-area-inset-top) + 16px) var(--pad) 28px",
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button className="tap" onClick={onBack} style={{
          width: 34, height: 34, marginLeft: -6, borderRadius: 99, display: "grid", placeItems: "center",
          color: "var(--muted)",
        }}>
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Add card</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Language + type row */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Language</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["en", "kr"].map((l) => (
                <button type="button" key={l} className="tap" onClick={() => { setLanguage(l); setTags([]); }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 600,
                    background: language === l ? "var(--text)" : "var(--surface)",
                    color: language === l ? "var(--bg)" : "var(--text-soft)",
                    border: `1px solid ${language === l ? "transparent" : "var(--border)"}`,
                  }}>
                  {l === "en" ? "English" : "Korean"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              style={{ ...inputStyle, padding: "11px 14px", cursor: "pointer" }}>
              <option value="vocabulary">Vocabulary</option>
              <option value="cloze">Cloze</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>

        {/* Front */}
        <div>
          <label style={labelStyle}>Front <span style={{ color: "var(--faint)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(word / prompt)</span></label>
          <input value={front} onChange={(e) => setFront(e.target.value)} style={inputStyle}
            placeholder={language === "en" ? "e.g. resilience" : "e.g. 약속"} />
        </div>

        {/* Back */}
        <div>
          <label style={labelStyle}>Back <span style={{ color: "var(--faint)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(meaning / answer)</span></label>
          <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} style={inputStyle}
            placeholder={language === "en" ? "e.g. 韌性 — capacity to recover from difficulties" : "e.g. promise / appointment — yaksok"} />
        </div>

        {/* Context */}
        <div>
          <label style={labelStyle}>Context <span style={{ color: "var(--faint)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(optional hint / example)</span></label>
          <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} style={inputStyle}
            placeholder="e.g. She showed great resilience after the setback." />
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tagOptions.map((t) => (
              <button type="button" key={t} className="tap" onClick={() => toggleTag(t)}
                style={{
                  padding: "6px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                  background: tags.includes(t) ? "var(--text)" : "var(--surface)",
                  color: tags.includes(t) ? "var(--bg)" : "var(--text-soft)",
                  border: `1px solid ${tags.includes(t) ? "transparent" : "var(--border)"}`,
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13.5, color: "var(--again)", background: "var(--again-soft)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
            {error}
          </p>
        )}

        <button type="submit" className="tap" disabled={saving}
          style={{
            width: "100%", padding: "16px", borderRadius: "var(--r-md)",
            background: "var(--text)", color: "var(--bg)", fontSize: 16, fontWeight: 700,
            boxShadow: "var(--shadow-lift)", letterSpacing: "-0.01em",
            opacity: saving ? 0.6 : 1, cursor: saving ? "wait" : "pointer",
          }}>
          {saving ? "Saving…" : "Add card"}
        </button>
      </form>
    </div>
  );
}
