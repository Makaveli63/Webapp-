import type { Metadata } from "next";
import { LibraryShortcut } from "@/components/tracker/LibraryShortcut";
import { FavoritesList } from "@/components/news/FavoritesList";
import { PinnedReleaseGrid } from "@/components/releases/PinnedReleaseGrid";
import { getUpcomingReleases } from "@/lib/releases";

export const metadata: Metadata = { title: "Mon espace" };

export default function FavoritesPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Mon espace</h1>
        <p className="mt-2 text-muted">Ta bibliothèque de jeux et d&apos;animes, tes jeux épinglés, et tes articles enregistrés. Les réglages sont dans la roue dentée en haut à droite.</p>
      </header>
      <LibraryShortcut />
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
