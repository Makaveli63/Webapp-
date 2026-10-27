import Link from "next/link";
import { PlatformBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { Article } from "@/types";

export function NewsCard({ article }: { article: Article }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/60">
      <div className="flex flex-wrap gap-1.5">
        {article.platforms.map((p) => (
          <PlatformBadge key={p} platform={p} />
        ))}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-white">
        <Link
          href={`/actualites/${article.slug}`}
          className="after:absolute after:inset-0 focus:outline-none"
        >
          <span className="relative">{article.title}</span>
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted">
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        <span aria-hidden>·</span>
        <span>Source : {article.source.name}</span>
      </div>
    </article>
  );
}
