import { getCalendar } from "@/lib/calendar";
import { getFreeGames } from "@/lib/free-games";
import { getArticles } from "@/lib/news";
import { getUpcomingReleases } from "@/lib/releases";
import type { SearchGame, SearchIndex } from "@/types";

// Index de recherche généré au build (fichier statique), téléchargé seulement sur la page Recherche.
export const dynamic = "force-static";

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
  const add = (g: SearchGame) => {
    const k = norm(g.title);
    if (!k || seen.has(k)) return;
    seen.add(k);
    games.push(g);
  };
  for (const r of getUpcomingReleases())
    add({ id: r.id, title: r.title, date: r.date, platforms: r.platforms, image: r.image, url: "/sorties", video: r.video });
  for (const g of calendar.games) add(g);
  for (const g of getFreeGames().games)
    add({ id: g.id, title: g.title, platforms: [g.store], image: g.image, url: g.url, note: "Gratuit en ce moment" });
  for (const g of calendar.database) add(g);

  const index: SearchIndex = { articles, games };
  return Response.json(index);
}
