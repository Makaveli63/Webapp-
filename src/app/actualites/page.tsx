import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsList } from "@/components/news/NewsList";
import { getArticles } from "@/lib/news";

export const metadata: Metadata = { title: "Actualités jeux vidéo" };

export default async function NewsPage() {
  const articles = await getArticles();

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white">Actualités jeux vidéo</h1>
      <p className="mt-2 text-muted">
        {articles.length} articles agrégés depuis la presse jeu vidéo francophone. Filtrez instantanément par
        plateforme ou par tag.
      </p>
      <div className="mt-8">
        <Suspense>
          <NewsList articles={articles} />
        </Suspense>
      </div>
    </div>
  );
}
