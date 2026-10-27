import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBar } from "@/components/layout/SearchBar";
import { SearchResults } from "@/components/layout/SearchResults";
import { getArticles } from "@/lib/news";

export const metadata: Metadata = { title: "Recherche" };

// Site statique : l'index est embarqué dans la page et la recherche se fait côté navigateur.
export default async function SearchPage() {
  const articles = (await getArticles()).map((a) => ({ ...a, content: "", aiSummary: undefined }));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Recherche</h1>
      <SearchBar className="mt-5 max-w-xl md:hidden" autoFocus />
      <Suspense>
        <SearchResults articles={articles} />
      </Suspense>
    </div>
  );
}
