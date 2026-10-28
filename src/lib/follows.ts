"use client";

import { useEffect, useState } from "react";

/**
 * Jeux et animes suivis pour les notifications (🔔) : chaque actu qui parle d'un jeu suivi est notifiée
 * tout de suite (même hors des filtres choisis) et chaque nouvel épisode d'un anime suivi aussi.
 */
export const FOLLOWS_KEY = "gb-follows";
export const FOLLOWS_EVENT = "gb-follows-change";
const MAX = 60;

export interface Follow {
  id: string; // « jeu-gta-6 », « anilist-151807 »
  kind: "game" | "anime";
  title: string;
  /** Autres façons d'écrire le titre dans les actus (GTA 6, GTA VI…) */
  aliases: string[];
  href: string;
  /** Prochain épisode connu (animes) */
  next?: { episode: number; at: string };
}

export { aliasesOf } from "@/lib/aliases";

export function readFollows(): Follow[] {
  try {
    const v = JSON.parse(localStorage.getItem(FOLLOWS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((f) => f && typeof f.id === "string" && typeof f.title === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function writeFollows(list: Follow[]) {
  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(FOLLOWS_EVENT));
}

export function toggleFollow(f: Follow): boolean {
  const list = readFollows();
  const on = !list.some((x) => x.id === f.id);
  writeFollows(on ? [f, ...list] : list.filter((x) => x.id !== f.id));
  return on;
}

/** Met à jour le prochain épisode des animes suivis (sans ajouter ni retirer de suivi). */
export function updateNext(next: Map<string, Follow["next"]>) {
  const list = readFollows();
  let changed = false;
  const updated = list.map((f) => {
    if (!next.has(f.id)) return f;
    const n = next.get(f.id);
    if (n?.at === f.next?.at && n?.episode === f.next?.episode) return f;
    changed = true;
    return { ...f, next: n };
  });
  if (changed) writeFollows(updated);
}

export function useFollows(): Follow[] | null {
  const [list, setList] = useState<Follow[] | null>(null);
  useEffect(() => {
    const update = () => setList(readFollows());
    update();
    window.addEventListener(FOLLOWS_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(FOLLOWS_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}
