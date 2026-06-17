import { ChevronLeft, Chevron } from "../../shared/icons.jsx";
import { nextWeekStart, prevWeekStart, relativeWeekLabel, weekRangeLabel } from "./loopUtils.js";

// Basic week selector: previous / next around a week_start (Monday).
export default function WeekNav({ weekStart, onChange }) {
  return (
    <div className="loop-weeknav">
      <button className="loop-iconbtn" onClick={() => onChange(prevWeekStart(weekStart))} aria-label="Previous week">
        <ChevronLeft size={16} />
      </button>
      <div className="loop-weeknav-label">
        <strong>{relativeWeekLabel(weekStart)}</strong>
        <span>{weekRangeLabel(weekStart)}</span>
      </div>
      <button className="loop-iconbtn" onClick={() => onChange(nextWeekStart(weekStart))} aria-label="Next week">
        <Chevron size={16} />
      </button>
    </div>
  );
}
