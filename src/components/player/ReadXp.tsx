"use client";

import { useEffect } from "react";
import { award } from "@/lib/player";

/** Article lu (15 s passées sur la page, onglet visible) : +5 XP, une seule fois par article. */
export function ReadXp({ slug, anime }: { slug: string; anime: boolean }) {
  useEffect(() => {
    let spent = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      spent += 1;
      if (spent >= 15) {
        window.clearInterval(timer);
        award("read", slug, { anime });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [slug, anime]);
  return null;
}
