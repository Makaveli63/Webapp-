import { Suspense, type ReactNode } from "react";
import type { Article } from "@/types";
import { NewsList } from "./NewsList";

interface Props {
  title: string;
  description: string;
  articles: Article[];
  showCategories?: boolean;
  /** Bloc affiché avant la liste (ex. comparateur de notes) */
  before?: ReactNode;
}

export function CategoryPage({ title, description, articles, showCategories, before }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <div className="mt-6 sm:mt-8">
        {before}
        <Suspense>
          <NewsList articles={articles} showCategories={showCategories} />
        </Suspense>
      </div>
    </div>
  );
}
