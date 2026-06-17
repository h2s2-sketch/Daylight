import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Check } from "../../shared/icons.jsx";
import { isoWeekStart, localISODate } from "./loopUtils.js";

export default function DailyCheckinView() {
  const today = localISODate();
  const weekStart = isoWeekStart(today);
  const [focusItems, setFocusItems] = useState([]);
  const [progressed, setProgressed] = useState([]);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getLoopFocusItems(weekStart),
      api.getLoopCheckin(today),
    ]).then(([items, checkin]) => {
      setFocusItems(items);
      if (checkin) {
        setProgressed(checkin.progressed_focus_ids || []);
        setEnergy(checkin.energy ?? null);
        setNote(checkin.note || "");
      }
      setError("");
    }).catch((err) => setError(err.message));
  }, [today, weekStart]);

  function toggle(id) {
    setSaved(false);
    setProgressed((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function save() {
    try {
      await api.putLoopCheckin({ date: today, progressed_focus_ids: progressed, energy, note: note.trim() || null });
      setSaved(true); setError("");
    } catch (err) { setError(err.message); }
  }

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading">
        <h1>Daily Check-in</h1>
        <p>{dateLabel}</p>
      </div>
      {error && <div className="daylight-card error-card">{error}</div>}
      <section className="ds-task-section">
        <div className="ds-section-head"><span className="ds-section-label">Made progress on</span></div>
        <div className="ds-task-list">
          {focusItems.length === 0 && (
            <div className="ds-empty"><strong>No focus items this week</strong><span>Set your weekly focus first.</span></div>
          )}
          {focusItems.map((item) => {
            const on = progressed.includes(item.id);
            return (
              <button key={item.id} className="ds-task" onClick={() => toggle(item.id)} style={{ textAlign: "left" }}>
                <span className="ds-task-title">{item.sort_order}. {item.title}</span>
                <span className="ds-section-meta">{on ? <Check size={16} /> : "—"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ds-task-section">
        <div className="ds-section-head"><span className="ds-section-label">Energy · optional</span></div>
        <div className="ds-loop-energy">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              className={energy === value ? "on" : ""}
              onClick={() => { setSaved(false); setEnergy(energy === value ? null : value); }}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <label className="ds-loop-note">
        Note · optional
        <textarea
          value={note}
          onChange={(event) => { setSaved(false); setNote(event.target.value); }}
          placeholder="Anything worth remembering?"
          rows={3}
        />
      </label>

      <button className="ds-primary-button" onClick={save} disabled={focusItems.length === 0 && progressed.length === 0}>
        {saved ? "Saved" : "Done"}
      </button>
    </div>
  );
}
