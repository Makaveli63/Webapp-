"use client";

import { ArrowLeft, ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimeFollow } from "@/components/tracker/AnimeFollow";
import { EpisodeTracker } from "@/components/tracker/EpisodeTracker";
import { Countdown } from "@/components/ui/Countdown";
import { TrailerButton } from "@/components/ui/TrailerButton";
import {
  animeHref,
  FORMATS,
  GENRES_FR,
  getAnimeDetail,
  getFranchise,
  https,
  nextOf,
  originalOf,
  plainDescription,
  STATUS,
  streamingOf,
  titleOf,
  type AniMedia,
} from "@/lib/anilist";
import { airedEpisodes, useTracker } from "@/lib/tracker";

const SEASON_FORMATS = new Set(["TV", "TV_SHORT", "ONA"]);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const dayFmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Image d'arrière-plan réglée par CSSOM (pas de style en ligne avec la CSP). */
function Banner({ src }: { src?: string }) {
  if (!src) return null;
  return <div ref={(el) => el?.style.setProperty("background-image", `url("${src.replace(/"/g, "%22")}")`)} className="absolute inset-0 bg-cover bg-center opacity-60" aria-hidden />;
}

const info = (m: AniMedia) => ({ id: `anilist-${m.id}`, title: titleOf(m), image: https(m.coverImage?.large), total: m.episodes ?? undefined, duration: m.duration ?? undefined, next: nextOf(m) });

/** Fiche d'un anime : infos, où le regarder, toutes ses saisons et films avec le suivi des épisodes. */
export function AnimeDetail() {
  const id = Number(useSearchParams().get("id"));
  const [media, setMedia] = useState<AniMedia | null | undefined>(undefined);
  const [family, setFamily] = useState<AniMedia[] | null>(null);
  const [error, setError] = useState(false);
  const tracker = useTracker();

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setMedia(null);
      return;
    }
    const controller = new AbortController();
    setMedia(undefined);
    setFamily(null);
    setError(false);
    getAnimeDetail(id, controller.signal)
      .then((m) => {
        setMedia(m);
        if (m) document.title = `${titleOf(m)} | GamingBase`;
        return m ? getFranchise(m, controller.signal).then(setFamily) : undefined;
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [id]);

  const back = (
    <Link href="/anime" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
      <ArrowLeft className="size-4" aria-hidden /> Anime
    </Link>
  );
  if (error) return <div>{back}<p className="mt-6 text-muted">AniList ne répond pas pour le moment. Réessaie dans un instant.</p></div>;
  if (media === null) return <div>{back}<p className="mt-6 text-muted">Anime introuvable.</p></div>;
  if (!media) return <div>{back}<p className="mt-6 text-muted">Chargement de la fiche…</p></div>;

  const next = nextOf(media);
  const synopsis = plainDescription(media.description);
  const links = streamingOf(media);
  const trailer = media.trailer?.site === "youtube" && /^[\w-]{6,20}$/.test(media.trailer.id ?? "") ? media.trailer.id : undefined;
  const facts = [
    media.format && (FORMATS[media.format] ?? media.format),
    media.status && STATUS[media.status],
    media.startDate?.year,
    media.episodes && plural(media.episodes, "épisode"),
    media.duration && `${media.duration} min`,
    media.studios?.nodes[0]?.name,
  ].filter(Boolean);
  const seasons = (family ?? []).filter((m) => SEASON_FORMATS.has(m.format ?? ""));
  const others = (family ?? []).filter((m) => !SEASON_FORMATS.has(m.format ?? ""));

  return (
    <div className="space-y-8">
      {back}
      <section className="glass-strong overflow-hidden rounded-2xl">
        <div className="relative overflow-hidden">
          <Banner src={https(media.bannerImage) ?? https(media.coverImage?.extraLarge)} />
          <div className="relative flex gap-4 bg-gradient-to-t from-black/90 via-black/65 to-black/30 p-4 pt-20 sm:p-6 sm:pt-32">
            {https(media.coverImage?.large) && (
              // eslint-disable-next-line @next/next/no-img-element -- site statique
              <img src={https(media.coverImage?.large)} alt="" referrerPolicy="no-referrer" className="h-40 w-28 shrink-0 rounded-xl object-cover shadow-lg sm:h-56 sm:w-40" />
            )}
            <div className="min-w-0 self-end text-white">
              <h1 className="text-2xl font-extrabold leading-tight drop-shadow sm:text-4xl">{titleOf(media)}</h1>
              {originalOf(media) && <p className="mt-1 text-sm text-white/75">{originalOf(media)}</p>}
              <p className="mt-2 text-sm text-white/85">{facts.join(" · ")}</p>
              {typeof media.averageScore === "number" && <p className="mt-1 text-sm font-bold">⭐ {media.averageScore}/100 sur AniList</p>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4 sm:px-6">
          <EpisodeTracker anime={info(media)} />
          <AnimeFollow anime={info(media)} />
          {trailer && <TrailerButton video={{ youtube: trailer }} title={titleOf(media)} />}
          {links.map((l) => (
            <a key={l.site} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-border hover:ring-accent">
              {l.site} <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
        {next && (
          <p className="border-t border-border px-4 py-3 text-sm sm:px-6">
            <PlayCircle className="mr-1 inline size-4 text-accent" aria-hidden />
            <strong className="text-heading">Épisode {next.episode}</strong>{" "}
            <span className="text-accent">
              <Countdown target={next.at} fallback={dayFmt(next.at)} doneLabel="disponible !" />
            </span>
          </p>
        )}
      </section>

      {(media.genres?.length ?? 0) > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {media.genres!.slice(0, 6).map((g) => (
            <span key={g} className="glass-pill rounded-full px-2.5 py-1 text-xs font-semibold text-fg ring-1 ring-inset ring-border">
              {GENRES_FR[g] ?? g}
            </span>
          ))}
        </p>
      )}

      {synopsis && (
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-xl font-bold text-heading">Synopsis</h2>
          <p className="mt-1 text-xs text-muted">Résumé AniList (en anglais).</p>
          <p lang="en" className="mt-2 whitespace-pre-line text-fg">{synopsis.length > 1200 ? `${synopsis.slice(0, 1199)}…` : synopsis}</p>
        </section>
      )}

      <FamilyList title="📺 Toutes les saisons" items={seasons} current={media.id} loading={!family} tracker={tracker} />
      {others.length > 0 && <FamilyList title="🎬 Films, OAV et épisodes spéciaux" items={others} current={media.id} tracker={tracker} />}

      <p className="text-xs text-muted">
        Données :{" "}
        <a href={https(media.siteUrl) ?? `https://anilist.co/anime/${media.id}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          AniList
        </a>
        . Liens vers les plateformes officielles uniquement.
      </p>
    </div>
  );
}

function FamilyList({ title, items, current, loading, tracker }: { title: string; items: AniMedia[]; current: number; loading?: boolean; tracker: ReturnType<typeof useTracker> }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-heading">{title}</h2>
      {loading ? (
        <p className="mt-2 text-sm text-muted">Recherche des saisons…</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Une seule saison pour l&apos;instant.</p>
      ) : (
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((m, i) => {
            const track = tracker?.anime[`anilist-${m.id}`];
            const total = m.episodes ?? undefined;
            const aired = airedEpisodes({ total, next: nextOf(m) });
            return (
              <li key={m.id} className={`glass flex gap-3 rounded-xl p-2.5 ${m.id === current ? "ring-2 ring-accent" : ""}`}>
                <Link href={animeHref(m.id)} className="shrink-0">
                  {https(m.coverImage?.large) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- site statique
                    <img src={https(m.coverImage?.large)} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-24 w-16 rounded-lg object-cover" />
                  ) : (
                    <span className="block h-24 w-16 rounded-lg bg-accent/20" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={animeHref(m.id)} className="line-clamp-2 text-sm font-semibold text-heading hover:text-accent">
                    {SEASON_FORMATS.has(m.format ?? "") && <span className="text-accent">#{i + 1} </span>}
                    {titleOf(m)}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {[m.format && (FORMATS[m.format] ?? m.format), m.startDate?.year, m.status && STATUS[m.status], total && plural(total, "épisode")].filter(Boolean).join(" · ")}
                  </p>
                  {track && (
                    <p className="mt-0.5 text-xs font-semibold text-accent">
                      {track.seen.length}/{total ?? aired ?? "?"} vus{(total ?? aired) && track.seen.length >= (total ?? aired)! ? " ✓" : ""}
                    </p>
                  )}
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <EpisodeTracker anime={info(m)} />
                    <AnimeFollow anime={info(m)} compact />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
