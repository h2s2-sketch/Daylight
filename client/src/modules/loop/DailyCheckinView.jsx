import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Check } from "../../shared/icons.jsx";
import { CATEGORY_COLORS, isoWeekStart, localISODate } from "./loopUtils.js";

export default function DailyCheckinView({ onClose }) {
  const today = localISODate();
  const weekStart = isoWeekStart(today);
  const [focusItems, setFocusItems] = useState([]);
  const [progressed, setProgressed] = useState([]);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

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
    setProgressed((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function save() {
    try {
      await api.putLoopCheckin({ date: today, progressed_focus_ids: progressed, energy, note: note.trim() || null });
      onClose();
    } catch (err) { setError(err.message); }
  }

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="loop-scrim" onClick={onClose}>
      <div className="loop-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="loop-grab" />
        <div className="loop-sheet-title">How did today go?</div>
        <div className="loop-sheet-date">{dateLabel}</div>
        {error && <div className="loop-error">{error}</div>}

        <div className="loop-sl">Made progress on</div>
        {focusItems.length === 0 && <div className="loop-empty">No focus items this week — set your weekly focus first.</div>}
        {focusItems.map((item) => {
          const on = progressed.includes(item.id);
          return (
            <button key={item.id} className={`loop-tog${on ? " on" : ""}`} onClick={() => toggle(item.id)}>
              <span className="ck">{on ? <Check size={13} sw={2.6} /> : null}</span>
              <span className="loop-bar" style={{ "--cat": CATEGORY_COLORS[item.goal_category], height: 20 }} />
              <span className="nm">{item.title}</span>
            </button>
          );
        })}

        <div className="loop-sl">Energy <span className="opt">· optional</span></div>
        <div className="loop-energy">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} className={energy === value ? "on" : ""} onClick={() => setEnergy(energy === value ? null : value)}>{value}</button>
          ))}
        </div>

        <div className="loop-sl">Note <span className="opt">· optional</span></div>
        <textarea
          className="loop-note-field"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything worth remembering?"
        />

        <button className="loop-cta" onClick={save}>Done</button>
      </div>
    </div>
  );
}
