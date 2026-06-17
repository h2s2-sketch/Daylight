import { useState } from "react";
import LoopDashboard from "./LoopDashboard.jsx";
import GoalsView from "./GoalsView.jsx";
import WeeklyFocusView from "./WeeklyFocusView.jsx";
import DailyCheckinView from "./DailyCheckinView.jsx";
import WeeklyReviewView from "./WeeklyReviewView.jsx";

const VIEWS = [
  ["dashboard", "Dashboard"],
  ["goals", "Goals"],
  ["focus", "Weekly Focus"],
  ["checkin", "Check-in"],
  ["review", "Weekly Review"],
];

export default function LoopSection() {
  const [view, setView] = useState("dashboard");

  // Re-mount sub-views on navigation so each fetches fresh data (incl. the
  // dashboard's derived counters after a check-in or review).
  return (
    <div>
      <div className="ds-segmented ds-loop-nav">
        {VIEWS.map(([id, label]) => (
          <button key={id} className={view === id ? "on" : ""} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>
      {view === "dashboard" && <LoopDashboard key="dashboard" goTo={setView} />}
      {view === "goals" && <GoalsView key="goals" />}
      {view === "focus" && <WeeklyFocusView key="focus" />}
      {view === "checkin" && <DailyCheckinView key="checkin" />}
      {view === "review" && <WeeklyReviewView key="review" />}
    </div>
  );
}
