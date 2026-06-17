import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Check, Plus, Trash } from "../../shared/icons.jsx";
import WeekNav from "./WeekNav.jsx";
import {
  CATEGORY_COLORS, CATEGORY_LABELS, FOCUS_STATUSES, FOCUS_STATUS_LABELS,
  MAX_FOCUS_PER_WEEK, isoWeekStart,
} from "./loopUtils.js";

function FocusSlot({ item, goals, onUpdate, onDelete }) {
  const [title, setTitle] = useState(item.title);
  const color = CATEGORY_COLORS[item.goal_category];
  return (
    <div className="loop-slot">
      <span className="six">{String(item.sort_order).padStart(2, "0")}</span>
      <div className="bd">
        <input
          className="loop-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== item.title && onUpdate(item.id, { title: title.trim() })}
        />
        <div className="sln">
          <span className="loop-dot" style={{ "--cat": color }} />
          <select
            className="loop-select"
            value={item.goal_id || ""}
            onChange={(event) => onUpdate(item.id, { goal_id: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>{CATEGORY_LABELS[goal.category] || goal.category}</option>
            ))}
          </select>
          <select className="loop-select" value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value })}>
            {FOCUS_STATUSES.map((status) => <option key={status} value={status}>{FOCUS_STATUS_LABELS[status]}</option>)}
          </select>
        </div>
      </div>
      <button className="loop-iconbtn" onClick={() => onDelete(item.id)} aria-label="Delete focus item"><Trash size={15} /></button>
    </div>
  );
}

export default function WeeklyFocusView() {
  const [weekStart, setWeekStart] = useState(isoWeekStart());
  const [items, setItems] = useState([]);
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  function load(week = weekStart) {
    api.getLoopFocusItems(week).then((rows) => { setItems(rows); setError(""); }).catch((err) => setError(err.message));
  }
  useEffect(() => { load(weekStart); }, [weekStart]);
  useEffect(() => { api.getLoopGoals({ status: "active" }).then(setGoals).catch(() => {}); }, []);

  async function addItem(event) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createLoopFocusItem({ week_start: weekStart, title: title.trim() });
      setTitle(""); load();
    } catch (err) { setError(err.message); }
  }
  async function updateItem(id, updates) {
    try { await api.updateLoopFocusItem(id, updates); load(); } catch (err) { setError(err.message); }
  }
  async function deleteItem(id) {
    try { await api.deleteLoopFocusItem(id); load(); } catch (err) { setError(err.message); }
  }

  const full = items.length >= MAX_FOCUS_PER_WEEK;

  return (
    <div className="loop-page flat">
      <header className="loop-head">
        <div className="loop-meta">Week of</div>
        <h1 className="loop-greet">This week</h1>
      </header>
      <WeekNav weekStart={weekStart} onChange={setWeekStart} />
      {error && <div className="loop-error">{error}</div>}

      {items.length === 0 && <div className="loop-empty">Nothing set for this week.</div>}
      {items.map((item) => (
        <FocusSlot key={item.id} item={item} goals={goals} onUpdate={updateItem} onDelete={deleteItem} />
      ))}

      {full ? (
        <div className="loop-capline"><Check size={12} sw={2.4} /> Three is the cap. That's the point.</div>
      ) : (
        <form className="loop-row" onSubmit={addItem} style={{ borderBottom: "none" }}>
          <input
            className="loop-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a focus item (e.g. Fitness 3×)"
          />
          <button className="loop-cta" style={{ width: "auto", marginTop: 0, padding: "12px 16px" }} disabled={!title.trim()}>
            <Plus size={15} sw={2.2} /> Add focus
          </button>
        </form>
      )}
    </div>
  );
}
