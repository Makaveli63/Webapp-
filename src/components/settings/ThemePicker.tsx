"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";
const CHOICES: { id: Choice; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "Automatique", icon: Monitor },
  { id: "light", label: "Clair", icon: Sun },
  { id: "dark", label: "Sombre", icon: Moon },
];

/** Choix du thème (appliqué par public/theme.js), dans les réglages. */
export function ThemePicker() {
  const [choice, setChoice] = useState<Choice>("system");
  useEffect(() => setChoice((document.documentElement.getAttribute("data-theme-choice") as Choice) || "system"), []);

  const choose = (next: Choice) => {
    try {
      localStorage.setItem("gb-theme", next);
    } catch {
      /* stockage indisponible */
    }
    setChoice(next);
    window.dispatchEvent(new Event("gb-theme-change"));
  };

  return (
    <section aria-labelledby="theme-title" className="glass rounded-xl p-4 sm:p-5">
      <h2 id="theme-title" className="flex items-center gap-2 font-semibold text-heading">
        <Sun className="size-5 text-accent" aria-hidden /> Thème
      </h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {CHOICES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            aria-pressed={choice === id}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm ring-1 ring-inset ${choice === id ? "text-heading ring-2 ring-accent" : "text-fg ring-border"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
            {choice === id && <Check className="size-4 text-accent" aria-hidden />}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Automatique : suit le réglage clair / sombre de ton appareil.</p>
    </section>
  );
}
