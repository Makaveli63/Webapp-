import { scoreTier } from "@/components/ui/ScoreBadge";
import { ArrowLeft, ExternalLink, Newspaper, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "@/components/news/NewsCard";
import { CategoryBadge, PlatformBadge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/news/FavoriteButton";
import { ReadingControls } from "@/components/news/ReadingControls";
import { ShareButton } from "@/components/share/ShareButton";
import { Comments } from "@/components/social/Comments";
import { PageTheme } from "@/components/theme/PageTheme";
import { DislikeButton } from "@/components/social/DislikeButton";
import { ReadXp } from "@/components/player/ReadXp";
import { LikeButton } from "@/components/social/LikeButton";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { OtherScores } from "@/components/tests/ScoreCompare";
import { otherTests, testedGame } from "@/lib/compare";
import { aboutGame, getGames } from "@/lib/games";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { getArticles } from "@/lib/news";
import { themeFor } from "@/lib/themes";

type Props = { params: Promise<{ slug: string }> };

// Une page par article, y compris pour ceux des flux RSS (générées à chaque build).
export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  // Aperçu riche quand le lien est partagé (WhatsApp, Messages, X…).
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      images: article.image ? [article.image] : undefined,
      siteName: "GamingBase",
      locale: "fr_FR",
    },
    twitter: { card: article.image ? "summary_large_image" : "summary", title: article.title, description: article.excerpt },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();

  const all = await getArticles();
  const others = otherTests(article, all);
  // Fiche du jeu testé (ou du jeu dont parle l'article), si elle existe.
  const games = await getGames();
  const tested = article.category === "Test" ? testedGame(article.title) : "";
  const gamePage = (games.find((g) => g.key === tested) ?? games.find((g) => g.key.length >= 4 && aboutGame(article.title, g)))?.slug;
  // Actu anime : d'autres actus anime ; actu jeu vidéo : même plateforme, jamais d'anime.
  const isAnime = article.category === "Anime";
  const related = all
    .filter((a) => a.slug !== article.slug && (a.category === "Anime") === isAnime)
    .filter((a) => isAnime || a.platforms.some((p) => article.platforms.includes(p)))
    .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTheme themeId={themeFor(`${article.title} ${article.tags.join(" ")}`, article.platforms).id} image={article.image} />
      <article>
        <Link href={isAnime ? "/anime" : "/actualites"} className="-my-2 inline-flex items-center gap-1 py-2 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> {isAnime ? "Toute l'actu anime" : "Toutes les actualités"}
        </Link>
        <RemoteImage
          src={article.image}
          alt={article.title}
          theme={themeFor(`${article.title} ${article.tags.join(" ")}`, article.platforms)}
          seed={article.slug}
          className="mt-4 aspect-[2/1] w-full rounded-2xl sm:mt-5"
          credit={article.imageCredit ?? (article.image ? `Image : ${article.source.name}` : undefined)}
        />
        <div className="mt-5 flex flex-wrap gap-1.5 sm:mt-6">
          <CategoryBadge category={article.category} />
          {article.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-heading sm:text-4xl">{article.title}</h1>
        {/* Sur téléphone : les infos sur toute la largeur, les boutons en dessous (rien n'est écrasé). */}
        <div className="mt-4 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <p className="min-w-0 text-sm text-muted">
          {article.author !== article.source.name && <>Par {article.author} · </>}
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          {" · "}Source : <span className="font-semibold text-fg">{article.source.name}</span>
          {" · "}
          {Math.max(1, Math.round(`${article.aiSummary ?? ""} ${article.content}`.split(/\s+/).length / 220))} min de lecture
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <ReadingControls />
          <LikeButton type="article" id={article.slug} className="glass-pill h-[30px] pr-3 ring-1 ring-inset ring-border" />
          <DislikeButton type="article" id={article.slug} className="glass-pill h-[30px] ring-1 ring-inset ring-border" />
          <ShareButton title={article.title} path={`/actualites/${article.slug}/`} />
          <FavoriteButton article={article} withLabel />
        </div>
        </div>

        {article.external ? (
          // Texte brut issu d'un flux externe ou de l'IA : jamais interprété comme du HTML.
          <div className="prose-article mt-8">
            {article.score && (
              <p className="flex items-center gap-3">
                <span className={`score-solid rounded-2xl px-3.5 py-2 text-2xl font-extrabold ${scoreTier(article.score).className}`}>
                  {article.score}
                </span>
                <span className="text-sm text-muted">
                  <span className="font-semibold text-heading">{scoreTier(article.score).label}</span> · note attribuée par{" "}
                  {article.source.name}
                </span>
              </p>
            )}
            {others.length > 0 && <OtherScores tests={others} />}
            {gamePage && (
              <p>
                <Link href={`/jeux/${gamePage}`} className="font-semibold">
                  🎮 Voir la fiche du jeu : notes de la presse, promos et vidéos
                </Link>
              </p>
            )}
            {article.aiSummary ? (
              <>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent-2">
                  <Sparkles className="size-3.5" aria-hidden /> Notre résumé
                </p>
                <p>{article.aiSummary}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-accent-2">
                  Extrait fourni par {article.source.name}
                </p>
                <blockquote>{article.content || article.excerpt}</blockquote>
              </>
            )}
          </div>
        ) : (
          <div className="prose-article mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />
        )}

        {article.video && (
          <section aria-label="Vidéo" className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-2">Vidéo</p>
            <VideoPlayer video={article.video} title={article.title} />
          </section>
        )}

        {article.external && (
          <aside className="mt-8 rounded-xl glass p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-heading">
              <Newspaper className="size-4 text-accent-2" aria-hidden /> Source : {article.source.name}
            </p>
            <p className="mt-1 text-muted">
              {article.aiSummary
                ? `Résumé rédigé automatiquement par intelligence artificielle à partir de l'article de ${article.source.name}, qui peut contenir des imprécisions.`
                : `Extrait publié par ${article.source.name} dans son flux d'actualités.`}{" "}
              L&apos;article original et ses illustrations appartiennent à leur éditeur.
            </p>
            {article.source.url && (
              <a
                href={article.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-accent-2 underline underline-offset-2"
              >
                Lire l&apos;article complet <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </aside>
        )}

        {article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
            {article.tags.map((t) => (
              <span key={t} className="rounded-md px-2 py-0.5 text-xs text-muted ring-1 ring-border">#{t}</span>
            ))}
          </div>
        )}
        <Comments slug={article.slug} />
        <ReadXp slug={article.slug} anime={isAnime} />
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="zen-hide mt-12">
          <h2 id="related-title" className="text-lg font-bold text-heading">À lire aussi</h2>
          <div className="mt-4 grid gap-4">
            {related.map((a) => <NewsCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
