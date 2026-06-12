import { useEffect, useState } from "react";

const DISMISSED_KEY = "lumi-install-dismissed";

export default function AppStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "yes"; } catch { return false; }
  });

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const captureInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => setInstallPrompt(null);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, "yes"); } catch {}
  }

  return (
    <>
      {!online && (
        <div className="connection-banner" role="status">
          Offline - reconnect before answering cards
        </div>
      )}
      {online && !isStandalone && !dismissed && (installPrompt || isIos) && (
        <div className="install-card" role="status">
          <img src="/icons/lumi.svg" alt="" />
          <div>
            <strong>Install Lumi</strong>
            <span>{isIos ? "Tap Share, then Add to Home Screen." : "Open faster from your home screen."}</span>
          </div>
          {installPrompt && <button type="button" onClick={install}>Install</button>}
          <button type="button" className="install-dismiss" onClick={dismiss} aria-label="Dismiss install suggestion">x</button>
        </div>
      )}
    </>
  );
}
