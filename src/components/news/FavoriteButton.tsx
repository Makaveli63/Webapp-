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
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${withLabel ? "glass-pill rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-border" : ""} ${saved ? (withLabel ? "bg-accent text-white ring-accent" : "text-accent") : withLabel ? "text-heading hover:text-fg" : "text-muted hover:text-fg"} ${className}`}
    >
      <Bookmark className={withLabel ? "size-3.5" : "size-5"} fill={saved ? "currentColor" : "none"} aria-hidden />
      {withLabel && <span>{saved ? "Enregistré" : "Favori"}</span>}
    </button>
  );
}
