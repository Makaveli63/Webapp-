import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBar } from "@/components/layout/SearchBar";
import { SearchResults } from "@/components/layout/SearchResults";

export const metadata: Metadata = { title: "Recherche" };

// Site statique : l'index (/recherche-index.json) est téléchargé par le navigateur, puis filtré localement.
export default function SearchPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Recherche</h1>
      <SearchBar className="mt-5 max-w-xl lg:hidden" autoFocus live />
      <Suspense>
        <SearchResults />
      </Suspense>
    </div>
  );
}
