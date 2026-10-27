import type { Metadata } from "next";
import Link from "next/link";
import { RankingList } from "@/components/ranking/RankingList";
import { rankedGames, trendingGames } from "@/lib/games";

export const metadata: Metadata = {
  title: "Classement et tendances",
  description: "Les jeux les mieux notés par la presse et ceux dont tout le monde parle cette semaine.",
};

export default async function RankingPage() {
  const [ranked, trending] = await Promise.all([rankedGames(), trendingGames(10)]);
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Classement</h1>
        <p className="mt-2 text-muted">Les meilleurs jeux selon la moyenne des notes de la presse (ramenées sur 20), et les tendances de la semaine.</p>
      </header>

      {trending.length > 0 && (
        <section aria-labelledby="trend-title">
          <h2 id="trend-title" className="text-xl font-bold text-heading">🔥 Tendances de la semaine</h2>
          <p className="mt-1 text-sm text-muted">Les jeux les plus cités dans l&apos;actu ces 7 derniers jours.</p>
          <ol className="mt-3 flex flex-wrap gap-2">
            {trending.map((g, i) => (
              <li key={g.slug}>
                <Link href={`/jeux/${g.slug}`} className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm hover:underline">
                  <span className="font-black text-accent">#{i + 1}</span>
                  <span className="font-semibold text-heading">{g.title}</span>
                  <span className="text-xs text-muted">{g.mentions} article{g.mentions > 1 ? "s" : ""}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="rank-title">
        <h2 id="rank-title" className="text-xl font-bold text-heading">🏆 Les mieux notés</h2>
        {ranked.length ? <RankingList items={ranked} /> : <p className="mt-2 text-muted">Pas encore assez de tests notés.</p>}
      </section>
    </div>
  );
}
