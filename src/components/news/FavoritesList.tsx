"use client";

import { Bookmark } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import type { Article } from "@/types";
import { NewsCard } from "./NewsCard";

export function FavoritesList() {
  const favorites = useFavorites();
  if (favorites === null) return null;
  if (!favorites.length) {
    return (
      <p className="mt-8 flex items-center gap-2 text-muted">
        <Bookmark className="size-5" aria-hidden /> Aucun favori pour l&apos;instant : touchez le signet d&apos;un article pour
        l&apos;enregistrer.
      </p>
    );
  }
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {favorites.map((f) => (
        <NewsCard key={f.slug} article={{ ...f, content: "", author: "" } as Article} />
      ))}
    </div>
  );
}
