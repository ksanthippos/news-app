export default function Settings({ settings, setSettings, onClose }) {
  const toggleLanguage = (language) => {
    setSettings((current) => ({
      ...current,
      languages: current.languages.includes(language)
        ? current.languages.filter((x) => x !== language)
        : [...current.languages, language]
    }));
  };

  return (
    <section className="settings-panel">
      <div className="panel-header">
        <h2>Asetukset</h2>
        <button className="close-button" onClick={onClose}>Sulje</button>
      </div>

      <label className="setting-row">
        <span>Tumma tila</span>
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={(e) =>
            setSettings((s) => ({ ...s, darkMode: e.target.checked }))
          }
        />
      </label>

      <div className="setting-group">
        <h3>Kielet</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.languages.includes("fi")}
            onChange={() => toggleLanguage("fi")}
          />
          Suomi
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.languages.includes("en")}
            onChange={() => toggleLanguage("en")}
          />
          English
        </label>
      </div>

      <div className="setting-group">
        <h3>Ilmoitukset</h3>
        <p className="muted">
          Push-ilmoitusten käyttöliittymä voidaan kytkeä seuraavassa vaiheessa
          Web Push -palveluun.
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
    </section>
  );
}
