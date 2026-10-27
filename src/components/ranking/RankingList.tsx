"use client";

import Link from "next/link";
import { useState } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { scoreTier } from "@/components/ui/ScoreBadge";
import { themeFor } from "@/lib/themes";

interface Item {
  slug: string;
  title: string;
  image?: string;
  platforms: string[];
  average: number;
  tests: number;
  month: string;
}

const fmt = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")}/20`;
const monthLabel = (m: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
const PLATFORMS = ["Toutes", "PS5", "Switch 2", "Xbox", "PC"];

/** Classement filtrable par plateforme et par mois. */
export function RankingList({ items }: { items: Item[] }) {
  const [platform, setPlatform] = useState("Toutes");
  const months = [...new Set(items.map((i) => i.month))].sort().reverse();
  const [month, setMonth] = useState("tout");
  const shown = items.filter((i) => (platform === "Toutes" || i.platforms.includes(platform)) && (month === "tout" || i.month === month));
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset ${active ? "bg-accent text-white ring-accent" : "glass-pill text-muted ring-border hover:text-fg"}`;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button key={p} type="button" aria-pressed={platform === p} onClick={() => setPlatform(p)} className={chip(platform === p)}>
            {p}
          </button>
        ))}
      </div>
      {months.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={month === "tout"} onClick={() => setMonth("tout")} className={chip(month === "tout")}>
            Tous les mois
          </button>
          {months.slice(0, 6).map((m) => (
            <button key={m} type="button" aria-pressed={month === m} onClick={() => setMonth(m)} className={`${chip(month === m)} capitalize`}>
              {monthLabel(m)}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-muted">Aucun jeu testé pour ce choix.</p>
      ) : (
        <ol className="space-y-2">
          {shown.slice(0, 50).map((g, i) => (
            <li key={g.slug}>
              <Link href={`/jeux/${g.slug}`} className="glass flex items-center gap-3 rounded-xl p-2.5 pr-4 hover:border-accent/60">
                <span className={`w-8 shrink-0 text-center text-lg font-black tabular-nums ${i < 3 ? "text-accent" : "text-muted"}`}>
                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                </span>
                <div className="aspect-[16/9] w-20 shrink-0 overflow-hidden rounded-lg sm:w-28">
                  <RemoteImage src={g.image} alt="" theme={themeFor(g.title)} seed={g.slug} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-heading">{g.title}</p>
                  <p className="truncate text-xs text-muted">
                    {g.platforms.join(" · ")} · {g.tests} test{g.tests > 1 ? "s" : ""}
                  </p>
                </div>
                <span className={`score-glass score-solid shrink-0 rounded-xl px-2.5 py-1 text-sm font-black ${scoreTier(fmt(g.average)).className}`}>
                  {fmt(g.average)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
