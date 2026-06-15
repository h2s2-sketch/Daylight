import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { AlertTriangle, Calendar, Clock, Sun } from "../../shared/icons.jsx";
import AreaFilters from "./AreaFilters.jsx";
import TaskQuickCapture from "./TaskQuickCapture.jsx";
import TaskRow from "./TaskRow.jsx";
import { localISODate, taskDate } from "./taskUtils.js";

const CATEGORIES = [["all", "All"], ["inbox", "Inbox"], ["today", "Today"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["waiting", "Waiting"], ["done", "Done"]];

function taskGroup(task, today) {
  if (task.status === "done") return "done";
  if (task.status === "waiting") return "waiting";
  if (!taskDate(task)) return "inbox";
  if (taskDate(task) < today) return "overdue";
  if (taskDate(task) === today) return "today";
  return "upcoming";
}

const GROUPS = [
  ["overdue", "Overdue", AlertTriangle], ["today", "Today", Sun], ["upcoming", "Upcoming", Calendar],
  ["waiting", "Waiting", Clock], ["inbox", "Inbox", null], ["done", "Done", null],
];

export default function TasksPage() {
  const today = localISODate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("all");
  const [error, setError] = useState("");

  async function loadTasks(selectedArea = area, selectedCategory = category) {
    try {
      setTasks(await api.getTasks({ ...(selectedArea ? { area: selectedArea } : {}), ...(selectedCategory !== "all" ? { category: selectedCategory } : {}), date: today }));
      setError("");
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { api.getProjects().then(setProjects).catch((err) => setError(err.message)); }, []);
  useEffect(() => { loadTasks(area, category); }, [area, category]);

  async function addTask(task) { await api.createTask(task); await loadTasks(); }
  async function updateTask(id, updates) { try { await api.updateTask(id, updates); await loadTasks(); } catch (err) { setError(err.message); } }
  function toggleTask(task) { return updateTask(task.id, { status: task.status === "done" ? "inbox" : "done" }); }

  return (
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading"><h1>Tasks</h1><p>{tasks.filter((task) => task.status !== "done").length} open across every area</p></div>
      <TaskQuickCapture projects={projects} onCreate={addTask} />
      <div className="ds-task-toolbar">
        <div className="ds-segmented">{CATEGORIES.map(([value, label]) => <button key={value} className={category === value ? "on" : ""} onClick={() => setCategory(value)}>{label}</button>)}</div>
        <AreaFilters value={area} onChange={setArea} />
      </div>
      {error && <div className="daylight-card error-card">{error}</div>}
      {!error && !tasks.length && <div className="ds-empty"><strong>No tasks here yet</strong><span>Capture a task above or choose another filter.</span></div>}
      <div className="ds-section-stack">
        {GROUPS.map(([id, label, Icon]) => {
          const list = tasks.filter((task) => taskGroup(task, today) === id);
          if (!list.length) return null;
          return (
            <section className={`ds-task-section${id === "overdue" ? " danger" : ""}`} key={id}>
              <div className="ds-section-head"><span className="ds-section-label">{Icon && <Icon size={16} />}{label}</span><span className="ds-section-meta">{list.length} {list.length === 1 ? "task" : "tasks"}</span></div>
              <div className="ds-task-list">{list.map((task) => <TaskRow key={task.id} task={task} today={today} projects={projects} editable onToggle={toggleTask} onUpdate={updateTask} />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
