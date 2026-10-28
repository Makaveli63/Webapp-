"use client";

import { CalendarDays, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CalendarGame, Release } from "@/types";
import { CalendarSection } from "./CalendarSection";
import { PinnedReleaseGrid } from "./PinnedReleaseGrid";

/** Consoles proposées dans le filtre des sorties (plusieurs choix possibles). */
const CONSOLES = [
  { id: "ps5", label: "PS5", re: /^PS5$/ },
  { id: "ps4", label: "PS4", re: /^PS4$/ },
  { id: "xbox", label: "Xbox", re: /^Xbox/ },
  { id: "switch2", label: "Switch 2", re: /^Switch 2$/ },
  { id: "switch", label: "Switch", re: /^Switch$/ },
  { id: "pc", label: "PC", re: /^PC$/ },
  { id: "mobile", label: "Mobile", re: /^(Mobile|iOS|Android)$/ },
] as const;
type ConsoleId = (typeof CONSOLES)[number]["id"];
const KEY = "gb-sorties-consoles";

const matches = (platforms: readonly string[], chosen: ConsoleId[]) =>
  !chosen.length || platforms.includes("Multi") || CONSOLES.some((c) => chosen.includes(c.id) && platforms.some((p) => c.re.test(p)));

interface Props {
  releases: (Release & { at: string })[];
  week: CalendarGame[];
  month: CalendarGame[];
  nextMonth: CalendarGame[];
  today: string;
  monthTitle: string;
  nextTitle: string;
}

/** Page Sorties : « Mon calendrier », filtre des consoles (retenu sur l'appareil), puis les sorties filtrées. */
export function ReleasesBoard({ releases, week, month, nextMonth, today, monthTitle, nextTitle }: Props) {
  const [chosen, setChosen] = useState<ConsoleId[]>([]);
  // Choix retenu : lu après l'affichage (la page publiée montre toutes les consoles).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
      setChosen(CONSOLES.map((c) => c.id).filter((id) => saved.includes(id)));
    } catch {
      /* rien de retenu */
    }
  }, []);
  const toggle = (id: ConsoleId | null) => {
    const next = id === null ? [] : chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id];
    setChosen(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible : le filtre dure le temps de la visite */
    }
  };

  const f = useMemo(
    () => ({
      releases: releases.filter((r) => matches(r.platforms, chosen)),
      week: week.filter((g) => matches(g.platforms, chosen)),
      month: month.filter((g) => matches(g.platforms, chosen)),
      nextMonth: nextMonth.filter((g) => matches(g.platforms, chosen)),
    }),
    [releases, week, month, nextMonth, chosen],
  );
  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition-colors ${on ? "bg-accent text-white ring-accent" : "glass-pill text-heading ring-border"}`;

  return (
    <>
      <div className="-mt-6 flex flex-wrap items-center gap-2">
        <Link href="/mon-calendrier" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white">
          <CalendarDays className="size-4" aria-hidden /> Mon calendrier
        </Link>
        <div role="group" aria-label="Consoles affichées" className="scroll-row -mr-4 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:pr-0">
          <SlidersHorizontal className="ml-1 size-4 shrink-0 text-muted" aria-hidden />
          <button type="button" aria-pressed={!chosen.length} onClick={() => toggle(null)} className={chip(!chosen.length)}>
            Toutes
          </button>
          {CONSOLES.map((c) => (
            <button key={c.id} type="button" aria-pressed={chosen.includes(c.id)} onClick={() => toggle(c.id)} className={chip(chosen.includes(c.id))}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {f.releases.length > 0 && (
        <section aria-labelledby="big-title">
          <h2 id="big-title" className="text-xl font-bold text-heading">Les plus attendus</h2>
          <PinnedReleaseGrid releases={f.releases} className="scroll-row -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3" />
        </section>
      )}

      <CalendarSection id="week-title" title="Cette semaine" games={f.week} today={today} showEmpty />
      <CalendarSection id="month-title" title={monthTitle} games={f.month} today={today} />
      <CalendarSection id="next-title" title={nextTitle} games={f.nextMonth} today={today} />
    </>
  );
}
