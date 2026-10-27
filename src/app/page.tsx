import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { NewsCard } from "@/components/news/NewsCard";
import { StatusWidget } from "@/components/scene/StatusWidget";
import { getGuides } from "@/lib/content";
import { getArticles } from "@/lib/news";

export const revalidate = 900;

export default async function HomePage() {
  const articles = (await getArticles()).slice(0, 6);
  const guides = getGuides().slice(0, 3);

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          L&apos;actu jeu vidéo, <span className="text-accent">sans bruit</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Les dernières news multi-plateformes et un suivi pédagogique de la scène homebrew PS5 et Switch 2.
        </p>
      </section>

      <StatusWidget />

      <section aria-labelledby="news-title">
        <div className="flex items-end justify-between">
          <h2 id="news-title" className="text-xl font-bold text-white">Dernières actualités</h2>
          <Link href="/actualites" className="flex items-center gap-1 text-sm text-muted hover:text-fg">
            Tout voir <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <NewsCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      <section aria-labelledby="guides-title">
        <h2 id="guides-title" className="text-xl font-bold text-white">Comprendre la scène</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/scene/guides/${g.slug}`} className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 hover:border-accent/60">
                <BookOpen className="size-5 text-accent-2" aria-hidden />
                <p className="mt-3 font-semibold text-white">{g.title}</p>
                <p className="mt-1 text-sm text-muted">{g.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
