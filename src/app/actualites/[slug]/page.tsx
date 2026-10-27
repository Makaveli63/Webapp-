import { ArrowLeft, ExternalLink, Newspaper, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "@/components/news/NewsCard";
import { PlatformBadge } from "@/components/ui/Badge";
import { renderMarkdown } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { getArticles } from "@/lib/news";

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
  return article ? { title: article.title, description: article.excerpt } : {};
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();

  const related = (await getArticles())
    .filter((a) => a.slug !== article.slug && a.platforms.some((p) => article.platforms.includes(p)))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl">
      <article>
        <Link href="/actualites" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> Toutes les actualités
        </Link>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {article.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">{article.title}</h1>
        <p className="mt-4 border-b border-border pb-6 text-sm text-muted">
          {article.author !== article.source.name && <>Par {article.author} · </>}
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          {" · "}Source : <span className="font-semibold text-fg">{article.source.name}</span>
        </p>

        {article.external ? (
          // Texte brut issu d'un flux externe ou de l'IA : jamais interprété comme du HTML.
          <div className="prose-article mt-8">
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

        {article.external && (
          <aside className="mt-8 rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-white">
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
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-12">
          <h2 id="related-title" className="text-lg font-bold text-white">À lire aussi</h2>
          <div className="mt-4 grid gap-4">
            {related.map((a) => <NewsCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
