"use client";

import { ChevronRight, LibraryBig } from "lucide-react";
import Link from "next/link";
import { formatHours } from "@/components/tracker/LibraryStats";
import { useCollection } from "@/lib/collection";
import { libraryStats, useTracker } from "@/lib/tracker";

/** Carte « Ma bibliothèque » en haut de Mon espace, avec un aperçu des stats. */
export function LibraryShortcut() {
  const t = useTracker();
  const c = useCollection();
  const s = t ? libraryStats(t) : null;
  const games = new Set([...(c?.owned ?? []).map((g) => g.title), ...Object.values(t?.games ?? {}).map((g) => g.title)]).size;
  const anime = Object.keys(t?.anime ?? {}).length;
  return (
    <Link href="/collection" className="glass flex items-center gap-4 rounded-2xl p-4 hover:border-accent/60">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
        <LibraryBig className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-heading">Ma bibliothèque</span>
        <span className="block text-sm text-muted">
          {s && (games || anime)
            ? `${games} jeu${games > 1 ? "x" : ""} · ${anime} anime${anime > 1 ? "s" : ""} · ${formatHours(s.gameHours)} de jeu · ${formatHours(s.animeMinutes / 60)} d'anime`
            : "Tes jeux, tes animes et ton temps de jeu"}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
