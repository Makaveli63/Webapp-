import type { Metadata } from "next";
import { CategoryPage } from "@/components/news/CategoryPage";
import { getArticlesByCategory } from "@/lib/news";

export const metadata: Metadata = { title: "Tests de jeux vidéo" };

export default async function TestsPage() {
  return (
    <CategoryPage
      title="Tests"
      description="Les derniers tests et critiques de jeux, résumés avec le verdict de la presse."
      articles={await getArticlesByCategory("Test")}
    />
  );
}
