import "server-only";
import { getCalendar } from "@/lib/calendar";
import { testedGame } from "@/lib/compare";
import { titleKey } from "@/lib/text";
import { getArticles, getGamingArticles } from "@/lib/news";
import { getUpcomingReleases } from "@/lib/releases";
import type { Article, Video } from "@/types";

/** Fiche de jeu : tout ce que le site sait d'un jeu, réuni sur une page /jeux/<slug>. */
export interface GameEntry {
  slug: string;
  /** Clé de comparaison (titre simplifié) */
  key: string;
  title: string;
  image?: string;
  date?: string;
  platforms: string[];
  /** Note Metacritic (RAWG) */
  rating?: number;
  /** Temps de jeu moyen en heures (joueurs RAWG) */
  playtime?: number;
  genres: string[];
  video?: Video;
  /** Grosse sortie suivie (compte à rebours, calendrier) */
  releaseId?: string;
  releaseAt?: string;
  externalUrl?: string;
}

export const gameSlug = (title: string) => titleKey(title).replace(/\s+/g, "-").slice(0, 80);

const GENRES_FR: Record<string, string> = {
  Action: "Action", Adventure: "Aventure", RPG: "RPG", Shooter: "Tir", Puzzle: "Réflexion", Racing: "Course",
  Sports: "Sport", Strategy: "Stratégie", Simulation: "Simulation", Indie: "Indé", Platformer: "Plateformes",
  Fighting: "Combat", Family: "Famille", Casual: "Casual", Arcade: "Arcade", "Massively Multiplayer": "MMO",
  "Board Games": "Jeu de plateau", Educational: "Éducatif", Card: "Cartes",
};

let cache: GameEntry[] | null = null;

/** Tous les jeux connus : grosses sorties, calendrier, base RAWG et jeux testés, sans doublons. */
export async function getGames(): Promise<GameEntry[]> {
  if (cache) return cache;
  const bySlug = new Map<string, GameEntry>();
  const add = (g: Omit<GameEntry, "slug" | "key" | "genres"> & { genres?: string[] }) => {
    const slug = gameSlug(g.title);
    if (slug.length < 2) return;
    const prev = bySlug.get(slug);
    // Fusion : on complète les informations manquantes sans écraser celles déjà connues.
    const merged: GameEntry = {
      ...(prev ?? { slug, key: titleKey(g.title), title: g.title, platforms: [], genres: [] }),
    };
    for (const [k, v] of Object.entries(g)) {
      if (v === undefined || (Array.isArray(v) && !v.length)) continue;
      const cur = (merged as unknown as Record<string, unknown>)[k];
      if (cur === undefined || (Array.isArray(cur) && !cur.length)) (merged as unknown as Record<string, unknown>)[k] = v;
    }
    bySlug.set(slug, merged);
  };

  for (const r of getUpcomingReleases()) {
    add({
      title: r.title,
      image: r.image,
      date: r.date,
      platforms: r.platforms,
      video: r.video ?? (r.youtube ? { youtube: r.youtube } : undefined),
      releaseId: r.id,
      releaseAt: r.at,
    });
  }
  const cal = getCalendar();
  for (const g of cal.database) {
    add({
      title: g.title,
      image: g.image,
      date: g.date,
      platforms: g.platforms,
      rating: g.rating,
      playtime: g.playtime,
      genres: (g.genres ?? []).map((x) => GENRES_FR[x] ?? x),
      externalUrl: g.url,
    });
  }
  for (const g of cal.games) add({ title: g.title, image: g.image, date: g.date, platforms: g.platforms, rating: g.rating, video: g.video, externalUrl: g.url });

  // Jeux testés par la presse (titre tiré du test).
  for (const a of await getArticles()) {
    if (a.category !== "Test") continue;
    const k = testedGame(a.title);
    if (k.length < 3) continue;
    const known = [...bySlug.values()].find((g) => g.key === k);
    if (known) continue;
    add({ title: k.replace(/\b\w/g, (c) => c.toUpperCase()), image: a.image, platforms: a.platforms.filter((p) => p !== "Multi") });
  }
  cache = [...bySlug.values()];
  return cache;
}

/** Le texte parle-t-il de ce jeu ? (titre entier, mots entiers) */
export function aboutGame(text: string, game: GameEntry): boolean {
  return game.key.length >= 3 && ` ${titleKey(text)} `.includes(` ${game.key} `);
}

/** Tests de presse du jeu (une note par site). */
export function testsOf(game: GameEntry, articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(
    (a) => a.category === "Test" && a.score && testedGame(a.title) === game.key && !seen.has(a.source.name) && seen.add(a.source.name),
  );
}

export interface RankedGame {
  slug: string;
  title: string;
  image?: string;
  platforms: string[];
  average: number;
  tests: number;
  /** Mois du premier test (AAAA-MM) */
  month: string;
}

/** Classement : jeux testés, moyenne de la presse ramenée sur 20. */
export async function rankedGames(): Promise<RankedGame[]> {
  const { on20 } = await import("@/lib/compare");
  const articles = await getArticles();
  const out: RankedGame[] = [];
  for (const g of await getGames()) {
    const tests = testsOf(g, articles);
    const notes = tests.map((t) => on20(t.score!)).filter((n): n is number => n !== null);
    if (!notes.length) continue;
    const platforms = [...new Set([...g.platforms, ...tests.flatMap((t) => t.platforms)])].filter((p) => p !== "Multi");
    const first = tests.map((t) => t.publishedAt).sort()[0];
    out.push({
      slug: g.slug,
      title: g.title,
      image: g.image ?? tests.find((t) => t.image)?.image,
      platforms,
      average: notes.reduce((s, n) => s + n, 0) / notes.length,
      tests: notes.length,
      month: first.slice(0, 7),
    });
  }
  return out.sort((a, b) => b.average - a.average || b.tests - a.tests);
}

/** Tendances : jeux dont on parle le plus sur les 7 derniers jours (nombre d'articles). */
export async function trendingGames(limit = 8): Promise<(GameEntry & { mentions: number })[]> {
  const since = Date.now() - 7 * 86_400_000;
  const recent = (await getGamingArticles()).filter((a) => Date.parse(a.publishedAt) >= since);
  return (await getGames())
    .filter((g) => g.key.length >= 4)
    .map((g) => ({ ...g, mentions: recent.filter((a) => aboutGame(`${a.title} ${a.tags.join(" ")}`, g)).length }))
    .filter((g) => g.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, limit);
}
