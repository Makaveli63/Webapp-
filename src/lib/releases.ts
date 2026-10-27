import "server-only";
import releases from "@/data/releases.json";
import { getCalendar } from "@/lib/calendar";
import type { Release } from "@/types";

/** Minuit (heure de Paris) le jour de la sortie, en ISO UTC. */
export function releaseInstant(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // Minuit à Paris = 23 h UTC la veille en hiver, 22 h UTC en été : on garde le candidat qui tombe à 0 h à Paris.
  for (const utcHour of [23, 22]) {
    const candidate = new Date(Date.UTC(y, m - 1, d - 1, utcHour));
    const parisHour = Number(
      new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(candidate),
    );
    if (parisHour === 0 || parisHour === 24) return candidate.toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
}

/**
 * Sorties à venir, de la plus proche à la plus lointaine.
 * Une sortie reste affichée le jour J (« Disponible ! »), puis disparaît au build suivant.
 */
export function getUpcomingReleases(now = new Date()): (Release & { at: string })[] {
  const images = getCalendar().releaseImages;
  return (releases as Release[])
    .map((r) => ({ ...r, image: r.image ?? images[r.id], at: releaseInstant(r.date) }))
    .filter((r) => Date.parse(r.at) + 86_400_000 > now.getTime())
    .sort((a, b) => a.at.localeCompare(b.at));
}
