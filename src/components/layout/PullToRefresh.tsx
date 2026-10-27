"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

const THRESHOLD = 80; // distance (px) à tirer pour déclencher l'actualisation
const MAX = 130;

/**
 * « Tirer pour actualiser » (comme sur iPhone) dans l'app installée sur l'écran d'accueil et dans
 * l'application Android, où le navigateur ne le propose pas. Dans Safari / Chrome, le geste natif suffit.
 * Positionnement via CSSOM et attributs data-* (compatible avec la CSP).
 */
export function PullToRefresh() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      navigator.userAgent.includes("GamingBaseApp");
    const el = ref.current;
    if (!installed || !el) return;

    let startY = 0;
    let pulling = false;
    let dist = 0;
    const show = (d: number) => {
      dist = d;
      el.style.setProperty("--pull", `${d}px`);
      el.style.setProperty("--pull-turn", `${(d / THRESHOLD) * 270}deg`);
      el.dataset.on = d > 6 ? "1" : "0";
      el.dataset.ready = d >= THRESHOLD ? "1" : "0";
    };
    const start = (e: TouchEvent) => {
      if (el.dataset.loading === "1" || e.touches.length !== 1 || window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
      el.dataset.dragging = "1";
    };
    const move = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 0) return show(0);
      show(Math.min(MAX, dy * 0.5)); // résistance, comme un élastique
    };
    const end = () => {
      if (!pulling) return;
      pulling = false;
      el.dataset.dragging = "0";
      if (dist >= THRESHOLD) {
        el.dataset.loading = "1";
        show(THRESHOLD);
        window.setTimeout(() => window.location.reload(), 250);
      } else show(0);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  return (
    <div ref={ref} className="ptr" aria-hidden="true">
      <RefreshCw className="ptr-icon size-5" />
    </div>
  );
}
