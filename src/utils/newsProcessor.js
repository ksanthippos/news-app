/**
 * Uutisapuri - Uutisten käsittely, puhdistus ja duplikaattikarsinta
 * Yhteiskäyttöinen selain- ja build-ympäristöissä.
 */

export function decodeHtmlEntities(str) {
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

export function stripHtml(html) {
  if (!html) return "";
  return decodeHtmlEntities(html)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractImageUrlFromXml(itemXml) {
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

/**
 * Normalisoi otsikon sanoiksi duplikaattitarkastusta varten
 */
export function extractTitleKeywords(title, language = "fi") {
  const clean = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(katso|lue|tässä|näkökulma|analyysi|kommentti|yle|is|suora|lähetys|video|live)\b/gi, "")
    .replace(/\b(the|and|for|with|from|that|this|what|how|why|are|was|were|has|have|had|new|says|after)\b/gi, "");

  const words = clean
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);

  return new Set(words);
}

/**
 * Tarkistaa ovatko kaksi uutista samasta aiheesta (eri lähteistä)
 */
export function areDuplicates(a, b) {
  if (!a || !b) return false;
  if (a.url && b.url && a.url === b.url) return true;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.language !== b.language) return false;

  const setA = extractTitleKeywords(a.title, a.language);
  const setB = extractTitleKeywords(b.title, b.language);

  if (setA.size === 0 || setB.size === 0) return false;

  let common = 0;
  for (const word of setA) {
    if (setB.has(word)) common++;
  }

  // Jaccard similarity & subset overlap
  const jaccard = common / (setA.size + setB.size - common);
  const minOverlap = common / Math.min(setA.size, setB.size);

  return jaccard >= 0.45 || (common >= 3 && minOverlap >= 0.65);
}

/**
 * Yhdistää duplikaatit eri lähteistä ja karsii liian vanhat uutiset
 */
export function deduplicateAndFilter(articles) {
  if (!Array.isArray(articles) || articles.length === 0) return [];

  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Karsitaan yli 4 päivää vanhat uutiset, jos tuoreempiakin on tarjolla
  const freshArticles = articles.filter((art) => {
    const age = now - new Date(art.published).getTime();
    return !isNaN(age) && age < FOUR_DAYS_MS;
  });

  const sourceArticles = freshArticles.length >= 10 ? freshArticles : articles;
  const uniqueList = [];

  for (const article of sourceArticles) {
    const existingIndex = uniqueList.findIndex((item) => areDuplicates(item, article));

    if (existingIndex === -1) {
      uniqueList.push({ ...article });
    } else {
      // Duplikaatti löytyi!
      const existing = uniqueList[existingIndex];

      // Pidetään kuva jos toiselta puuttui
      if (!existing.imageUrl && article.imageUrl) {
        existing.imageUrl = article.imageUrl;
      }

      // Merkitään molemmat lähteet näkyviin
      if (!existing.source.includes(article.source)) {
        existing.source = `${existing.source} & ${article.source}`;
      }
    }
  }

  return uniqueList;
}
