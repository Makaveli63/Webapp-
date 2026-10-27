"use client";

import { useEffect, useState } from "react";

type Parts = { d: number; h: number; m: number; done: boolean };

function parts(target: number): Parts {
  const min = Math.max(0, Math.floor((target - Date.now()) / 60_000));
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60, done: target <= Date.now() };
}

/** Espaces insécables : « 2 j 8 h » ne doit jamais être coupé en fin de ligne. */
const nb = (s: string) => s.replace(/ /g, " ");

function text({ d, h, m }: Parts): string {
  return nb(d > 0 ? `dans ${d} j ${h} h` : h > 0 ? `dans ${h} h ${m} min` : `dans ${m} min`);
}

interface Props {
  target: string;
  /** Texte rendu au build, avant le calcul côté navigateur */
  fallback: string;
  doneLabel?: string;
  variant?: "text" | "blocks";
}

/** Compte à rebours mis à jour chaque minute. */
export function Countdown({ target, fallback, doneLabel = "c'est maintenant !", variant = "text" }: Props) {
  const [value, setValue] = useState<Parts | null>(null);
  useEffect(() => {
    const t = Date.parse(target);
    const tick = () => setValue(parts(t));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (!value) return <span>{fallback}</span>;
  if (value.done) return <span>{doneLabel}</span>;
  if (variant === "text") return <span>{text(value)}</span>;

  return (
    <span className="flex gap-2" role="timer" aria-label={text(value)}>
      {(
        [
          [value.d, "jours"],
          [value.h, "heures"],
          [value.m, "min"],
        ] as const
      ).map(([n, unit]) => (
        <span key={unit} className="flex min-w-14 flex-col items-center rounded-lg bg-surface-2 px-2 py-1.5">
          <span className="text-xl font-extrabold tabular-nums text-heading sm:text-2xl">{n}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted">{unit}</span>
        </span>
      ))}
    </span>
  );
}
