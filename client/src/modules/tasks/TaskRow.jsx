import { Check, Projects } from "../../shared/icons.jsx";
import { displayTaskDate, taskDate, taskTime } from "./taskUtils.js";

export default function TaskRow({ task, today, projects = [], timed = false, editable = false, onToggle, onUpdate }) {
  const date = taskDate(task);
  const time = taskTime(task);
  const late = date && date < today && task.status !== "done";

  return (
    <div className={`ds-task${task.status === "done" ? " done" : ""}`}>
      {timed && <span className="ds-time-gutter">{time}</span>}
      <button className="ds-check" onClick={() => onToggle(task)} aria-label={`Mark ${task.title} ${task.status === "done" ? "not done" : "done"}`}>
        {task.status === "done" && <Check size={13} sw={2.4} />}
      </button>
      <span className={`ds-area-dot ${task.area || "unsorted"}`} />
      <div className="ds-task-body">
        <span className="ds-task-title">{task.title}</span>
        {editable && (
          <details className="ds-task-editor">
            <summary>Edit details</summary>
            <div className="ds-task-editor-grid">
              <label className="ds-editor-title">Title<input defaultValue={task.title} onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== task.title) onUpdate(task.id, { title: value }); }} /></label>
              <label>Date<input type="date" value={date || ""} onChange={(event) => onUpdate(task.id, { date: event.target.value || null, ...(!event.target.value ? { time: null } : {}) })} /></label>
              <label>Time<input type="time" disabled={!date} value={time || ""} onChange={(event) => onUpdate(task.id, { time: event.target.value || null })} /></label>
              <label>Area<select value={task.area || ""} onChange={(event) => onUpdate(task.id, { area: event.target.value || null })}><option value="">Unsorted</option><option value="work">Work</option><option value="life">Life</option></select></label>
              <label>Project<select value={task.project_id || ""} onChange={(event) => onUpdate(task.id, { project_id: event.target.value || null })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
              <label>Status<select value={task.status} onChange={(event) => onUpdate(task.id, { status: event.target.value })}><option value="inbox">Inbox</option><option value="next">Next</option><option value="waiting">Waiting</option><option value="done">Done</option></select></label>
            </div>
          </details>
        )}
      </div>
      <div className="ds-task-meta">
        {task.project_title && <span className="ds-project-chip"><Projects size={13} />{task.project_title}</span>}
        {!timed && <span className={`ds-task-when${late ? " late" : ""}`}>{displayTaskDate(date, today)}{time ? <><span>&middot;</span><b>{time}</b></> : ""}</span>}
      </div>
    </div>
  );
}
