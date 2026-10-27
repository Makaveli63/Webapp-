import type { Metadata } from "next";
import { NewsList } from "@/components/news/NewsList";
import { getArticles } from "@/lib/news";
import { PLATFORMS, type Platform } from "@/types";

export const metadata: Metadata = { title: "Actualités jeux vidéo" };
export const revalidate = 900;

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ plateforme?: string }> }) {
  const { plateforme } = await searchParams;
  const initial = PLATFORMS.includes(plateforme as Platform) ? (plateforme as Platform) : undefined;
  const articles = await getArticles();

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white">Actualités jeux vidéo</h1>
      <p className="mt-2 text-muted">Filtrez instantanément par plateforme ou par tag.</p>
      <div className="mt-8">
        {/* key : réinitialise les filtres quand le paramètre d'URL change */}
        <NewsList key={initial ?? "all"} articles={articles} initialPlatform={initial} />
      </div>
    </div>
  );
}
