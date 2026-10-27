import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { trendingGames } from "@/lib/games";

/** 🔥 Les jeux dont on parle le plus cette semaine (bandeau défilant sur mobile). */
export async function TrendingStrip() {
  const trending = await trendingGames(8);
  if (!trending.length) return null;
  return (
    <section aria-labelledby="trend-home">
      <div className="flex items-end justify-between gap-4">
        <h2 id="trend-home" className="text-xl font-bold text-heading sm:text-2xl">🔥 Tendances</h2>
        <Link href="/classement" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
          Classement <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ol className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {trending.map((g, i) => (
          <li key={g.slug} className="shrink-0">
            <Link href={`/jeux/${g.slug}`} className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm hover:underline">
              <span className="font-black text-accent">#{i + 1}</span>
              <span className="font-semibold text-heading">{g.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
