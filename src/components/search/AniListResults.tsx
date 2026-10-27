"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { EpisodeTracker } from "@/components/tracker/EpisodeTracker";

interface Media {
  id: number;
  title: { romaji?: string; english?: string };
  coverImage?: { large?: string };
  format?: string;
  status?: string;
  episodes?: number;
  startDate?: { year?: number };
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  siteUrl?: string;
  externalLinks?: { site: string; url: string; type?: string; language?: string | null }[];
}

const QUERY = `query ($q: String) {
  Page(perPage: 8) {
    media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
      id title { romaji english } coverImage { large } format status episodes startDate { year }
      nextAiringEpisode { episode airingAt } siteUrl externalLinks { site url type language }
    }
  }
}`;

const FORMATS: Record<string, string> = { TV: "Série", TV_SHORT: "Série courte", MOVIE: "Film", OVA: "OAV", ONA: "Web", SPECIAL: "Spécial" };
const STATUS: Record<string, string> = { RELEASING: "En cours", FINISHED: "Terminé", NOT_YET_RELEASED: "À venir", HIATUS: "En pause", CANCELLED: "Annulé" };
const https = (u?: string) => (u?.startsWith("https://") ? u : undefined);

const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Plateformes de streaming officielles listées par AniList (version française d'abord). */
const streaming = (m: Media) =>
  (m.externalLinks ?? [])
    .filter((l) => l.type === "STREAMING" && https(l.url))
    .sort((a, b) => Number(b.language === "French") - Number(a.language === "French"))
    .filter((l, i, all) => all.findIndex((x) => x.site === l.site) === i)
    .slice(0, 3);

/** Recherche en direct dans la base d'animes d'AniList (API publique et gratuite). */
export function AniListResults({ query, onCount }: { query: string; onCount?: (n: number) => void }) {
  const [media, setMedia] = useState<Media[] | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    setMedia(null);
    fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { q: query.slice(0, 100) } }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setMedia(((data?.data?.Page?.media ?? []) as Media[]).filter((m) => m?.id && (m.title?.english || m.title?.romaji))))
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
            const title = m.title.english || m.title.romaji;
            const original = m.title.english && m.title.romaji !== m.title.english ? m.title.romaji : undefined;
            const cover = https(m.coverImage?.large);
            const links = streaming(m);
            const details = [
              m.format && (FORMATS[m.format] ?? m.format),
              m.status && STATUS[m.status],
              m.startDate?.year,
              m.episodes && `${m.episodes} épisode${m.episodes > 1 ? "s" : ""}`,
            ].filter(Boolean);
            return (
              <li key={m.id} className="flex gap-3 rounded-xl glass p-3">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element -- site statique
                  <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.classList.add("invisible")} className="h-28 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <a
                    href={https(m.siteUrl) ?? `https://anilist.co/anime/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-semibold text-heading hover:text-accent"
                  >
                    <span className="line-clamp-2">{title}</span> <ExternalLink className="size-3 shrink-0 text-muted" aria-hidden />
                  </a>
                  {original && <p className="truncate text-xs text-muted">{original}</p>}
                  <p className="mt-1 text-xs text-muted">{details.join(" · ")}</p>
                  {m.nextAiringEpisode && (
                    <p className="mt-1 text-xs font-semibold text-accent">
                      Épisode {m.nextAiringEpisode.episode} : {dayFmt.format(new Date(m.nextAiringEpisode.airingAt * 1000))}
                    </p>
                  )}
                  <EpisodeTracker
                    anime={{
                      id: `anilist-${m.id}`,
                      title: title ?? "",
                      image: cover,
                      total: m.episodes ?? undefined,
                      next: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, at: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() } : undefined,
                    }}
                    className="mt-2"
                  />
                  {links.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {links.map((l) => (
                        <a
                          key={l.site}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full glass px-2 py-0.5 text-xs font-semibold text-heading hover:border-accent/60"
                        >
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
      <p className="mt-3 text-xs text-muted">Données : AniList. Liens vers les plateformes officielles uniquement.</p>
    </section>
  );
}
