import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight } from "../../shared/icons.jsx";
import WeekNav from "./WeekNav.jsx";
import { FOCUS_STATUS_LABELS, isoWeekStart, nextWeekStart } from "./loopUtils.js";

const SCORES = ["done", "partial", "missed", "carried"];

export default function WeeklyReviewView() {
  const [weekStart, setWeekStart] = useState(isoWeekStart());
  const [items, setItems] = useState([]);
  const [wins, setWins] = useState("");
  const [slipped, setSlipped] = useState("");
  const [learning, setLearning] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");

  function load(week = weekStart) {
    setNotice("");
    Promise.all([
      api.getLoopFocusItems(week),
      api.getLoopReview(week),
    ]).then(([focus, review]) => {
      setItems(focus);
      setWins(review?.wins || "");
      setSlipped(review?.slipped || "");
      setLearning(review?.learning || "");
      setError("");
    }).catch((err) => setError(err.message));
  }
  useEffect(() => { load(weekStart); }, [weekStart]);

  async function scoreItem(id, status) {
    try { await api.updateLoopFocusItem(id, { status }); load(); } catch (err) { setError(err.message); }
  }

  async function saveReview() {
    try {
      await api.putLoopReview({ week_start: weekStart, wins: wins.trim() || null, slipped: slipped.trim() || null, learning: learning.trim() || null });
      setSaved(true); setError("");
    } catch (err) { setError(err.message); }
  }

  // Simple carry-forward: create a next-week focus item with the same title,
  // then mark this week's item as "carried".
  async function carryForward(item) {
    try {
      await api.createLoopFocusItem({ week_start: nextWeekStart(weekStart), title: item.title, goal_id: item.goal_id || null });
      await api.updateLoopFocusItem(item.id, { status: "carried" });
      setNotice(`Carried "${item.title}" to next week.`);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading">
        <h1>Weekly Review</h1>
        <p>Close the week</p>
      </div>
      <WeekNav weekStart={weekStart} onChange={setWeekStart} />
      {error && <div className="daylight-card error-card">{error}</div>}
      {notice && <div className="daylight-card">{notice}</div>}

      <section className="ds-task-section">
        <div className="ds-section-head"><span className="ds-section-label">Looking back</span></div>
        <div className="ds-task-list">
          {items.length === 0 && <div className="ds-task"><span className="ds-section-meta">No focus items for this week.</span></div>}
          {items.map((item) => (
            <div className="ds-task" key={item.id}>
              <span className="ds-task-title">{item.sort_order}. {item.title}</span>
              <select value={SCORES.includes(item.status) ? item.status : ""} onChange={(event) => scoreItem(item.id, event.target.value)}>
                <option value="" disabled>Score…</option>
                {SCORES.map((status) => <option key={status} value={status}>{FOCUS_STATUS_LABELS[status]}</option>)}
              </select>
              <button className="ds-text-link" onClick={() => carryForward(item)}>Carry forward <ArrowRight size={13} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="ds-task-section">
        <div className="ds-section-head"><span className="ds-section-label">Reflecting</span></div>
        <label className="ds-loop-note">What worked this week?
          <textarea value={wins} onChange={(event) => { setSaved(false); setWins(event.target.value); }} rows={2} />
        </label>
        <label className="ds-loop-note">What slipped?
          <textarea value={slipped} onChange={(event) => { setSaved(false); setSlipped(event.target.value); }} rows={2} />
        </label>
        <label className="ds-loop-note">What should I change next week?
          <textarea value={learning} onChange={(event) => { setSaved(false); setLearning(event.target.value); }} rows={2} />
        </label>
      </section>

      <button className="ds-primary-button" onClick={saveReview}>{saved ? "Saved" : "Save review"}</button>
    </div>
  );
}
