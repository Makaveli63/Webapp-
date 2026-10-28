import type { Metadata } from "next";
import { ReleasesBoard } from "@/components/releases/ReleasesBoard";
import { getCalendar, groupCalendar } from "@/lib/calendar";
import { getAnnouncedReleases, getUpcomingReleases } from "@/lib/releases";

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
      </header>

      <ReleasesBoard
        releases={releases}
        announced={getAnnouncedReleases()}
        week={week}
        month={month}
        nextMonth={nextMonth}
        today={today}
        monthTitle={`Plus tard en ${monthName(today)}`}
        nextTitle={`En ${monthName(today, 1)}`}
      />

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
