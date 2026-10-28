"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";
const CHOICES: { id: Choice; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "Automatique", icon: Monitor },
  { id: "light", label: "Clair", icon: Sun },
  { id: "dark", label: "Sombre", icon: Moon },
];

// Couleurs du style Capsule (pastille : teinte en mode sombre).
const TINTS: { id: string; label: string; color: string }[] = [
  { id: "gamingbase", label: "Violet GamingBase", color: "#7c5cff" },
  { id: "rose", label: "Rose", color: "#fa2d48" },
  { id: "rouge", label: "Rouge", color: "#ff453a" },
  { id: "orange", label: "Orange", color: "#ff9f0a" },
  { id: "vert", label: "Vert", color: "#30d158" },
  { id: "turquoise", label: "Turquoise", color: "#40c8e0" },
  { id: "bleu", label: "Bleu", color: "#0a84ff" },
  { id: "indigo", label: "Indigo", color: "#5e5ce6" },
  { id: "violet", label: "Violet", color: "#bf5af2" },
];
const GLASS: { id: string; label: string; hint: string }[] = [
  { id: "opaque", label: "Opaque", hint: "Cartes pleines" },
  { id: "verre", label: "Verre", hint: "Légère transparence" },
  { id: "cristal", label: "Cristal", hint: "Très transparent" },
];

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event("gb-theme-change"));
};

/** Choix du style et du thème (appliqués par public/theme.js), dans les réglages. */
export function ThemePicker() {
  const [choice, setChoice] = useState<Choice>("system");
  const [tint, setTint] = useState("gamingbase");
  const [glass, setGlass] = useState("verre");
  useEffect(() => {
    setTint(document.documentElement.getAttribute("data-tint") ?? "gamingbase");
    setGlass(document.documentElement.getAttribute("data-glass") ?? "verre");
    setChoice((document.documentElement.getAttribute("data-theme-choice") as Choice) || "system");
  }, []);

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
          <Palette className="size-5 text-accent" aria-hidden /> Apparence
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-heading">Couleur</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {TINTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTint(t.id);
                    save("gb-tint", t.id);
                  }}
                  aria-pressed={tint === t.id}
                  aria-label={t.label}
                  title={t.label}
                  className={`flex size-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-bg ${tint === t.id ? "ring-2 ring-heading" : ""}`}
                  ref={(el) => el?.style.setProperty("background-color", t.color)}
                >
                  {tint === t.id && <Check className="size-4" aria-hidden />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-heading">Transparence</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {GLASS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGlass(g.id);
                    save("gb-glass", g.id);
                  }}
                  aria-pressed={glass === g.id}
                  className={`rounded-2xl px-2 py-2.5 text-center ring-1 ring-inset ${glass === g.id ? "ring-2 ring-accent" : "ring-border"}`}
                >
                  <span className="block text-sm font-semibold text-heading">{g.label}</span>
                  <span className="block text-[11px] text-muted">{g.hint}</span>
                </button>
              ))}
            </div>
          </div>
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
