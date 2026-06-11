import { BookOpen, Settings } from "../shared/icons.jsx";

const TABS = [
  { id: "study",    label: "Study",    Icon: BookOpen },
  { id: "settings", label: "Settings", Icon: Settings },
];

export default function NavBar({ active, onNavigate }) {
  return (
    <nav style={{
      flexShrink: 0,
      display: "flex",
      borderTop: "1px solid var(--border)",
      background: "var(--surface)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button key={id} className="tap" onClick={() => onNavigate(id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "11px 8px 10px",
              color: isActive ? "var(--text)" : "var(--faint)",
              transition: "color .15s ease",
            }}>
            <Icon size={22} sw={isActive ? 2.0 : 1.7} />
            <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, letterSpacing: "0.02em" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
