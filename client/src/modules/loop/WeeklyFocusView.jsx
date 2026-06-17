import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Plus, Trash } from "../../shared/icons.jsx";
import WeekNav from "./WeekNav.jsx";
import {
  CATEGORY_LABELS, FOCUS_STATUSES, FOCUS_STATUS_LABELS, MAX_FOCUS_PER_WEEK, isoWeekStart,
} from "./loopUtils.js";

function FocusRow({ item, goals, onUpdate, onDelete }) {
  const [title, setTitle] = useState(item.title);
  return (
    <div className="ds-task">
      <input
        className="ds-loop-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => title.trim() && title !== item.title && onUpdate(item.id, { title: title.trim() })}
      />
      <select
        value={item.goal_id || ""}
        onChange={(event) => onUpdate(item.id, { goal_id: event.target.value ? Number(event.target.value) : null })}
      >
        <option value="">No goal</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>{CATEGORY_LABELS[goal.category] || goal.category}</option>
        ))}
      </select>
      <select value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value })}>
        {FOCUS_STATUSES.map((status) => <option key={status} value={status}>{FOCUS_STATUS_LABELS[status]}</option>)}
      </select>
      <button className="ds-text-link" onClick={() => onDelete(item.id)} aria-label="Delete focus item"><Trash size={15} /></button>
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
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading">
        <h1>Weekly Focus</h1>
        <p>Maximum 3. That's the point.</p>
      </div>
      <WeekNav weekStart={weekStart} onChange={setWeekStart} />
      {error && <div className="daylight-card error-card">{error}</div>}
      <section className="ds-task-section">
        <div className="ds-section-head">
          <span className="ds-section-label">Focus items</span>
          <span className="ds-section-meta">{items.length} / 3</span>
        </div>
        <div className="ds-task-list">
          {items.length === 0 && <div className="ds-task"><span className="ds-section-meta">Nothing set for this week.</span></div>}
          {items.map((item) => (
            <FocusRow key={item.id} item={item} goals={goals} onUpdate={updateItem} onDelete={deleteItem} />
          ))}
        </div>
      </section>
      {full ? (
        <div className="daylight-card">Three is the cap. That's the point.</div>
      ) : (
        <form className="ds-task" onSubmit={addItem}>
          <input
            className="ds-loop-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a focus item (e.g. Fitness 3×)"
          />
          <button className="ds-primary-button" disabled={!title.trim()}><Plus size={15} /> Add</button>
        </form>
      )}
    </div>
  );
}
