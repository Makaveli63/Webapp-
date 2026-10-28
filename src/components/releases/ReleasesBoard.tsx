"use client";

import { CalendarDays, ExternalLink, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlatformBadge } from "@/components/ui/Badge";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { isMuted, useMuted } from "@/lib/muted";
import { themeFor } from "@/lib/themes";
import type { AnnouncedRelease, CalendarGame, Release } from "@/types";
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
  /** Jeux attendus sans date précise */
  announced: AnnouncedRelease[];
  week: CalendarGame[];
  month: CalendarGame[];
  nextMonth: CalendarGame[];
  today: string;
  monthTitle: string;
  nextTitle: string;
}

/** Page Sorties : « Mon calendrier », filtre des consoles (retenu sur l'appareil), puis les sorties filtrées. */
export function ReleasesBoard({ releases, announced, week, month, nextMonth, today, monthTitle, nextTitle }: Props) {
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

  const muted = useMuted();
  const f = useMemo(() => {
    // Consoles choisies, sans les licences « Pas intéressé ».
    const keep = <T extends { title: string; platforms: readonly string[] }>(list: T[]) => list.filter((g) => matches(g.platforms, chosen) && !isMuted(g.title, muted));
    return { releases: keep(releases), announced: keep(announced), week: keep(week), month: keep(month), nextMonth: keep(nextMonth) };
  }, [releases, announced, week, month, nextMonth, chosen, muted]);
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

      {f.announced.length > 0 && (
        <section aria-labelledby="announced-title">
          <h2 id="announced-title" className="text-xl font-bold text-heading">Annoncés, date à venir</h2>
          <p className="mt-1 text-sm text-muted">Pas encore de date précise : le compte à rebours démarrera dès qu&apos;elle sera officielle.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {f.announced.map((r) => (
              <li key={r.id} className="glass flex overflow-hidden rounded-xl">
                <RemoteImage src={r.image} alt={r.title} theme={themeFor(r.title, r.platforms)} seed={r.id} className="w-28 shrink-0 sm:w-32" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                  <p className="font-bold leading-tight text-heading">{r.title}</p>
                  <p className="text-sm font-semibold text-accent">Prévu en {r.window}</p>
                  <p className="flex flex-wrap gap-1">
                    {r.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))}
                  </p>
                  <a href={r.source} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 text-xs text-muted underline underline-offset-2 hover:text-fg">
                    Source de l&apos;annonce <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CalendarSection id="week-title" title="Cette semaine" games={f.week} today={today} showEmpty />
      <CalendarSection id="month-title" title={monthTitle} games={f.month} today={today} />
      <CalendarSection id="next-title" title={nextTitle} games={f.nextMonth} today={today} />
    </>
  );
}
