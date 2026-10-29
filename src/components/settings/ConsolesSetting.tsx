"use client";

import { Gamepad2 } from "lucide-react";
import { CONSOLE_CHOICES, useMyConsoles, writeConsoles } from "@/lib/consoles";

/** Réglages : « Mes consoles », le filtre des actus de l'accueil, d'Actus, de Tests et de Consoles. */
export function ConsolesSetting() {
  const mine = useMyConsoles();
  const chip = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset transition-colors ${on ? "bg-accent text-white ring-accent" : "glass-pill text-muted ring-border hover:text-fg"}`;
  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Gamepad2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <h2 className="font-semibold text-heading">Mes consoles</h2>
          <p className="text-sm text-muted">Seules les actus de tes consoles s&apos;affichent (les actus multiplateformes et l&apos;anime restent). Aucune choisie = tout.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Mes consoles">
        <button type="button" onClick={() => writeConsoles([])} aria-pressed={!mine.length} className={chip(!mine.length)}>
          Toutes
        </button>
        {CONSOLE_CHOICES.map((c) => {
          const on = mine.includes(c);
          return (
            <button key={c} type="button" aria-pressed={on} onClick={() => writeConsoles(on ? mine.filter((x) => x !== c) : [...mine, c])} className={chip(on)}>
              {c}
            </button>
          );
        })}
      </div>
    </section>
  );
}
