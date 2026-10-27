import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBar } from "@/components/layout/SearchBar";
import { SearchResults } from "@/components/layout/SearchResults";
import { getGlossary, getGuides } from "@/lib/content";
import { getArticles } from "@/lib/news";

export const metadata: Metadata = { title: "Recherche" };

// Site statique : l'index est embarqué dans la page et la recherche se fait côté navigateur.
export default async function SearchPage() {
  const articles = (await getArticles()).map((a) => ({ ...a, content: "" }));
  const guides = getGuides().map(({ slug, title, description, tags }) => ({ slug, title, description, tags }));
  const terms = getGlossary().map(({ slug, term, short }) => ({ slug, term, short }));

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white">Recherche</h1>
      <SearchBar className="mt-6 max-w-xl md:hidden" />
      <Suspense>
        <SearchResults articles={articles} guides={guides} terms={terms} />
      </Suspense>
    </div>
  );
}
