import { FreeGamesTeaser } from "@/components/free/FreeGamesTeaser";
import { AnimeTeaser } from "@/components/home/AnimeTeaser";
import { PromosTeaser } from "@/components/home/PromosTeaser";
import { QuickLinks } from "@/components/home/QuickLinks";
import { VideosTeaser } from "@/components/home/VideosTeaser";
import { PollCard } from "@/components/poll/PollCard";
import { currentPoll } from "@/lib/polls";
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
          Les dernières news jeux vidéo et anime, les tests, les sorties, les nouveaux épisodes et les jeux gratuits, mis à jour toutes les 2 heures.
        </p>
      </section>

      <QuickLinks />
      <UpcomingReleases />
      <NewsSection id="latest-title" title="Dernières actualités" href="/actualites" articles={latest.filter((a) => a.category !== "Anime").slice(0, 6)} />
      <PollCard poll={currentPoll()} />
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
