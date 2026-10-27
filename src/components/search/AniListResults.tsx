"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EpisodeTracker } from "@/components/tracker/EpisodeTracker";
import { animeHref, FORMATS, https, nextOf, originalOf, searchAnime, STATUS, streamingOf, titleOf, type AniMedia } from "@/lib/anilist";

const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Recherche en direct dans la base d'animes d'AniList (API publique et gratuite) ; chaque anime ouvre sa fiche. */
export function AniListResults({ query, onCount }: { query: string; onCount?: (n: number) => void }) {
  const [media, setMedia] = useState<AniMedia[] | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    setMedia(null);
    searchAnime(query, controller.signal)
      .then(setMedia)
      .catch((err) => {
        if (err?.name !== "AbortError") setMedia([]);
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => onCount?.(media?.length ?? 0), [media, onCount]);

  // Pas de section vide : la plupart des recherches portent sur des jeux.
  if (!query || (media && media.length === 0)) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-heading">Animes</h2>
      {media === null ? (
        <p className="mt-3 text-sm text-muted">Recherche en cours…</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {media.map((m) => {
            const title = titleOf(m);
            const cover = https(m.coverImage?.large);
            const links = streamingOf(m, 3);
            const details = [
              m.format && (FORMATS[m.format] ?? m.format),
              m.status && STATUS[m.status],
              m.startDate?.year,
              m.episodes && `${m.episodes} épisode${m.episodes > 1 ? "s" : ""}`,
            ].filter(Boolean);
            return (
              <li key={m.id} className="glass flex gap-3 rounded-xl p-3">
                <Link href={animeHref(m.id)} className="shrink-0">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- site statique
                    <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.classList.add("invisible")} className="h-28 w-20 rounded-lg object-cover" />
                  ) : (
                    <span className="block h-28 w-20 rounded-lg bg-accent/20" />
                  )}
                </Link>
                <div className="min-w-0">
                  <Link href={animeHref(m.id)} className="line-clamp-2 font-semibold text-heading hover:text-accent">
                    {title}
                  </Link>
                  {originalOf(m) && <p className="truncate text-xs text-muted">{originalOf(m)}</p>}
                  <p className="mt-1 text-xs text-muted">{details.join(" · ")}</p>
                  {m.nextAiringEpisode && (
                    <p className="mt-1 text-xs font-semibold text-accent">
                      Épisode {m.nextAiringEpisode.episode} : {dayFmt.format(new Date(m.nextAiringEpisode.airingAt * 1000))}
                    </p>
                  )}
                  <EpisodeTracker
                    anime={{ id: `anilist-${m.id}`, title, image: cover, total: m.episodes ?? undefined, duration: m.duration ?? undefined, next: nextOf(m) }}
                    className="mt-2"
                  />
                  {links.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {links.map((l) => (
                        <a key={l.site} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full glass px-2 py-0.5 text-xs font-semibold text-heading hover:border-accent/60">
                          {l.site}
                        </a>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Données : AniList. Touche un anime pour voir toutes ses saisons.</p>
    </section>
  );
}
