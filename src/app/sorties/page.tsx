import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarSection } from "@/components/releases/CalendarSection";
import { PinnedReleaseGrid } from "@/components/releases/PinnedReleaseGrid";
import { getCalendar, groupCalendar } from "@/lib/calendar";
import { getUpcomingReleases } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Sorties jeux vidéo de la semaine et du mois",
  description: "Le calendrier des sorties de jeux : cette semaine, ce mois-ci, le mois prochain, et le compte à rebours des plus attendus.",
};

const monthName = (ymd: string, offset = 0) => {
  const d = new Date(`${ymd.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(d);
};

export default function ReleasesPage() {
  const releases = getUpcomingReleases();
  const calendar = getCalendar();
  const { week, month, nextMonth, today } = groupCalendar(calendar.games);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Sorties jeux vidéo</h1>
        <p className="mt-2 text-muted">Ce qui sort cette semaine, ce mois-ci, et le compte à rebours des jeux les plus attendus.</p>
        <Link href="/mon-calendrier" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white">
          <CalendarDays className="size-4" aria-hidden /> Mon calendrier
        </Link>
      </header>

      {releases.length > 0 && (
        <section aria-labelledby="big-title">
          <h2 id="big-title" className="text-xl font-bold text-heading">Les plus attendus</h2>
          <PinnedReleaseGrid releases={releases} className="scroll-row -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3" />
        </section>
      )}

      <CalendarSection id="week-title" title="Cette semaine" games={week} today={today} showEmpty />
      <CalendarSection id="month-title" title={`Plus tard en ${monthName(today)}`} games={month} today={today} />
      <CalendarSection id="next-title" title={`En ${monthName(today, 1)}`} games={nextMonth} today={today} />

      <p className="text-xs text-muted">
        {calendar.source === "RAWG"
          ? "Calendrier et visuels : RAWG (rawg.io) et boutique Steam."
          : calendar.source === "Steam"
            ? "Calendrier et visuels : boutique Steam (sorties PC)."
            : "Calendrier momentanément indisponible."}{" "}
        Dates susceptibles d&apos;évoluer : vérifiez auprès des éditeurs.
      </p>
    </div>
  );
}
