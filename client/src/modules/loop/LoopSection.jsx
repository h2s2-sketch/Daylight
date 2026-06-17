import { useState } from "react";
import "../../styles/loop.css";
import LoopDashboard from "./LoopDashboard.jsx";
import GoalsView from "./GoalsView.jsx";
import WeeklyFocusView from "./WeeklyFocusView.jsx";
import DailyCheckinView from "./DailyCheckinView.jsx";
import WeeklyReviewView from "./WeeklyReviewView.jsx";

const TABS = [
  ["dashboard", "Loop"],
  ["goals", "Goals"],
  ["focus", "Focus"],
  ["checkin", "Check-in"],
  ["review", "Review"],
];

export default function LoopSection() {
  const [view, setView] = useState("dashboard");
  const [checkinOpen, setCheckinOpen] = useState(false);
  // Bumped whenever the check-in sheet closes so the dashboard refetches.
  const [refreshToken, setRefreshToken] = useState(0);

  function goTo(target) {
    if (target === "checkin") { setCheckinOpen(true); return; }
    setView(target);
  }

  function closeCheckin() {
    setCheckinOpen(false);
    setRefreshToken((n) => n + 1);
  }

  return (
    <div className="loop-theme has-tabs">
      <nav className="loop-tabs" aria-label="Loop sections">
        {TABS.map(([id, label]) => {
          const active = id === "checkin" ? checkinOpen : (!checkinOpen && view === id);
          return (
            <button key={id} className={active ? "on" : ""} onClick={() => goTo(id)}>{label}</button>
          );
        })}
      </nav>

      <div className="loop-scroll">
        {view === "dashboard" && <LoopDashboard key={`dashboard-${refreshToken}`} goTo={goTo} />}
        {view === "goals" && <GoalsView key="goals" />}
        {view === "focus" && <WeeklyFocusView key="focus" />}
        {view === "review" && <WeeklyReviewView key="review" />}
      </div>

      {checkinOpen && <DailyCheckinView onClose={closeCheckin} />}
    </div>
  );
}
