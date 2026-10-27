"use client";

import { Hourglass, Pin } from "lucide-react";
import { Countdown } from "@/components/ui/Countdown";
import { pinnedFirst, usePins } from "@/lib/pins";
import type { Release } from "@/types";

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

/** Contenu du bandeau : le jeu épinglé en priorité, sinon la prochaine grosse sortie. */
export function ReleaseBannerContent({ releases }: { releases: (Release & { at: string })[] }) {
  const pins = usePins();
  const [next] = pinnedFirst(releases, pins);
  const pinned = !!pins?.includes(next.id);
  const Icon = pinned ? Pin : Hourglass;
  return (
    <>
      <Icon className="size-4 shrink-0 text-accent" fill={pinned ? "currentColor" : "none"} aria-hidden />
      {/* Le nom peut être tronqué, jamais le compte à rebours. */}
      <span className="min-w-0 truncate font-semibold text-heading">{next.short ?? next.title}</span>
      <span className="shrink-0 font-semibold text-accent">
        <Countdown target={next.at} fallback={`le ${dateLabel(next.at)}`} doneLabel="disponible !" />
      </span>
      {releases.length > 1 && (
        <span className="ml-auto shrink-0 text-xs text-muted">
          +{releases.length - 1} <span className="hidden sm:inline">autres sorties</span>
        </span>
      )}
    </>
  );
}
