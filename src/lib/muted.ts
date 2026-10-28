"use client";

import { useEffect, useState } from "react";
import { canon } from "@/lib/fuzzy";

/**
 * « Pas intéressé » : licences masquées (« final fantasy »…), gardées sur l'appareil et synchronisées.
 * Tout ce dont le titre contient ces mots disparaît des actus, des sorties et de la recherche,
 * et l'appli ne notifie plus ces actus.
 */
export const MUTED_KEY = "gb-masques";
export const MUTED_EVENT = "gb-masques-change";

export function readMuted(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(MUTED_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === "string" && t.length >= 2).slice(0, 60) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(MUTED_EVENT));
}

export function mute(term: string) {
  const t = term.trim();
  if (t.length < 2) return;
  const list = readMuted();
  if (!list.some((x) => canon(x) === canon(t))) write([...list, t]);
}

export function unmute(term: string) {
  write(readMuted().filter((x) => x !== term));
}

/** Le titre parle-t-il d'une licence masquée ? (mots entiers, accents et chiffres romains compris) */
export function isMuted(title: string, list: string[]): boolean {
  if (!list.length) return false;
  const hay = ` ${canon(title)} `;
  return list.some((t) => {
    const k = canon(t);
    return k.length >= 2 && hay.includes(` ${k} `);
  });
}

/** Liste des licences masquées ; vide pendant l'affichage initial (page identique pour tout le monde). */
export function useMuted(): string[] {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setList(readMuted());
    load();
    window.addEventListener(MUTED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(MUTED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return list;
}

// Mots qui ne font pas partie du nom de la licence (« Remake », « Edition »…).
const EXTRA = /\b(remake|remastered|remaster|edition|deluxe|definitive|complete|hd|reloaded|collection|trilogy|version)\b/gi;
const NUMBER = /^(\d+|[ivxlcdm]+)$/i;

/**
 * Licence d'un jeu, proposée par défaut : « Final Fantasy VII Revelation » → « Final Fantasy »,
 * « The Legend of Zelda: Ocarina of Time » → « Zelda ». Modifiable avant de masquer.
 */
export function franchiseOf(title: string): string {
  let base = title.split(/\s[:–—-]\s|:\s/)[0].replace(EXTRA, " ").replace(/\s+/g, " ").trim();
  base = base.replace(/^the legend of\s+/i, "");
  const words = base.split(" ");
  const cut = words.findIndex((w, i) => i > 0 && NUMBER.test(w));
  return (cut > 0 ? words.slice(0, cut) : words).join(" ").trim() || title;
}
