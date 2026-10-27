import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/types";
import { NewsCard } from "./NewsCard";

interface Props {
  id: string;
  title: string;
  href: string;
  articles: Article[];
}

/** Bloc de la page d'accueil : titre, lien « Tout voir » et grille d'articles. */
export function NewsSection({ id, title, href, articles }: Props) {
  if (!articles.length) return null;
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="text-xl font-bold text-heading">{title}</h2>
        <Link href={href} className="flex shrink-0 items-center gap-1 py-1 text-sm text-muted hover:text-fg">
          Tout voir <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {articles.map((a) => (
          <NewsCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}
