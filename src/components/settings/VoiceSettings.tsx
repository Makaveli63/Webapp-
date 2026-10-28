"use client";

import { Check, Headphones, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { browserVoice, browserVoices, readVoice, saveVoice, type VoiceOption, type VoicePrefs } from "@/lib/voice";

const RATES = [
  { value: 0.85, label: "Lente" },
  { value: 1, label: "Normale" },
  { value: 1.15, label: "Rapide" },
  { value: 1.3, label: "Très rapide" },
];
const SAMPLE = "Bonjour ! Voici les actus du jour sur GamingBase. Grand Theft Auto 6 sort dans trois semaines, et un nouvel épisode de Solo Leveling arrive ce soir.";

type AppWindow = Window & {
  GamingBaseApp?: { speak?: (json: string) => void; speakVoices?: () => void };
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } };
};

/** Réglages de « Écouter les actus » : voix (la plus naturelle par défaut) et vitesse, avec un exemple. */
export function VoiceSettings() {
  const [prefs, setPrefs] = useState<VoicePrefs>({ voice: "", rate: 1 });
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setPrefs(readVoice());
    const w = window as AppWindow;
    const app = navigator.userAgent.includes("GamingBaseApp");
    setIos(app && !!w.webkit?.messageHandlers?.gamingbase);
    const onVoices = (e: Event) => setVoices(((e as CustomEvent<VoiceOption[]>).detail ?? []).slice(0, 30));
    window.addEventListener("gb-voices", onVoices);
    try {
      if (app && w.GamingBaseApp?.speakVoices) w.GamingBaseApp.speakVoices();
      else if (app && w.webkit?.messageHandlers?.gamingbase) w.webkit.messageHandlers.gamingbase.postMessage({ speakVoices: true });
      else if (typeof speechSynthesis !== "undefined") {
        const load = () => setVoices(browserVoices().slice(0, 30));
        load();
        speechSynthesis.addEventListener?.("voiceschanged", load);
      }
    } catch {
      setVoices([]); // ancienne version de l'app
    }
    // Ancienne version de l'app : pas de réponse, on n'attend pas indéfiniment.
    const timer = window.setTimeout(() => setVoices((v) => v ?? []), 2500);
    return () => {
      window.removeEventListener("gb-voices", onVoices);
      window.clearTimeout(timer);
    };
  }, []);

  const update = (patch: Partial<VoicePrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveVoice(next);
  };

  const preview = (p = prefs) => {
    const w = window as AppWindow;
    const items = [{ title: "Exemple de voix", text: SAMPLE }];
    if (w.GamingBaseApp?.speak) return w.GamingBaseApp.speak(JSON.stringify({ items, voice: p.voice, rate: p.rate }));
    if (navigator.userAgent.includes("GamingBaseApp") && w.webkit?.messageHandlers?.gamingbase)
      return w.webkit.messageHandlers.gamingbase.postMessage({ speak: items, speakVoice: p.voice, speakRate: p.rate });
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(SAMPLE);
    u.lang = "fr-FR";
    const v = browserVoice(p.voice);
    if (v) u.voice = v;
    u.rate = p.rate;
    speechSynthesis.speak(u);
  };

  const list: VoiceOption[] = [{ id: "", name: "Automatique", detail: "La voix la plus naturelle du téléphone", natural: true }, ...(voices ?? [])];

  return (
    <section aria-labelledby="voice-title" className="glass rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="voice-title" className="flex items-center gap-2 font-semibold text-heading">
          <Headphones className="size-5 text-accent" aria-hidden /> Voix de lecture
        </h2>
        <button type="button" onClick={() => preview()} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white">
          <Play className="size-3.5" fill="currentColor" aria-hidden /> Écouter
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">Pour « Écouter les actus » sur l&apos;accueil.</p>

      <p className="mt-4 text-sm font-semibold text-heading">Vitesse</p>
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1">
        {RATES.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={prefs.rate === r.value}
            onClick={() => update({ rate: r.value })}
            className={`rounded-full py-1.5 text-xs font-semibold transition-colors sm:text-sm ${prefs.rate === r.value ? "bg-surface text-heading shadow" : "text-muted"}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold text-heading">Voix</p>
      {voices === null ? (
        <p className="mt-2 text-sm text-muted">Recherche des voix du téléphone…</p>
      ) : (
        <ul className="mt-2 grid max-h-72 gap-1 overflow-y-auto">
          {list.map((v) => {
            const on = prefs.voice === v.id;
            return (
              <li key={v.id || "auto"}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    update({ voice: v.id });
                    preview({ ...prefs, voice: v.id });
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${on ? "bg-accent/10 ring-1 ring-inset ring-accent" : "hover:bg-surface-2"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading">
                      {v.name} {v.natural && v.id && <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Naturelle</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{v.detail}</span>
                  </span>
                  {on && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {ios && (
        <p className="mt-3 text-xs text-muted">
          Astuce : pour une voix encore plus naturelle, télécharge une voix « Premium » ou « Améliorée » (gratuite) dans Réglages de l&apos;iPhone → Accessibilité → Contenu énoncé →
          Voix → Français. Elle apparaîtra ici, et « Automatique » la choisira toute seule.
        </p>
      )}
      {!ios && voices !== null && (
        <p className="mt-3 text-xs text-muted">
          Astuce : sur Android, d&apos;autres voix plus naturelles se téléchargent dans Réglages → Accessibilité → Synthèse vocale → Moteur Google → Installer les données vocales.
        </p>
      )}
    </section>
  );
}
