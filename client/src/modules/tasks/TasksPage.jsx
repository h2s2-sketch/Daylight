import { useState } from "react";
import { Plus } from "../../shared/icons.jsx";

const FILTERS = ["All", "Tower A", "Site Office", "Phase 2"];

export default function TasksPage({ tasks, onToggleTask, onAddTask }) {
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const groups = [
    { id: "overdue", label: "Overdue", note: "Needs attention" },
    { id: "today", label: "Today", note: "Current focus" },
    { id: "upcoming", label: "Upcoming", note: "This week" },
  ];

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim());
    setTitle("");
  }

  return (
    <div className="daylight-page fade-enter">
      <div className="page-heading"><div><h1>Tasks</h1><p>Across every project</p></div><span className="prototype-badge">Demo only</span></div>
      <form className="prototype-quick-add" onSubmit={submit}>
        <Plus size={17} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task..." /><button>Add</button>
      </form>
      <div className="prototype-filters">
        {FILTERS.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      {groups.map((group) => {
        const list = tasks.filter((task) => task.when === group.id && (filter === "All" || task.project === filter));
        if (!list.length) return null;
        return (
          <section className="task-group" key={group.id}>
            <div className="section-heading"><div><span className="section-kicker">{group.label}</span><p>{group.note}</p></div></div>
            <div className="prototype-task-list">
              {list.map((task) => (
                <button key={task.id} className={`prototype-task${task.done ? " done" : ""}`} onClick={() => onToggleTask(task.id)}>
                  <span className="prototype-check">{task.done ? "✓" : ""}</span><span className={`priority-dot ${task.priority}`} />
                  <span className="prototype-task-title">{task.title}</span><span className="prototype-tag">{task.project || "Inbox"}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
