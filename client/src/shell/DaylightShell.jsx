import { BookOpen, Flame, Projects, Settings, Tasks, Today } from "../shared/icons.jsx";

const NAV = [
  { id: "today", label: "Today", Icon: Today },
  { id: "tasks", label: "Tasks", Icon: Tasks },
  { id: "projects", label: "Projects", Icon: Projects },
  { id: "study", label: "Study", Icon: BookOpen },
  { id: "settings", label: "Settings", Icon: Settings },
];

function Navigation({ active, onNavigate, mobile = false }) {
  return (
    <nav className={mobile ? "daylight-mobile-nav" : "daylight-side-nav"} aria-label="Main navigation">
      {NAV.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`daylight-nav-item${active === id ? " active" : ""}`}
          onClick={() => onNavigate(id)}
          aria-current={active === id ? "page" : undefined}
        >
          <Icon size={mobile ? 21 : 18} sw={active === id ? 2.1 : 1.7} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function DaylightShell({ active, streak = 0, onNavigate, children }) {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="daylight-shell">
      <aside className="daylight-photo-panel">
        <div className="daylight-photo-shade" />
        <div className="daylight-brand">
          <span className="daylight-brand-mark"><Today size={17} sw={2.2} /></span>
          <strong>Daylight</strong>
        </div>
        <Navigation active={active} onNavigate={onNavigate} />
        <div className="daylight-greeting">
          <span>Good morning,</span>
          <strong>Sam</strong>
          <small>{date}</small>
          <div className="daylight-streak"><Flame size={15} sw={2} /> {streak}-day streak</div>
        </div>
      </aside>

      <section className="daylight-workspace">
        <header className="daylight-mobile-header">
          <div className="daylight-brand">
            <span className="daylight-brand-mark"><Today size={16} sw={2.2} /></span>
            <strong>Daylight</strong>
          </div>
          <div className="daylight-streak"><Flame size={15} sw={2} /> {streak}</div>
        </header>
        <main className="daylight-content">{children}</main>
        <Navigation active={active} onNavigate={onNavigate} mobile />
      </section>
    </div>
  );
}
