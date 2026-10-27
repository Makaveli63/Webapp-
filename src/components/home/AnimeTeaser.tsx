import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { getAnime, thisWeek } from "@/lib/anime";

/** Accueil : les 4 prochains épisodes d'anime de la semaine. */
export function AnimeTeaser() {
  const data = getAnime();
  const items = [...thisWeek(data), ...data.upcoming].slice(0, 4);
  if (!items.length) return null;
  return (
    <section aria-labelledby="anime-teaser">
      <div className="flex items-end justify-between gap-4">
        <h2 id="anime-teaser" className="text-xl font-bold text-heading sm:text-2xl">Anime de la semaine</h2>
        <Link href="/anime" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
          Tout l&apos;anime <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((a) => (
          <AnimeCard key={a.id} anime={a} />
        ))}
      </div>
    </section>
  );
}
