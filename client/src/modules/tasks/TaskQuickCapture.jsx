import { useRef, useState } from "react";
import { Calendar, Clock, Plus } from "../../shared/icons.jsx";

export default function TaskQuickCapture({ projects = [], defaultDate = "", placeholder = "Add a task...", onCreate }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [area, setArea] = useState("");
  const [projectId, setProjectId] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const blurTimer = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    try {
      setSaving(true);
      setError("");
      await onCreate({ title: title.trim(), date: date || null, time: time || null, area: area || null, project_id: projectId || null });
      setTitle("");
      setTime("");
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function chooseProject(value) {
    setProjectId(value);
    const project = projects.find((item) => String(item.id) === value);
    if (project?.area) setArea(project.area);
  }

  function keepOpen() {
    clearTimeout(blurTimer.current);
    setOpen(true);
  }

  function maybeClose() {
    blurTimer.current = setTimeout(() => { if (!title) setOpen(false); }, 140);
  }

  return (
    <div className="ds-capture-wrap">
      <form className={`ds-capture${open ? " open" : ""}`} onSubmit={submit} onFocus={keepOpen} onBlur={maybeClose}>
        <div className="ds-capture-top">
          <span className="ds-capture-plus"><Plus size={19} /></span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { setTitle(""); setOpen(false); event.currentTarget.blur(); } }} placeholder={placeholder} aria-label="Task title" />
          <button className="ds-details-button" type="button" onClick={() => setOpen((value) => !value)}>{open ? "Hide" : "Details"}</button>
          <button className="ds-primary-button" type="submit" disabled={!title.trim() || saving}>{saving ? "Adding..." : "Add"}</button>
        </div>
        <div className="ds-capture-more"><div className="ds-capture-more-inner">
          <div className="ds-capture-row">
            <label className="ds-compact-field"><Calendar size={15} /><input type="date" value={date} onChange={(event) => { setDate(event.target.value); if (!event.target.value) setTime(""); }} aria-label="Task date" /></label>
            <label className={`ds-compact-field${!date ? " disabled" : ""}`}><Clock size={15} /><input type="time" value={time} disabled={!date} onChange={(event) => setTime(event.target.value)} aria-label="Task time" /></label>
            <label className="ds-select"><select value={area} onChange={(event) => setArea(event.target.value)} aria-label="Area"><option value="">Unsorted</option><option value="work">Work</option><option value="life">Life</option></select></label>
            <label className="ds-select"><select value={projectId} onChange={(event) => chooseProject(event.target.value)} aria-label="Project"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
            <span className="ds-capture-hint">Date and time optional</span>
          </div>
        </div></div>
      </form>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
