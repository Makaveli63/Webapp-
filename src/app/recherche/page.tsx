import type { Metadata } from "next";
import Link from "next/link";
import { NewsCard } from "@/components/news/NewsCard";
import { SearchBar } from "@/components/layout/SearchBar";
import { getGlossary, getGuides } from "@/lib/content";
import { getArticles } from "@/lib/news";

export const metadata: Metadata = { title: "Recherche" };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const needle = normalize(q);
  const match = (...fields: string[]) => needle.length > 0 && fields.some((f) => normalize(f).includes(needle));

  const articles = (await getArticles()).filter((a) => match(a.title, a.excerpt, ...a.tags, ...a.platforms));
  const guides = getGuides().filter((g) => match(g.title, g.description, ...g.tags));
  const terms = getGlossary().filter((t) => match(t.term, t.short));
  const total = articles.length + guides.length + terms.length;

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white">Recherche</h1>
      <SearchBar className="mt-6 max-w-xl md:hidden" />
      {q ? (
        <p className="mt-4 text-muted">{total} résultat{total > 1 ? "s" : ""} pour « {q} »</p>
      ) : (
        <p className="mt-4 text-muted">Saisissez un terme dans la barre de recherche.</p>
      )}

      {guides.length + terms.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Guides & glossaire</h2>
          <ul className="mt-3 space-y-2">
            {guides.map((g) => (
              <li key={g.slug}><Link className="text-accent-2 underline underline-offset-2" href={`/scene/guides/${g.slug}`}>{g.title}</Link></li>
            ))}
            {terms.map((t) => (
              <li key={t.slug}><Link className="text-accent-2 underline underline-offset-2" href={`/scene/glossaire#${t.slug}`}>{t.term}</Link> <span className="text-sm text-muted">— {t.short}</span></li>
            ))}
          </ul>
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Actualités</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => <NewsCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
