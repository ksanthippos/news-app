const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc";

export async function fetchGdeltNews() {
  const params = new URLSearchParams({
    query: "technology",
    mode: "artlist",
    maxrecords: "20",
    timespan: "1d",
    sort: "datedesc",
    format: "json"
  });

  const response = await fetch(`${GDELT_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`GDELT-virhe: ${response.status}`);
  }

 const data = await response.json();

    console.log("GDELT-avaimet:", Object.keys(data));
    console.log("GDELT-JSON:", JSON.stringify(data, null, 2));
    console.log("Artikkeleita:", data.articles?.length);

  return (data.articles || []).map((article, index) => ({
    id: `gdelt-${index}-${article.url}`,
    title: article.title,
    summary: "",
    source: article.domain,
    language: "en",
    category: "Technology",
    published: parseGdeltDate(article.seendate),
    url: article.url
  }));
}

function parseGdeltDate(value) {
  if (!value) return new Date().toISOString();

  // GDELT käyttää esimerkiksi muotoa 20260926T103000Z
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );

  if (!match) return new Date().toISOString();

  const [, year, month, day, hour, minute, second] = match;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}