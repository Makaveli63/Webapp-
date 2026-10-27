"use client";

import { useEffect, useState } from "react";

/** « Ma collection » : jeux possédés et jeux voulus, enregistrés sur l'appareil (synchronisables). */
const KEY = "gb-collection";
const EVENT = "gb-collection-change";

export interface CollectionGame {
  id: string;
  title: string;
  image?: string;
  addedAt: string;
}

export interface Collection {
  owned: CollectionGame[];
  wanted: CollectionGame[];
}

const EMPTY: Collection = { owned: [], wanted: [] };

export function readCollection(): Collection {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const list = (x: unknown) => (Array.isArray(x) ? x.filter((g) => g && typeof g.id === "string" && typeof g.title === "string") : []);
    return { owned: list(data.owned), wanted: list(data.wanted) };
  } catch {
    return EMPTY;
  }
}

export function writeCollection(c: Collection) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ owned: c.owned.slice(0, 500), wanted: c.wanted.slice(0, 500) }));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Ajoute / retire un jeu d'une liste ; un jeu possédé quitte la liste des jeux voulus (et inversement). */
export function toggleCollection(list: "owned" | "wanted", game: { id: string; title: string; image?: string }) {
  const c = readCollection();
  const other = list === "owned" ? "wanted" : "owned";
  const has = c[list].some((g) => g.id === game.id);
  const next: Collection = { ...c };
  next[list] = has ? c[list].filter((g) => g.id !== game.id) : [{ ...game, addedAt: new Date().toISOString() }, ...c[list]];
  if (!has) next[other] = c[other].filter((g) => g.id !== game.id);
  writeCollection(next);
}

export function useCollection(): Collection | null {
  const [c, setC] = useState<Collection | null>(null);
  useEffect(() => {
    const update = () => setC(readCollection());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return c;
}

// Comparaison de titres partagée avec le serveur (fiches de jeux).
export { mentions, titleKey } from "@/lib/text";
