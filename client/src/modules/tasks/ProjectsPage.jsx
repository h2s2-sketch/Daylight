import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Plus } from "../../shared/icons.jsx";

export default function ProjectsPage({ onOpenTasks }) {
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try { setProjects(await api.getProjects()); setError(""); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  async function addProject(event) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    await api.createProject({ title: value });
    setTitle(""); await load();
  }

  return (
    <div className="daylight-page fade-enter">
      <div className="page-heading"><div><h1>Projects</h1><p>{projects.length} active workspaces</p></div></div>
      <form className="prototype-quick-add" onSubmit={addProject}><Plus size={17} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Create a project..." /><button>Add</button></form>
      {error && <div className="daylight-card error-card">{error}</div>}
      {!error && !projects.length && <div className="daylight-card empty-state">No projects yet. Tasks can still live in Inbox.</div>}
      <div className="project-grid">
        {projects.map((project) => (
          <button className="project-card" key={project.id} onClick={onOpenTasks}>
            <div className="project-top"><div><strong>{project.title}</strong><span>{project.description || "No description"}</span></div><b>{project.percent}%</b></div>
            <div className="project-track"><span style={{ width: `${project.percent}%`, background: project.color }} /></div>
            <div className="project-footer"><span>{project.open_tasks} open · {project.completed_tasks} done</span><span>{project.next_due ? `Next: ${project.next_due}` : "No due date"}</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}
