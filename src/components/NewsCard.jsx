export default function NewsCard({
  article,
  favorite,
  onFavorite,
  isRead = false,
  onRead
}) {
  const time = new Date(article.published).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const openArticle = () => {
    if (onRead) {
      onRead(article);
    }
    if (article.url) {
      window.open(article.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCardClick = (e) => {
    // Älä avaa juttua jos klikataan suoraan suosikkitähteä tai linkkiä
    if (e.target.closest(".favorite-button") || e.target.closest("a")) {
      return;
    }
    openArticle();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target.closest(".favorite-button") || e.target.closest("a")) {
        return;
      }
      e.preventDefault();
      openArticle();
    }
  };

  return (
    <article
      className={`news-card ${isRead ? "is-read" : ""}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`Avaa uutinen: ${article.title}`}
    >
      {article.imageUrl && (
        <div className="news-card-image-wrap">
          <img
            src={article.imageUrl}
            alt=""
            loading="lazy"
            className="news-card-image"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="news-card-top">
        <div className="category-and-status">
          <span className="category">{article.category}</span>
          {isRead && <span className="read-badge">✓ Luettu</span>}
        </div>
        <button
          className={`favorite-button ${favorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(article.id);
          }}
          aria-label={favorite ? "Poista suosikeista" : "Lisää suosikkeihin"}
          title={favorite ? "Poista suosikeista" : "Lisää suosikkeihin"}
          type="button"
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>

      <h2>{article.title}</h2>
      {article.summary && <p>{article.summary}</p>}

      <div className="news-meta">
        <span>{article.source}</span>
        <span>·</span>
        <span>{time}</span>
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          if (onRead) onRead(article);
        }}
      >
        Lue alkuperäinen juttu →
      </a>
    </article>
  );
}
