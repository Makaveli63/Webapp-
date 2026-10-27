import type { Metadata } from "next";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { NewsCard } from "@/components/news/NewsCard";
import { getAnime, thisWeek } from "@/lib/anime";
import { getArticlesByCategory } from "@/lib/news";

export const metadata: Metadata = {
  title: "Anime : actus, épisodes et sorties",
  description: "L'actualité anime en français, les épisodes de la semaine avec compte à rebours et les prochaines sorties, avec où les regarder légalement.",
};

export default async function AnimePage() {
  const data = getAnime();
  const week = thisWeek(data);
  const others = data.airing.filter((a) => !week.includes(a)).slice(0, 12);
  const news = (await getArticlesByCategory("Anime")).slice(0, 12);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Anime</h1>
        <p className="mt-2 text-muted">
          L&apos;actu anime, les nouveaux épisodes de la semaine et les prochaines sorties. Les liens mènent uniquement vers les
          plateformes officielles (Crunchyroll, ADN, Netflix…).
        </p>
      </header>

      {news.length > 0 && (
        <section aria-labelledby="anime-news">
          <h2 id="anime-news" className="text-xl font-bold text-heading">📰 Actus anime</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {news.map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      {week.length > 0 && (
        <section aria-labelledby="anime-week">
          <h2 id="anime-week" className="text-xl font-bold text-heading">📺 Épisodes de la semaine</h2>
          <p className="mt-1 text-sm text-muted">Les prochains épisodes des séries en cours, avec le compte à rebours (heure de Paris).</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {week.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="anime-season">
          <h2 id="anime-season" className="text-xl font-bold text-heading">🔥 Populaires cette saison</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {others.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section aria-labelledby="anime-upcoming">
          <h2 id="anime-upcoming" className="text-xl font-bold text-heading">🗓️ Prochainement</h2>
          <p className="mt-1 text-sm text-muted">Les nouvelles séries, saisons et films les plus attendus.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {data.upcoming.slice(0, 16).map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        </section>
      )}

      {!news.length && !data.airing.length && !data.upcoming.length && (
        <p className="text-muted">Les infos anime arrivent à la prochaine mise à jour du site.</p>
      )}
      <p className="text-xs text-muted">Épisodes et sorties : données AniList (anilist.co).</p>
    </div>
  );
}
