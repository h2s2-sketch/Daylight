import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight, Check, Layers } from "../../shared/icons.jsx";
import { CATEGORY_COLORS, CATEGORY_LABELS, greeting, shouldShowReviewBanner } from "./loopUtils.js";

export default function LoopDashboard({ goTo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getLoopDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="loop-page flat"><div className="loop-error">{error}</div></div>;
  if (!data) return <div className="loop-page flat"><div className="loop-empty">Loading…</div></div>;

  const checkedIn = Boolean(data.today_checkin);
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const showBanner = shouldShowReviewBanner(data.week_start, Boolean(data.current_review));

  return (
    <div className="loop-page wash">
      <header className="loop-head sun-glow">
        <div className="loop-head-row">
          <span className="loop-eyebrow">Loop</span>
          <span className="loop-count">{data.checkin_count} / 7 this week</span>
        </div>
        <div className="loop-meta">{date}</div>
        <h1 className="loop-greet">{greeting()}</h1>

        <button className={`loop-cta${checkedIn ? " done" : ""}`} onClick={() => goTo("checkin")}>
          <Check size={17} sw={2.4} />
          {checkedIn ? "Checked in for today" : "Check in for today"}
        </button>
      </header>

      {showBanner && (
        <button className="loop-banner" onClick={() => goTo("review")}>
          <span className="bi"><Layers size={15} sw={2} /></span>
          <span>
            <span className="bt">Your week's ready to review</span>
            <span className="bs">ABOUT 4 MINUTES</span>
          </span>
          <span className="ba"><ArrowRight size={16} sw={2} /></span>
        </button>
      )}

      <div className="loop-slab"><span>Weekly focus</span><span>{String(data.focus_items.length).padStart(2, "0")}</span></div>
      {data.focus_items.length === 0 ? (
        <div className="loop-empty">No focus set this week — choose up to 3 things to push.</div>
      ) : (
        data.focus_items.map((item) => (
          <div className="loop-frow" key={item.id}>
            <span className="ix">{item.sort_order}</span>
            <span className="loop-bar" style={{ "--cat": CATEGORY_COLORS[item.goal_category] }} />
            <div className="t">
              <div className="tt">{item.title}</div>
              <div className="ts">{item.progressed_days ? `Moved ${item.progressed_days} ${item.progressed_days === 1 ? "day" : "days"}` : "Not yet"}</div>
            </div>
          </div>
        ))
      )}

      <div className="loop-slab"><span>Active goals</span><span>{String(data.active_goals.length).padStart(2, "0")}</span></div>
      {data.active_goals.length === 0 ? (
        <div className="loop-empty">No active goals — set one per category.</div>
      ) : (
        data.active_goals.map((goal) => (
          <div className="loop-grow" key={goal.id}>
            <span className="loop-dot" style={{ "--cat": CATEGORY_COLORS[goal.category] }} />
            <span className="gn">{goal.title}</span>
            <span className="gc">{CATEGORY_LABELS[goal.category] || goal.category}</span>
          </div>
        ))
      )}
    </div>
  );
}
