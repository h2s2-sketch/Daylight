import { ChevronLeft, Chevron } from "../../shared/icons.jsx";
import { nextWeekStart, prevWeekStart, relativeWeekLabel } from "./loopUtils.js";

// Basic week selector: previous / next around a week_start (Monday).
export default function WeekNav({ weekStart, onChange }) {
  return (
    <div className="ds-loop-weeknav">
      <button className="ds-text-link" onClick={() => onChange(prevWeekStart(weekStart))} aria-label="Previous week">
        <ChevronLeft size={16} />
      </button>
      <strong>{relativeWeekLabel(weekStart)}</strong>
      <button className="ds-text-link" onClick={() => onChange(nextWeekStart(weekStart))} aria-label="Next week">
        <Chevron size={16} />
      </button>
    </div>
  );
}
