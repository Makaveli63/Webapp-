"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

/**
 * Flèches de défilement d'une rangée horizontale, sur ordinateur (souris ou pavé) uniquement :
 * au toucher, on fait glisser la rangée. Chaque flèche avance d'environ une largeur visible et
 * disparaît quand on est au bout.
 */
export function ScrollArrows({ target, label }: { target: RefObject<HTMLElement | null>; label: string }) {
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [target]);

  const go = (dir: 1 | -1) => {
    const el = target.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.85), behavior: reduce ? "auto" : "smooth" });
  };

  const btn =
    "scroll-arrow absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full glass-pill text-heading shadow-lg ring-1 ring-inset ring-border transition-opacity hover:text-accent";
  return (
    <>
      {!edge.start && (
        <button type="button" onClick={() => go(-1)} aria-label={`${label} : précédents`} className={`${btn} -left-3`}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {!edge.end && (
        <button type="button" onClick={() => go(1)} aria-label={`${label} : suivants`} className={`${btn} -right-3`}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </>
  );
}
