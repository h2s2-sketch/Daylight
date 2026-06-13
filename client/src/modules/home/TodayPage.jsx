import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight, BookOpen, Chevron, Plus } from "../../shared/icons.jsx";

function TaskRow({ task, onToggle }) {
  return (
    <button className={`prototype-task${task.done ? " done" : ""}`} onClick={() => onToggle(task.id)}>
      <span className="prototype-check">{task.done ? "✓" : ""}</span>
      <span className={`priority-dot ${task.priority}`} />
      <span className="prototype-task-title">{task.title}</span>
      {task.project && <span className="prototype-tag">{task.project}</span>}
    </button>
  );
}

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
          if (!data.hangul?.foundation?.complete && koreanWaiting) onHangul();
          else onStart(null);
        }}>Start Review <ArrowRight size={15} /></button>
      </div>
      <div className="home-study-grid">
        {languages.map((language) => (
          <button key={language.id} className="home-study-card" onClick={() => {
            if (language.id === "kr" && !data.hangul?.foundation?.complete) onHangul();
            else onStart(language.id);
          }}>
            <span className="study-accent" style={{ background: language.color }} />
            <span className="study-card-top">
              <strong>{language.name}</strong>
              <span className="study-icon" style={{ color: language.color, background: language.soft }}><BookOpen size={15} /></span>
            </span>
            <span><b>{language.data.due}</b> due · <b style={{ color: language.color }}>{language.data.fresh}</b> new</span>
          </button>
        ))}
      </div>
      <button className="text-link" onClick={onOpenStudy}>Open full Study dashboard <Chevron size={15} /></button>
    </section>
  );
}

export default function TodayPage({ tasks, onToggleTask, onAddTask, onStart, onHangul, onOpenStudy, onOpenProjects, onData }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    api.getDashboard().then((value) => {
      setData(value);
      onData(value);
    }).catch(() => setError(true));
  }, [onData]);

  const today = tasks.filter((task) => task.when === "today");
  const open = today.filter((task) => !task.done).length;
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim());
    setTitle("");
  }

  return (
    <div className="daylight-page fade-enter">
      <div className="page-heading">
        <div><h1>Today</h1><p>{date}</p></div>
        <span className="prototype-badge">Prototype tasks</span>
      </div>

      <button className="slipping-banner" onClick={onOpenProjects}>
        <span className="slipping-icon">!</span>
        <span><strong>2 things are slipping</strong><small>Phase 2 needs attention · Korean review is waiting</small></span>
        <Chevron size={18} />
      </button>

      <form className="prototype-quick-add" onSubmit={submit}>
        <Plus size={17} />
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task for today..." />
        <button type="submit">Add</button>
      </form>

      <section className="home-section">
        <div className="section-heading">
          <div><span className="section-kicker">Today's Tasks</span><p>{open} open · {today.length - open} done</p></div>
        </div>
        <div className="prototype-task-list">
          {today.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggleTask} />)}
        </div>
      </section>

      {error
        ? <div className="daylight-card error-card">Study data is unavailable. Open Study to try again.</div>
        : <StudySummary data={data} onStart={onStart} onHangul={onHangul} onOpenStudy={onOpenStudy} />}
    </div>
  );
}
