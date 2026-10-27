import type { Metadata } from "next";
import { CollectionView } from "@/components/collection/CollectionView";
import { getDeals } from "@/lib/deals";

export const metadata: Metadata = { title: "Ma bibliothèque" };

export default function CollectionPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Ma bibliothèque</h1>
      <p className="mt-2 text-muted">
        Tes jeux et tes animes : ton avancement, tes heures de jeu et de visionnage, les jeux que tu possèdes et ceux que tu veux, avec
        leurs promos et leurs actus. Conservé sur cet appareil (synchronisable dans Mes
        favoris).
      </p>
      <CollectionView deals={getDeals().steam} />
    </div>
  );
}
