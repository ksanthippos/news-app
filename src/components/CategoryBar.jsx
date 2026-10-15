export default function CategoryBar({ categories, selected, onSelect }) {
  return (
    <nav className="category-bar" aria-label="Kategoriat">
      {categories.map((category) => (
        <button
          key={category}
          className={selected === category ? "selected" : ""}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </nav>
  );
}
