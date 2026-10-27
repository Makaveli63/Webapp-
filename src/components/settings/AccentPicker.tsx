"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useState } from "react";

const ACCENTS = [
  { id: "violet", label: "Violet GamingBase", color: "#7c5cff" },
  { id: "playstation", label: "Bleu PlayStation", color: "#0062c4" },
  { id: "xbox", label: "Vert Xbox", color: "#107c10" },
  { id: "nintendo", label: "Rouge Nintendo", color: "#d0000f" },
];

/** Choix de la couleur d'accent du site (appliquée sans flash par public/theme.js). */
export function AccentPicker() {
  const [current, setCurrent] = useState("violet");
  useEffect(() => setCurrent(document.documentElement.getAttribute("data-accent") ?? "violet"), []);

  const choose = (id: string) => {
    setCurrent(id);
    try {
      localStorage.setItem("gb-accent", id);
    } catch {
      /* stockage indisponible */
    }
    document.documentElement.setAttribute("data-accent", id);
  };

  return (
    <section aria-labelledby="accent-title" className="glass rounded-xl p-4 sm:p-5">
      <h2 id="accent-title" className="flex items-center gap-2 font-semibold text-heading">
        <Palette className="size-5 text-accent" aria-hidden /> Couleur du site
      </h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => choose(a.id)}
            aria-pressed={current === a.id}
            aria-label={a.label}
            title={a.label}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm ring-1 ring-inset ${current === a.id ? "ring-2 ring-accent" : "ring-border"}`}
          >
            <span
              className="flex size-7 items-center justify-center rounded-full text-white"
              ref={(el) => {
                el?.style.setProperty("background-color", a.color);
              }}
            >
              {current === a.id && <Check className="size-4" aria-hidden />}
            </span>
            <span className="text-fg">{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
