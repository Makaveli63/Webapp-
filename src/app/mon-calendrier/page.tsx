import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MyCalendar, type CalendarItem } from "@/components/calendar/MyCalendar";
import { getCalendar } from "@/lib/calendar";
import { getUpcomingReleases } from "@/lib/releases";

export const metadata: Metadata = { title: "Mon calendrier" };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Toutes les dates connues ; le navigateur ne garde que ce que tu suis (🔔, 📌, Ma bibliothèque).
export default function MyCalendarPage() {
  const big: CalendarItem[] = getUpcomingReleases().map((r) => ({
    id: r.id,
    title: r.title,
    day: r.date,
    platforms: r.platforms,
    ics: `${BASE}/calendrier/${r.id}.ics`,
  }));
  const known = new Set(big.map((r) => r.title.toLowerCase()));
  // Du mois dernier à dans un an : assez pour naviguer, sans alourdir la page.
  const from = new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);
  const others: CalendarItem[] = getCalendar()
    .games.filter((g) => g.date >= from && g.date <= to && !known.has(g.title.toLowerCase()))
    .slice(0, 1500)
    .map((g) => ({ id: g.id, title: g.title, day: g.date, platforms: g.platforms.slice(0, 4) }));
  return (
    <div>
      <Link href="/favoris" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Mon espace
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">Mon calendrier</h1>
      <p className="mt-2 text-muted">Les sorties de tes jeux et les épisodes de tes animes, réunis sur un mois.</p>
      <MyCalendar releases={[...big, ...others]} />
    </div>
  );
}
