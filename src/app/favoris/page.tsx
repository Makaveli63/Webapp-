import type { Metadata } from "next";
import { FavoritesList } from "@/components/news/FavoritesList";

export const metadata: Metadata = { title: "Mes favoris" };

export default function FavoritesPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Mes favoris</h1>
      <p className="mt-2 text-muted">Les articles que vous avez enregistrés, conservés sur cet appareil.</p>
      <FavoritesList />
    </div>
  );
}
