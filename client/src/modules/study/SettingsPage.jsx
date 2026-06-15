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

async function prepareSidebarPhoto(file) {
  const image = await createImageBitmap(file);
  const maxSide = 2048;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  image.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("Could not prepare this image. Try a PNG or JPEG file.");
  return new File([blob], "sidebar-photo.jpg", { type: blob.type });
}

export default function SettingsPage({ theme, onToggleTheme }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const importInput = useRef(null);
  const photoInput = useRef(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  async function save(key, value) {
    const updated = await api.patchSettings({ [key]: value });
    setSettings(updated);
  }

  async function saveSidebarStyle(value) {
    if (!settings || settings.sidebar_style === value || busy) return;
    const previous = settings.sidebar_style || "personal_photo";
    setBusy("sidebar-style");
    setMessage("");
    setSettings((current) => ({ ...current, sidebar_style: value }));
    window.dispatchEvent(new CustomEvent("daylight-sidebar-style", { detail: value }));
    try {
      const updated = await api.patchSettings({ sidebar_style: value });
      setSettings(updated);
    } catch {
      setSettings((current) => ({ ...current, sidebar_style: previous }));
      window.dispatchEvent(new CustomEvent("daylight-sidebar-style", { detail: previous }));
      setMessage("Could not save sidebar style. Please try again.");
    } finally {
      setBusy("");
    }
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

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("photo");
    setMessage("");
    try {
      const prepared = await prepareSidebarPhoto(file);
      const result = await api.uploadSidebarPhoto(prepared);
      setSettings(result.settings);
      window.dispatchEvent(new CustomEvent("daylight-photo", { detail: result.url }));
      setMessage("Sidebar image updated.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function resetPhoto() {
    setBusy("photo");
    setMessage("");
    try {
      const result = await api.resetSidebarPhoto();
      setSettings(result.settings);
      window.dispatchEvent(new CustomEvent("daylight-photo", { detail: "" }));
      setMessage("Default sidebar image restored.");
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
      {message && <div className="settings-message global" role="status">{message}</div>}

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
      </section>

      <section className="settings-section">
        <div className="settings-heading">Appearance</div>
        <div className="settings-stack">
          <div className="settings-sidebar-style">
            <div className="settings-label">Sidebar style</div>
            <div className="settings-description">Choose how the desktop sidebar appears. Your choice is saved for every device.</div>
            <div className="sidebar-style-options">
              {[
                ["personal_photo", "Personal Photo", "Use your current image-based sidebar."],
                ["minimal_gradient", "Minimal Gradient", "A cleaner sidebar without the photo."],
                ["focus_mode", "Focus Mode", "A plain low-distraction view for work or screen sharing."],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  className={`sidebar-style-option ${value}${(settings?.sidebar_style || "personal_photo") === value ? " active" : ""}`}
                  disabled={!settings || Boolean(busy)}
                  onClick={() => saveSidebarStyle(value)}
                  aria-pressed={(settings?.sidebar_style || "personal_photo") === value}
                >
                  <span className="sidebar-style-preview"><i /><i /><i /></span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                  <span className="sidebar-style-check">{(settings?.sidebar_style || "personal_photo") === value ? "Selected" : "Select"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row photo-setting-row">
            <div className="sidebar-photo-preview" style={settings?.sidebar_photo_url ? { backgroundImage: `url(${settings.sidebar_photo_url})` } : undefined} />
            <div className="photo-setting-copy">
              <div className="settings-label">Sidebar image</div>
              <div className="settings-description">PNG, JPEG or WebP. Large photos are optimized automatically. Desktop only.</div>
            </div>
            <div className="photo-setting-actions">
              <ActionButton disabled={Boolean(busy)} onClick={() => photoInput.current?.click()}>{busy === "photo" ? "Working..." : "Choose image"}</ActionButton>
              {settings?.sidebar_photo_url && <button className="tap settings-secondary" disabled={Boolean(busy)} onClick={resetPhoto}>Restore default</button>}
              <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadPhoto} />
            </div>
          </div>
          <Row label="Dark mode" description="Toggle between light and dark theme.">
            <button className="tap settings-toggle" onClick={onToggleTheme} aria-label="Toggle dark mode">
              <span className={theme === "dark" ? "is-dark" : ""} />
            </button>
          </Row>
        </div>
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
