import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getCalendar, groupCalendar } from "@/lib/calendar";
import { CalendarCard } from "./CalendarCard";

/** Accueil : les sorties de la semaine (ou, à défaut, les prochaines du mois). */
export function WeekReleasesTeaser() {
  const { week, month, today } = groupCalendar(getCalendar().games);
  const games = (week.length ? week : month).slice(0, 8);
  if (!games.length) return null;
  return (
    <section aria-labelledby="week-teaser">
      <div className="flex items-end justify-between gap-4">
        <h2 id="week-teaser" className="text-xl font-bold text-heading">
          {week.length ? "Les sorties de la semaine" : "Les prochaines sorties"}
        </h2>
        <Link href="/sorties" className="flex shrink-0 items-center gap-1 py-1 text-sm text-muted hover:text-fg">
          Calendrier <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="scroll-row -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0">
        {games.map((g) => (
          <div key={g.id} className="w-[44%] shrink-0 sm:w-auto">
            <CalendarCard game={g} isToday={g.date === today} />
          </div>
        ))}
      </div>
    </section>
  );
}
