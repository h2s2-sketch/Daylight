import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { AlertTriangle, ArrowRight, Clock, Layers, Sun } from "../../shared/icons.jsx";
import AreaFilters from "../tasks/AreaFilters.jsx";
import TaskQuickCapture from "../tasks/TaskQuickCapture.jsx";
import TaskRow from "../tasks/TaskRow.jsx";
import { localISODate, taskDate, taskTime } from "../tasks/taskUtils.js";

function Section({ icon, title, count, children, tone = "" }) {
  if (!count) return null;
  return (
    <section className={`ds-task-section ${tone}`}>
      <div className="ds-section-head"><span className="ds-section-label">{icon}{title}</span><span className="ds-section-meta">{count} {count === 1 ? "task" : "tasks"}</span></div>
      <div className="ds-task-list">{children}</div>
    </section>
  );
}

function StudySummary({ data, onStart, onHangul, onOpenStudy }) {
  if (!data) return <div className="ds-study-card">Loading study queue...</div>;
  const total = data.queue.en.due + data.queue.en.fresh + data.queue.kr.due + data.queue.kr.fresh;
  return (
    <section className="ds-study-card">
      <span className="ds-study-bar" />
      <div className="ds-study-head">
        <span className="ds-study-icon"><Layers size={17} /></span>
        <div className="ds-study-titles"><strong>Review due today</strong><span>{total ? `${total} cards waiting across two languages` : "Your review queue is clear"}</span></div>
        <button className="ds-primary-button" onClick={() => {
          const koreanWaiting = data.queue.kr?.due || data.queue.kr?.fresh;
          if (!data.hangul?.foundation?.complete && koreanWaiting) onHangul(); else onStart(null);
        }}>Start Review <ArrowRight size={15} /></button>
      </div>
      <div className="ds-study-decks">
        <button onClick={() => onStart("en")}><span className="ds-deck-dot en" /><strong>English</strong><span>{data.queue.en.due} due <small>&middot; {data.queue.en.fresh} new</small></span></button>
        <button onClick={() => data.hangul?.foundation?.complete ? onStart("kr") : onHangul()}><span className="ds-deck-dot kr" /><strong>Korean</strong><span>{data.queue.kr.due} due <small>&middot; {data.queue.kr.fresh} new</small></span></button>
      </div>
      <button className="ds-text-link" onClick={onOpenStudy}>Open full Study dashboard <ArrowRight size={13} /></button>
    </section>
  );
}

export default function TodayPage({ onStart, onHangul, onOpenStudy, onData }) {
  const today = localISODate();
  const [study, setStudy] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [area, setArea] = useState("");
  const [error, setError] = useState("");

  function loadTasks(selectedArea = area) { return api.getTaskDashboard(today, selectedArea).then(setTaskData); }

  useEffect(() => {
    Promise.all([
      api.getDashboard().then((value) => { setStudy(value); onData(value); }),
      api.getProjects().then(setProjects),
    ]).catch((err) => setError(err.message));
  }, [onData]);
  useEffect(() => { loadTasks(area).catch((err) => setError(err.message)); }, [area]);

  async function addTask(task) { await api.createTask(task); await loadTasks(); }
  async function toggleTask(task) { await api.updateTask(task.id, { status: task.status === "done" ? "inbox" : "done" }); await loadTasks(); }

  const tasks = taskData?.tasks || [];
  const overdue = tasks.filter((task) => taskDate(task) < today);
  const todayTasks = tasks.filter((task) => taskDate(task) === today);
  const timed = todayTasks.filter((task) => taskTime(task));
  const anytime = todayTasks.filter((task) => !taskTime(task));
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="daylight-page ds-page fade-enter">
      <div className="ds-page-heading"><h1>Today</h1><p>{date} &middot; {overdue.length} overdue, {timed.length} timed, {anytime.length} anytime</p></div>
      <TaskQuickCapture projects={projects} defaultDate={today} onCreate={addTask} />
      <AreaFilters value={area} onChange={setArea} />
      {error && <div className="daylight-card error-card">{error}</div>}
      <div className="ds-section-stack">
        <Section icon={<AlertTriangle size={16} />} title="Overdue" count={overdue.length} tone="danger">
          {overdue.map((task) => <TaskRow key={task.id} task={task} today={today} onToggle={toggleTask} />)}
        </Section>
        <Section icon={<Clock size={16} />} title="Timed" count={timed.length}>
          {timed.map((task) => <TaskRow key={task.id} task={task} today={today} timed onToggle={toggleTask} />)}
        </Section>
        <Section icon={<Sun size={16} />} title="Anytime" count={anytime.length}>
          {anytime.map((task) => <TaskRow key={task.id} task={task} today={today} onToggle={toggleTask} />)}
        </Section>
      </div>
      {!error && !tasks.length && <div className="ds-empty"><strong>Nothing planned for today</strong><span>Add one small next step above.</span></div>}
      {!error && <StudySummary data={study} onStart={onStart} onHangul={onHangul} onOpenStudy={onOpenStudy} />}
    </div>
  );
}
