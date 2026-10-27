"use client";

import { useEffect, useState } from "react";

/** Jeux épinglés (comptes à rebours), enregistrés sur l'appareil du visiteur. */
const KEY = "gb-epingles";
const EVENT = "gb-epingles-change";

function read(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function togglePin(id: string) {
  const list = read();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  try {
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, 50)));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Identifiants épinglés, mis à jour en direct ; null avant lecture (rendu serveur). */
export function usePins(): string[] | null {
  const [pins, setPins] = useState<string[] | null>(null);
  useEffect(() => {
    const update = () => setPins(read());
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

/** Remet les éléments épinglés en tête, en gardant l'ordre chronologique dans chaque groupe. */
export function pinnedFirst<T extends { id: string }>(items: T[], pins: string[] | null): T[] {
  if (!pins?.length) return items;
  return [...items.filter((i) => pins.includes(i.id)), ...items.filter((i) => !pins.includes(i.id))];
}
