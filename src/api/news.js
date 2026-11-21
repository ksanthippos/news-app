import { demoNews } from "../data/demoNews";
import {
  decodeHtmlEntities,
  stripHtml,
  extractImageUrlFromXml,
  deduplicateAndFilter
} from "../utils/newsProcessor";

const CACHE_KEY = "uutisapuri-live-news-cache";

export const CLIENT_FEEDS = [
  {
    name: "Yle Uutiset",
    url: "https://yle.fi/rss/uutiset/tuoreimmat",
    language: "fi",
    defaultCategory: "Kotimaa",
    maxItems: 16,
    direct: false
  },
  {
    name: "Helsingin Sanomat",
    url: "https://www.hs.fi/rss/tuoreimmat.xml",
    language: "fi",
    defaultCategory: "Uutiset",
    maxItems: 12,
    direct: true // Tukee CORS:ia suoraan selaimesta
  },
  {
    name: "Ilta-Sanomat",
    url: "https://www.is.fi/rss/tuoreimmat.xml",
    language: "fi",
    defaultCategory: "Uutiset",
    maxItems: 8,
    direct: true // Tukee CORS:ia suoraan selaimesta
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    language: "en",
    defaultCategory: "World",
    maxItems: 8,
    direct: false
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    language: "en",
    defaultCategory: "Technology",
    maxItems: 6,
    direct: false
  },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    language: "en",
    defaultCategory: "World",
    maxItems: 8,
    direct: false
  }
];

/**
 * Parsii suoran XML-syötteen (Ilta-Sanomat, Helsingin Sanomat) selaimessa
 */
function parseRssXmlClient(xmlText, feedConfig) {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const getTag = (tag) => {
      const match = itemXml.match(
        new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
      );
      return match ? decodeHtmlEntities(match[1]).trim() : "";
    };

    const categoryMatches = [
      ...itemXml.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)
    ]
      .map((m) => decodeHtmlEntities(m[1]).trim())
      .filter(Boolean);

    const title = stripHtml(getTag("title"));
    const rawLink = getTag("link");
    const linkMatch = itemXml.match(/<link[^>]*>([^<\s]+)/i);
    const link = rawLink || (linkMatch ? linkMatch[1].trim() : "");
    const description = stripHtml(
      getTag("description") || getTag("content:encoded") || getTag("summary")
    );
    const guid = stripHtml(getTag("guid")) || link;
    const pubDateStr = getTag("pubDate");
    const imageUrl = extractImageUrlFromXml(itemXml);

    if (!title || !link) continue;

    let published = new Date().toISOString();
    if (pubDateStr) {
      const parsedDate = new Date(pubDateStr);
      if (!isNaN(parsedDate.getTime())) {
        published = parsedDate.toISOString();
      }
    }

    const category = categoryMatches[0] || feedConfig.defaultCategory || "Uutiset";

    items.push({
      id: `${feedConfig.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${encodeURIComponent(guid)}`,
      title,
      summary: description,
      source: feedConfig.name,
      language: feedConfig.language,
      category,
      published,
      url: link,
      imageUrl: imageUrl || null
    });

    if (items.length >= feedConfig.maxItems) {
      break;
    }
  }

  return items;
}

/**
 * Parsii RSS2JSON-palvelun palauttaman JSON-vastauksen
 */
function parseRss2JsonClient(data, feedConfig, existingMap = new Map()) {
  if (!data || !Array.isArray(data.items)) return [];
  const items = [];

  for (const item of data.items) {
    const title = stripHtml(item.title);
    const link = item.link || item.guid || "";
    if (!title || !link) continue;

    const summary = stripHtml(item.description || item.content || "");
    const guid = item.guid || link;

    let published = new Date().toISOString();
    if (item.pubDate) {
      // rss2json palauttaa UTC-ajan tyyliin "2026-11-21 07:16:42"
      const dateStr =
        item.pubDate.includes("Z") || item.pubDate.includes("+")
          ? item.pubDate
          : item.pubDate.replace(" ", "T") + "Z";
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        published = parsedDate.toISOString();
      }
    }

    const category =
      Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories[0]
        : feedConfig.defaultCategory || "Uutiset";

    // Kuvan poiminta
    let imageUrl =
      item.thumbnail ||
      item.enclosure?.thumbnail ||
      item.enclosure?.link ||
      item.enclosure?.url ||
      null;

    if (imageUrl && typeof imageUrl === "string") {
      imageUrl = decodeHtmlEntities(imageUrl);
    }

    // Jos kuvaa ei ollut suoraan syötteessä (kuten Yle), tarkistetaan löytyykö aiemmasta välimuistista
    if (!imageUrl) {
      const cleanLink = link.split("?")[0];
      const match =
        existingMap.get(link) ||
        existingMap.get(cleanLink) ||
        existingMap.get(guid) ||
        existingMap.get(title.toLowerCase().trim());
      if (match?.imageUrl) {
        imageUrl = match.imageUrl;
      }
    }

    items.push({
      id: `${feedConfig.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${encodeURIComponent(guid)}`,
      title,
      summary,
      source: feedConfig.name,
      language: feedConfig.language,
      category,
      published,
      url: link,
      imageUrl
    });

    if (items.length >= feedConfig.maxItems) {
      break;
    }
  }

  return items;
}

/**
 * Hakee yksittäisen syötteen suoraan selaimesta
 */
async function fetchSingleFeedClient(feedConfig, existingMap) {
  if (feedConfig.direct) {
    // Suora haku (Ilta-Sanomat ja Helsingin Sanomat tukevat CORS-otsikoita)
    const res = await fetch(feedConfig.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xmlText = await res.text();
    return parseRssXmlClient(xmlText, feedConfig);
  }

  // Yle, BBC ja Guardian haetaan rss2json-välityksen kautta
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedConfig.url)}`;
  const res = await fetch(proxyUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error("rss2json status not ok");
  return parseRss2JsonClient(data, feedConfig, existingMap);
}

/**
 * Hakee uutiset livenä kaikista syötteistä suoraan selaimesta
 */
export async function fetchLiveNews(existingArticles = []) {
  const existingMap = new Map();
  if (Array.isArray(existingArticles)) {
    for (const art of existingArticles) {
      if (art.url) {
        existingMap.set(art.url, art);
        existingMap.set(art.url.split("?")[0], art);
      }
      if (art.id) existingMap.set(art.id, art);
      if (art.title) existingMap.set(art.title.toLowerCase().trim(), art);
    }
  }

  const results = await Promise.allSettled(
    CLIENT_FEEDS.map((feed) => fetchSingleFeedClient(feed, existingMap))
  );

  const newArticles = [];
  let successfulFeeds = 0;

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.status === "fulfilled" && Array.isArray(res.value) && res.value.length > 0) {
      newArticles.push(...res.value);
      successfulFeeds++;
    } else {
      console.warn(`Syötteen ${CLIENT_FEEDS[i].name} live-nouto epäonnistui:`, res.reason);
    }
  }

  if (successfulFeeds === 0) {
    throw new Error("Yksikään live-syöte ei vastannut");
  }

  // Yhdistetään olemassa olevat artikkelit ja uudet
  const combined = [...newArticles];
  if (Array.isArray(existingArticles)) {
    for (const art of existingArticles) {
      if (!combined.some((item) => item.url === art.url)) {
        combined.push(art);
      }
    }
  }

  // Järjestetään tuoreimmat ensin ja karsitaan duplikaatit
  combined.sort((a, b) => new Date(b.published) - new Date(a.published));
  const unique = deduplicateAndFilter(combined);

  const payload = {
    articles: unique,
    updatedAt: new Date().toISOString(),
    isLive: true,
    isFallback: false
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Välimuistiin tallennus epäonnistui:", err);
  }

  return {
    articles: unique,
    updatedAt: new Date(payload.updatedAt),
    isLive: true,
    isFallback: false
  };
}

/**
 * Hakee staattisen uutisdatan (news.json) tai selaimen välimuistista
 */
export async function fetchStaticNews() {
  // 1. Kokeillaan ensin selaimen tuoretta live-välimuistia
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.articles) && parsed.articles.length > 0) {
        return {
          articles: parsed.articles,
          updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
          isLive: Boolean(parsed.isLive),
          isFallback: false
        };
      }
    }
  } catch (err) {
    console.warn("Välimuistin luku epäonnistui:", err);
  }

  // 2. Haetaan public/news.json
  try {
    const basePath = import.meta.env.BASE_URL || "/";
    const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
    const url = `${normalizedBase}news.json?t=${Date.now()}`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data.articles) && data.articles.length > 0) {
      return {
        articles: data.articles,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
        isLive: false,
        isFallback: false
      };
    }

    throw new Error("Tiedosto ei sisältänyt artikkeleita");
  } catch (err) {
    console.warn("news.json lataus epäonnistui, käytetään demouutisia:", err.message);
    return {
      articles: demoNews,
      updatedAt: null,
      isLive: false,
      isFallback: true
    };
  }
}

/**
 * Pääasiallinen uutisten haku.
 * Tukee sekä nopeaa alkulatausta että reaaliaikaista live-hakua.
 */
export async function fetchNews({ live = false, existingArticles = [] } = {}) {
  if (live) {
    try {
      return await fetchLiveNews(existingArticles);
    } catch (err) {
      console.warn("Live-nouto epäonnistui, siirrytään staattiseen noutoon:", err.message);
    }
  }

  return await fetchStaticNews();
}
