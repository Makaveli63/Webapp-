"use client";

import { ArrowLeft, Clock, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FollowButton } from "@/components/app/FollowButton";
import { NotInterestedButton } from "@/components/app/NotInterestedButton";
import { CollectionButtons } from "@/components/collection/CollectionButtons";
import { NewsCard } from "@/components/news/NewsCard";
import { ShareButton } from "@/components/share/ShareButton";
import { GameProgress } from "@/components/tracker/GameProgress";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TrailerButton } from "@/components/ui/TrailerButton";
import { gameFollowId } from "@/lib/aliases";
import { loadSearchIndex } from "@/lib/search-index";
import { titleKey } from "@/lib/text";
import { themeFor } from "@/lib/themes";
import type { Article, SearchGame } from "@/types";

const fullDate = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));

/**
 * Fiche d'un jeu de la grande base de recherche (jeux sans page dédiée sur le site) : visuel, date, plateformes,
 * note, durée de vie, bande-annonce, suivi et collection, et les actus du site qui en parlent.
 * Le lien vers RAWG (base de données d'où viennent ces informations) reste en bas, en source.
 */
export function GameSheet() {
  const id = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<{ game: SearchGame | null; articles: Article[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    loadSearchIndex()
      .then((index) => setData({ game: index.games.find((g) => g.id === id) ?? null, articles: index.articles }))
      .catch(() => setError(true));
  }, [id]);

  const news = useMemo(() => {
    if (!data?.game) return [];
    const k = titleKey(data.game.title);
    if (k.length < 3) return [];
    return data.articles.filter((a) => ` ${titleKey(a.title)} `.includes(` ${k} `)).slice(0, 6);
  }, [data]);

  if (error) return <p className="text-muted">Fiche indisponible pour le moment (hors connexion ?).</p>;
  if (!data) return <div className="glass mx-auto aspect-[21/9] max-w-4xl animate-pulse rounded-2xl" aria-hidden />;
  const game = data.game;
  if (!game)
    return (
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <p className="text-fg">Ce jeu n&apos;est plus dans notre base.</p>
        <Link href="/recherche" className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
          Rechercher un jeu
        </Link>
      </div>
    );

  const upcoming = !!game.date && Date.parse(`${game.date}T23:59:59Z`) > Date.now();
  const source = game.source?.startsWith("https://") ? game.source : undefined;
  const path = `/jeux/fiche?id=${encodeURIComponent(game.id)}`;
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link href="/recherche" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Recherche
      </Link>
      <header className="glass overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
          <div className="absolute inset-0">
            <RemoteImage src={game.image} alt={game.title} theme={themeFor(game.title)} seed={game.id} className="h-full w-full" />
          </div>
          <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5">
            {game.platforms.length > 0 && <p className="text-sm font-semibold text-white/90">{game.platforms.join(" · ")}</p>}
            <h1 className="mt-1 line-clamp-2 text-xl! font-extrabold leading-tight! text-white drop-shadow sm:text-4xl!">{game.title}</h1>
            {game.genres && game.genres.length > 0 && <p className="text-sm text-white/80">{game.genres.join(" · ")}</p>}
          </div>
          {game.video && <TrailerButton video={game.video} title={game.title} className="!absolute bottom-4 right-4" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-5 text-sm">
          {game.date && (
            <span className="text-fg">
              {upcoming ? "Sortie le " : "Sorti le "}
              <strong>{fullDate(game.date)}</strong>
            </span>
          )}
          {game.note && <span className="text-muted">{game.note}</span>}
          {typeof game.rating === "number" && (
            <span className="inline-flex items-center gap-1.5 text-fg">
              <Star className="size-4 text-amber-500" aria-hidden /> Metacritic <strong>{game.rating}</strong>
            </span>
          )}
          {game.playtime ? (
            <span className="inline-flex items-center gap-1.5 text-fg">
              <Clock className="size-4 text-accent" aria-hidden /> Environ <strong>{game.playtime} h</strong> de jeu
            </span>
          ) : null}
          <FollowButton item={{ id: gameFollowId(game.title), kind: "game", title: game.title, href: path }} />
          <ShareButton title={game.title} path={path} />
          <NotInterestedButton title={game.title} />
          <CollectionButtons game={{ id: game.id, title: game.title, image: game.image }} />
        </div>
        {!upcoming && (
          <div className="border-t border-border p-5">
            <p className="mb-2 text-sm font-bold text-heading">📋 Mon suivi</p>
            <GameProgress game={{ title: game.title, image: game.image }} full className="max-w-md" />
          </div>
        )}
      </header>

      <section aria-labelledby="sheet-news">
        <h2 id="sheet-news" className="text-xl font-bold text-heading">Actus</h2>
        {news.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {news.map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Pas d&apos;actu récente sur ce jeu. Touche la cloche 🔔 pour être prévenu de la prochaine.</p>
        )}
      </section>

      {source && (
        <p className="text-xs text-muted">
          Informations :{" "}
          <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-2">
            RAWG <ExternalLink className="size-3" aria-hidden />
          </a>
        </p>
      )}
    </div>
  );
}
