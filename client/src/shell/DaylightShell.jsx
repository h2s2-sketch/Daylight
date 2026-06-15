import { useEffect, useState } from "react";
import { BookOpen, Flame, Projects, Settings, Tasks, Today } from "../shared/icons.jsx";
import { api } from "../shared/api.js";

const NAV = [
  { id: "today", label: "Today", Icon: Today },
  { id: "tasks", label: "Tasks", Icon: Tasks },
  { id: "projects", label: "Projects", Icon: Projects },
  { id: "study", label: "Study", Icon: BookOpen },
  { id: "settings", label: "Settings", Icon: Settings },
];

const PHOTO_KEY = "daylight-sidebar-photo";
const STYLE_KEY = "daylight-sidebar-style";
const SIDEBAR_STYLES = new Set(["personal_photo", "minimal_gradient", "focus_mode"]);

function cachedPhoto() {
  try {
    return localStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

function rememberPhoto(url) {
  try {
    localStorage.setItem(PHOTO_KEY, url);
  } catch {}
}

function cachedStyle() {
  try {
    const value = localStorage.getItem(STYLE_KEY);
    return SIDEBAR_STYLES.has(value) ? value : "personal_photo";
  } catch {
    return "personal_photo";
  }
}

function rememberStyle(value) {
  try { localStorage.setItem(STYLE_KEY, value); } catch {}
}

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
  const [photoUrl, setPhotoUrl] = useState(cachedPhoto);
  const [sidebarStyle, setSidebarStyle] = useState(cachedStyle);
  const [desktopPhoto, setDesktopPhoto] = useState(() => window.matchMedia("(min-width: 1024px)").matches);

  useEffect(() => {
    api.getSettings().then((settings) => {
      const url = settings.sidebar_photo_url || "";
      const style = SIDEBAR_STYLES.has(settings.sidebar_style) ? settings.sidebar_style : "personal_photo";
      setPhotoUrl(url);
      setSidebarStyle(style);
      rememberPhoto(url);
      rememberStyle(style);
    }).catch(() => {});
    const update = (event) => {
      const url = event.detail || "";
      setPhotoUrl(url);
      rememberPhoto(url);
    };
    window.addEventListener("daylight-photo", update);
    const updateStyle = (event) => {
      const style = SIDEBAR_STYLES.has(event.detail) ? event.detail : "personal_photo";
      setSidebarStyle(style);
      rememberStyle(style);
    };
    window.addEventListener("daylight-sidebar-style", updateStyle);
    return () => {
      window.removeEventListener("daylight-photo", update);
      window.removeEventListener("daylight-sidebar-style", updateStyle);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktopPhoto(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <div className={`daylight-shell sidebar-style-${sidebarStyle}`}>
      <aside
        className="daylight-photo-panel"
        style={desktopPhoto && sidebarStyle === "personal_photo"
          ? { backgroundImage: photoUrl === null ? "none" : photoUrl ? `url(${photoUrl})` : undefined }
          : { backgroundImage: "none" }}
      >
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
