"use client";

import { pinnedFirst, usePins } from "@/lib/pins";
import type { Release } from "@/types";
import { ReleaseCard } from "./ReleaseCard";

/** Liste des grosses sorties, épinglées d'abord (carrousel sur mobile, grille sur ordinateur). */
export function PinnedReleaseGrid({
  releases,
  className,
  onlyPinned = false,
}: {
  releases: (Release & { at: string })[];
  className: string;
  /** N'afficher que les jeux épinglés (page Favoris) */
  onlyPinned?: boolean;
}) {
  const pins = usePins();
  const list = onlyPinned ? releases.filter((r) => pins?.includes(r.id)) : pinnedFirst(releases, pins);
  if (onlyPinned && !list.length) {
    return <p className="text-sm text-muted">Aucun jeu épinglé : touche l&apos;épingle d&apos;un compte à rebours pour le suivre ici.</p>;
  }
  return (
    <div className={className}>
      {list.map((r) => (
        <div key={r.id} className={onlyPinned ? "" : "w-[78%] shrink-0 snap-start sm:w-auto"}>
          <ReleaseCard release={r} pinned={!!pins?.includes(r.id)} />
        </div>
      ))}
    </div>
  );
}
