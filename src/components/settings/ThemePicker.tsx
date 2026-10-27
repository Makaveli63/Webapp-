"use client";

import { Check, Monitor, Moon, Smartphone, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";
const CHOICES: { id: Choice; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "Automatique", icon: Monitor },
  { id: "light", label: "Clair", icon: Sun },
  { id: "dark", label: "Sombre", icon: Moon },
];

type Style = "gamingbase" | "ios";
const STYLES: { id: Style; label: string; hint: string; icon: typeof Sun }[] = [
  { id: "gamingbase", label: "GamingBase", hint: "Verre coloré, fond dynamique", icon: Sparkles },
  { id: "ios", label: "iOS Music", hint: "Noir profond, accent rose, barre flottante", icon: Smartphone },
];

/** Choix du style et du thème (appliqués par public/theme.js), dans les réglages. */
export function ThemePicker() {
  const [choice, setChoice] = useState<Choice>("system");
  const [style, setStyle] = useState<Style>("gamingbase");
  useEffect(() => {
    setChoice((document.documentElement.getAttribute("data-theme-choice") as Choice) || "system");
    setStyle(document.documentElement.getAttribute("data-style") === "ios" ? "ios" : "gamingbase");
  }, []);

  const chooseStyle = (next: Style) => {
    try {
      localStorage.setItem("gb-style", next);
    } catch {
      /* stockage indisponible */
    }
    setStyle(next);
    window.dispatchEvent(new Event("gb-theme-change"));
  };

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
    <>
      <section aria-labelledby="style-title" className="glass rounded-xl p-4 sm:p-5">
        <h2 id="style-title" className="flex items-center gap-2 font-semibold text-heading">
          <Smartphone className="size-5 text-accent" aria-hidden /> Style du site
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {STYLES.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseStyle(id)}
              aria-pressed={style === id}
              className={`flex items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset ${style === id ? "ring-2 ring-accent" : "ring-border"}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${id === "ios" ? "bg-gradient-to-br from-[#fa2d48] to-[#a01a2c]" : "bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee]"}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-heading">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
              {style === id && <Check className="size-5 shrink-0 text-accent" aria-hidden />}
            </button>
          ))}
        </div>
      </section>
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
    </>
  );
}
