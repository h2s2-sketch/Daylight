import { useEffect, useRef, useState } from "react";
import { api } from "../../shared/api.js";

function Row({ label, description, children }) {
  return (
    <div className="settings-row">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {description && <div className="settings-description">{description}</div>}
      </div>
      {children}
    </div>
  );
}

function ActionButton({ children, disabled, onClick }) {
  return (
    <button className="tap settings-action" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export default function SettingsPage({ theme, onToggleTheme }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const importInput = useRef(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  async function save(key, value) {
    const updated = await api.patchSettings({ [key]: value });
    setSettings(updated);
  }

  async function exportData() {
    setBusy("export");
    setMessage("");
    try {
      const blob = await api.exportData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daylight-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Backup downloaded.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Importing will replace the current Daylight data. Continue?")) return;
    setBusy("import");
    setMessage("");
    try {
      await api.importData(JSON.parse(await file.text()));
      setMessage("Data restored. Reloading...");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "That file is not a valid JSON backup." : error.message);
      setBusy("");
    }
  }

  async function createServerBackup() {
    setBusy("server");
    setMessage("");
    try {
      const result = await api.createServerBackup();
      setMessage(`Server backup created: ${result.filename}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  const numInput = (key, max = 50) => (
    <input className="settings-number" type="number" min="1" max={max}
      value={settings?.[key] ?? ""}
      onChange={(event) => save(key, event.target.value)}
    />
  );

  return (
    <div className="settings-page">
      <h2 className="settings-title">Settings</h2>

      <section className="settings-section">
        <div className="settings-heading">Daily new cards</div>
        <div className="settings-stack">
          <Row label="English new cards / day" description="Default 10. Overdue cards always take priority.">
            {settings ? numInput("study_new_en_daily") : null}
          </Row>
          <Row label="Korean new cards / day" description="Default 5.">
            {settings ? numInput("study_new_kr_daily") : null}
          </Row>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-heading">Data & backup</div>
        <div className="settings-stack">
          <Row label="Download your data" description="Save a portable JSON backup for another phone or computer.">
            <ActionButton disabled={Boolean(busy)} onClick={exportData}>{busy === "export" ? "Working..." : "Download"}</ActionButton>
          </Row>
          <Row label="Restore from a backup" description="Replaces current data after creating a safety copy on the server.">
            <ActionButton disabled={Boolean(busy)} onClick={() => importInput.current?.click()}>{busy === "import" ? "Restoring..." : "Import"}</ActionButton>
            <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importData} />
          </Row>
          <Row label="Back up on this server" description="Creates a consistent copy of app.db in data/backups.">
            <ActionButton disabled={Boolean(busy)} onClick={createServerBackup}>{busy === "server" ? "Working..." : "Back up now"}</ActionButton>
          </Row>
        </div>
        {message && <div className="settings-message" role="status">{message}</div>}
      </section>

      <section className="settings-section">
        <div className="settings-heading">Appearance</div>
        <Row label="Dark mode" description="Toggle between light and dark theme.">
          <button className="tap settings-toggle" onClick={onToggleTheme} aria-label="Toggle dark mode">
            <span className={theme === "dark" ? "is-dark" : ""} />
          </button>
        </Row>
      </section>

      <section>
        <div className="settings-heading">About</div>
        <div className="settings-about">
          <b>Daylight</b> personal workspace<br />
          Tasks, projects and spaced repetition, stored in SQLite.<br />
          <span>A streak counts when the due queue is cleared or 5 cards are reviewed.</span>
        </div>
      </section>
    </div>
  );
}
