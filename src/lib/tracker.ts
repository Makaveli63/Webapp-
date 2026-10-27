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
  /** Durée d'un épisode en minutes (AniList) */
  duration?: number;
  /** Prochain épisode à sortir (pour savoir combien sont déjà sortis) */
  next?: { episode: number; at: string };
  seen: number[];
  /** ❤️ Favori */
  fav?: boolean;
  /** 🕒 À voir plus tard */
  later?: boolean;
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

/** Temps passé par jour (AAAA-MM-JJ), en minutes : a = anime, g = jeux. */
export type ActivityLog = Record<string, { a?: number; g?: number }>;

export interface Tracker {
  anime: Record<string, AnimeTrack>;
  games: Record<string, GameTrack>;
  log: ActivityLog;
}

/** Durée par défaut d'un épisode quand AniList ne la donne pas. */
export const DEFAULT_EPISODE_MINUTES = 24;
const LOG_DAYS = 400;

const MAX_ENTRIES = 300;
const MAX_EPISODES = 2000;

const isEpisode = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_EPISODES;

/** Nettoie des données venant du stockage ou d'un autre appareil (synchronisation). */
export function cleanTracker(raw: unknown): Tracker {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Tracker, Record<string, unknown>>>;
  const log: ActivityLog = {};
  const minutes = (n: unknown) => (typeof n === "number" && n > 0 ? Math.min(24 * 60 * 31, Math.round(n)) : undefined);
  for (const [day, v] of Object.entries(data.log ?? {}).sort(([x], [y]) => y.localeCompare(x)).slice(0, LOG_DAYS)) {
    const e = v as { a?: unknown; g?: unknown };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !e || typeof e !== "object") continue;
    const entry = { a: minutes(e.a), g: minutes(e.g) };
    if (entry.a || entry.g) log[day] = entry;
  }
  const anime: Record<string, AnimeTrack> = {};
  const games: Record<string, GameTrack> = {};
  for (const a of Object.values(data.anime ?? {}).slice(0, MAX_ENTRIES) as Partial<AnimeTrack>[]) {
    if (!a || typeof a.id !== "string" || typeof a.title !== "string") continue;
    anime[a.id] = {
      id: a.id,
      title: a.title.slice(0, 200),
      image: typeof a.image === "string" && a.image.startsWith("https://") ? a.image : undefined,
      total: isEpisode(a.total) ? a.total : undefined,
      duration: typeof a.duration === "number" && a.duration > 0 && a.duration < 400 ? Math.round(a.duration) : undefined,
      next: a.next && isEpisode(a.next.episode) && typeof a.next.at === "string" ? { episode: a.next.episode, at: a.next.at } : undefined,
      seen: [...new Set((Array.isArray(a.seen) ? a.seen : []).filter(isEpisode))].sort((x, y) => x - y),
      fav: a.fav === true || undefined,
      later: a.later === true || undefined,
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
  return { anime, games, log };
}

export function readTracker(): Tracker {
  try {
    return cleanTracker(JSON.parse(localStorage.getItem(TRACKER_KEY) ?? "{}"));
  } catch {
    return { anime: {}, games: {}, log: {} };
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
  // Journal : pour chaque jour, la plus grande valeur (les deux appareils peuvent avoir le même jour).
  const log: ActivityLog = { ...b.log };
  for (const [day, v] of Object.entries(a.log)) {
    const o = log[day] ?? {};
    log[day] = { a: Math.max(v.a ?? 0, o.a ?? 0) || undefined, g: Math.max(v.g ?? 0, o.g ?? 0) || undefined };
  }
  return { anime: pick(a.anime, b.anime), games: pick(a.games, b.games), log };
}

type AnimeInfo = { id: string; title: string; image?: string; total?: number; duration?: number; next?: { episode: number; at: string } };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Ajoute (ou retire, si on décoche) du temps au journal du jour, sans descendre sous zéro. */
function logTime(t: Tracker, kind: "a" | "g", deltaMinutes: number) {
  if (!deltaMinutes) return;
  const day = today();
  const e = t.log[day] ?? {};
  const v = Math.max(0, (e[kind] ?? 0) + deltaMinutes);
  t.log[day] = { ...e, [kind]: v || undefined };
}

export const episodeMinutes = (a: { duration?: number }) => a.duration ?? DEFAULT_EPISODE_MINUTES;

/** Épisodes déjà sortis (selon le prochain épisode annoncé), sinon le total. */
export function airedEpisodes(a: { total?: number; next?: { episode: number; at: string } }, now = Date.now()): number | undefined {
  if (a.next) return Date.parse(a.next.at) <= now ? a.next.episode : a.next.episode - 1;
  return a.total;
}

/** Met à jour les épisodes vus d'un anime (et ses infos : total, prochain épisode). */
export function setEpisodes(info: AnimeInfo, seen: number[]) {
  const t = readTracker();
  const prev = t.anime[info.id];
  const clean = [...new Set(seen.filter(isEpisode))];
  const duration = info.duration ?? prev?.duration;
  logTime(t, "a", (clean.length - (prev?.seen.length ?? 0)) * episodeMinutes({ duration }));
  t.anime[info.id] = {
    id: info.id,
    title: info.title,
    image: info.image ?? prev?.image,
    total: info.total ?? prev?.total,
    duration,
    next: info.next ?? (info.total ? undefined : prev?.next),
    seen: clean.sort((x, y) => x - y),
    fav: prev?.fav,
    later: clean.length ? undefined : prev?.later, // un épisode vu : ce n'est plus « à voir »
    updatedAt: new Date().toISOString(),
  };
  writeTracker(t);
}

/** Favori / à voir plus tard ; l'anime quitte le suivi s'il n'a plus ni drapeau ni épisode vu. */
export function setAnimeFlags(info: AnimeInfo, flags: { fav?: boolean; later?: boolean }) {
  const t = readTracker();
  const prev = t.anime[info.id];
  const fav = "fav" in flags ? flags.fav : prev?.fav;
  const later = "later" in flags ? flags.later : prev?.later;
  if (!fav && !later && !prev?.seen.length && prev) {
    delete t.anime[info.id];
  } else {
    t.anime[info.id] = {
      id: info.id,
      title: info.title,
      image: info.image ?? prev?.image,
      total: info.total ?? prev?.total,
      duration: info.duration ?? prev?.duration,
      next: info.next ?? prev?.next,
      seen: prev?.seen ?? [],
      fav: fav || undefined,
      later: later || undefined,
      updatedAt: new Date().toISOString(),
    };
  }
  writeTracker(t);
}

export function untrackAnime(id: string) {
  const t = readTracker();
  const prev = t.anime[id];
  if (prev) logTime(t, "a", -prev.seen.length * episodeMinutes(prev));
  delete t.anime[id];
  writeTracker(t);
}

/** Un jeu est suivi par son titre : la même fiche partout (sorties, recherche, fiche du jeu). */
export const gameKey = (title: string) => `t-${titleKey(title).slice(0, 120)}`;

export function setGameTrack(game: { title: string; image?: string }, patch: Partial<Pick<GameTrack, "status" | "progress" | "hours">> | null) {
  const t = readTracker();
  const id = gameKey(game.title);
  const prev = t.games[id];
  if (!patch) {
    logTime(t, "g", -(prev?.hours ?? 0) * 60);
    delete t.games[id];
  } else {
    if (patch.hours !== undefined || "hours" in patch) logTime(t, "g", ((patch.hours ?? 0) - (prev?.hours ?? 0)) * 60);
    const status = patch.status ?? prev?.status ?? "en-cours";
    t.games[id] = {
      id,
      title: game.title,
      image: game.image ?? prev?.image,
      status,
      progress: status === "termine" || status === "platine" ? 100 : (patch.progress ?? prev?.progress),
      hours: "hours" in patch ? patch.hours : prev?.hours,
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

export interface LibraryStats {
  gameHours: number;
  animeMinutes: number;
  episodes: number;
  finished: number;
  platinum: number;
  playing: number;
  animeUpToDate: number;
}

export function libraryStats(t: Tracker): LibraryStats {
  const games = Object.values(t.games);
  const anime = Object.values(t.anime);
  return {
    gameHours: games.reduce((s, g) => s + (g.hours ?? 0), 0),
    animeMinutes: anime.reduce((s, a) => s + a.seen.length * episodeMinutes(a), 0),
    episodes: anime.reduce((s, a) => s + a.seen.length, 0),
    finished: games.filter((g) => g.status === "termine" || g.status === "platine").length,
    platinum: games.filter((g) => g.status === "platine").length,
    playing: games.filter((g) => g.status === "en-cours").length,
    animeUpToDate: anime.filter((a) => {
      const max = a.total ?? airedEpisodes(a);
      return !!max && a.seen.length >= max;
    }).length,
  };
}

/** Heures par mois (les 6 derniers mois, du plus ancien au plus récent). */
export function monthlyHours(log: ActivityLog, months = 6, now = new Date()) {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let a = 0;
    let g = 0;
    for (const [day, v] of Object.entries(log)) {
      if (!day.startsWith(key)) continue;
      a += v.a ?? 0;
      g += v.g ?? 0;
    }
    return { key, label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d), anime: a / 60, games: g / 60 };
  });
}
