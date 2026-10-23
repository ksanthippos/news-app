import { useEffect, useRef, useState } from "react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 60; // px vetomatka jolla päivitys laukeaa
  const MAX_PULL = 95;

  useEffect(() => {
    const handleTouchStart = (e) => {
      // Käynnistetään vain kun sivu on aivan yläreunassa eikä päivitys ole jo käynnissä
      if (window.scrollY <= 0 && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
        isPulling.current = true;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - touchStartY.current;
      const diffX = Math.abs(currentX - touchStartX.current);

      // Jos liike on vaakasuuntainen (esim. kategoriapalkin selaus), unohdetaan pull
      if (diffX > Math.abs(diffY)) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      // Vain alaspäin vetäminen sivun huipulla
      if (diffY > 0 && window.scrollY <= 0) {
        // Kitkakäyrä tekee vedosta luonnollisen tuntuisen
        const distance = Math.min(diffY * 0.45, MAX_PULL);
        setPullDistance(distance);

        if (distance >= THRESHOLD) {
          setStatusText("Vapauta päivittääksesi");
        } else {
          setStatusText("Vedä alas päivittääksesi");
        }

        // Estetään selaimen oletus-pomppaus
        if (e.cancelable && distance > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;
      isPulling.current = false;

      if (pullDistance >= THRESHOLD) {
        try {
          setIsRefreshing(true);
          setPullDistance(48); // Pidetään indikaattori näkyvissä latauksen ajan
          setStatusText("Päivitetään uutisia...");

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate(15);
            } catch {
              // Värinä ei aina sallittu ilman käyttäjäehtoa
            }
          }

          await onRefresh();

          setStatusText("Uutiset päivitetty!");
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
          setStatusText("Päivitys epäonnistui");
          await new Promise((resolve) => setTimeout(resolve, 800));
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setStatusText("");
        }
      } else {
        setPullDistance(0);
        setStatusText("");
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, isRefreshing, pullDistance]);

  const rotation = Math.min((pullDistance / THRESHOLD) * 180, 180);

  return (
    <div className="pull-to-refresh-container">
      <div
        className={`pull-indicator ${isRefreshing ? "refreshing" : ""} ${
          pullDistance > 0 || isRefreshing ? "visible" : ""
        }`}
        style={{
          transform: `translate3d(0, ${Math.max(pullDistance - 48, 0)}px, 0)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
        aria-hidden="true"
      >
        <div className="pull-pill">
          {isRefreshing ? (
            <span className="pull-spinner" />
          ) : (
            <span
              className="pull-arrow"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              ↓
            </span>
          )}
          <span className="pull-label">{statusText}</span>
        </div>
      </div>

      <div
        className="pull-content"
        style={{
          transform: `translate3d(0, ${pullDistance * 0.7}px, 0)`,
          transition: isPulling.current
            ? "none"
            : "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)"
        }}
      >
        {children}
      </div>
    </div>
  );
}

