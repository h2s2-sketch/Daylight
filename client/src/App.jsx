import { useCallback, useEffect, useState } from "react";
import DaylightShell from "./shell/DaylightShell.jsx";
import TodayPage from "./modules/home/TodayPage.jsx";
import TasksPage from "./modules/tasks/TasksPage.jsx";
import ProjectsPage from "./modules/tasks/ProjectsPage.jsx";
import Dashboard from "./modules/study/Dashboard.jsx";
import Review from "./modules/study/Review.jsx";
import Summary from "./modules/study/Summary.jsx";
import AddCard from "./modules/study/AddCard.jsx";
import Cards from "./modules/study/Cards.jsx";
import SettingsPage from "./modules/study/SettingsPage.jsx";
import HangulDrill from "./modules/study/HangulDrill.jsx";
import { api } from "./shared/api.js";
import AppStatus from "./shell/AppStatus.jsx";
import LoginScreen from "./shell/LoginScreen.jsx";

const THEME_KEY = "daylight-theme";

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; }
  });
  const [section, setSection] = useState("today");
  const [studyScreen, setStudyScreen] = useState("dashboard");
  const [queue, setQueue] = useState([]);
  const [tally, setTally] = useState(null);
  const [streak, setStreak] = useState(0);
  const [streakCache, setStreakCache] = useState(null);
  const [auth, setAuth] = useState("checking");

  useEffect(() => {
    api.getAuthStatus()
      .then((status) => setAuth(status.authenticated ? "authenticated" : "required"))
      .catch(() => setAuth("required"));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#181821" : "#F8F7F3");
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  const rememberDashboard = useCallback((data) => setStreak(data?.streak?.current ?? 0), []);

  async function startReview(language) {
    const nextQueue = await api.getQueue(language);
    if (!nextQueue?.length) return;
    setQueue(nextQueue);
    setTally(null);
    setStudyScreen("review");
  }

  function handleGrade(finalTally) {
    setTally(finalTally);
    api.getDashboard().then((data) => {
      setStreakCache(data.streak);
      setStreak(data.streak.current);
    }).catch(() => {});
    setStudyScreen("summary");
  }

  function navigate(id) {
    setSection(id);
    if (id === "study") setStudyScreen("dashboard");
  }

  const toggleTheme = () => setTheme((value) => value === "dark" ? "light" : "dark");
  const focusMode = ["review", "hangul-drill", "summary", "add-card", "cards"].includes(studyScreen);

  if (auth === "checking") return <div className="app"><div className="auth-loading"><span className="app-spinner" /></div></div>;
  if (auth === "required") return <div className="app"><LoginScreen onLogin={() => setAuth("authenticated")} /></div>;

  if (focusMode) {
    return (
      <div className="app focus-app">
        <AppStatus />
        {studyScreen === "review" && queue.length > 0 && <Review queue={queue} onGrade={handleGrade} onExit={() => setStudyScreen("dashboard")} />}
        {studyScreen === "hangul-drill" && <HangulDrill onDone={() => setStudyScreen("dashboard")} />}
        {studyScreen === "summary" && tally && <Summary tally={tally} streak={streakCache} onDone={() => setStudyScreen("dashboard")} />}
        {studyScreen === "add-card" && <AddCard onBack={() => setStudyScreen("dashboard")} onCreated={() => setStudyScreen("dashboard")} />}
        {studyScreen === "cards" && <Cards onBack={() => setStudyScreen("dashboard")} onAddCard={() => setStudyScreen("add-card")} />}
      </div>
    );
  }

  return (
    <div className="app">
      <AppStatus />
      <DaylightShell active={section} streak={streak} onNavigate={navigate}>
        {section === "today" && (
          <TodayPage
            onStart={startReview}
            onHangul={() => setStudyScreen("hangul-drill")}
            onOpenStudy={() => navigate("study")}
            onOpenProjects={() => navigate("projects")}
            onData={rememberDashboard}
          />
        )}
        {section === "tasks" && <TasksPage />}
        {section === "projects" && <ProjectsPage onOpenTasks={() => navigate("tasks")} />}
        {section === "study" && (
          <Dashboard
            onStart={startReview}
            onHangul={() => setStudyScreen("hangul-drill")}
            onAddCard={() => setStudyScreen("add-card")}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {section === "settings" && <SettingsPage theme={theme} onToggleTheme={toggleTheme} />}
      </DaylightShell>
    </div>
  );
}
