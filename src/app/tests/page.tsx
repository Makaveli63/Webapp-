import type { Metadata } from "next";
import { CategoryPage } from "@/components/news/CategoryPage";
import { ScoreCompare } from "@/components/tests/ScoreCompare";
import { scoreGroups } from "@/lib/compare";
import { getArticlesByCategory } from "@/lib/news";

export const metadata: Metadata = { title: "Tests de jeux vidéo" };

export default async function TestsPage() {
  const tests = await getArticlesByCategory("Test");
  return (
    <CategoryPage
      title="Tests"
      description="Les derniers tests et critiques de jeux, résumés avec le verdict de la presse."
      articles={tests}
      before={<ScoreCompare groups={scoreGroups(tests)} />}
    />
  );
}
