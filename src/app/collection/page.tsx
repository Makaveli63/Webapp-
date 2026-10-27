import type { Metadata } from "next";
import { CollectionView } from "@/components/collection/CollectionView";
import { getDeals } from "@/lib/deals";

export const metadata: Metadata = { title: "Ma collection" };

export default function CollectionPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Ma collection</h1>
      <p className="mt-2 text-muted">
        Les jeux que tu possèdes et ceux que tu veux, ton avancement dans tes jeux et tes épisodes d&apos;anime, avec les promos et les actus. Conservé sur cet appareil (synchronisable dans Mes
        favoris).
      </p>
      <CollectionView deals={getDeals().steam} />
    </div>
  );
}
