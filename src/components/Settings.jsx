import { useState } from "react";
import { APP_VERSION, VERSION_HISTORY } from "../config";

export const AVAILABLE_SOURCES = [
  {
    id: "yle",
    name: "Yle Uutiset",
    description: "Ylen tuoreimmat uutiset, kotimaa ja maailma",
    language: "fi",
    flag: "🇫🇮"
  },
  {
    id: "hs",
    name: "Helsingin Sanomat",
    description: "HS:n tuoreimmat uutiset, talous ja yhteiskunta",
    language: "fi",
    flag: "🇫🇮"
  },
  {
    id: "is",
    name: "Ilta-Sanomat",
    description: "Päivän puheenaiheet, ilmiöt ja uutiset",
    language: "fi",
    flag: "🇫🇮"
  },
  {
    id: "bbc",
    name: "BBC News",
    description: "Kansainväliset uutiset ja teknologia (English)",
    language: "en",
    flag: "🇬🇧"
  },
  {
    id: "guardian",
    name: "The Guardian",
    description: "Maailmanlaajuiset uutiset ja analyysit (English)",
    language: "en",
    flag: "🌍"
  }
];

export default function Settings({
  settings,
  setSettings,
  readCount = 0,
  onClearReadHistory,
  onBackToHome
}) {
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const currentTheme = settings.theme || (settings.darkMode ? "dark" : "system");

  const setTheme = (theme) => {
    setSettings((current) => ({
      ...current,
      theme,
      darkMode: theme === "dark"
    }));
  };

  const toggleSource = (sourceName) => {
    setSettings((current) => {
      const currentSources = Array.isArray(current.sources)
        ? current.sources
        : AVAILABLE_SOURCES.map((s) => s.name);

      const isEnabled = currentSources.includes(sourceName);

      // Estetään poistamasta aivan kaikkia lähteitä (vähintään 1 säilytetään aina)
      if (isEnabled && currentSources.length === 1) {
        return current;
      }

      const nextSources = isEnabled
        ? currentSources.filter((s) => s !== sourceName)
        : [...currentSources, sourceName];

      // Päivitetään kielet automaattisesti valittujen lähteiden mukaan
      const hasFi = nextSources.some((s) =>
        AVAILABLE_SOURCES.find((src) => src.name === s && src.language === "fi")
      );
      const hasEn = nextSources.some((s) =>
        AVAILABLE_SOURCES.find((src) => src.name === s && src.language === "en")
      );

      const nextLanguages = [];
      if (hasFi) nextLanguages.push("fi");
      if (hasEn) nextLanguages.push("en");

      return {
        ...current,
        sources: nextSources,
        languages: nextLanguages.length > 0 ? nextLanguages : current.languages
      };
    });
  };

  const activeSources = Array.isArray(settings.sources)
    ? settings.sources
    : AVAILABLE_SOURCES.map((s) => s.name);

  return (
    <section className="settings-panel">
      <div className="panel-header">
        <div>
          <h2>Asetukset</h2>
          <p className="settings-subtitle">Muokkaa uutisvirtaasi ja ulkoasua</p>
        </div>
        {onBackToHome && (
          <button className="close-button" onClick={onBackToHome} type="button">
            ← Kotiin
          </button>
        )}
      </div>

      {/* Teemavalinta: Järjestelmä, Vaalea, Tumma */}
      <div className="setting-group">
        <h3>Teema</h3>
        <p className="muted">
          Valitse haluamasi ulkoasu tai anna sovelluksen seurata laitteesi asetusta.
        </p>
        <div className="theme-segmented-control" role="radiogroup" aria-label="Teemavalinta">
          <button
            type="button"
            className={`theme-chip ${currentTheme === "system" ? "active" : ""}`}
            onClick={() => setTheme("system")}
            role="radio"
            aria-checked={currentTheme === "system"}
          >
            <span className="theme-icon">📱</span>
            <span>Järjestelmä</span>
          </button>

          <button
            type="button"
            className={`theme-chip ${currentTheme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
            role="radio"
            aria-checked={currentTheme === "light"}
          >
            <span className="theme-icon">☀️</span>
            <span>Vaalea</span>
          </button>

          <button
            type="button"
            className={`theme-chip ${currentTheme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
            role="radio"
            aria-checked={currentTheme === "dark"}
          >
            <span className="theme-icon">🌙</span>
            <span>Tumma</span>
          </button>
        </div>
      </div>

      {/* Uutislähteet */}
      <div className="setting-group">
        <h3>Uutislähteet</h3>
        <p className="muted">
          Valitse mitkä mediat näytetään uutisvirrassasi. Voit kytkeä lähteitä vapaasti päälle tai pois.
        </p>

        <div className="sources-list">
          <div className="sources-section-title">Kotimaiset mediat</div>
          {AVAILABLE_SOURCES.filter((s) => s.language === "fi").map((src) => {
            const isChecked = activeSources.includes(src.name);
            return (
              <label key={src.id} className="source-item">
                <div className="source-item-left">
                  <span className="source-item-flag">{src.flag}</span>
                  <div className="source-item-text">
                    <span className="source-item-name">{src.name}</span>
                    <span className="source-item-desc">{src.description}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSource(src.name)}
                />
              </label>
            );
          })}

          <div className="sources-section-title" style={{ marginTop: "14px" }}>
            Kansainväliset mediat
          </div>
          {AVAILABLE_SOURCES.filter((s) => s.language === "en").map((src) => {
            const isChecked = activeSources.includes(src.name);
            return (
              <label key={src.id} className="source-item">
                <div className="source-item-left">
                  <span className="source-item-flag">{src.flag}</span>
                  <div className="source-item-text">
                    <span className="source-item-name">{src.name}</span>
                    <span className="source-item-desc">{src.description}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSource(src.name)}
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Lukuhistoria ja luettujen piilotus */}
      <div className="setting-group">
        <h3>Luetut uutiset</h3>
        <p className="muted">
          Sovellus pitää kirjaa avaamistasi uutisista 7 päivän ajalta. Luetut uutiset voidaan
          piilottaa automaattisesti etusivulta, jotta näet aina vain uutta luettavaa. Tähdellä
          merkityt suosikit säilyvät aina.
        </p>

        <label className="setting-row">
          <span>Piilota luetut uutiset etusivulta</span>
          <input
            type="checkbox"
            checked={settings.hideReadNews !== false}
            onChange={(e) =>
              setSettings((s) => ({ ...s, hideReadNews: e.target.checked }))
            }
          />
        </label>

        <div className="read-stats-box">
          <div className="read-stats-info">
            <span className="read-stats-number">{readCount}</span>
            <span className="read-stats-label">
              uutista luettu viimeisen 7 päivän aikana
            </span>
          </div>
          {readCount > 0 && (
            <button
              type="button"
              className="action-button-secondary"
              onClick={onClearReadHistory}
            >
              Tyhjennä lukuhistoria
            </button>
          )}
        </div>
      </div>

      {/* Versiohistoria */}
      <div className="setting-group version-group">
        <div
          className="version-header-row"
          onClick={() => setShowVersionHistory((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowVersionHistory((v) => !v);
            }
          }}
          aria-expanded={showVersionHistory}
        >
          <div>
            <h3>Versiohistoria (v{APP_VERSION})</h3>
            <p className="muted" style={{ margin: 0 }}>
              {showVersionHistory
                ? "Napauta sulkeaksesi luettelon"
                : "Napauta nähdäksesi julkaistut versiot ja commitit"}
            </p>
          </div>
          <span className={`version-arrow ${showVersionHistory ? "open" : ""}`}>
            ▾
          </span>
        </div>

        {showVersionHistory && (
          <div className="version-history-container">
            <div className="version-history-list" role="region" aria-label="Versioluettelo">
              {VERSION_HISTORY.map((item) => (
                <div key={item.version} className="version-item">
                  <div className="version-item-header">
                    <span className="version-badge">Versio {item.version}</span>
                    {item.date && <span className="version-date">{item.date}</span>}
                  </div>
                  <p className="version-text">-- {item.message} --</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ilmoitukset */}
      <div className="setting-group">
        <h3>Ilmoitukset</h3>
        <p className="muted">
          Push-ilmoitusten taustapalvelu voidaan kytkeä myöhemmässä vaiheessa.
        </p>
        <label className="setting-row">
          <span>Uutisilmoitukset</span>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) =>
              setSettings((s) => ({ ...s, notifications: e.target.checked }))
            }
          />
        </label>
      </div>

      <div className="settings-footer-info">
        <p>Uutisapuri v{APP_VERSION} · Local-first PWA</p>
      </div>
    </section>
  );
}
