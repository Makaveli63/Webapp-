"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NewsCard } from "@/components/news/NewsCard";
import type { Article, GlossaryTerm, Guide } from "@/types";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Props {
  articles: Article[];
  guides: Pick<Guide, "slug" | "title" | "description" | "tags">[];
  terms: Pick<GlossaryTerm, "slug" | "term" | "short">[];
}

export function SearchResults({ articles, guides, terms }: Props) {
  const q = (useSearchParams().get("q") ?? "").trim();
  const needle = normalize(q);
  const match = (...fields: string[]) => needle.length > 0 && fields.some((f) => normalize(f).includes(needle));

  const foundArticles = articles.filter((a) => match(a.title, a.excerpt, a.source.name, ...a.tags, ...a.platforms));
  const foundGuides = guides.filter((g) => match(g.title, g.description, ...g.tags));
  const foundTerms = terms.filter((t) => match(t.term, t.short));
  const total = foundArticles.length + foundGuides.length + foundTerms.length;

  return (
    <>
      {q ? (
        <p className="mt-4 text-muted">{total} résultat{total > 1 ? "s" : ""} pour « {q} »</p>
      ) : (
        <p className="mt-4 text-muted">Saisissez un terme dans la barre de recherche.</p>
      )}

      {foundGuides.length + foundTerms.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Guides & glossaire</h2>
          <ul className="mt-3 space-y-2">
            {foundGuides.map((g) => (
              <li key={g.slug}><Link className="text-accent-2 underline underline-offset-2" href={`/scene/guides/${g.slug}`}>{g.title}</Link></li>
            ))}
            {foundTerms.map((t) => (
              <li key={t.slug}><Link className="text-accent-2 underline underline-offset-2" href={`/scene/glossaire#${t.slug}`}>{t.term}</Link> <span className="text-sm text-muted">— {t.short}</span></li>
            ))}
          </ul>
        </section>
      )}

      {foundArticles.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Actualités</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {foundArticles.slice(0, 60).map((a) => <NewsCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}
    </>
  );
}
