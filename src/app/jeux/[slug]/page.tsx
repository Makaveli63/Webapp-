import { CalendarPlus, Clock, ExternalLink, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/app/FollowButton";
import { CollectionButtons } from "@/components/collection/CollectionButtons";
import { DealCard } from "@/components/deals/DealCard";
import { GameProgress } from "@/components/tracker/GameProgress";
import { ShareButton } from "@/components/share/ShareButton";
import { NewsCard } from "@/components/news/NewsCard";
import { PageTheme } from "@/components/theme/PageTheme";
import { PlatformBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/ui/Countdown";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { ScoreBadge, scoreTier } from "@/components/ui/ScoreBadge";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { on20 } from "@/lib/compare";
import { getDeals } from "@/lib/deals";
import { formatDate } from "@/lib/format";
import { aboutGame, getGames, testsOf } from "@/lib/games";
import { getArticles } from "@/lib/news";
import { themeFor } from "@/lib/themes";
import type { Platform } from "@/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getGames()).map((g) => ({ slug: g.slug }));
}

async function getGame(slug: string) {
  return (await getGames()).find((g) => g.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGame((await params).slug);
  if (!game) return {};
  const description = `${game.title} : tests et notes de la presse, actus, promos et bande-annonce.`;
  return { title: game.title, description, openGraph: { title: game.title, description, images: game.image ? [game.image] : undefined } };
}

const fmt = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")}/20`;
const KNOWN: Platform[] = ["PC", "PS5", "Switch 2", "Xbox", "Mobile", "Multi"];

export default async function GamePage({ params }: Props) {
  const game = await getGame((await params).slug);
  if (!game) notFound();

  const articles = await getArticles();
  const tests = testsOf(game, articles);
  const notes = tests.map((t) => on20(t.score!)).filter((n): n is number => n !== null);
  const pressAverage = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : undefined;
  const news = articles.filter((a) => a.category !== "Test" && aboutGame(a.title, game)).slice(0, 6);
  const deals = getDeals().steam.filter((d) => aboutGame(d.title, game));
  const upcoming = game.date ? Date.parse(`${game.date}T23:59:59Z`) > Date.now() : !!game.releaseAt;
  const theme = themeFor(game.title, game.platforms.filter((p): p is Platform => KNOWN.includes(p as Platform)));
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageTheme themeId={theme.id} image={game.image} />

      <header className="glass overflow-hidden rounded-2xl">
        <div className="relative aspect-[21/9] w-full">
          <div className="absolute inset-0">
            <RemoteImage src={game.image} alt={game.title} theme={theme} seed={game.slug} className="h-full w-full" />
          </div>
          <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5">
            <div className="flex flex-wrap gap-1.5">
              {game.platforms.map((p) => (KNOWN.includes(p as Platform) ? <PlatformBadge key={p} platform={p as Platform} /> : null))}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-white drop-shadow sm:text-4xl">{game.title}</h1>
            {game.genres.length > 0 && <p className="text-sm text-white/80">{game.genres.join(" · ")}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-5 text-sm">
          {game.date && (
            <span className="text-fg">
              {upcoming ? "Sortie le " : "Sorti le "}
              <strong>{formatDate(game.releaseAt ?? `${game.date}T12:00:00Z`)}</strong>
            </span>
          )}
          {pressAverage !== undefined && (
            <span className="inline-flex items-center gap-2">
              Presse :
              <span className={`score-glass score-solid rounded-xl px-2.5 py-1 font-black ${scoreTier(fmt(pressAverage)).className}`}>
                {fmt(pressAverage)}
              </span>
            </span>
          )}
          {typeof game.rating === "number" && (
            <span className="inline-flex items-center gap-1.5 text-fg">
              <Star className="size-4 text-amber-500" aria-hidden /> Metacritic <strong>{game.rating}</strong>
            </span>
          )}
          {game.playtime && (
            <span className="inline-flex items-center gap-1.5 text-fg" title="Temps de jeu moyen déclaré par les joueurs (RAWG)">
              <Clock className="size-4 text-accent" aria-hidden /> Environ <strong>{game.playtime} h</strong> de jeu
            </span>
          )}
          <FollowButton item={{ id: `jeu-${game.slug}`, kind: "game", title: game.title, href: `/jeux/${game.slug}/` }} />
          <ShareButton title={game.title} path={`/jeux/${game.slug}/`} />
          <CollectionButtons game={{ id: game.releaseId ? `sortie-${game.releaseId}` : `jeu-${game.slug}`, title: game.title, image: game.image }} />
        </div>
        {!upcoming && (
          <div className="border-t border-border p-5">
            <p className="mb-2 text-sm font-bold text-heading">📋 Mon suivi</p>
            <GameProgress game={{ title: game.title, image: game.image }} full className="max-w-md" />
          </div>
        )}
        {game.releaseAt && upcoming && (
          <div className="flex flex-wrap items-center gap-4 border-t border-border p-5">
            <Countdown target={game.releaseAt} fallback={`Sortie le ${formatDate(game.releaseAt)}`} doneLabel="🎉 Disponible !" variant="blocks" />
            <a
              href={`${base}/calendrier/${game.releaseId}.ics`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white"
            >
              <CalendarPlus className="size-4" aria-hidden /> Ajouter au calendrier
            </a>
          </div>
        )}
      </header>

      {game.video && <VideoPlayer video={game.video} title={`Bande-annonce de ${game.title}`} />}

      <section aria-labelledby="press-title">
        <h2 id="press-title" className="text-xl font-bold text-heading">Les tests de la presse</h2>
        {tests.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {tests.map((t) => (
              <li key={t.slug}>
                <Link href={`/actualites/${t.slug}`} className="glass flex items-center justify-between gap-3 rounded-xl p-3 hover:border-accent/60">
                  <span className="min-w-0">
                    <span className="block font-semibold text-heading">{t.source.name}</span>
                    <span className="block truncate text-xs text-muted">{t.title}</span>
                  </span>
                  <ScoreBadge score={t.score!} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Pas encore de test publié.</p>
        )}
      </section>

      {deals.length > 0 && (
        <section aria-labelledby="game-deals">
          <h2 id="game-deals" className="text-xl font-bold text-heading">En promo</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section aria-labelledby="game-news">
          <h2 id="game-news" className="text-xl font-bold text-heading">Dans l&apos;actu</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      {game.externalUrl && (
        <a href={game.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted underline underline-offset-2 hover:text-fg">
          Fiche détaillée (RAWG) <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}
