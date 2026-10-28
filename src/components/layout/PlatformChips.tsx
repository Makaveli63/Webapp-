"use client";

import { PLATFORM_CHIPS, type PlatformId } from "@/lib/platform-filter";

/** Rangée de pastilles : « Toutes » puis une par plateforme ; toucher la pastille active la désélectionne. */
export function PlatformChips({ value, onChange, className = "" }: { value: PlatformId | null; onChange: (id: PlatformId | null) => void; className?: string }) {
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset transition-colors ${active ? "bg-accent text-white ring-accent" : "bg-surface-2 text-heading ring-border"}`;
  return (
    <div role="group" aria-label="Plateforme" className={`scroll-row flex gap-1.5 overflow-x-auto ${className}`}>
      <button type="button" aria-pressed={!value} onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(null)} className={chip(!value)}>
        Toutes
      </button>
      {PLATFORM_CHIPS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(value === c.id ? null : c.id)}
          className={chip(value === c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
