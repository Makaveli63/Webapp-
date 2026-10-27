import Link from "next/link";
import { getUpcomingReleases } from "@/lib/releases";
import { ReleaseBannerContent } from "./ReleaseBannerContent";

/** Bandeau en tête de toutes les pages : compte à rebours du jeu épinglé, sinon de la prochaine grosse sortie. */
export function ReleaseBanner() {
  const releases = getUpcomingReleases();
  if (!releases.length) return null;
  return (
    <Link
      href="/sorties"
      className="block border-b border-border bg-gradient-to-r from-accent/15 via-accent/5 to-transparent hover:from-accent/25"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm">
        <ReleaseBannerContent releases={releases} />
      </div>
    </Link>
  );
}
