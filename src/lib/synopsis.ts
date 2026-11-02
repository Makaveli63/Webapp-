"use client";

import { titleKey } from "@/lib/text";
import { rpc, socialEnabled } from "@/lib/social";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const shards = new Map<string, Promise<Record<string, string>>>();

const shardOf = (key: string) => (/[a-z]/.test(key.charAt(0)) ? key.charAt(0) : "0");

/** Synopsis en français d'un jeu (fichiers /synopsis/<lettre>.json publiés avec le site), ou null. */
export async function loadSynopsis(title: string): Promise<string | null> {
  const key = titleKey(title);
  if (!key) return null;
  const shard = shardOf(key);
  if (!shards.has(shard)) {
    const p = fetch(`${BASE}/synopsis/${shard}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
      .catch(() => ({}));
    shards.set(shard, p);
  }
  return (await shards.get(shard)!)[key] ?? null;
}

/** Fiche sans synopsis : demandé à la prochaine mise à jour (une fois par jeu et par appareil). */
export function requestSynopsis(title: string, source?: string) {
  if (!socialEnabled) return;
  const mark = `gb-synopsis-asked:${titleKey(title)}`;
  try {
    if (localStorage.getItem(mark)) return;
    localStorage.setItem(mark, "1");
  } catch {
    /* stockage indisponible : la demande part quand même */
  }
  rpc("request_synopsis", { p_title: title, p_source: source ?? null }).catch(() => {});
}
