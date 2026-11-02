import type { Metadata } from "next";
import { CategoryPage } from "@/components/news/CategoryPage";
import { getArticlesByCategory } from "@/lib/news";

export const metadata: Metadata = {
  title: "Comics : l'actu DC, Marvel et BD",
  description: "L'actualité DC, Marvel et comics en français : films, séries, sorties BD et jeux tirés des comics.",
};

export default async function ComicsPage() {
  return (
    <CategoryPage
      title="Comics"
      description="L'actu DC, Marvel et comics : films, séries, sorties et jeux, résumée et classée à part de l'actu jeu vidéo."
      articles={await getArticlesByCategory("Comics")}
    />
  );
}
