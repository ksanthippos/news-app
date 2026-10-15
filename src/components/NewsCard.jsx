export default function NewsCard({ article, favorite, onFavorite }) {
  const time = new Date(article.published).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <article className="news-card">
      <div className="news-card-top">
        <span className="category">{article.category}</span>
        <button
          className={`favorite-button ${favorite ? "active" : ""}`}
          onClick={() => onFavorite(article.id)}
          aria-label={favorite ? "Poista suosikeista" : "Lisää suosikkeihin"}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>

      <h2>{article.title}</h2>
      <p>{article.summary}</p>

      <div className="news-meta">
        <span>{article.source}</span>
        <span>·</span>
        <span>{time}</span>
      </div>

      <a href={article.url} target="_blank" rel="noreferrer">
        Lue alkuperäinen juttu →
      </a>
    </article>
  );
}
