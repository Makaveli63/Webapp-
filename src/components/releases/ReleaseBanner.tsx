import { Hourglass } from "lucide-react";
import Link from "next/link";
import { Countdown } from "@/components/ui/Countdown";
import { formatDate } from "@/lib/format";
import { getUpcomingReleases } from "@/lib/releases";

/** Bandeau en tête de toutes les pages : compte à rebours de la prochaine grosse sortie. */
export function ReleaseBanner() {
  const [next, ...others] = getUpcomingReleases();
  if (!next) return null;
  return (
    <Link
      href="/sorties"
      className="block border-b border-border bg-gradient-to-r from-accent/15 via-accent/5 to-transparent hover:from-accent/25"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm">
        <Hourglass className="size-4 shrink-0 text-accent" aria-hidden />
        {/* Le nom peut être tronqué, jamais le compte à rebours. */}
        <span className="min-w-0 truncate font-semibold text-heading">{next.short ?? next.title}</span>
        <span className="shrink-0 font-semibold text-accent">
          <Countdown target={next.at} fallback={`le ${formatDate(next.at)}`} doneLabel="disponible !" />
        </span>
        {others.length > 0 && (
          <span className="ml-auto shrink-0 text-xs text-muted">
            +{others.length} <span className="hidden sm:inline">autres sorties</span>
          </span>
        )}
      </div>
    </Link>
  );
}
