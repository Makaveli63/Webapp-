import fs from "node:fs";
import path from "node:path";
import { getAnime } from "@/lib/anime";
import { getDeals } from "@/lib/deals";
import { getFreeGames } from "@/lib/free-games";
import { getGames } from "@/lib/games";
import { getArticles } from "@/lib/news";
import { getUpcomingReleases } from "@/lib/releases";

// État du site pour le tableau de bord administrateur (fichier statique, régénéré à chaque mise à jour).
// Rien de privé : noms des sources, nombres d'articles et heure de mise à jour.
export const dynamic = "force-static";

type FeedStatus = { name: string; count?: number; error?: string };
type UpdateStatus = { at?: string; feeds?: FeedStatus[]; today?: number; ai?: number; aiEnabled?: boolean };

function readStatus(): UpdateStatus {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), ".cache", "news", "status.json"), "utf8")) as UpdateStatus;
  } catch {
    return {}; // pas de mise à jour des actus pendant ce build (développement)
  }
}

export async function GET() {
  const articles = await getArticles();
  const byCategory: Record<string, number> = {};
  for (const a of articles) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
  const status = readStatus();
  return Response.json({
    builtAt: new Date().toISOString(),
    update: status,
    content: {
      articles: articles.length,
      byCategory,
      withAi: articles.filter((a) => a.aiSummary).length,
      games: (await getGames()).length,
      releases: getUpcomingReleases().length,
      free: getFreeGames().games.filter((g) => g.status === "now").length,
      deals: getDeals().steam.length,
      anime: getAnime().airing.length,
      animeUpcoming: getAnime().upcoming.length,
    },
  });
}
