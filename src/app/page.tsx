import { FreeGamesTeaser } from "@/components/free/FreeGamesTeaser";
import { NewsSection } from "@/components/news/NewsSection";
import { UpcomingReleases } from "@/components/releases/UpcomingReleases";
import { getArticles, getArticlesByCategory } from "@/lib/news";

export default async function HomePage() {
  const [latest, tests, consoles] = await Promise.all([
    getArticles(),
    getArticlesByCategory("Test"),
    getArticlesByCategory("Console"),
  ]);

  return (
    <div className="space-y-10 sm:space-y-12">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight text-heading sm:text-4xl">
          L&apos;actu jeu vidéo, <span className="text-accent">sans bruit</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-muted sm:mt-3">
          Les dernières news, les tests, l&apos;actualité des consoles et les jeux gratuits de la semaine, mis à jour toutes les 2 heures.
        </p>
      </section>

      <UpcomingReleases />
      <NewsSection id="latest-title" title="Dernières actualités" href="/actualites" articles={latest.slice(0, 6)} />
      <FreeGamesTeaser />
      <NewsSection id="tests-title" title="Derniers tests" href="/tests" articles={tests.slice(0, 3)} />
      <NewsSection id="consoles-title" title="Consoles & matériel" href="/consoles" articles={consoles.slice(0, 3)} />
    </div>
  );
}
