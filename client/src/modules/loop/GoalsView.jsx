import { useEffect, useState } from "react";
import { Plus, Trash } from "../../shared/icons.jsx";
import { api } from "../../shared/api.js";
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER, GOAL_STATUS_LABELS, GOAL_STATUSES } from "./loopUtils.js";

function GoalCard({ goal, onUpdate, onDelete }) {
  const [title, setTitle] = useState(goal.title);
  return (
    <div className="loop-gcard">
      <input
        className="loop-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => title.trim() && title !== goal.title && onUpdate(goal.id, { title: title.trim() })}
      />
      <select className="loop-select" value={goal.status} onChange={(event) => onUpdate(goal.id, { status: event.target.value })}>
        {GOAL_STATUSES.map((status) => <option key={status} value={status}>{GOAL_STATUS_LABELS[status]}</option>)}
      </select>
      <button className="loop-iconbtn" onClick={() => onDelete(goal.id)} aria-label="Delete goal"><Trash size={15} /></button>
    </div>
  );
}

export default function GoalsView() {
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState("");
  const [creatingFor, setCreatingFor] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  function load() {
    api.getLoopGoals().then((rows) => { setGoals(rows); setError(""); }).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function createGoal(category) {
    if (!newTitle.trim()) return;
    try {
      await api.createLoopGoal({ category, title: newTitle.trim() });
      setNewTitle(""); setCreatingFor(null); load();
    } catch (err) { setError(err.message); }
  }
  async function updateGoal(id, updates) {
    try { await api.updateLoopGoal(id, updates); load(); } catch (err) { setError(err.message); }
  }
  async function deleteGoal(id) {
    try { await api.deleteLoopGoal(id); load(); } catch (err) { setError(err.message); }
  }

  return (
    <div className="loop-page flat">
      <header className="loop-head">
        <h1 className="loop-greet">Goals</h1>
        <div className="loop-meta" style={{ margin: "6px 0 0" }}>One active goal per category</div>
      </header>
      {error && <div className="loop-error">{error}</div>}

      {CATEGORY_ORDER.map((category) => {
        const list = goals.filter((goal) => goal.category === category);
        const hasActive = list.some((goal) => goal.status === "active");
        return (
          <div className="loop-ggroup" key={category}>
            <div className="loop-ggh">
              <span className="loop-dot" style={{ "--cat": CATEGORY_COLORS[category] }} />
              <span className="gt">{CATEGORY_LABELS[category]}</span>
              <button
                className="loop-back add"
                onClick={() => { setCreatingFor(creatingFor === category ? null : category); setNewTitle(""); }}
              ><Plus size={13} /> Add</button>
            </div>

            {list.map((goal) => (
              <div key={goal.id} style={{ marginBottom: 8 }}>
                <GoalCard goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
              </div>
            ))}

            {list.length === 0 && creatingFor !== category && (
              <button className="loop-gcard empty" onClick={() => { setCreatingFor(category); setNewTitle(""); }}>
                <Plus size={13} sw={2.2} /> Set a goal
              </button>
            )}

            {creatingFor === category && (
              <form className="loop-gcard" onSubmit={(event) => { event.preventDefault(); createGoal(category); }}>
                <input
                  className="loop-input"
                  autoFocus
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder={hasActive ? "New goal (needs a free category)" : "Short goal title"}
                />
                <button className="loop-cta" style={{ width: "auto", marginTop: 0, padding: "9px 14px", fontSize: 13 }} disabled={!newTitle.trim()}>Create</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
