"use client";

import { useEffect } from "react";
import { feedback } from "@/lib/feedback";

/**
 * Micro-interactions sur tout le site, sans toucher à chaque bouton :
 * - boutons à bascule (j'aime, suivre 🔔, épingler, interrupteurs) : petit rebond, vibration et deux notes ;
 * - cartes (articles, vignettes) : enfoncement léger au toucher (CSS) et « tic ».
 * Un élément peut choisir son retour avec data-feedback="tap|on|off|success|none".
 */
export function TapFeedback() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      const custom = target.closest<HTMLElement>("[data-feedback]");
      if (custom) {
        const kind = custom.dataset.feedback;
        if (kind && kind !== "none") feedback(kind as "tap");
        return;
      }
      const toggle = target.closest<HTMLElement>("button[aria-pressed], [role=switch]");
      if (toggle) {
        // L'état est lu avant la mise à jour par React : « false » maintenant = on va activer.
        const wasOn = toggle.getAttribute("aria-pressed") === "true" || toggle.getAttribute("aria-checked") === "true";
        feedback(wasOn ? "off" : "on");
        toggle.classList.remove("fb-pop");
        void toggle.offsetWidth; // relance l'animation
        toggle.classList.add("fb-pop");
        return;
      }
      if (target.closest("a.glass, a[data-card], .snap-start a, article a")) feedback("tap");
    };
    const clear = (e: AnimationEvent) => {
      if (e.animationName === "fb-pop") (e.target as Element).classList.remove("fb-pop");
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("animationend", clear, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("animationend", clear, true);
    };
  }, []);
  return null;
}
