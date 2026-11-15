import { useEffect, useRef, useState } from "react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusText, setStatusText] = useState("");

  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isEligibleRef = useRef(false);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  const THRESHOLD = 65;
  const MAX_PULL = 110;

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    const getScrollTop = () =>
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const handleTouchStart = (e) => {
      if (isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      const scrollTop = getScrollTop();
      if (scrollTop <= 1) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isEligibleRef.current = true;
        isPullingRef.current = false;
      } else {
        isEligibleRef.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isEligibleRef.current || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = Math.abs(currentX - startXRef.current);

      // Jos liike on selvästi sivusuuntainen, peruutetaan
      if (!isPullingRef.current && diffX > Math.abs(diffY)) {
        isEligibleRef.current = false;
        return;
      }

      const scrollTop = getScrollTop();
      if (diffY > 5 && scrollTop <= 0) {
        isPullingRef.current = true;

        // Estetään selaimen oletus-vieritys / Safari-kumivenytys
        if (e.cancelable) {
          e.preventDefault();
        }

        // Damping / kitka: liike vaimenee mitä alemmas vedetään
        const damped = Math.min(diffY * 0.42, MAX_PULL);
        setPullDistance(damped);

        if (damped >= THRESHOLD) {
          setStatusText("Vapauta päivittääksesi");
        } else {
          setStatusText("Vedä alas päivittääksesi");
        }
      } else if (diffY <= 0) {
        setPullDistance(0);
        isPullingRef.current = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshingRef.current) {
        isEligibleRef.current = false;
        isPullingRef.current = false;
        setPullDistance(0);
        setStatusText("");
        return;
      }

      isEligibleRef.current = false;
      isPullingRef.current = false;

      setPullDistance((current) => {
        if (current >= THRESHOLD) {
          runRefresh();
          return 48; // pidetään indikaattori näkyvissä
        } else {
          setStatusText("");
          return 0;
        }
      });
    };

    const runRefresh = async () => {
      setIsRefreshing(true);
      setStatusText("Päivitetään uutisia...");

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch {
          // Ei sallittu
        }
      }

      try {
        if (onRefreshRef.current) {
          await onRefreshRef.current();
        }
        setStatusText("Uutiset ajan tasalla!");
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error("Päivitysvirhe:", err);
        setStatusText("Päivitys epäonnistui");
        await new Promise((r) => setTimeout(r, 800));
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setStatusText("");
      }
    };

    // Tapahtumankuuntelijat suoraan ikkunaan
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const rotation = Math.min((pullDistance / THRESHOLD) * 180, 180);
  const isVisible = pullDistance > 8 || isRefreshing;

  return (
    <div className="pull-to-refresh-container" ref={containerRef}>
      <div
        className={`pull-indicator ${isRefreshing ? "refreshing" : ""} ${
          isVisible ? "visible" : ""
        }`}
        style={{
          transform: `translate3d(0, ${Math.max(pullDistance - 48, 0)}px, 0)`,
          opacity: isVisible ? 1 : 0
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
          transform: `translate3d(0, ${pullDistance * 0.65}px, 0)`,
          transition: isPullingRef.current
            ? "none"
            : "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)"
        }}
      >
        {children}
      </div>
    </div>
  );
}
