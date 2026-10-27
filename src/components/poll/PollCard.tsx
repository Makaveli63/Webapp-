"use client";

import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { rpc, socialEnabled, voterId } from "@/lib/social";

interface Props {
  poll: { id: string; question: string; options: { id: string; label: string }[] };
}

/** Sondage de la semaine : un vote par appareil (modifiable), résultats en direct. */
export function PollCard({ poll }: Props) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    rpc<{ counts: Record<string, number>; mine: string | null }>("get_poll", { p_poll: poll.id, p_voter: voterId() })
      .then((r) => {
        setCounts(r.counts ?? {});
        setMine(r.mine);
      })
      .catch(() => setCounts({}));
  }, [poll.id]);

  useEffect(() => {
    if (socialEnabled) load();
  }, [load]);

  if (!socialEnabled || poll.options.length < 2) return null;

  const vote = async (option: string) => {
    setError("");
    setMine(option);
    try {
      await rpc("vote_poll", { p_poll: poll.id, p_option: option, p_voter: voterId() });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const total = poll.options.reduce((s, o) => s + (counts?.[o.id] ?? 0), 0);
  const showResults = !!mine;

  return (
    <section aria-labelledby="poll-title" className="glass rounded-2xl p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        <BarChart3 className="size-4" aria-hidden /> Sondage de la semaine
      </p>
      <h2 id="poll-title" className="mt-1 text-lg font-bold text-heading sm:text-xl">{poll.question}</h2>
      <ul className="mt-4 space-y-2">
        {poll.options.map((o) => {
          const n = counts?.[o.id] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const chosen = mine === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => vote(o.id)}
                aria-pressed={chosen}
                className={`poll-option relative w-full overflow-hidden rounded-xl px-4 py-2.5 text-left text-sm ring-1 ring-inset transition-colors ${chosen ? "ring-accent" : "ring-border hover:ring-accent/60"}`}
              >
                {showResults && <PollBar pct={pct} chosen={chosen} />}
                <span className="relative flex items-center justify-between gap-3">
                  <span className={`font-medium ${chosen ? "text-heading" : "text-fg"}`}>
                    {chosen && "✓ "}
                    {o.label}
                  </span>
                  {showResults && <span className="tabular-nums font-semibold text-heading">{pct} %</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">
        {showResults ? `${total} vote${total > 1 ? "s" : ""} · tu peux changer d'avis jusqu'à lundi` : "Vote pour voir les résultats."}
      </p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

/** Barre de résultat, largeur posée via CSSOM (compatible avec la CSP). */
function PollBar({ pct, chosen }: { pct: number; chosen: boolean }) {
  return (
    <span
      aria-hidden
      ref={(el) => {
        el?.style.setProperty("width", `${pct}%`);
      }}
      className={`absolute inset-y-0 left-0 transition-[width] duration-700 ${chosen ? "bg-accent/30" : "bg-accent/12"}`}
    />
  );
}
