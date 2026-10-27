"use client";

import { Pin } from "lucide-react";
import { togglePin, usePins } from "@/lib/pins";

/** Épingle un compte à rebours : il passe en tête des listes et dans le bandeau. */
export function PinButton({ id, title, className = "" }: { id: string; title: string; className?: string }) {
  const pins = usePins();
  const pinned = !!pins?.includes(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(id);
      }}
      aria-pressed={pinned}
      aria-label={pinned ? `Désépingler ${title}` : `Épingler ${title}`}
      title={pinned ? "Désépingler" : "Épingler en tête"}
      className={`inline-flex size-9 items-center justify-center rounded-full backdrop-blur transition-colors ${pinned ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-black/75"} ${className}`}
    >
      <Pin className={`size-4 ${pinned ? "" : "rotate-45"}`} fill={pinned ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
