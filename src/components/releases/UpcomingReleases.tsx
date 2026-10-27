import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getUpcomingReleases } from "@/lib/releases";
import { PinnedReleaseGrid } from "./PinnedReleaseGrid";

/** Accueil : les prochaines grosses sorties, en carrousel horizontal sur mobile. */
export function UpcomingReleases() {
  const releases = getUpcomingReleases().slice(0, 4);
  if (!releases.length) return null;
  return (
    <section aria-labelledby="releases-title">
      <div className="flex items-end justify-between gap-4">
        <h2 id="releases-title" className="text-xl font-bold text-heading">Prochaines grosses sorties</h2>
        <Link href="/sorties" className="flex shrink-0 items-center gap-1 py-1 text-sm text-muted hover:text-fg">
          Tout voir <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <PinnedReleaseGrid releases={releases} className="scroll-row -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4" />
    </section>
  );
}
