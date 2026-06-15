import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Briefcase, Leaf, Plus, Projects } from "../../shared/icons.jsx";
import AreaFilters from "./AreaFilters.jsx";

function ProjectEditor({ project, onUpdate }) {
  const [goal, setGoal] = useState(project.goal || "");
  return (
    <details className="ds-project-editor">
      <summary>Edit</summary>
      <div className="ds-project-editor-fields">
        <label>Area<select value={project.area || ""} onChange={(event) => onUpdate(project.id, { area: event.target.value || null })}><option value="">Unsorted</option><option value="work">Work</option><option value="life">Life</option></select></label>
        <label>Status<select value={project.status} onChange={(event) => onUpdate(project.id, { status: event.target.value })}><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option></select></label>
        <label className="ds-project-goal">Goal<input value={goal} onChange={(event) => setGoal(event.target.value)} onBlur={() => goal !== (project.goal || "") && onUpdate(project.id, { goal })} placeholder="What does done look like?" /></label>
      </div>
    </details>
  );
}

function ProjectCard({ project, onOpenTasks, onUpdate }) {
  const area = project.area || "unsorted";
  return (
    <article className="ds-project-card">
      <span className={`ds-project-area-bar ${area}`} />
      <div className="ds-project-top"><div><strong>{project.title}</strong><span>{project.goal || project.description || "No goal set"}</span></div><b>{project.percent}%</b></div>
      <div className="ds-project-track"><span className={area} style={{ width: `${project.percent}%` }} /></div>
      <div className="ds-project-foot"><span>{project.open_tasks} open {project.open_tasks === 1 ? "task" : "tasks"}</span><span>{project.next_action ? `Next: ${project.next_action}` : "Needs a next action"}</span></div>
      <div className="ds-project-actions"><button onClick={onOpenTasks}>Open tasks</button><ProjectEditor project={project} onUpdate={onUpdate} /></div>
    </article>
  );
}

export default function ProjectsPage({ onOpenTasks }) {
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [newArea, setNewArea] = useState("");
  const [area, setArea] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load(selectedArea = area) { try { setProjects(await api.getProjects(selectedArea ? { area: selectedArea } : {})); setError(""); } catch (err) { setError(err.message); } }
  useEffect(() => { load(area); }, [area]);

  async function addProject(event) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createProject({ title: title.trim(), area: newArea || null, goal: goal.trim() || null });
      setTitle(""); setGoal(""); setNewArea(""); setCreating(false); await load();
    } catch (err) { setError(err.message); }
  }
  async function updateProject(id, updates) { try { await api.updateProject(id, updates); await load(); } catch (err) { setError(err.message); } }

  const activeCount = projects.filter((project) => project.status === "active").length;
  const groups = [
    ["work", "Work", Briefcase],
    ["life", "Life", Leaf],
    ["unsorted", "Unsorted", Projects],
  ];

  return (
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-project-page-head">
        <div className="ds-page-heading"><h1>Projects</h1><p>{activeCount} active &middot; grouped by area</p></div>
        <button className="ds-primary-button ds-new-project" onClick={() => setCreating((value) => !value)}><Plus size={16} /> New project</button>
      </div>
      {creating && (
        <form className="ds-project-create" onSubmit={addProject}>
          <label>Project name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project name" /></label>
          <label>Goal<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What does done look like?" /></label>
          <label>Area<select value={newArea} onChange={(event) => setNewArea(event.target.value)}><option value="">Unsorted</option><option value="work">Work</option><option value="life">Life</option></select></label>
          <button className="ds-primary-button" disabled={!title.trim()}>Create</button>
        </form>
      )}
      <AreaFilters value={area} onChange={setArea} />
      {error && <div className="daylight-card error-card">{error}</div>}
      {!error && !projects.length && <div className="ds-empty"><strong>No projects here yet</strong><span>Start a project or choose another area.</span></div>}
      <div className="ds-project-groups">
        {groups.map(([id, label, Icon]) => {
          const list = projects.filter((project) => (project.area || "unsorted") === id);
          if (!list.length) return null;
          return (
            <section className="ds-project-group" key={id}>
              <div className={`ds-project-group-head ${id}`}><span><i><Icon size={16} /></i>{label}</span><b>{list.length} {list.length === 1 ? "project" : "projects"} &middot; {list.reduce((sum, project) => sum + project.open_tasks, 0)} open</b></div>
              <div className="ds-project-grid">{list.map((project) => <ProjectCard key={project.id} project={project} onOpenTasks={onOpenTasks} onUpdate={updateProject} />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
