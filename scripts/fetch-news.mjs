import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputFile = path.join(rootDir, "public", "news.json");

const FEEDS = [
  {
    name: "Yle Uutiset",
    url: "https://yle.fi/rss/uutiset/tuoreimmat",
    language: "fi",
    defaultCategory: "Kotimaa",
    maxItems: 10,
    fetchOgImageIfMissing: true
  },
  {
    name: "Ilta-Sanomat",
    url: "https://www.is.fi/rss/tuoreimmat.xml",
    language: "fi",
    defaultCategory: "Uutiset",
    maxItems: 8,
    fetchOgImageIfMissing: false
  },
  {
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    language: "en",
    defaultCategory: "Technology",
    maxItems: 6,
    fetchOgImageIfMissing: false
  },
  {
    name: "BBC Science",
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    language: "en",
    defaultCategory: "Science",
    maxItems: 6,
    fetchOgImageIfMissing: false
  }
];

function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function stripHtml(html) {
  if (!html) return "";
  return decodeHtmlEntities(html)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImageUrl(itemXml) {
  // 1. media:thumbnail
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbMatch) return thumbMatch[1];

  // 2. enclosure (usein Ilta-Sanomat, HS ym.)
  const enclosureMatch =
    itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i) ||
    itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosureMatch) return enclosureMatch[1];

  // 3. media:content
  const mediaContentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaContentMatch) return mediaContentMatch[1];

  // 4. <img> tagi
  const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return null;
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function parseRssXml(xmlText, feedConfig) {
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
    const imageUrl = extractImageUrl(itemXml);

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

async function fetchFeed(feedConfig) {
  try {
    console.log(`Haetaan syöte: ${feedConfig.name} (${feedConfig.url})...`);
    const res = await fetch(feedConfig.url, {
      headers: {
        "User-Agent": "Uutiskoostaja/1.0 (+https://github.com/)"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      console.warn(`Varoitus: ${feedConfig.name} vastasi HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const articles = parseRssXml(xml, feedConfig);

    // Jos syötteessä ei ollut suoria kuvatunnisteita (kuten Yle), haetaan og:image rinnakkain
    if (feedConfig.fetchOgImageIfMissing) {
      const enrichPromises = articles.map(async (art) => {
        if (!art.imageUrl) {
          art.imageUrl = await fetchOgImage(art.url);
        }
      });
      await Promise.all(enrichPromises);
    }

    console.log(
      `✓ ${feedConfig.name}: saatiin ${articles.length} uutista (${articles.filter((a) => a.imageUrl).length} kuvalla)`
    );
    return articles;
  } catch (err) {
    console.warn(`Virhe haettaessa syötettä ${feedConfig.name}:`, err.message);
    return [];
  }
}

async function main() {
  console.log("Aloitetaan uutisten nouto RSS-syötteistä...");

  const results = await Promise.all(FEEDS.map(fetchFeed));
  const allArticles = results.flat();

  // Järjestetään tuorein ensin
  allArticles.sort((a, b) => new Date(b.published) - new Date(a.published));

  if (allArticles.length === 0) {
    console.error("Uutisia ei saatu noudettua yhdestäkään syötteestä.");
    process.exit(1);
  }

  const output = {
    updatedAt: new Date().toISOString(),
    total: allArticles.length,
    articles: allArticles
  };

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(output, null, 2), "utf8");

  const withImages = allArticles.filter((a) => a.imageUrl).length;
  console.log(
    `\nValmis! Tallennettu ${allArticles.length} uutista (joista ${withImages} sisältää kuvan) tiedostoon:`
  );
  console.log(`→ ${outputFile}`);
}

main().catch((err) => {
  console.error("Skripti kaatui:", err);
  process.exit(1);
});
