import Link from "next/link";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { scoreTier } from "@/components/ui/ScoreBadge";
import type { ScoreGroup } from "@/lib/compare";

const fmt = (n: number) => `${(Math.round(n * 10) / 10).toString().replace(".", ",")}/20`;

/** Comparateur : un même jeu, la note de chaque site, et la moyenne ramenée sur 20. */
export function ScoreCompare({ groups }: { groups: ScoreGroup[] }) {
  if (!groups.length) return null;
  return (
    <section aria-labelledby="compare-title" className="mb-8">
      <h2 id="compare-title" className="text-xl font-bold text-heading">Comparateur de notes</h2>
      <p className="mt-1 text-sm text-muted">Les jeux testés par plusieurs sites, note par note.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.slice(0, 9).map((g) => (
          <article key={g.key} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold capitalize text-heading">
                <Link href={`/jeux/${g.key.replace(/\s+/g, "-")}`} className="hover:underline">
                  {g.game}
                </Link>
              </h3>
              <span
                className={`score-glass score-solid shrink-0 rounded-xl px-2 py-1 text-sm font-black ${scoreTier(fmt(g.average)).className}`}
                title="Moyenne sur 20"
              >
                ⌀ {fmt(g.average)}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {g.tests.map((t) => (
                <li key={t.slug} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/actualites/${t.slug}`} className="truncate text-fg hover:underline">
                    {t.source.name}
                  </Link>
                  <ScoreBadge score={t.score!} className="scale-75 origin-right" />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Sur la page d'un test : les notes des autres sites pour le même jeu. */
export function OtherScores({ tests }: { tests: { slug: string; score?: string; source: { name: string } }[] }) {
  if (!tests.length) return null;
  return (
    <aside className="glass mt-6 rounded-xl p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Les autres notes</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {tests.map((t) => (
          <li key={t.slug}>
            <Link href={`/actualites/${t.slug}`} className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:underline">
              <span className="font-semibold text-heading">{t.score}</span> {t.source.name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
