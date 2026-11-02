"use client";

import { Volume2, Vibrate } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULTS_FEEDBACK, feedback, readFeedback, writeFeedback, type FeedbackPrefs } from "@/lib/feedback";

/** Réglages → « Sons et vibrations » des micro-interactions. */
export function FeedbackSetting() {
  const [p, setP] = useState<FeedbackPrefs>(DEFAULTS_FEEDBACK);
  useEffect(() => setP(readFeedback()), []);
  const set = (patch: Partial<FeedbackPrefs>) => {
    const next = { ...p, ...patch };
    setP(next);
    writeFeedback(next);
    if (patch.sound || patch.haptics) feedback("on"); // aperçu
  };
  const row = (Icon: typeof Volume2, title: string, hint: string, on: boolean, change: (v: boolean) => void) => (
    <div className="flex items-center gap-3">
      <Icon className={`size-5 shrink-0 ${on ? "text-accent" : "text-muted"}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-heading">{title}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        data-feedback="none"
        onClick={() => change(!on)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? "bg-accent" : "bg-surface-2 ring-1 ring-inset ring-border"}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
  return (
    <section className="glass space-y-4 rounded-xl p-4">
      <h2 className="font-semibold text-heading">Sons et vibrations</h2>
      {row(Vibrate, "Vibrations", "Petit retour au toucher : j'aime, suivre, épingler, cartes.", p.haptics, (v) => set({ haptics: v }))}
      {row(Volume2, "Sons", "Clic discret, coupé par le mode silencieux de l'iPhone.", p.sound, (v) => set({ sound: v }))}
    </section>
  );
}
