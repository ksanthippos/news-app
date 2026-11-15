import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const top =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (top > 280) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Tarkistetaan heti alussa
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <button
      type="button"
      className={`scroll-to-top ${visible ? "visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Rullaa sivun alkuun"
      title="Rullaa sivun alkuun"
    >
      <span className="scroll-to-top-icon">↑</span>
      <span className="scroll-to-top-label">Alkuun</span>
    </button>
  );
}
