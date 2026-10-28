"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

const THRESHOLD = 76; // distance (px) à tirer pour déclencher l'actualisation
const LIMIT = 160; // étirement maximal de l'élastique

/** Courbe « élastique » d'iOS : plus on tire, plus ça résiste, sans jamais dépasser LIMIT. */
const rubber = (dy: number) => LIMIT * (1 - 1 / ((dy * 0.9) / LIMIT + 1));

/**
 * « Tirer pour actualiser » façon iOS dans les applications (iPhone, iPad, Android) et l'app installée :
 * la page s'étire comme un élastique sous l'en-tête (qui reste en place), une lueur colorée
 * fait le tour de l'écran, puis la page rebondit au lâcher.
 * Positionnement via CSSOM et attributs data-* (compatible avec la CSP).
 */
export function PullToRefresh() {
  const ref = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      navigator.userAgent.includes("GamingBaseApp");
    const el = ref.current;
    const halo = glow.current;
    const main = document.querySelector("main");
    if (!installed || !el || !halo || !main) return;
    // La page et l'île des sorties descendent ensemble ; l'en-tête reste en place.
    const moving = () => [main, ...document.querySelectorAll<HTMLElement>(".release-banner")];
    // Le rebond natif déplacerait tout l'écran (en-tête compris) : c'est l'élastique ci-dessous qui le remplace.
    document.documentElement.dataset.ptr = "1";

    let startY = 0;
    let pulling = false;
    let dist = 0;
    const show = (d: number) => {
      dist = d;
      const p = Math.min(1, d / THRESHOLD);
      for (const node of moving()) node.style.setProperty("transform", d > 0 ? `translate3d(0, ${d}px, 0)` : "");
      el.style.setProperty("--pull", `${d}px`);
      el.style.setProperty("--pull-turn", `${p * 300}deg`);
      halo.style.setProperty("--glow", String(p));
      el.dataset.on = d > 6 ? "1" : "0";
      const ready = d >= THRESHOLD ? "1" : "0";
      if (ready === "1" && el.dataset.ready !== "1") navigator.vibrate?.(8); // petit retour haptique (Android)
      el.dataset.ready = ready;
    };
    // Lâcher : retour avec un léger rebond (ressort).
    const release = (to: number) => {
      const nodes = moving();
      nodes.forEach((n) => n.classList.add("ptr-spring"));
      el.dataset.dragging = "0";
      show(to);
      window.setTimeout(() => nodes.forEach((n) => n.classList.remove("ptr-spring")), 650);
    };
    const start = (e: TouchEvent) => {
      if (el.dataset.loading === "1" || e.touches.length !== 1 || window.scrollY > 0) return;
      if (document.body.classList.contains("overflow-hidden")) return; // fenêtre ouverte
      startY = e.touches[0].clientY;
      pulling = true;
      moving().forEach((n) => n.classList.remove("ptr-spring"));
    };
    const move = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 0) return show(0);
      el.dataset.dragging = "1";
      halo.dataset.on = "1";
      show(rubber(dy));
    };
    const end = () => {
      if (!pulling) return;
      pulling = false;
      if (dist >= THRESHOLD) {
        el.dataset.loading = "1";
        halo.dataset.loading = "1";
        release(THRESHOLD * 0.8);
        window.setTimeout(() => window.location.reload(), 900);
      } else {
        release(0);
        halo.dataset.on = "0";
      }
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      delete document.documentElement.dataset.ptr;
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  return (
    <>
      <div ref={glow} className="ptr-glow" aria-hidden="true">
        <span className="ptr-glow-soft">
          <span className="ptr-glow-ring" />
        </span>
        <span className="ptr-glow-ring ptr-glow-line" />
      </div>
      <div ref={ref} className="ptr" aria-hidden="true">
        <RefreshCw className="ptr-icon size-5" />
      </div>
    </>
  );
}
