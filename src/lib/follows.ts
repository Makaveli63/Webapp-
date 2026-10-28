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

const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10", xi: "11", xii: "12" };
const ARABIC = Object.fromEntries(Object.entries(ROMAN).map(([r, n]) => [n, r]));
const SMALL = new Set(["the", "of", "and", "a", "an", "le", "la", "les", "de", "du", "des", "et"]);

/** Variantes d'un titre : sans sous-titre, sigle (Grand Theft Auto VI → GTA VI / GTA 6), chiffres romains ou arabes. */
export function aliasesOf(...titles: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t.replace(/[^\p{L}\p{N}]/gu, "").length >= 4) out.add(t);
  };
  for (const raw of titles) {
    if (!raw) continue;
    const title = raw.replace(/[™®©]/g, "").trim();
    add(title);
    // « Solo Leveling Season 2 -Arise from the Shadow- » → « Solo Leveling » (les actus parlent de la série).
    const series = title.replace(/\s+(season|saison|part|partie|cour)\s+\d+.*$/i, "").replace(/\s+-[^-]+-\s*$/, "").replace(/\s+(2nd|3rd|\d+th)\s+season.*$/i, "");
    if (series !== title) add(series);
    const after = title.split(/\s*[:–—-]\s+/).slice(1).join(" ");
    if (after.length >= 8) add(after);
    const words = title.split(/[\s:–—-]+/).filter(Boolean);
    const last = words[words.length - 1]?.toLowerCase() ?? "";
    const num = ROMAN[last] ? last : ARABIC[last] ? last : /^\d+$/.test(last) ? last : "";
    const swap = (n: string) => ROMAN[n] ?? ARABIC[n];
    if (num && swap(num)) add([...words.slice(0, -1), swap(num).toUpperCase()].join(" "));
    // Sigle des mots principaux + numéro : « GTA 6 », « GTA VI ».
    const main = (num ? words.slice(0, -1) : words).filter((w) => !SMALL.has(w.toLowerCase()) && /^\p{Lu}/u.test(w));
    if (main.length >= 3) {
      const initials = main.map((w) => w[0]).join("").toUpperCase();
      if (num) {
        add(`${initials} ${num.toUpperCase()}`);
        if (swap(num)) add(`${initials} ${swap(num).toUpperCase()}`);
      }
    }
  }
  return [...out].slice(0, 8);
}

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
