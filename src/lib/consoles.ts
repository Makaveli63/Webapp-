"use client";

import { useEffect, useState } from "react";
import type { Article, Platform } from "@/types";

/**
 * « Mes consoles » : les plateformes choisies une fois pour toutes (gardées sur l'appareil et synchronisées).
 * Les listes d'actus n'affichent alors que les articles qui les concernent. Aucune choisie = tout.
 */
export const CONSOLES_KEY = "gb-consoles";
export const CONSOLES_EVENT = "gb-consoles-change";
export const CONSOLE_CHOICES: readonly Platform[] = ["PS5", "Switch 2", "Xbox", "PC", "Mobile"];

export function readConsoles(): Platform[] {
  try {
    const list = JSON.parse(localStorage.getItem(CONSOLES_KEY) ?? "[]");
    return Array.isArray(list) ? CONSOLE_CHOICES.filter((c) => list.includes(c)) : [];
  } catch {
    return [];
  }
}

export function writeConsoles(list: readonly string[]) {
  try {
    localStorage.setItem(CONSOLES_KEY, JSON.stringify(CONSOLE_CHOICES.filter((c) => list.includes(c))));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(CONSOLES_EVENT));
}

/** L'actu concerne-t-elle mes consoles ? Les actus toutes plateformes (« Multi », sans plateforme) et l'anime restent. */
export function onMyConsoles(a: Pick<Article, "platforms" | "category">, mine: readonly string[]): boolean {
  if (!mine.length || a.category === "Anime" || !a.platforms.length || a.platforms.includes("Multi")) return true;
  return a.platforms.some((p) => mine.includes(p));
}

/** Mes consoles ; vide pendant l'affichage initial (page identique pour tout le monde), puis la vraie liste. */
export function useMyConsoles(): Platform[] {
  const [list, setList] = useState<Platform[]>([]);
  useEffect(() => {
    const load = () => setList(readConsoles());
    load();
    window.addEventListener(CONSOLES_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CONSOLES_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return list;
}
