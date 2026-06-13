import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight, BookOpen, Chevron, Plus } from "../../shared/icons.jsx";

function StudySummary({ data, onStart, onHangul, onOpenStudy }) {
  if (!data) return <div className="daylight-card daylight-loading">Loading study queue...</div>;
  const languages = [
    { id: "en", name: "English", data: data.queue.en, color: "var(--en)", soft: "var(--en-soft)" },
    { id: "kr", name: "Korean", data: data.queue.kr, color: "var(--kr)", soft: "var(--kr-soft)" },
  ];
  return (
    <section className="home-section">
      <div className="section-heading">
        <div><span className="section-kicker">Study</span><p>Your live review queue</p></div>
        <button className="daylight-primary compact" onClick={() => {
          const koreanWaiting = data.queue.kr?.due || data.queue.kr?.fresh;
          if (!data.hangul?.foundation?.complete && koreanWaiting) onHangul(); else onStart(null);
        }}>Start Review <ArrowRight size={15} /></button>
      </div>
      <div className="home-study-grid">
        {languages.map((language) => (
          <button key={language.id} className="home-study-card" onClick={() => {
            if (language.id === "kr" && !data.hangul?.foundation?.complete) onHangul(); else onStart(language.id);
          }}>
            <span className="study-accent" style={{ background: language.color }} />
            <span className="study-card-top"><strong>{language.name}</strong><span className="study-icon" style={{ color: language.color, background: language.soft }}><BookOpen size={15} /></span></span>
            <span><b>{language.data.due}</b> due · <b style={{ color: language.color }}>{language.data.fresh}</b> new</span>
          </button>
        ))}
      </div>
      <button className="text-link" onClick={onOpenStudy}>Open full Study dashboard <Chevron size={15} /></button>
    </section>
  );
}

export default function TodayPage({ onStart, onHangul, onOpenStudy, onOpenProjects, onData }) {
  const [study, setStudy] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  function loadTasks() {
    return api.getTaskDashboard().then(setTaskData);
  }

  useEffect(() => {
    Promise.all([
      api.getDashboard().then((value) => { setStudy(value); onData(value); }),
      loadTasks(),
    ]).catch((err) => setError(err.message));
  }, [onData]);

  async function addTask(event) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    await api.createTask({ title: value });
    setTitle("");
    await loadTasks();
  }

  async function toggleTask(task) {
    await api.updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    await loadTasks();
  }

  const tasks = taskData?.tasks || [];
  const open = tasks.filter((task) => task.status !== "done").length;
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="daylight-page fade-enter">
      <div className="page-heading"><div><h1>Today</h1><p>{date}</p></div></div>
      {(taskData?.overdue || 0) > 0 && (
        <button className="slipping-banner" onClick={onOpenProjects}>
          <span className="slipping-icon">!</span><span><strong>{taskData.overdue} overdue {taskData.overdue === 1 ? "task" : "tasks"}</strong><small>Open Tasks to review what needs attention.</small></span><Chevron size={18} />
        </button>
      )}
      <form className="prototype-quick-add" onSubmit={addTask}>
        <Plus size={17} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task for today..." /><button type="submit">Add</button>
      </form>
      <section className="home-section">
        <div className="section-heading"><div><span className="section-kicker">Today's Tasks</span><p>{open} open · {tasks.length - open} done</p></div></div>
        {tasks.length ? (
          <div className="prototype-task-list">
            {tasks.map((task) => (
              <button key={task.id} className={`prototype-task${task.status === "done" ? " done" : ""}`} onClick={() => toggleTask(task)}>
                <span className="prototype-check">{task.status === "done" ? "✓" : ""}</span><span className={`priority-dot ${task.priority}`} />
                <span className="prototype-task-title">{task.title}</span>{task.project_title && <span className="prototype-tag">{task.project_title}</span>}
              </button>
            ))}
          </div>
        ) : <div className="daylight-card empty-state">Nothing planned for today. Add one small next step above.</div>}
      </section>
      {error ? <div className="daylight-card error-card">{error}</div> : <StudySummary data={study} onStart={onStart} onHangul={onHangul} onOpenStudy={onOpenStudy} />}
    </div>
  );
}
