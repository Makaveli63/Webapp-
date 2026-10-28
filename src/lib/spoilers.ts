"use client";

import { useEffect, useState } from "react";
import { aliasesOf } from "@/lib/aliases";
import { readFollows, FOLLOWS_EVENT } from "@/lib/follows";
import { canon } from "@/lib/fuzzy";
import { readTracker, TRACKER_EVENT } from "@/lib/tracker";

export const SPOILER_KEY = "gb-spoiler";
export const SPOILER_EVENT = "gb-spoiler-change";

/** Bouclier anti-spoiler activé ? (oui par défaut) */
export function spoilerShield(): boolean {
  try {
    return localStorage.getItem(SPOILER_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSpoilerShield(on: boolean) {
  try {
    localStorage.setItem(SPOILER_KEY, on ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(SPOILER_EVENT));
}

interface Watched {
  title: string;
  keys: string[];
  /** Dernier épisode coché (0 : rien vu) */
  seen: number;
}

/** Animes suivis (🔔) ou cochés, avec le dernier épisode vu. */
function watched(): Watched[] {
  const t = readTracker();
  const list = new Map<string, Watched>();
  const keys = (...titles: (string | undefined)[]) => [...new Set(aliasesOf(...titles).map(canon))].filter((k) => k.replace(/ /g, "").length >= 5);
  for (const a of Object.values(t.anime)) list.set(a.id, { title: a.title, keys: keys(a.title), seen: Math.max(0, ...a.seen) });
  for (const f of readFollows()) {
    if (f.kind !== "anime") continue;
    const prev = list.get(f.id);
    list.set(f.id, { title: f.title, keys: [...new Set([...(prev?.keys ?? []), ...keys(f.title, ...f.aliases)])], seen: prev?.seen ?? 0 });
  }
  return [...list.values()];
}

const EPISODE = /(?:[ée]pisode|ep\.?|ép\.?)\s*(\d{1,4})/gi;
const REVEAL = /spoil|twist|r[ée]v[ée]l|mort d|meurt|fin de (la )?saison|finale|dernier [ée]pisode|ce qui (arrive|se passe)/i;

/**
 * Raison de flouter l'actu (« Tu en es à l'épisode 4 »), ou null : l'actu parle d'un anime que tu regardes
 * et d'un épisode que tu n'as pas encore vu, ou annonce une révélation.
 */
export function spoilerReason(text: string, list: Watched[]): string | null {
  const hay = ` ${canon(text)} `;
  for (const w of list) {
    if (!w.keys.some((k) => hay.includes(` ${k} `))) continue;
    const episodes = [...text.matchAll(EPISODE)].map((m) => Number(m[1]));
    const ahead = episodes.some((n) => n > w.seen);
    if (ahead || REVEAL.test(text)) return w.seen > 0 ? `Tu en es à l'épisode ${w.seen} de ${w.title}` : `Tu n'as pas encore commencé ${w.title}`;
  }
  return null;
}

/** Liste des animes regardés, tenue à jour (null : bouclier coupé ou pas encore chargé). */
export function useWatched(): Watched[] | null {
  const [list, setList] = useState<Watched[] | null>(null);
  useEffect(() => {
    const update = () => setList(spoilerShield() ? watched() : null);
    update();
    const events = [TRACKER_EVENT, FOLLOWS_EVENT, SPOILER_EVENT, "storage"];
    events.forEach((e) => window.addEventListener(e, update));
    return () => events.forEach((e) => window.removeEventListener(e, update));
  }, []);
  return list;
}
