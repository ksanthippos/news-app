import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "./api/news";
import NewsCard from "./components/NewsCard";
import CategoryBar from "./components/CategoryBar";
import Settings from "./components/Settings";
import { DesktopNav, MobileBottomNav } from "./components/Navigation";
import PullToRefresh from "./components/PullToRefresh";
import ScrollToTop from "./components/ScrollToTop";
import {
  loadReadHistory,
  markArticleRead,
  isArticleRead,
  clearReadHistory,
  getReadCount
} from "./utils/readHistory";

const defaultSettings = {
  theme: "system", // "system" | "light" | "dark"
  darkMode: false,
  languages: ["fi", "en"],
  notifications: false,
  hideReadNews: true
};

function loadSettings() {
  try {
    const saved = localStorage.getItem("uutiskoostaja-settings");
    if (!saved) return defaultSettings;
    const parsed = JSON.parse(saved);

    // Taaksepäin yhteensopivuus vanhan darkMode-booleanin kanssa
    let theme = parsed.theme;
    if (!theme) {
      theme = parsed.darkMode ? "dark" : "system";
    }

    return {
      ...defaultSettings,
      ...parsed,
      theme,
      hideReadNews: parsed.hideReadNews !== undefined ? parsed.hideReadNews : true
    };
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
  const [readHistory, setReadHistory] = useState(loadReadHistory);
  const [activeTab, setActiveTab] = useState("home"); // "home" | "favorites" | "settings"
  const [category, setCategory] = useState("Kaikki");
  const [showReadInFeed, setShowReadInFeed] = useState(false);

  // Uutisten lataus
  async function loadNews(showFullLoader = false) {
    try {
      if (showFullLoader) {
        setLoading(true);
      }
      setError("");

      const result = await fetchNews();
      setNews(result.articles);
      setNewsMeta({
        updatedAt: result.updatedAt,
        isFallback: result.isFallback
      });
      return result;
    } catch (err) {
      console.error(err);
      setError(`Uutisten hakeminen epäonnistui: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Ensilataus
  useEffect(() => {
    loadNews(true);
  }, []);

  // Automaattipäivitys kun käyttäjä palaa puhelimessa appiin
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadNews(false);
        setReadHistory(loadReadHistory());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, []);

  // Tallennukset localStorageen
  useEffect(() => {
    localStorage.setItem("uutiskoostaja-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("uutiskoostaja-favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Teeman hallinta: Järjestelmä / Vaalea / Tumma
  useEffect(() => {
    const applyTheme = () => {
      const mode = settings.theme || "system";
      let isDark = false;

      if (mode === "dark") {
        isDark = true;
      } else if (mode === "light") {
        isDark = false;
      } else {
        // "system": haetaan laitteen järjestelmäteema
        isDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      document.documentElement.classList.toggle("dark", Boolean(isDark));
    };

    applyTheme();

    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!settings.theme || settings.theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.theme]);

  // Kategoriat (vain tuoreista uutisista, ei duplikaatteja)
  const categories = useMemo(() => {
    const values = new Set(news.map((article) => article.category).filter(Boolean));
    return ["Kaikki", ...values];
  }, [news]);

  // Uutisen merkitseminen luetuksi
  const handleMarkRead = (article) => {
    const updated = markArticleRead(article);
    setReadHistory(updated);
  };

  // Lukuhistorian tyhjennys
  const handleClearReadHistory = () => {
    clearReadHistory();
    setReadHistory({});
  };

  // Suosikin lisäys / poisto
  const toggleFavorite = (id) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id]
    );
  };

  // Suodatetut uutiset etusivulle
  const { visibleNews, hiddenReadCount } = useMemo(() => {
    let hiddenCount = 0;

    const filtered = news.filter((article) => {
      const languageOk = settings.languages.includes(article.language);
      const categoryOk = category === "Kaikki" || article.category === category;
      if (!languageOk || !categoryOk) return false;

      const isRead = isArticleRead(article, readHistory);
      const isFav = favorites.includes(article.id);

      // Jos asetus on päällä eikä käyttäjä ole avannut "näytä luetut" -tilaa:
      if (settings.hideReadNews !== false && isRead && !isFav) {
        hiddenCount++;
        if (!showReadInFeed) {
          return false;
        }
      }

      return true;
    });

    return { visibleNews: filtered, hiddenReadCount: hiddenCount };
  }, [
    news,
    category,
    settings.languages,
    settings.hideReadNews,
    readHistory,
    favorites,
    showReadInFeed
  ]);

  // Suosikkinäkymän uutiset (näytetään aina kaikki suosikit)
  const favoriteNews = useMemo(() => {
    return news.filter((article) => favorites.includes(article.id));
  }, [news, favorites]);

  const formattedUpdate = useMemo(() => {
    if (!newsMeta.updatedAt) return null;
    return newsMeta.updatedAt.toLocaleString("fi-FI", {
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }, [newsMeta.updatedAt]);

  const readCount = useMemo(() => getReadCount(readHistory), [readHistory]);

  return (
    <>
      <PullToRefresh onRefresh={() => loadNews(false)}>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-group" onClick={() => setActiveTab("home")}>
            <div className="eyebrow">UUTISIA OMAAN MAKUUN</div>
            <h1>Uutisapuri</h1>
          </div>

          <div className="header-actions">
            {/* Työpöytänäkymän ylävalikko (näytetään näytöillä >= 700px) */}
            <DesktopNav
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              favoritesCount={favorites.length}
            />

            {/* Manuaalinen päivityspainike */}
            <button
              className={`refresh-button ${loading ? "spinning" : ""}`}
              onClick={() => loadNews(true)}
              aria-label="Päivitä uutiset"
              title="Päivitä uutiset"
              type="button"
            >
              ↻
            </button>
          </div>
        </header>

        {/* 1. KOTI -NÄKYMÄ */}
        {activeTab === "home" && (
          <main className="tab-view tab-home">
            <section className="intro">
              <h2>Tuoreimmat uutiset</h2>
              <p>
                {newsMeta.isFallback ? (
                  <span>
                    Käytetään demodataa (aja <code>npm run fetch:news</code>).
                  </span>
                ) : formattedUpdate ? (
                  <span>Päivitetty {formattedUpdate}</span>
                ) : (
                  <span>Henkilökohtainen uutisapuri</span>
                )}
              </p>
            </section>

            <CategoryBar
              categories={categories}
              selected={category}
              onSelect={setCategory}
            />

            {/* Ilmoitus piilotetuista luetuista uutisista */}
            {settings.hideReadNews !== false && hiddenReadCount > 0 && (
              <div className="hidden-read-banner">
                <span>
                  {showReadInFeed
                    ? `Näytetään myös ${hiddenReadCount} jo luettua uutista`
                    : `${hiddenReadCount} aiemmin lukemaasi uutista piilotettu`}
                </span>
                <button
                  type="button"
                  className="banner-toggle-button"
                  onClick={() => setShowReadInFeed((v) => !v)}
                >
                  {showReadInFeed ? "Piilota luetut" : "Näytä luetut"}
                </button>
              </div>
            )}

            <div className="news-list">
              {loading && news.length === 0 && (
                <div className="status-message">Haetaan tuoreita uutisia...</div>
              )}

              {error && <div className="status-message error">{error}</div>}

              {!error &&
                visibleNews.map((article) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    favorite={favorites.includes(article.id)}
                    onFavorite={toggleFavorite}
                    isRead={isArticleRead(article, readHistory)}
                    onRead={handleMarkRead}
                  />
                ))}

              {!loading && !error && visibleNews.length === 0 && (
                <div className="status-message empty-feed">
                  <div className="empty-feed-icon">🎉</div>
                  <h3>Kaikki tuoreet uutiset on luettu!</h3>
                  <p>
                    Uusia uutisia saapuu seuraavassa päivityksessä. Voit myös katsella
                    aiemmin lukemiasi juttuja.
                  </p>
                  {hiddenReadCount > 0 && !showReadInFeed && (
                    <button
                      type="button"
                      className="action-button-secondary"
                      onClick={() => setShowReadInFeed(true)}
                    >
                      Näytä luetut uutiset ({hiddenReadCount} kpl)
                    </button>
                  )}
                </div>
              )}
            </div>

            <footer>
              <span>Local-first PWA</span>
              <span>·</span>
              <span>{visibleNews.length} uutista näkyvissä</span>
            </footer>
          </main>
        )}

        {/* 2. SUOSIKIT -NÄKYMÄ */}
        {activeTab === "favorites" && (
          <main className="tab-view tab-favorites">
            <section className="intro">
              <h2>Tallennetut suosikit</h2>
              <p>Tähdellä merkitsemäsi uutiset säilyvät täällä tallessa.</p>
            </section>

            <div className="news-list">
              {favoriteNews.length > 0 ? (
                favoriteNews.map((article) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    favorite={true}
                    onFavorite={toggleFavorite}
                    isRead={isArticleRead(article, readHistory)}
                    onRead={handleMarkRead}
                  />
                ))
              ) : (
                <div className="status-message empty-favorites">
                  <div className="empty-feed-icon">☆</div>
                  <h3>Ei vielä suosikkeja</h3>
                  <p>
                    Voit tallentaa mielenkiintoisia uutisia lukulistallesi napauttamalla
                    uutiskortin tähteä.
                  </p>
                  <button
                    type="button"
                    className="action-button-secondary"
                    onClick={() => setActiveTab("home")}
                  >
                    Selaa uutisia
                  </button>
                </div>
              )}
            </div>
          </main>
        )}

        {/* 3. ASETUKSET -NÄKYMÄ */}
        {activeTab === "settings" && (
          <main className="tab-view tab-settings">
            <Settings
              settings={settings}
              setSettings={setSettings}
              readCount={readCount}
              onClearReadHistory={handleClearReadHistory}
              onBackToHome={() => setActiveTab("home")}
            />
          </main>
        )}
      </div>
    </PullToRefresh>

      {/* Leijuva Alkuun-nappi sivua alas rullattaessa */}
      <ScrollToTop />

      {/* Mobiilin alavalintanauha AINA kiinteästi ruudun alalaidassa (riippumaton vierityksestä) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        favoritesCount={favorites.length}
      />
  </>
);
}
