"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { setSpoilerShield, spoilerShield } from "@/lib/spoilers";

/** Réglage du bouclier anti-spoiler (activé par défaut). */
export function SpoilerToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(spoilerShield()), []);
  const toggle = () => {
    setOn(!on);
    setSpoilerShield(!on);
  };
  return (
    <section className="glass flex items-center gap-3 rounded-xl p-4">
      <EyeOff className={`size-5 shrink-0 ${on ? "text-accent" : "text-muted"}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-heading">Bouclier anti-spoiler</h2>
        <p className="text-sm text-muted">Floute les actus qui parlent d&apos;épisodes que tu n&apos;as pas encore cochés dans tes animes.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Bouclier anti-spoiler"
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? "bg-accent" : "bg-surface-2 ring-1 ring-inset ring-border"}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </section>
  );
}
