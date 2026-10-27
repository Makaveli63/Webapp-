"use client";

import { Bookmark } from "lucide-react";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import type { Article } from "@/types";

/** Bouton « favori » (signet) : enregistre l'article sur l'appareil. */
export function FavoriteButton({ article, withLabel = false, className = "" }: { article: Article; withLabel?: boolean; className?: string }) {
  const favorites = useFavorites();
  const saved = !!favorites?.some((f) => f.slug === article.slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(article);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
      title={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${saved ? "text-accent" : "text-muted hover:text-fg"} ${className}`}
    >
      <Bookmark className="size-5" fill={saved ? "currentColor" : "none"} aria-hidden />
      {withLabel && <span className="text-sm font-medium">{saved ? "Enregistré" : "Favori"}</span>}
    </button>
  );
}
