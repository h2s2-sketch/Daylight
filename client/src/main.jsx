import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import App from "./App.jsx";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// App shell: phone-width column, centered on desktop
const appShellStyle = document.createElement("style");
appShellStyle.textContent = `
.app {
  position: relative;
  width: 100%;
  max-width: var(--maxw);
  height: 100%;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.5s ease, color 0.5s ease;
}
@media (min-width: 680px) {
  body { padding: 26px 0; }
  .app {
    min-height: 0;
    height: calc(100dvh - 52px);
    border-radius: 30px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lift);
  }
}
@media (display-mode: standalone) {
  body { padding: 0; background: var(--bg); }
  .app { min-height: 100dvh; height: 100dvh; border: 0; border-radius: 0; }
}
`;
document.head.appendChild(appShellStyle);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
