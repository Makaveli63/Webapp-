"use client";

import { useEffect, useState } from "react";
import { DOCK_CHOICES, DOCK_MAX } from "@/components/layout/nav-links";

/**
 * « Ma barre du bas » : onglets choisis et leur ordre (Accueil toujours en premier, non compté ici).
 * Absent = barre par défaut. Gardé sur l'appareil et synchronisé entre appareils liés.
 */
export const DOCK_KEY = "gb-dock";
export const DOCK_EVENT = "gb-dock-change";

export function readDock(): string[] | null {
  try {
    const list = JSON.parse(localStorage.getItem(DOCK_KEY) ?? "null");
    if (!Array.isArray(list)) return null;
    return list.filter((h, i) => typeof h === "string" && (DOCK_CHOICES as readonly string[]).includes(h) && list.indexOf(h) === i).slice(0, DOCK_MAX - 1);
  } catch {
    return null;
  }
}

/** null : retour à la barre par défaut. */
export function writeDock(list: string[] | null) {
  try {
    if (list) localStorage.setItem(DOCK_KEY, JSON.stringify(list.slice(0, DOCK_MAX - 1)));
    else localStorage.removeItem(DOCK_KEY);
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(DOCK_EVENT));
}

/** Onglets choisis ; null pendant l'affichage initial et quand la barre par défaut est gardée. */
export function useDock(): string[] | null {
  const [list, setList] = useState<string[] | null>(null);
  useEffect(() => {
    const load = () => setList(readDock());
    load();
    window.addEventListener(DOCK_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(DOCK_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return list;
}
