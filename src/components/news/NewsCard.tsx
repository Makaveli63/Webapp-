import { Play } from "lucide-react";
import Link from "next/link";
import { CategoryBadge, PlatformBadge } from "@/components/ui/Badge";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { formatDate } from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";
import { themeFor } from "@/lib/themes";
import type { Article } from "@/types";

export function NewsCard({ article }: { article: Article }) {
  const theme = themeFor(`${article.title} ${article.tags.join(" ")}`, article.platforms);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl glass transition-colors hover:border-accent/60 active:bg-surface-2">
      <RemoteImage
        src={article.image}
        alt=""
        theme={theme}
        seed={article.slug}
        className="aspect-[2/1] w-full"
        imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
        credit={article.imageCredit ? "Wikimedia Commons" : article.image ? article.source.name : undefined}
      />
      {article.score && (
        <ScoreBadge score={article.score} className="absolute right-2 top-2" />
      )}
      {article.video && (
        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
          <Play className="size-3" fill="currentColor" aria-hidden /> Vidéo
        </span>
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge category={article.category} />
          {article.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
        <h3 className="mt-2.5 text-base font-semibold leading-snug text-heading sm:mt-3 sm:text-lg">
          <Link href={`/actualites/${article.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            <span className="relative">{article.title}</span>
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-xs text-muted sm:pt-4">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>Source : {article.source.name}</span>
          {/* Au-dessus du lien qui couvre la carte, pour rester cliquable */}
          <FavoriteButton article={article} className="relative z-10 -my-2 ml-auto p-2" />
        </div>
      </div>
    </article>
  );
}
