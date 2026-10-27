import type { Metadata } from "next";
import { CategoryPage } from "@/components/news/CategoryPage";
import { getArticlesByCategory } from "@/lib/news";

export const metadata: Metadata = { title: "Consoles & matériel" };

export default async function ConsolesPage() {
  return (
    <CategoryPage
      title="Consoles & matériel"
      description="Nouvelles consoles, mises à jour système, manettes et accessoires."
      articles={await getArticlesByCategory("Console")}
    />
  );
}
