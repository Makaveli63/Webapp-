import type { Metadata } from "next";
import { CategoryPage } from "@/components/news/CategoryPage";
import { getArticles } from "@/lib/news";

export const metadata: Metadata = { title: "Actualités jeux vidéo" };

export default async function NewsPage() {
  const articles = await getArticles();
  return (
    <CategoryPage
      title="Actualités jeux vidéo"
      description={`${articles.length} articles de la presse jeu vidéo francophone, résumés pour vous.`}
      articles={articles}
      showCategories
    />
  );
}
