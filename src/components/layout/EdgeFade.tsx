"use client";

import { useEffect } from "react";

/**
 * Rangées qui défilent horizontalement (.scroll-row) : fondu sur le bord où il reste du contenu,
 * au lieu d'une carte coupée net. data-fade = "end" | "start" | "both" (aucun si tout tient).
 */
export function EdgeFade() {
  useEffect(() => {
    const update = (el: HTMLElement) => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 20; // marge de la rangée (cartes aimantées à 1rem du bord)
      const end = el.scrollLeft < max - 20;
      const next = start && end ? "both" : start ? "start" : end ? "end" : "";
      if ((el.dataset.fade ?? "") !== next) {
        if (next) el.dataset.fade = next;
        else delete el.dataset.fade;
      }
    };
    let frame = 0;
    const all = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => document.querySelectorAll<HTMLElement>(".scroll-row").forEach(update));
    };
    const onScroll = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLElement && el.classList.contains("scroll-row")) update(el);
    };
    all();
    // Rangées ajoutées après coup (changement de page, contenu chargé) et changement de taille d'écran.
    const observer = new MutationObserver(all);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", all);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", all);
    };
  }, []);
  return null;
}
