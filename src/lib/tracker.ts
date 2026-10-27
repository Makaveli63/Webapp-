"use client";

import { useEffect, useState } from "react";
import { titleKey } from "@/lib/text";

/**
 * « Mon suivi » : épisodes vus de chaque anime (chaque saison est une fiche AniList) et avancement des jeux.
 * Enregistré sur l'appareil (clé gb-suivi), synchronisable entre appareils comme la collection.
 */
export const TRACKER_KEY = "gb-suivi";
export const TRACKER_EVENT = "gb-suivi-change";

export interface AnimeTrack {
  id: string;
  title: string;
  image?: string;
  /** Nombre total d'épisodes, s'il est connu */
  total?: number;
  /** Prochain épisode à sortir (pour savoir combien sont déjà sortis) */
  next?: { episode: number; at: string };
  seen: number[];
  updatedAt: string;
}

export type GameStatus = "a-jouer" | "en-cours" | "termine" | "platine" | "abandonne";

export const GAME_STATUS: Record<GameStatus, { label: string; emoji: string }> = {
  "a-jouer": { label: "À jouer", emoji: "🕹️" },
  "en-cours": { label: "En cours", emoji: "▶️" },
  termine: { label: "Terminé", emoji: "✅" },
  platine: { label: "100 %", emoji: "🏆" },
  abandonne: { label: "Abandonné", emoji: "⏸️" },
};

export interface GameTrack {
  id: string;
  title: string;
  image?: string;
  status: GameStatus;
  /** Avancement en % (0-100) */
  progress?: number;
  /** Heures de jeu */
  hours?: number;
  updatedAt: string;
}

export interface Tracker {
  anime: Record<string, AnimeTrack>;
  games: Record<string, GameTrack>;
}

const MAX_ENTRIES = 300;
const MAX_EPISODES = 2000;

const isEpisode = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_EPISODES;

/** Nettoie des données venant du stockage ou d'un autre appareil (synchronisation). */
export function cleanTracker(raw: unknown): Tracker {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Tracker, Record<string, unknown>>>;
  const anime: Record<string, AnimeTrack> = {};
  const games: Record<string, GameTrack> = {};
  for (const a of Object.values(data.anime ?? {}).slice(0, MAX_ENTRIES) as Partial<AnimeTrack>[]) {
    if (!a || typeof a.id !== "string" || typeof a.title !== "string") continue;
    anime[a.id] = {
      id: a.id,
      title: a.title.slice(0, 200),
      image: typeof a.image === "string" && a.image.startsWith("https://") ? a.image : undefined,
      total: isEpisode(a.total) ? a.total : undefined,
      next: a.next && isEpisode(a.next.episode) && typeof a.next.at === "string" ? { episode: a.next.episode, at: a.next.at } : undefined,
      seen: [...new Set((Array.isArray(a.seen) ? a.seen : []).filter(isEpisode))].sort((x, y) => x - y),
      updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : new Date(0).toISOString(),
    };
  }
  for (const g of Object.values(data.games ?? {}).slice(0, MAX_ENTRIES) as Partial<GameTrack>[]) {
    if (!g || typeof g.id !== "string" || typeof g.title !== "string" || !g.status || !(g.status in GAME_STATUS)) continue;
    games[g.id] = {
      id: g.id,
      title: g.title.slice(0, 200),
      image: typeof g.image === "string" && g.image.startsWith("https://") ? g.image : undefined,
      status: g.status,
      progress: typeof g.progress === "number" ? Math.min(100, Math.max(0, Math.round(g.progress))) : undefined,
      hours: typeof g.hours === "number" && g.hours >= 0 ? Math.min(99_999, Math.round(g.hours)) : undefined,
      updatedAt: typeof g.updatedAt === "string" ? g.updatedAt : new Date(0).toISOString(),
    };
  }
  return { anime, games };
}

export function readTracker(): Tracker {
  try {
    return cleanTracker(JSON.parse(localStorage.getItem(TRACKER_KEY) ?? "{}"));
  } catch {
    return { anime: {}, games: {} };
  }
}

function writeTracker(t: Tracker) {
  try {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(t));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(TRACKER_EVENT));
}

/** Fusion de deux appareils : pour chaque anime / jeu, la version modifiée le plus récemment l'emporte. */
export function mergeTrackers(a: Tracker, b: Tracker): Tracker {
  const pick = <T extends { updatedAt: string }>(x: Record<string, T>, y: Record<string, T>) => {
    const out = { ...y };
    for (const [id, v] of Object.entries(x)) if (!out[id] || v.updatedAt >= out[id].updatedAt) out[id] = v;
    return out;
  };
  return { anime: pick(a.anime, b.anime), games: pick(a.games, b.games) };
}

type AnimeInfo = { id: string; title: string; image?: string; total?: number; next?: { episode: number; at: string } };

/** Épisodes déjà sortis (selon le prochain épisode annoncé), sinon le total. */
export function airedEpisodes(a: { total?: number; next?: { episode: number; at: string } }, now = Date.now()): number | undefined {
  if (a.next) return Date.parse(a.next.at) <= now ? a.next.episode : a.next.episode - 1;
  return a.total;
}

/** Met à jour les épisodes vus d'un anime (et ses infos : total, prochain épisode). */
export function setEpisodes(info: AnimeInfo, seen: number[]) {
  const t = readTracker();
  const prev = t.anime[info.id];
  t.anime[info.id] = {
    id: info.id,
    title: info.title,
    image: info.image ?? prev?.image,
    total: info.total ?? prev?.total,
    next: info.next ?? (info.total ? undefined : prev?.next),
    seen: [...new Set(seen.filter(isEpisode))].sort((x, y) => x - y),
    updatedAt: new Date().toISOString(),
  };
  writeTracker(t);
}

export function untrackAnime(id: string) {
  const t = readTracker();
  delete t.anime[id];
  writeTracker(t);
}

/** Un jeu est suivi par son titre : la même fiche partout (sorties, recherche, fiche du jeu). */
export const gameKey = (title: string) => `t-${titleKey(title).slice(0, 120)}`;

export function setGameTrack(game: { title: string; image?: string }, patch: Partial<Pick<GameTrack, "status" | "progress" | "hours">> | null) {
  const t = readTracker();
  const id = gameKey(game.title);
  if (!patch) delete t.games[id];
  else {
    const prev = t.games[id];
    const status = patch.status ?? prev?.status ?? "en-cours";
    t.games[id] = {
      id,
      title: game.title,
      image: game.image ?? prev?.image,
      status,
      progress: status === "termine" || status === "platine" ? 100 : (patch.progress ?? prev?.progress),
      hours: patch.hours ?? prev?.hours,
      updatedAt: new Date().toISOString(),
    };
  }
  writeTracker(t);
}

export function useTracker(): Tracker | null {
  const [t, setT] = useState<Tracker | null>(null);
  useEffect(() => {
    const update = () => setT(readTracker());
    update();
    window.addEventListener(TRACKER_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(TRACKER_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return t;
}
