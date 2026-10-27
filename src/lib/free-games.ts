import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { FreeGame, FreeGamesData } from "@/types";

/** Écrit par scripts/fetch-free-games.mjs (`npm run news`) avant le build. */
const FILE = path.join(process.cwd(), ".cache", "news", "free-games.json");

const EMPTY: FreeGamesData = { epicAvailable: false, othersAvailable: false, games: [] };

function isFreeGame(g: unknown): g is FreeGame {
  const x = g as FreeGame;
  return !!x && typeof x.id === "string" && typeof x.title === "string" && (x.status === "now" || x.status === "upcoming");
}

export function getFreeGames(): FreeGamesData {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<FreeGamesData>;
    return {
      updatedAt: data.updatedAt,
      epicAvailable: !!data.epicAvailable,
      othersAvailable: !!data.othersAvailable,
      games: Array.isArray(data.games) ? data.games.filter(isFreeGame) : [],
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Prochain changement des jeux Epic : fin de l'offre en cours si connue,
 * sinon le prochain jeudi à 17 h (heure de Paris).
 */
export function nextEpicRefresh(data: FreeGamesData, now = new Date()): string {
  const ends = data.games
    .filter((g) => g.store === "Epic Games" && g.status === "now" && g.endDate)
    .map((g) => Date.parse(g.endDate!))
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b);
  if (ends.length) return new Date(ends[0]).toISOString();

  // 17 h à Paris = 15 h UTC en été, 16 h UTC en hiver : on essaie les deux et on garde celle qui tombe à 17 h.
  for (let d = 0; d <= 7; d++) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d));
    if (day.getUTCDay() !== 4) continue;
    for (const utcHour of [15, 16]) {
      const candidate = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), utcHour));
      const parisHour = Number(
        new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(candidate),
      );
      if (parisHour === 17 && candidate > now) return candidate.toISOString();
    }
  }
  return new Date(now.getTime() + 7 * 86_400_000).toISOString();
}
