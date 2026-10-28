import "server-only";
import fs from "node:fs";
import path from "node:path";
import announced from "@/data/announced.json";
import releases from "@/data/releases.json";
import { getCalendar } from "@/lib/calendar";
import { titleKey } from "@/lib/text";
import type { AnnouncedRelease, Release } from "@/types";

/** Grosses sorties ajoutées dans le tableau de bord (écrit par scripts/fetch-admin-articles.mjs). */
function adminReleases(): Release[] {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".cache", "news", "admin-releases.json"), "utf8"));
    return Array.isArray(data) ? data.filter((r) => r && typeof r.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "")) : [];
  } catch {
    return [];
  }
}

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
  const { releaseImages, releaseVideos, anticipated } = getCalendar();
  // Liste choisie (releases.json) d'abord, puis l'admin, puis les plus attendus de RAWG ; un jeu n'apparaît qu'une fois.
  const seen = new Set<string>();
  const all = [...(releases as Release[]), ...adminReleases(), ...anticipated].filter((r) => {
    const k = titleKey(r.title);
    return !seen.has(k) && seen.add(k);
  });
  return all
    .map((r) => ({ ...r, image: r.image ?? releaseImages[r.id], video: releaseVideos[r.id], at: releaseInstant(r.date) }))
    .filter((r) => Date.parse(r.at) + 86_400_000 > now.getTime())
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Jeux attendus sans date précise (« Prévu en 2028 »), absents des comptes à rebours. */
export function getAnnouncedReleases(): AnnouncedRelease[] {
  const { releaseImages } = getCalendar();
  return (announced as AnnouncedRelease[]).map((r) => ({ ...r, image: r.image ?? releaseImages[r.id] }));
}
