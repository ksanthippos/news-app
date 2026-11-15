const STORAGE_KEY = "uutisapuri-read-articles";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Poistaa yli 7 päivää vanhat merkinnät ja palauttaa siivotun lukukartan:
 * { [articleIdOrUrl]: timestamp }
 */
export function loadReadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const now = Date.now();
    const cleaned = {};
    let hasChanges = false;

    for (const [key, timestamp] of Object.entries(parsed)) {
      if (typeof timestamp === "number" && now - timestamp < SEVEN_DAYS_MS) {
        cleaned[key] = timestamp;
      } else {
        hasChanges = true;
      }
    }

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch (err) {
    console.warn("Lukuhistorian lukeminen epäonnistui:", err);
    return {};
  }
}

/**
 * Tallentaa uutisen luetuksi nykyisellä aikaleimalla.
 */
export function markArticleRead(article) {
  if (!article) return {};
  try {
    const history = loadReadHistory();
    const now = Date.now();

    // Tallennetaan sekä ID että URL tunnistamisen varmistamiseksi
    if (article.id) history[article.id] = now;
    if (article.url) history[article.url] = now;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history;
  } catch (err) {
    console.warn("Lukuhistorian tallennus epäonnistui:", err);
    return {};
  }
}

/**
 * Tarkistaa onko uutinen merkitty luetuksi.
 */
export function isArticleRead(article, readHistory) {
  if (!article || !readHistory) return false;
  if (article.id && readHistory[article.id]) return true;
  if (article.url && readHistory[article.url]) return true;
  return false;
}

/**
 * Tyhjentää koko 7 päivän lukuhistorian.
 */
export function clearReadHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Lukuhistorian tyhjennys epäonnistui:", err);
  }
  return {};
}

/**
 * Laskee montako uniikkia uutista on luettu viimeisen 7 päivän aikana.
 */
export function getReadCount(readHistory) {
  if (!readHistory) return 0;
  // Koska ID ja URL voivat molemmat olla tallessa samalle uutiselle, lasketaan uniikit URL/ID-parit
  const keys = Object.keys(readHistory);
  // Arvioidaan artikkelien määrä (ID:t alkavat yleensä syötteen nimellä)
  const idKeys = keys.filter((k) => !k.startsWith("http"));
  return idKeys.length > 0 ? idKeys.length : Math.ceil(keys.length / 2);
}
