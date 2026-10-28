"use client";

import { readFollows } from "@/lib/follows";
import { spoilerShield } from "@/lib/spoilers";
import { readTracker } from "@/lib/tracker";

export const NOTIF_KEY = "gb-notif";
export const PREFS_KEY = "gb-notif-prefs";
export const PREFS_EVENT = "gb-notif-prefs-change";

/** Réglages envoyés aux applications (filtrage des articles avant notification). */
export interface Prefs {
  platforms: string[]; // vide = toutes
  testsOnly: boolean;
  myGames: boolean; // seulement les jeux de Ma collection
  digest: boolean; // un résumé par jour (à l'heure choisie) au lieu d'une notification par article
  digestTime: string; // heure du résumé, « HH:MM » (heure du téléphone)
  anime: boolean; // inclure l'actu anime
  priceAlerts: boolean; // promo sur un jeu « Je le veux »
}
export const DEFAULT_PREFS: Prefs = { platforms: [], testsOnly: false, myGames: false, digest: false, digestTime: "19:00", anime: true, priceAlerts: true };

export function readPrefs(): Prefs {
  try {
    const p: Prefs = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.digestTime)) p.digestTime = DEFAULT_PREFS.digestTime;
    return p;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Titres de Ma collection (jeux voulus et possédés) pour le filtre « mes jeux » ; « wanted » seul pour les alertes prix. */
function collectionTitles(only?: "wanted"): string[] {
  try {
    const c = JSON.parse(localStorage.getItem("gb-collection") ?? "{}");
    const list = only ? (c.wanted ?? []) : [...(c.wanted ?? []), ...(c.owned ?? [])];
    return list.map((g: { title?: string }) => g.title).filter((t: unknown): t is string => typeof t === "string").slice(0, 200);
  } catch {
    return [];
  }
}

type AppWindow = Window & {
  GamingBaseApp?: { setNotifications?: (on: boolean) => void; setNotificationPrefs?: (json: string) => void }; // Android
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
};

export const inApp = () => typeof navigator !== "undefined" && navigator.userAgent.includes("GamingBaseApp");

/** Réglages + jeux et animes suivis (🔔) + prochains épisodes, envoyés à l'app. */
export function sendPrefs(prefs: Prefs = readPrefs()) {
  const follows = readFollows();
  const now = Date.now();
  const payload = {
    ...prefs,
    games: collectionTitles(),
    wanted: collectionTitles("wanted"),
    follows: follows.map((f) => ({ t: f.title, a: f.aliases, k: f.kind })),
    spoilerShield: spoilerShield(),
    episodes: follows
      .filter((f) => f.next && Date.parse(f.next.at) > now - 86_400_000)
      .map((f) => ({ title: f.title, episode: f.next!.episode, atMs: Date.parse(f.next!.at), path: `/Webapp-${f.href}` })),
  };
  // Widget « Mes épisodes » : animes en cours avec le prochain épisode à cocher.
  const tracked = Object.values(readTracker().anime)
    .map((a) => ({ a, last: Math.max(0, ...a.seen) }))
    .filter(({ a, last }) => !a.total || last < a.total)
    .sort((x, y) => y.a.updatedAt.localeCompare(x.a.updatedAt))
    .slice(0, 8)
    .map(({ a, last }) => ({ id: a.id, title: a.title, next: last + 1, total: a.total ?? null, path: `/Webapp-/anime/fiche?id=${a.id.replace(/^anilist-/, "")}` }));
  const full = { ...payload, tracked };
  const w = window as AppWindow;
  try {
    w.GamingBaseApp?.setNotificationPrefs?.(JSON.stringify(full));
    w.webkit?.messageHandlers?.gamingbase?.postMessage({ notifPrefs: full });
  } catch {
    /* hors application */
  }
}

export function notificationsOn(): boolean {
  try {
    return localStorage.getItem(NOTIF_KEY) === "1";
  } catch {
    return false;
  }
}

/** Allume (ou coupe) les notifications dans l'app ; la réponse arrive par l'événement « gb-notif ». */
export function sendToApp(on: boolean) {
  const w = window as AppWindow;
  try {
    localStorage.setItem(NOTIF_KEY, on ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
  try {
    w.GamingBaseApp?.setNotifications?.(on);
    w.webkit?.messageHandlers?.gamingbase?.postMessage({ notifications: on });
  } catch {
    /* hors application */
  }
}
