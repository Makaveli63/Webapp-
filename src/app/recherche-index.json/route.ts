import { getAnime } from "@/lib/anime";
import { getCalendar } from "@/lib/calendar";
import { getFreeGames } from "@/lib/free-games";
import { gameSlug, getGames } from "@/lib/games";
import { getArticles } from "@/lib/news";
import { getUpcomingReleases } from "@/lib/releases";
import { normalize } from "@/lib/fuzzy";
import type { SearchGame, SearchIndex } from "@/types";

// Index de recherche généré au build (fichier statique), téléchargé seulement sur la page Recherche.
export const dynamic = "force-static";

const dayLabel = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

export async function GET() {
  const articles = (await getArticles()).map((a) => ({
    ...a,
    content: "",
    aiSummary: undefined,
    excerpt: a.excerpt.slice(0, 160),
    author: "",
  }));

  // Jeux : grosses sorties, calendrier, jeux gratuits et base RAWG, sans doublons (titre normalisé).
  const calendar = getCalendar();
  const games: SearchGame[] = [];
  const seen = new Set<string>();
  const byKey = new Map<string, SearchGame>();
  const add = (g: SearchGame) => {
    const k = norm(g.title);
    if (!k) return;
    const known = byKey.get(k);
    if (known) {
      // Même jeu dans plusieurs sources (ex. version Switch 2 à venir + version PS5 / PC déjà sortie) : plateformes réunies,
      // date la plus ancienne affichée, la sortie plus tardive gardée en note (« Switch 2 : 18 mars 2027 »).
      if (g.date && known.date && g.date < known.date && known.platforms.length) {
        known.note ??= `${known.platforms.join(", ")} : ${dayLabel(known.date)}`;
        known.date = g.date;
      }
      known.platforms = [...new Set([...known.platforms, ...g.platforms])];
      known.image ??= g.image;
      return;
    }
    seen.add(k);
    const copy = { ...g, platforms: [...g.platforms] };
    byKey.set(k, copy);
    games.push(copy);
  };
  for (const r of getUpcomingReleases())
    add({ id: r.id, title: r.title, date: r.date, platforms: r.platforms, image: r.image, url: "/sorties", video: r.video });
  for (const g of calendar.games) add(g);
  for (const g of getFreeGames().games)
    add({ id: g.id, title: g.title, platforms: [g.store], image: g.image, url: g.url, note: "Gratuit en ce moment" });
  for (const g of calendar.database) add(g);
  for (const g of calendar.searchGames) add(g);
  // Animes de la saison et à venir (AniList) : « solo leveling » trouve l'anime même sans actu.
  const anime = getAnime();
  for (const a of [...anime.airing, ...anime.upcoming])
    add({ id: a.id, title: a.title, aka: a.original, image: a.image, date: a.start?.length === 10 ? a.start : undefined, platforms: [], url: `/anime/fiche?id=${a.id.replace(/^anilist-/, "")}`, anime: { total: a.episodes, duration: a.duration, next: a.next }, note: a.format ? `Anime · ${a.format}` : "Anime" });

  // Vocabulaire du correcteur : mots des titres de jeux (poids fort), des actus et des tags, avec leur fréquence.
  const vocab: Record<string, number> = {};
  const addWords = (text: string, weight: number) => {
    for (const w of normalize(text).split(" ")) if (w.length >= 2) vocab[w] = (vocab[w] ?? 0) + weight;
  };
  games.forEach((g) => addWords(`${g.title} ${g.aka ?? ""}`, 5));
  articles.forEach((a) => addWords(`${a.title} ${a.tags.join(" ")}`, 1));
  ["PS5", "PlayStation", "Xbox", "Switch 2", "Nintendo", "PC", "Steam", "test", "sortie", "gratuit", "anime"].forEach((w) => addWords(w, 10));

  // Jeux qui ont une fiche sur le site : lien vers la fiche plutôt que vers la boutique.
  const allGames = await getGames();
  const pages = new Set(allGames.map((g) => g.slug));
  for (const g of games) {
    const slug = gameSlug(g.title);
    if (pages.has(slug) && !g.note?.startsWith("Gratuit")) g.url = `/jeux/${slug}`;
  }
  for (const g of allGames) {
    if (!seen.has(norm(g.title))) {
      seen.add(norm(g.title));
      games.push({ id: `jeu-${g.slug}`, title: g.title, platforms: g.platforms, image: g.image, date: g.date, rating: g.rating, url: `/jeux/${g.slug}` });
    }
  }

  const index: SearchIndex = { articles, games, vocab };
  return Response.json(index);
}
