export function DesktopNav({ activeTab, onSelectTab, favoritesCount = 0 }) {
  return (
    <nav className="desktop-nav" aria-label="Päävalikko">
      <button
        className={`nav-item ${activeTab === "home" ? "active" : ""}`}
        onClick={() => onSelectTab("home")}
        type="button"
      >
        <span className="nav-icon">📰</span>
        <span>Koti</span>
      </button>

      <button
        className={`nav-item ${activeTab === "favorites" ? "active" : ""}`}
        onClick={() => onSelectTab("favorites")}
        type="button"
      >
        <span className="nav-icon">★</span>
        <span>Suosikit</span>
        {favoritesCount > 0 && (
          <span className="nav-badge">{favoritesCount}</span>
        )}
      </button>

      <button
        className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
        onClick={() => onSelectTab("settings")}
        type="button"
      >
        <span className="nav-icon">⚙︎</span>
        <span>Asetukset</span>
      </button>
    </nav>
  );
}

export function MobileBottomNav({ activeTab, onSelectTab, favoritesCount = 0 }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobiilivalikko">
      <button
        className={`bottom-nav-item ${activeTab === "favorites" ? "active" : ""}`}
        onClick={() => onSelectTab("favorites")}
        type="button"
        aria-label="Suosikit"
      >
        <span className="bottom-nav-icon-wrap">
          <span className="bottom-nav-icon">★</span>
          {favoritesCount > 0 && (
            <span className="nav-badge">{favoritesCount}</span>
          )}
        </span>
        <span className="bottom-nav-label">Suosikit</span>
      </button>

      <button
        className={`bottom-nav-item bottom-nav-home ${activeTab === "home" ? "active" : ""}`}
        onClick={() => onSelectTab("home")}
        type="button"
        aria-label="Koti"
      >
        <span className="bottom-nav-icon-wrap">
          <span className="bottom-nav-icon">📰</span>
        </span>
        <span className="bottom-nav-label">Koti</span>
      </button>

      <button
        className={`bottom-nav-item ${activeTab === "settings" ? "active" : ""}`}
        onClick={() => onSelectTab("settings")}
        type="button"
        aria-label="Asetukset"
      >
        <span className="bottom-nav-icon-wrap">
          <span className="bottom-nav-icon">⚙︎</span>
        </span>
        <span className="bottom-nav-label">Asetukset</span>
      </button>
    </nav>
  );
}

export default function Navigation(props) {
  return (
    <>
      <DesktopNav {...props} />
      <MobileBottomNav {...props} />
    </>
  );
}
