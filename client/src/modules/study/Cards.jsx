import { useState, useEffect } from "react";
import { api } from "../../shared/api.js";
import { ChevronLeft, Trash, Edit2, Plus } from "../../shared/icons.jsx";

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid var(--border)", borderTopColor: "var(--en)",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
      verticalAlign: "middle", flexShrink: 0,
    }} />
  );
}

function CardRow({ card, onEdit, onDelete, onRetry }) {
  const isEn = card.language === "en";
  const accent = isEn ? "var(--en)" : "var(--kr)";
  const soft   = isEn ? "var(--en-soft)" : "var(--kr-soft)";
  const tags   = Array.isArray(card.tags) ? card.tags : [];
  const isPending = card.status === "pending";
  const isFailed  = card.status === "failed";

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      background: "var(--surface)", border: `1px solid ${isFailed ? "color-mix(in oklch, var(--again) 30%, var(--border))" : "var(--border)"}`,
      borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "14px 16px",
      opacity: isPending ? 0.8 : 1,
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: soft, color: accent, display: "grid", placeItems: "center",
        fontWeight: 700, fontSize: 14, fontFamily: isEn ? "var(--font)" : "var(--font-kr)",
      }}>{isEn ? "En" : "한"}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 7 }}
          className={!isEn ? "kr" : ""}>
          {card.front}
          {isPending && <Spinner />}
          {isFailed && <span style={{ fontSize: 11.5, color: "var(--again)", fontWeight: 600, background: "var(--again-soft)", borderRadius: 99, padding: "2px 7px" }}>AI failed</span>}
        </div>
        <div style={{ marginTop: 3, fontSize: 13.5, color: isPending ? "var(--faint)" : "var(--text-soft)", lineHeight: 1.4, fontStyle: isPending ? "italic" : "normal" }}>
          {isPending ? "AI filling in…" : card.back}
        </div>
        {!isPending && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
            <span className="tnum" style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 500 }}>
              {card.interval}d interval · ease {card.ease.toFixed(2)}
            </span>
            {tags.map((t) => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600, color: "var(--muted)",
                background: "var(--bg-sunken)", borderRadius: 99, padding: "2px 7px",
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {isFailed && (
          <button className="tap" onClick={() => onRetry(card)} aria-label="Retry AI"
            style={{ padding: "0 10px", height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--en)", background: "var(--en-soft)", whiteSpace: "nowrap" }}>
            Retry
          </button>
        )}
        <button className="tap" onClick={() => onEdit(card)} aria-label="Edit"
          style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted)", background: "var(--bg-sunken)" }}>
          <Edit2 size={15} />
        </button>
        <button className="tap" onClick={() => onDelete(card)} aria-label="Delete"
          style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--again)", background: "var(--again-soft)" }}>
          <Trash size={15} />
        </button>
      </div>
    </div>
  );
}

function EditModal({ card, onSave, onClose }) {
  const [front, setFront]     = useState(card.front);
  const [back, setBack]       = useState(card.back);
  const [context, setContext] = useState(card.context || "");
  const [saving, setSaving]   = useState(false);

  const inputStyle = {
    width: "100%", padding: "11px 13px", borderRadius: "var(--r-sm)",
    background: "var(--bg-sunken)", border: "1px solid var(--border-strong)",
    fontSize: 14, color: "var(--text)", fontFamily: "var(--font)", outline: "none", resize: "vertical",
  };

  async function save() {
    setSaving(true);
    const updated = await api.updateCard(card.id, { front, back, context: context || null });
    onSave(updated);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: "var(--maxw)", margin: "0 auto",
        background: "var(--surface)", borderRadius: "var(--r-lg) var(--r-lg) 0 0",
        padding: "20px var(--pad) calc(env(safe-area-inset-bottom) + 24px)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Edit card</h3>
          <button className="tap" onClick={onClose} style={{ color: "var(--muted)", fontSize: 14 }}>Cancel</button>
        </div>
        <input value={front} onChange={(e) => setFront(e.target.value)} style={inputStyle} placeholder="Front" />
        <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} style={inputStyle} placeholder="Back" />
        <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} style={inputStyle} placeholder="Context (optional)" />
        <button className="tap" onClick={save} disabled={saving}
          style={{
            width: "100%", padding: "14px", borderRadius: "var(--r-md)",
            background: "var(--text)", color: "var(--bg)", fontSize: 15, fontWeight: 700,
            opacity: saving ? 0.6 : 1,
          }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function Cards({ onBack, onAddCard }) {
  const [cards, setCards]       = useState([]);
  const [language, setLanguage] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function loadCards(lang) {
    return api.getCards(lang ? { language: lang } : {}).then(setCards);
  }

  useEffect(() => {
    setLoading(true);
    loadCards(language).finally(() => setLoading(false));
  }, [language]);

  // Poll while any card is pending
  useEffect(() => {
    const hasPending = cards.some((c) => c.status === "pending");
    if (!hasPending) return;
    const t = setTimeout(() => loadCards(language), 2000);
    return () => clearTimeout(t);
  }, [cards, language]);

  async function handleDelete(card) {
    await api.deleteCard(card.id);
    setCards((c) => c.filter((x) => x.id !== card.id));
    setConfirmDelete(null);
  }

  function handleSaved(updated) {
    setCards((c) => c.map((x) => x.id === updated.id ? updated : x));
    setEditing(null);
  }

  async function handleRetry(card) {
    const updated = await api.retryCard(card.id);
    setCards((c) => c.map((x) => x.id === updated.id ? updated : x));
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflowY: "auto",
      padding: "calc(env(safe-area-inset-top) + 16px) var(--pad) 28px",
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button className="tap" onClick={onBack} style={{
          width: 34, height: 34, marginLeft: -6, borderRadius: 99, display: "grid", placeItems: "center",
          color: "var(--muted)",
        }}>
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", flex: 1 }}>All cards</h2>
        <button className="tap" onClick={onAddCard}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", borderRadius: 99,
            background: "var(--text)", color: "var(--bg)", fontSize: 13.5, fontWeight: 600,
          }}>
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[null, "en", "kr"].map((l) => (
          <button key={String(l)} className="tap" onClick={() => setLanguage(l)}
            style={{
              padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              background: language === l ? "var(--text)" : "var(--surface)",
              color: language === l ? "var(--bg)" : "var(--text-soft)",
              border: `1px solid ${language === l ? "transparent" : "var(--border)"}`,
            }}>
            {l === null ? "All" : l === "en" ? "English" : "Korean"}
          </button>
        ))}
        <span className="tnum" style={{ marginLeft: "auto", fontSize: 13, color: "var(--faint)", alignSelf: "center" }}>
          {cards.length} cards
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--faint)", fontSize: 14 }}>Loading…</div>
      ) : cards.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--faint)", fontSize: 14 }}>
          No cards yet.{" "}
          <button className="tap" onClick={onAddCard} style={{ color: "var(--en)", fontWeight: 600 }}>Add one</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cards.map((card) => (
            <CardRow key={card.id} card={card}
              onEdit={setEditing}
              onDelete={setConfirmDelete}
              onRetry={handleRetry} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal card={editing} onSave={handleSaved} onClose={() => setEditing(null)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end",
        }} onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div style={{
            width: "100%", maxWidth: "var(--maxw)", margin: "0 auto",
            background: "var(--surface)", borderRadius: "var(--r-lg) var(--r-lg) 0 0",
            padding: "20px var(--pad) calc(env(safe-area-inset-bottom) + 24px)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Delete card?</h3>
            <p style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.4 }}>
              "<b>{confirmDelete.front}</b>" and its review history will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="tap" onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: "13px", borderRadius: "var(--r-md)", background: "var(--bg-sunken)", fontSize: 15, fontWeight: 600, color: "var(--text-soft)" }}>
                Cancel
              </button>
              <button className="tap" onClick={() => handleDelete(confirmDelete)}
                style={{ flex: 1, padding: "13px", borderRadius: "var(--r-md)", background: "var(--again)", color: "#fff", fontSize: 15, fontWeight: 700 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
