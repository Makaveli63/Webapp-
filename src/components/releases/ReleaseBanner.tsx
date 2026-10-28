import { getUpcomingReleases } from "@/lib/releases";
import { titleKey } from "@/lib/text";
import { ReleaseBannerContent } from "./ReleaseBannerContent";

const gameSlug = (title: string) => titleKey(title).replace(/\s+/g, "-").slice(0, 80);

/** Bandeau en tête de toutes les pages : compte à rebours du jeu épinglé, sinon de la prochaine grosse sortie. */
export function ReleaseBanner() {
  const releases = getUpcomingReleases().map((r) => ({ ...r, href: `/jeux/${gameSlug(r.title)}` }));
  if (!releases.length) return null;
  return (
    <div className="release-banner border-b border-border bg-gradient-to-r from-accent/15 via-accent/5 to-transparent">
      <ReleaseBannerContent releases={releases} />
    </div>
  );
}
