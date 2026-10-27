import Link from "next/link";
import { CategoryBadge, PlatformBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { Article } from "@/types";

export function NewsCard({ article }: { article: Article }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/60 active:bg-surface-2 sm:p-5">
      <div className="flex flex-wrap gap-1.5">
        <CategoryBadge category={article.category} />
        {article.platforms.map((p) => (
          <PlatformBadge key={p} platform={p} />
        ))}
      </div>
      <h3 className="mt-2.5 text-base font-semibold leading-snug text-heading sm:mt-3 sm:text-lg">
        <Link
          href={`/actualites/${article.slug}`}
          className="after:absolute after:inset-0 focus:outline-none"
        >
          <span className="relative">{article.title}</span>
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-xs text-muted sm:pt-4">
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        <span aria-hidden>·</span>
        <span>Source : {article.source.name}</span>
      </div>
    </article>
  );
}
