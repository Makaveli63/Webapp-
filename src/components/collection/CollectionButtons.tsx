"use client";

import { Check, Heart } from "lucide-react";
import { toggleCollection, useCollection } from "@/lib/collection";

interface Props {
  game: { id: string; title: string; image?: string };
  className?: string;
}

/** « Je l'ai » / « Je le veux » : ajoute le jeu à Ma collection. */
export function CollectionButtons({ game, className = "" }: Props) {
  const c = useCollection();
  const owned = !!c?.owned.some((g) => g.id === game.id);
  const wanted = !!c?.wanted.some((g) => g.id === game.id);
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors";
  // Au-dessus d'un éventuel lien qui couvre toute la carte.
  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  return (
    <div className={`relative z-10 flex gap-1.5 ${className}`}>
      <button
        type="button"
        aria-pressed={owned}
        onClick={(e) => stop(e, () => toggleCollection("owned", game))}
        className={`${base} ${owned ? "bg-emerald-600 text-white" : "glass-pill text-muted ring-1 ring-inset ring-border hover:text-fg"}`}
      >
        <Check className="size-3.5" aria-hidden /> Je l&apos;ai
      </button>
      <button
        type="button"
        aria-pressed={wanted}
        onClick={(e) => stop(e, () => toggleCollection("wanted", game))}
        className={`${base} ${wanted ? "bg-rose-600 text-white" : "glass-pill text-muted ring-1 ring-inset ring-border hover:text-fg"}`}
      >
        <Heart className="size-3.5" fill={wanted ? "currentColor" : "none"} aria-hidden /> Je le veux
      </button>
    </div>
  );
}
