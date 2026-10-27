"use client";

import { useSearchParams } from "next/navigation";
import { NewsCard } from "@/components/news/NewsCard";
import type { Article } from "@/types";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function SearchResults({ articles }: { articles: Article[] }) {
  const q = (useSearchParams().get("q") ?? "").trim();
  const needle = normalize(q);
  const found = needle
    ? articles.filter((a) =>
        [a.title, a.excerpt, a.source.name, ...a.tags, ...a.platforms].some((f) => normalize(f).includes(needle)),
      )
    : [];

  return (
    <>
      <p className="mt-4 text-muted">
        {q
          ? `${found.length} résultat${found.length > 1 ? "s" : ""} pour « ${q} »`
          : "Recherchez un jeu, une console, un éditeur…"}
      </p>
      {found.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {found.slice(0, 60).map((a) => (
            <NewsCard key={a.slug} article={a} />
          ))}
        </div>
      )}
    </>
  );
}
