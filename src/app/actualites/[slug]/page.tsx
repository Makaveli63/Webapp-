import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformBadge } from "@/components/ui/Badge";
import { mockArticles } from "@/data/news";
import { renderMarkdown } from "@/lib/content";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return mockArticles.map((a) => ({ slug: a.slug }));
}

// Seuls les articles locaux ont une page de lecture ; ceux des flux RSS renvoient vers leur source.
const getArticle = (slug: string) => mockArticles.find((a) => a.slug === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug);
  return article ? { title: article.title, description: article.excerpt } : {};
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/actualites" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Toutes les actualités
      </Link>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {article.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
      </div>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">{article.title}</h1>
      <p className="mt-3 text-lg text-muted">{article.excerpt}</p>
      <p className="mt-4 border-b border-border pb-6 text-sm text-muted">
        Par {article.author} · <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      </p>
      <div className="prose-article mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />
      <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
        {article.tags.map((t) => (
          <span key={t} className="rounded-md px-2 py-0.5 text-xs text-muted ring-1 ring-border">#{t}</span>
        ))}
      </div>
    </article>
  );
}
