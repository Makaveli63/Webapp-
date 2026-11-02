import type { Metadata } from "next";
import { CategoryPage } from "@/components/news/CategoryPage";
import { getArticlesByCategory } from "@/lib/news";

export const metadata: Metadata = {
  title: "TCG : jeux de cartes à collectionner",
  description: "L'actualité des jeux de cartes à collectionner en français : Pokémon, Magic, Yu-Gi-Oh!, Lorcana, One Piece…",
};

export default async function TcgPage() {
  return (
    <CategoryPage
      title="TCG"
      description="Les jeux de cartes à collectionner : nouvelles extensions, tournois et annonces (Pokémon, Magic, Yu-Gi-Oh!, Lorcana, One Piece…)."
      articles={await getArticlesByCategory("TCG")}
    />
  );
}
