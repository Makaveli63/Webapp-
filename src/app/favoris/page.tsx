import { CalendarDays, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LibraryShortcut } from "@/components/tracker/LibraryShortcut";
import { FavoritesList } from "@/components/news/FavoritesList";
import { PinnedReleaseGrid } from "@/components/releases/PinnedReleaseGrid";
import { PlayerCard } from "@/components/player/PlayerCard";
import { SuggestShortcut } from "@/components/suggestions/SuggestShortcut";
import { getUpcomingReleases } from "@/lib/releases";

export const metadata: Metadata = { title: "Mon espace" };

export default function FavoritesPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Mon espace</h1>
        <p className="mt-2 text-muted">Ton profil de joueur, ta bibliothèque de jeux et d&apos;animes, tes jeux épinglés et tes articles enregistrés. Les réglages sont dans la roue dentée en haut à droite.</p>
      </header>
      <PlayerCard />
      <div className="grid gap-3">
        <LibraryShortcut />
        <Link href="/mon-calendrier" className="glass flex items-center gap-4 rounded-2xl p-4 hover:border-accent/60">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500 text-white">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold text-heading">Mon calendrier</span>
            <span className="block text-sm text-muted">Les sorties de tes jeux et les épisodes de tes animes</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
        </Link>
        <SuggestShortcut />
      </div>
      <section aria-labelledby="pinned-title">
        <h2 id="pinned-title" className="mb-4 text-xl font-bold text-heading">Mes jeux épinglés</h2>
        <PinnedReleaseGrid releases={getUpcomingReleases()} onlyPinned className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" />
      </section>
      <section aria-labelledby="saved-title">
        <h2 id="saved-title" className="text-xl font-bold text-heading">Articles enregistrés</h2>
        <FavoritesList />
      </section>
    </div>
  );
}
