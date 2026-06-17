import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Plus } from "../../shared/icons.jsx";
import { CATEGORY_LABELS, CATEGORY_ORDER, GOAL_STATUS_LABELS, GOAL_STATUSES } from "./loopUtils.js";

function GoalRow({ goal, onUpdate, onDelete }) {
  const [title, setTitle] = useState(goal.title);
  return (
    <div className="ds-task">
      <input
        className="ds-loop-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => title.trim() && title !== goal.title && onUpdate(goal.id, { title: title.trim() })}
      />
      <select value={goal.status} onChange={(event) => onUpdate(goal.id, { status: event.target.value })}>
        {GOAL_STATUSES.map((status) => <option key={status} value={status}>{GOAL_STATUS_LABELS[status]}</option>)}
      </select>
      <button className="ds-text-link" onClick={() => onDelete(goal.id)}>Delete</button>
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
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading">
        <h1>Goals</h1>
        <p>One active goal per category</p>
      </div>
      {error && <div className="daylight-card error-card">{error}</div>}
      <div className="ds-section-stack">
        {CATEGORY_ORDER.map((category) => {
          const list = goals.filter((goal) => goal.category === category);
          const hasActive = list.some((goal) => goal.status === "active");
          return (
            <section className="ds-task-section" key={category}>
              <div className="ds-section-head">
                <span className="ds-section-label">{CATEGORY_LABELS[category]}</span>
                <button
                  className="ds-text-link"
                  onClick={() => { setCreatingFor(creatingFor === category ? null : category); setNewTitle(""); }}
                >
                  <Plus size={14} /> Add goal
                </button>
              </div>
              <div className="ds-task-list">
                {list.length === 0 && creatingFor !== category && (
                  <div className="ds-task"><span className="ds-section-meta">No goal yet</span></div>
                )}
                {list.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
                ))}
                {creatingFor === category && (
                  <form
                    className="ds-task"
                    onSubmit={(event) => { event.preventDefault(); createGoal(category); }}
                  >
                    <input
                      className="ds-loop-input"
                      autoFocus
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      placeholder={hasActive ? "New goal (will need a free category)" : "Short goal title"}
                    />
                    <button className="ds-primary-button" disabled={!newTitle.trim()}>Create</button>
                  </form>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
