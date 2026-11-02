"use client";

import { useEffect, useState } from "react";

/**
 * Jeux épinglés (comptes à rebours), enregistrés sur l'appareil du visiteur. Chaque épingle garde la date
 * de sortie du jeu : la liste est toujours triée par date (le prochain à sortir en premier, c'est lui que
 * montrent les widgets), et un jeu sorti depuis plus d'un jour est désépinglé tout seul.
 */
const KEY = "gb-epingles";
const DATES_KEY = "gb-epingles-dates";
const EVENT = "gb-epingles-change";
/** Un jeu reste épinglé le jour de sa sortie (« Disponible ! »), puis disparaît. */
const GRACE = 86_400_000;

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible */
  }
}
function readRaw(): string[] {
  const data = readJson<unknown>(KEY, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}
function readDates(): Record<string, number> {
  const d = readJson<Record<string, unknown>>(DATES_KEY, {});
  return Object.fromEntries(Object.entries(d && typeof d === "object" ? d : {}).filter(([, v]) => typeof v === "number")) as Record<string, number>;
}

/** Épingles sans les jeux déjà sortis, triées par date de sortie (les dates inconnues à la fin, dans leur ordre). */
function tidy(list: string[], dates: Record<string, number>, now = Date.now()): string[] {
  return list
    .filter((id) => !(dates[id] && dates[id] + GRACE < now))
    .map((id, i) => ({ id, i, at: dates[id] ?? Infinity }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((x) => x.id);
}

function read(): string[] {
  return tidy(readRaw(), readDates());
}

/** Range la liste enregistrée (et les dates) si le tri ou le ménage l'a changée. */
function persist(list: string[], dates: Record<string, number>): boolean {
  const kept = Object.fromEntries(list.filter((id) => dates[id]).map((id) => [id, dates[id]]));
  const changed = JSON.stringify(list) !== JSON.stringify(readRaw()) || JSON.stringify(kept) !== JSON.stringify(readDates());
  if (changed) {
    save(KEY, list.slice(0, 50));
    save(DATES_KEY, kept);
  }
  return changed;
}

/**
 * Dates de sortie connues de la page : complète les dates des épingles, puis retire les jeux sortis.
 * complete : la liste contient TOUTES les sorties à venir ; une épingle sans date qui n'y figure pas
 * est alors un jeu déjà sorti (épingles d'avant l'enregistrement des dates).
 */
export function syncPinDates(releases: { id: string; at: string }[], complete = false) {
  if (!releases.length) return;
  const known = new Map(releases.map((r) => [r.id, Date.parse(r.at)]));
  const dates = readDates();
  const list = readRaw().filter((id) => !complete || dates[id] || known.has(id));
  for (const id of list) {
    const at = known.get(id);
    if (at && Number.isFinite(at)) dates[id] = at;
  }
  if (persist(tidy(list, dates), dates)) window.dispatchEvent(new Event(EVENT));
}

/** Applications Android et iPhone : transmet les épingles au widget « Mon jeu épinglé ». */
function syncApp(list: string[]) {
  const pins = list.slice(0, 20);
  const w = window as Window & {
    GamingBaseApp?: { setPins?: (json: string) => void }; // Android
    webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
  };
  try {
    w.GamingBaseApp?.setPins?.(JSON.stringify(pins));
    w.webkit?.messageHandlers?.gamingbase?.postMessage({ pins });
  } catch {
    /* hors application : rien à faire */
  }
}

/** Épingle (avec la date de sortie, pour le tri) ou désépingle un jeu. */
export function togglePin(id: string, at?: string) {
  const list = read();
  const dates = readDates();
  const time = at ? Date.parse(at) : NaN;
  if (Number.isFinite(time)) dates[id] = time;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  persist(tidy(next, dates), dates);
  window.dispatchEvent(new Event(EVENT));
}

/** Identifiants épinglés, mis à jour en direct ; null avant lecture (rendu serveur). */
export function usePins(): string[] | null {
  const [pins, setPins] = useState<string[] | null>(null);
  useEffect(() => {
    const update = () => {
      const list = read();
      persist(list, readDates()); // jeux sortis retirés pour de bon, ordre par date enregistré
      setPins(list);
      syncApp(list);
    };
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return pins;
}

/** Remet les éléments épinglés en tête, en gardant l'ordre chronologique (des sorties) dans chaque groupe. */
export function pinnedFirst<T extends { id: string }>(items: T[], pins: string[] | null): T[] {
  if (!pins?.length) return items;
  return [...items.filter((i) => pins.includes(i.id)), ...items.filter((i) => !pins.includes(i.id))];
}
