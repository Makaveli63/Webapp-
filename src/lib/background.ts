"use client";

import { useSyncExternalStore } from "react";
import { THEMES, type ThemeId } from "@/lib/themes";

type Glow = readonly [string, string, string];

/** Couleurs imposées par la page affichée (ex. article : jeu consulté), sinon celles de l'onglet. */
let pageGlow: Glow | null = null;
const listeners = new Set<() => void>();

export function setPageGlow(glow: Glow | null) {
  pageGlow = glow;
  listeners.forEach((l) => l());
}

export function usePageGlow(): Glow | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pageGlow,
    () => null,
  );
}

/** Historique des sujets consultés (sur l'appareil) : nombre de lectures par thème. */
const HISTORY_KEY = "gb-sujets";

export function recordTopic(themeId: string) {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}") as Record<string, number>;
    h[themeId] = (h[themeId] ?? 0) + 1;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* stockage indisponible */
  }
}

/** Couleurs des 3 sujets les plus lus (hors plateforme générique), pour l'accueil. */
export function favoriteTopicsGlow(): Glow | null {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}") as Record<string, number>;
    const top = Object.entries(h)
      .filter(([id]) => id in THEMES && id !== "multi")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => THEMES[id as ThemeId].glow);
    // Couleur principale de chaque sujet favori ; s'il y en a moins de 3, celles du premier complètent.
    if (top.length === 0) return null;
    if (top.length === 1) return top[0];
    if (top.length === 2) return [top[0][0], top[1][0], top[0][1]] as const;
    return [top[0][0], top[1][0], top[2][0]] as const;
  } catch {
    return null;
  }
}
