import { demoNews } from "../data/demoNews";

/**
 * Hakee uutiset public/news.json -tiedostosta.
 * Mikäli tiedostoa ei löydy tai lataus epäonnistuu, palautetaan demouutiset varalle.
 */
export async function fetchNews() {
  try {
    const basePath = import.meta.env.BASE_URL || "/";
    const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
    // Aikaleima ja cache: no-store estävät mobiiliselaimia tarjoilemasta vanhaa välimuistia
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
        isFallback: false
      };
    }

    throw new Error("Tiedosto ei sisältänyt artikkeleita");
  } catch (err) {
    console.warn(
      "news.json lataus epäonnistui, käytetään varalla demouutisia:",
      err.message
    );
    return {
      articles: demoNews,
      updatedAt: null,
      isFallback: true
    };
  }
}
