import { useState, useEffect } from "react";
import NavBar from "./shell/NavBar.jsx";
import Dashboard from "./modules/study/Dashboard.jsx";
import Review from "./modules/study/Review.jsx";
import Summary from "./modules/study/Summary.jsx";
import AddCard from "./modules/study/AddCard.jsx";
import Cards from "./modules/study/Cards.jsx";
import SettingsPage from "./modules/study/SettingsPage.jsx";
import { api } from "./shared/api.js";

const THEME_KEY = "lumi-theme";

// Screens: dashboard | review | summary | add-card | cards | settings
export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; }
  });
  const [tab, setTab]     = useState("study");   // study | settings
  const [screen, setScreen] = useState("dashboard"); // within study module
  const [queue, setQueue]   = useState([]);
  const [tally, setTally]   = useState(null);
  const [streakCache, setStreakCache] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => t === "dark" ? "light" : "dark");
  }

  async function startReview(language) {
    const q = await api.getQueue(language);
    if (!q || q.length === 0) return; // nothing to review
    setQueue(q);
    setTally(null);
    setScreen("review");
  }

  function handleGrade(finalTally) {
    setTally(finalTally);
    // Refresh streak for summary
    api.getDashboard().then((d) => setStreakCache(d.streak)).catch(() => {});
    setScreen("summary");
  }

  const showNav = screen === "dashboard" || tab === "settings" || screen === "cards";

  return (
    <div className="app">
      {/* ── Study module ── */}
      {tab === "study" && screen === "dashboard" && (
        <Dashboard
          onStart={startReview}
          onAddCard={() => setScreen("add-card")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      {tab === "study" && screen === "review" && queue.length > 0 && (
        <Review
          queue={queue}
          onGrade={handleGrade}
          onExit={() => setScreen("dashboard")}
        />
      )}
      {tab === "study" && screen === "summary" && tally && (
        <Summary
          tally={tally}
          streak={streakCache}
          onDone={() => setScreen("dashboard")}
        />
      )}
      {tab === "study" && screen === "add-card" && (
        <AddCard
          onBack={() => setScreen("dashboard")}
          onCreated={() => setScreen("dashboard")}
        />
      )}
      {tab === "study" && screen === "cards" && (
        <Cards
          onBack={() => setScreen("dashboard")}
          onAddCard={() => setScreen("add-card")}
        />
      )}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <SettingsPage theme={theme} onToggleTheme={toggleTheme} />
      )}

      {/* ── Nav (hidden during review focus mode) ── */}
      {showNav && (
        <NavBar
          active={tab}
          onNavigate={(id) => {
            setTab(id);
            if (id === "study") setScreen("dashboard");
          }}
        />
      )}
    </div>
  );
}
