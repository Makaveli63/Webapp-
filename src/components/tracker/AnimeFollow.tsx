"use client";

import { Clock, Heart } from "lucide-react";
import type { EpisodeInfo } from "@/components/tracker/EpisodeTracker";
import { setAnimeFlags, useTracker } from "@/lib/tracker";

/** ❤️ Favori et 🕒 À voir pour un anime (compact : icônes seules, pour les cartes). */
export function AnimeFollow({ anime, compact = false, className = "" }: { anime: EpisodeInfo; compact?: boolean; className?: string }) {
  const t = useTracker()?.anime[anime.id];
  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  const base = `relative z-10 inline-flex items-center justify-center gap-1 rounded-full text-xs font-semibold transition-colors ${compact ? "size-8" : "px-3 py-1.5"}`;
  const off = "glass-pill text-heading ring-1 ring-inset ring-border hover:text-fg";
  return (
    <span className={`inline-flex gap-1.5 ${className}`}>
      <button
        type="button"
        aria-pressed={!!t?.fav}
        aria-label={t?.fav ? "Retirer des favoris" : "Ajouter aux favoris"}
        onClick={(e) => stop(e, () => setAnimeFlags(anime, { fav: !t?.fav }))}
        className={`${base} ${t?.fav ? "bg-rose-600 text-white" : off}`}
      >
        <Heart className="size-3.5" fill={t?.fav ? "currentColor" : "none"} aria-hidden />
        {!compact && "Favori"}
      </button>
      <button
        type="button"
        aria-pressed={!!t?.later}
        aria-label={t?.later ? "Retirer de « À voir »" : "Ajouter à « À voir »"}
        onClick={(e) => stop(e, () => setAnimeFlags(anime, { later: !t?.later }))}
        className={`${base} ${t?.later ? "bg-amber-500 text-black" : off}`}
      >
        <Clock className="size-3.5" aria-hidden />
        {!compact && "À voir"}
      </button>
    </span>
  );
}
