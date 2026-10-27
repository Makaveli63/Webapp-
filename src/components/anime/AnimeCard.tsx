import { ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";
import { EpisodeTracker } from "@/components/tracker/EpisodeTracker";
import { Countdown } from "@/components/ui/Countdown";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TrailerButton } from "@/components/ui/TrailerButton";
import { themeFor } from "@/lib/themes";
import type { Anime } from "@/types";

const day = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(
    new Date(iso),
  );
const startLabel = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));

/** Carte d'un anime : affiche, prochain épisode avec compte à rebours, où le regarder légalement. */
export function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <article className="glass relative flex flex-col overflow-hidden rounded-xl">
      <div className="relative aspect-[3/4] w-full sm:aspect-[2/3]">
        <div className="absolute inset-0">
          <RemoteImage src={anime.image} alt={anime.title} theme={themeFor(anime.title)} seed={anime.id} className="h-full w-full" credit="AniList" />
        </div>
        {typeof anime.score === "number" && (
          <span className="score-glass score-excellent absolute right-2 top-2 rounded-xl px-2 py-1 text-sm font-black" title="Note moyenne AniList">
            {anime.score}%
          </span>
        )}
        {anime.trailer && <TrailerButton video={{ youtube: anime.trailer }} title={anime.title} className="absolute bottom-2 right-2 z-10" />}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-semibold leading-snug text-heading">
          <Link href={`/anime/fiche?id=${anime.id.replace(/^anilist-/, "")}`} className="hover:text-accent after:absolute after:inset-0">
            {anime.title}
          </Link>
        </h3>
        {anime.original && <p className="truncate text-xs text-muted">{anime.original}</p>}
        <p className="mt-1 text-xs text-muted">{[anime.format, anime.genres.join(" · ")].filter(Boolean).join(" — ")}</p>
        {anime.next ? (
          <div className="mt-2 text-sm">
            <p className="font-semibold text-heading">
              <PlayCircle className="mr-1 inline size-4 text-accent" aria-hidden />
              Épisode {anime.next.episode}
              {anime.episodes ? `/${anime.episodes}` : ""}
            </p>
            <p className="text-xs text-accent">
              <Countdown target={anime.next.at} fallback={day(anime.next.at)} doneLabel="disponible !" />
            </p>
          </div>
        ) : (
          anime.start && <p className="mt-2 text-sm font-semibold text-heading">Début : {startLabel(anime.start)}</p>
        )}
        <div className="mt-auto pt-3">
          {anime.streaming.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {anime.streaming.map((s) => (
                <a
                  key={s.site}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/25"
                >
                  {s.site} <ExternalLink className="size-3" aria-hidden />
                </a>
              ))}
            </div>
          )}
          <EpisodeTracker anime={{ id: anime.id, title: anime.title, image: anime.image, total: anime.episodes, duration: anime.duration, next: anime.next }} className="mt-2" />
        </div>
      </div>
    </article>
  );
}
