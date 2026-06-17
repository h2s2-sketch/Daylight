import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight, Check, Layers } from "../../shared/icons.jsx";
import { CATEGORY_LABELS, relativeWeekLabel } from "./loopUtils.js";

export default function LoopDashboard({ goTo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getLoopDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="daylight-card error-card">{error}</div>;
  if (!data) return <div className="daylight-card">Loading…</div>;

  const checkedIn = Boolean(data.today_checkin);
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading">
        <h1>Loop</h1>
        <p>{date} &middot; {relativeWeekLabel(data.week_start)}</p>
      </div>

      <section className="ds-study-card">
        <span className="ds-study-bar" />
        <div className="ds-study-head">
          <span className="ds-study-icon"><Layers size={17} /></span>
          <div className="ds-study-titles">
            <strong>{checkedIn ? "Checked in for today" : "Check in for today"}</strong>
            <span>{data.checkin_count} / 7 this week</span>
          </div>
          <button className="ds-primary-button" onClick={() => goTo("checkin")}>
            {checkedIn ? "Update check-in" : "Check in"} <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="ds-task-section">
        <div className="ds-section-head">
          <span className="ds-section-label"><Layers size={16} />Weekly Focus</span>
          <span className="ds-section-meta">{data.focus_items.length} / 3</span>
        </div>
        <div className="ds-task-list">
          {data.focus_items.length === 0 && (
            <div className="ds-empty">
              <strong>No focus set this week</strong>
              <span>Choose up to 3 things to push.</span>
            </div>
          )}
          {data.focus_items.map((item) => (
            <div className="ds-task" key={item.id}>
              <span className="ds-task-title">
                {item.sort_order}. {item.title}
                {item.goal_category ? <small> &middot; {CATEGORY_LABELS[item.goal_category] || item.goal_category}</small> : null}
              </span>
              <span className="ds-section-meta">
                {item.progressed_days ? `Moved ${item.progressed_days} ${item.progressed_days === 1 ? "day" : "days"}` : "Not yet"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="ds-task-section">
        <div className="ds-section-head">
          <span className="ds-section-label"><Check size={16} />Active goals</span>
          <span className="ds-section-meta">{data.active_goals.length}</span>
        </div>
        <div className="ds-task-list">
          {data.active_goals.length === 0 && (
            <div className="ds-empty"><strong>No active goals</strong><span>Set one goal per category.</span></div>
          )}
          {data.active_goals.map((goal) => (
            <div className="ds-task" key={goal.id}>
              <span className="ds-task-title">{goal.title}</span>
              <span className="ds-section-meta">{CATEGORY_LABELS[goal.category] || goal.category}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="ds-loop-entrypoints">
        <button className="ds-primary-button" onClick={() => goTo("goals")}>Goals <ArrowRight size={14} /></button>
        <button className="ds-primary-button" onClick={() => goTo("focus")}>Weekly Focus <ArrowRight size={14} /></button>
        <button className="ds-primary-button" onClick={() => goTo("review")}>Weekly Review <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}
