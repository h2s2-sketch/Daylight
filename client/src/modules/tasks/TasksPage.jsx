import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { Plus } from "../../shared/icons.jsx";

function dateGroup(task, today) {
  if (task.status === "done") return "done";
  if (task.due_date && task.due_date < today) return "overdue";
  if (task.due_date === today) return "today";
  return "upcoming";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    try {
      const [nextTasks, nextProjects] = await Promise.all([api.getTasks(), api.getProjects()]);
      setTasks(nextTasks); setProjects(nextProjects); setError("");
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  async function addTask(event) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    await api.createTask({ title: value, project_id: projectId || null });
    setTitle(""); await load();
  }
  async function toggle(task) {
    await api.updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    await load();
  }

  const filtered = filter === "all" ? tasks : tasks.filter((task) => String(task.project_id || "inbox") === filter);
  const groups = [
    { id: "overdue", label: "Overdue", note: "Needs attention" },
    { id: "today", label: "Today", note: "Current focus" },
    { id: "upcoming", label: "Upcoming", note: "Later or unscheduled" },
    { id: "done", label: "Completed", note: "Finished tasks" },
  ];

  return (
    <div className="daylight-page fade-enter">
      <div className="page-heading"><div><h1>Tasks</h1><p>Across every project</p></div></div>
      <form className="prototype-quick-add task-quick-add" onSubmit={addTask}>
        <Plus size={17} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task..." />
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Project"><option value="">Inbox</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
        <button>Add</button>
      </form>
      <div className="prototype-filters">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
        <button className={filter === "inbox" ? "active" : ""} onClick={() => setFilter("inbox")}>Inbox</button>
        {projects.map((project) => <button key={project.id} className={filter === String(project.id) ? "active" : ""} onClick={() => setFilter(String(project.id))}>{project.title}</button>)}
      </div>
      {error && <div className="daylight-card error-card">{error}</div>}
      {!error && !filtered.length && <div className="daylight-card empty-state">No tasks here yet.</div>}
      {groups.map((group) => {
        const list = filtered.filter((task) => dateGroup(task, today) === group.id);
        if (!list.length) return null;
        return <section className="task-group" key={group.id}>
          <div className="section-heading"><div><span className="section-kicker">{group.label}</span><p>{group.note}</p></div></div>
          <div className="prototype-task-list">{list.map((task) => (
            <button key={task.id} className={`prototype-task${task.status === "done" ? " done" : ""}`} onClick={() => toggle(task)}>
              <span className="prototype-check">{task.status === "done" ? "✓" : ""}</span><span className={`priority-dot ${task.priority}`} />
              <span className="prototype-task-title">{task.title}</span><span className="prototype-tag">{task.project_title || "Inbox"}</span>
            </button>
          ))}</div>
        </section>;
      })}
    </div>
  );
}
