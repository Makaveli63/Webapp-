import { getFreeGames } from "@/lib/free-games";
import { getArticles } from "@/lib/news";
import { getUpcomingReleases } from "@/lib/releases";

// Données des widgets de l'application Android (fichier statique, régénéré à chaque mise à jour du site).
export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function GET() {
  const articles = await getArticles();
  const free = getFreeGames().games.filter((g) => g.status === "now");
  const data = {
    updatedAt: new Date().toISOString(),
    releases: getUpcomingReleases().map((r) => ({
      id: r.id,
      title: r.short ?? r.title,
      fullTitle: r.title,
      at: r.at,
      atMs: Date.parse(r.at),
      image: r.image ?? null,
      path: `${BASE}/sorties/`,
    })),
    news: articles.slice(0, 5).map((a) => ({
      title: a.title,
      category: a.category,
      score: a.score ?? null,
      source: a.source.name,
      path: `${BASE}/actualites/${a.slug}/`,
    })),
    tests: articles
      .filter((a) => a.category === "Test" && a.score)
      .slice(0, 4)
      .map((a) => ({ title: a.title, score: a.score, path: `${BASE}/actualites/${a.slug}/` })),
    free: free.slice(0, 4).map((g) => ({ title: g.title, store: g.store, endDate: g.endDate ?? null })),
    freePath: `${BASE}/jeux-gratuits/`,
  };
  return Response.json(data);
}
