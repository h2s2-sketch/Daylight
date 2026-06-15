export default function MockupPage() {
  const scale = new URLSearchParams(window.location.search).get("scale");
  return (
    <main className={`mockup-stage${scale === "3" ? " is-3x" : scale === "2" ? " is-2x" : ""}`} aria-label="Daylight iPhone marketing mockup">
      <div className="iphone-device">
        <div className="iphone-bezel">
          <div className="iphone-screen">
            <iframe
              title="Live Daylight Study app"
              src="/?marketing=study"
              className="iphone-app"
            />
            <div className="iphone-status" aria-hidden="true">
              <strong>9:41</strong>
              <span className="iphone-signals">
                <svg className="iphone-cell" viewBox="0 0 19 12" aria-hidden="true">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="6" width="3" height="6" rx="1" />
                  <rect x="10" y="3" width="3" height="9" rx="1" />
                  <rect x="15" width="3" height="12" rx="1" />
                </svg>
                <svg className="iphone-wifi" viewBox="0 0 18 13" aria-hidden="true">
                  <path d="M1 4.3C5.4.6 12.6.6 17 4.3" />
                  <path d="M4 7.4c2.8-2.2 7.2-2.2 10 0" />
                  <path d="M7.2 10.3c1-.8 2.6-.8 3.6 0" />
                  <circle cx="9" cy="12" r="1" />
                </svg>
                <svg className="iphone-battery" viewBox="0 0 28 13" aria-hidden="true">
                  <rect x=".75" y=".75" width="23" height="11.5" rx="3" />
                  <path d="M25.5 4v5c1.2-.2 1.8-.9 1.8-2.5S26.7 4.2 25.5 4Z" className="battery-cap" />
                  <rect x="3" y="3" width="17" height="7" rx="1.5" className="battery-level" />
                </svg>
              </span>
            </div>
            <div className="dynamic-island" aria-hidden="true" />
            <div className="home-indicator" aria-hidden="true" />
          </div>
        </div>
        <span className="iphone-button action" aria-hidden="true" />
        <span className="iphone-button volume-up" aria-hidden="true" />
        <span className="iphone-button volume-down" aria-hidden="true" />
        <span className="iphone-button power" aria-hidden="true" />
      </div>
    </main>
  );
}
