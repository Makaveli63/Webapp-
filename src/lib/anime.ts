import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Anime, AnimeData } from "@/types";

/** Écrit par scripts/fetch-anime.mjs (`npm run news`) avant le build. */
const FILE = path.join(process.cwd(), ".cache", "news", "anime.json");

const isAnime = (a: unknown): a is Anime => {
  const x = a as Anime;
  return !!x && typeof x.id === "string" && typeof x.title === "string" && Array.isArray(x.genres) && Array.isArray(x.streaming);
};

export function getAnime(): AnimeData {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<AnimeData>;
    return {
      updatedAt: d.updatedAt,
      airing: (d.airing ?? []).filter(isAnime),
      upcoming: (d.upcoming ?? []).filter(isAnime),
    };
  } catch {
    return { airing: [], upcoming: [] };
  }
}

/** Épisodes à venir dans les 7 prochains jours, du plus proche au plus lointain. */
export function thisWeek(data: AnimeData, now = Date.now()): Anime[] {
  return data.airing
    .filter((a) => a.next && Date.parse(a.next.at) - now < 7 * 86_400_000)
    .sort((a, b) => Date.parse(a.next!.at) - Date.parse(b.next!.at));
}
