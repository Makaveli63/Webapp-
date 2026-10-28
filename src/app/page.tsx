import { FreeGamesTeaser } from "@/components/free/FreeGamesTeaser";
import { AnimeTeaser } from "@/components/home/AnimeTeaser";
import { ForYou } from "@/components/home/ForYou";
import { ListenNews } from "@/components/home/ListenNews";
import { PromosTeaser } from "@/components/home/PromosTeaser";
import { QuickLinks } from "@/components/home/QuickLinks";
import { VideosTeaser } from "@/components/home/VideosTeaser";
import { NewsSection } from "@/components/news/NewsSection";
import { UpcomingReleases } from "@/components/releases/UpcomingReleases";
import { WeekReleasesTeaser } from "@/components/releases/WeekReleasesTeaser";
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
          Le jeu vidéo et l&apos;anime, <span className="logo-gradient">au même endroit</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-muted sm:mt-3">
          Les dernières news jeux vidéo et anime, les tests, les sorties, les nouveaux épisodes et les jeux gratuits, mis à jour toutes les heures.
        </p>
      </section>

      <QuickLinks />
      <UpcomingReleases />
      <ListenNews
        items={latest
          .filter((a) => a.category !== "Anime")
          .slice(0, 8)
          .map((a) => ({ title: a.title, path: `/actualites/${a.slug}`, text: `${a.title}. ${(a.aiSummary ?? a.excerpt).replace(/[#*_>`]/g, "").slice(0, 900)}` }))}
      />
      {/* Sans le texte complet des articles : la page reste légère. */}
      <ForYou
        articles={latest.slice(0, 100).map((a) => ({
          slug: a.slug,
          title: a.title,
          tags: a.tags.slice(0, 8),
          platforms: a.platforms,
          category: a.category,
          image: a.image,
          publishedAt: a.publishedAt,
          source: { name: a.source.name },
        }))}
      />
      <NewsSection id="latest-title" title="Dernières actualités" href="/actualites" articles={latest.filter((a) => a.category !== "Anime").slice(0, 6)} />
      <WeekReleasesTeaser />
      <FreeGamesTeaser />
      <AnimeTeaser />
      <PromosTeaser />
      <VideosTeaser />
      <NewsSection id="tests-title" title="Derniers tests" href="/tests" articles={tests.slice(0, 3)} />
      <NewsSection id="consoles-title" title="Consoles & matériel" href="/consoles" articles={consoles.slice(0, 3)} />
    </div>
  );
}
