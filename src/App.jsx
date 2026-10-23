import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "./api/news";
import NewsCard from "./components/NewsCard";
import CategoryBar from "./components/CategoryBar";
import Settings from "./components/Settings";

const defaultSettings = {
  darkMode: false,
  languages: ["fi", "en"],
  notifications: false
};

function loadSettings() {
  try {
    const saved = localStorage.getItem("uutiskoostaja-settings");
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem("uutiskoostaja-favorites")) || [];
  } catch {
    return [];
  }
}

export default function App() {
  const [news, setNews] = useState([]);
  const [newsMeta, setNewsMeta] = useState({ updatedAt: null, isFallback: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(loadSettings);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [category, setCategory] = useState("Kaikki");
  const [showSettings, setShowSettings] = useState(false);

  async function loadNews() {
    try {
      setLoading(true);
      setError("");

      const result = await fetchNews();
      setNews(result.articles);
      setNewsMeta({
        updatedAt: result.updatedAt,
        isFallback: result.isFallback
      });
    } catch (err) {
      console.error(err);
      setError(`Uutisten hakeminen epäonnistui: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    localStorage.setItem("uutiskoostaja-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("uutiskoostaja-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  const categories = useMemo(() => {
    const values = new Set(news.map((article) => article.category).filter(Boolean));
    const list = ["Kaikki"];
    if (favorites.length > 0 || category === "★ Suosikit") {
      list.push("★ Suosikit");
    }
    return [...list, ...values];
  }, [news, favorites.length, category]);

  const visibleNews = useMemo(() => {
    return news.filter((article) => {
      const isFav = favorites.includes(article.id);
      if (category === "★ Suosikit") {
        return isFav;
      }
      const languageOk = settings.languages.includes(article.language);
      const categoryOk = category === "Kaikki" || article.category === category;
      return languageOk && categoryOk;
    });
  }, [news, category, settings.languages, favorites]);

  const toggleFavorite = (id) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id]
    );
  };

  const formattedUpdate = useMemo(() => {
    if (!newsMeta.updatedAt) return null;
    return newsMeta.updatedAt.toLocaleString("fi-FI", {
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }, [newsMeta.updatedAt]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">OMA UUTISVIRTA</div>
          <h1>Uutiskoostaja</h1>
        </div>
        <button
          className="settings-button"
          onClick={() => setShowSettings((value) => !value)}
          aria-label="Asetukset"
        >
          ⚙︎
        </button>
      </header>

      {showSettings ? (
        <Settings
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <>
          <section className="intro">
            <h2>Tuoreimmat uutiset</h2>
            <p>
              {newsMeta.isFallback ? (
                <span>Käytetään demodataa (aja <code>npm run fetch:news</code> ladataksesi tuoreet uutiset).</span>
              ) : formattedUpdate ? (
                <span>Päivitetty {formattedUpdate}</span>
              ) : (
                <span>Henkilökohtainen uutiskoostaja</span>
              )}
            </p>
          </section>

          <CategoryBar
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />

          <main className="news-list">
            {loading && (
              <div className="status-message">
                Haetaan uutisia...
              </div>
            )}

            {error && (
              <div className="status-message error">
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              visibleNews.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  favorite={favorites.includes(article.id)}
                  onFavorite={toggleFavorite}
                />
              ))}

            {!loading && !error && visibleNews.length === 0 && (
              <div className="status-message">
                {category === "★ Suosikit"
                  ? "Ei vielä suosikeiksi merkittyjä uutisia. Napauta kortin tähteä tallentaaksesi uutisen lukulistalle!"
                  : "Ei uutisia valituilla suodattimilla."}
              </div>
            )}
          </main>

          <footer>
            <span>Local-first PWA</span>
            <span>·</span>
            <span>{visibleNews.length} uutista</span>
          </footer>
        </>
      )}
    </div>
  );
}
