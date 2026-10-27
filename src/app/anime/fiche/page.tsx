import type { Metadata } from "next";
import { Suspense } from "react";
import { AnimeDetail } from "@/components/anime/AnimeDetail";

export const metadata: Metadata = { title: "Fiche anime", description: "Toutes les saisons, les films, où regarder légalement et ton suivi des épisodes." };

// Site statique : la fiche est chargée par le navigateur depuis AniList (n'importe quel anime, toutes ses saisons).
export default function AnimeDetailPage() {
  return (
    <Suspense fallback={<p className="text-muted">Chargement…</p>}>
      <AnimeDetail />
    </Suspense>
  );
}
