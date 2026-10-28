"use client";

import { Headphones, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SpokenItem {
  title: string;
  text: string;
}

type AppWindow = Window & {
  GamingBaseApp?: { speak?: (json: string) => void; speakControl?: (cmd: string) => void }; // Android
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
};
type Cmd = "pause" | "resume" | "next" | "previous" | "stop";

/**
 * 🎧 « Écouter les actus » : les résumés du jour lus à voix haute, l'un après l'autre.
 * Dans les applis, la voix du téléphone (la lecture continue écran éteint) ; sinon, celle du navigateur.
 */
export function ListenNews({ items }: { items: SpokenItem[] }) {
  const [index, setIndex] = useState(-1);
  const [state, setState] = useState<"playing" | "paused" | "stopped">("stopped");
  const [mounted, setMounted] = useState(false);
  const web = useRef<{ i: number } | null>(null);
  useEffect(() => setMounted(true), []);

  const native = () => {
    const w = window as AppWindow;
    if (w.GamingBaseApp?.speak) return "android";
    if (w.webkit?.messageHandlers?.gamingbase && navigator.userAgent.includes("GamingBaseApp")) return "ios";
    return null;
  };

  // Réponses de l'app : épisode en cours et état.
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ index: number; state: string }>).detail;
      if (!d) return;
      setIndex(d.index);
      setState(d.state === "playing" ? "playing" : d.state === "paused" ? "paused" : "stopped");
    };
    window.addEventListener("gb-speak", on);
    return () => {
      window.removeEventListener("gb-speak", on);
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, []);

  // Lecture dans le navigateur (site hors appli).
  const speakWeb = (i: number) => {
    speechSynthesis.cancel();
    if (i < 0 || i >= items.length) {
      web.current = null;
      setIndex(-1);
      return setState("stopped");
    }
    web.current = { i };
    const u = new SpeechSynthesisUtterance(items[i].text);
    u.lang = "fr-FR";
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("fr"));
    if (voice) u.voice = voice;
    u.onend = () => web.current?.i === i && speakWeb(i + 1);
    speechSynthesis.speak(u);
    setIndex(i);
    setState("playing");
  };

  const start = () => {
    const kind = native();
    const w = window as AppWindow;
    if (kind === "android") w.GamingBaseApp?.speak?.(JSON.stringify(items));
    else if (kind === "ios") w.webkit?.messageHandlers?.gamingbase?.postMessage({ speak: items });
    else if (typeof speechSynthesis !== "undefined") return speakWeb(0);
    setIndex(0);
    setState("playing");
  };

  const control = (cmd: Cmd) => {
    const kind = native();
    const w = window as AppWindow;
    if (kind === "android") return w.GamingBaseApp?.speakControl?.(cmd);
    if (kind === "ios") return w.webkit?.messageHandlers?.gamingbase?.postMessage({ speakControl: cmd });
    if (cmd === "pause") {
      speechSynthesis.pause();
      setState("paused");
    } else if (cmd === "resume") {
      speechSynthesis.resume();
      setState("playing");
    } else if (cmd === "next") speakWeb(index + 1);
    else if (cmd === "previous") speakWeb(Math.max(0, index - 1));
    else speakWeb(-1);
  };

  if (!items.length) return null;
  const current = items[index];

  return (
    <>
      <button type="button" onClick={start} className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:border-accent/60">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
          <Headphones className="size-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-heading">Écouter les actus</span>
          <span className="block text-sm text-muted">
            Les {items.length} dernières actus lues à voix haute, environ {Math.max(1, Math.round(items.reduce((n, i) => n + i.text.split(" ").length, 0) / 160))} min
          </span>
        </span>
        <Play className="size-5 shrink-0 text-accent" aria-hidden />
      </button>
      {mounted &&
        state !== "stopped" &&
        current &&
        createPortal(
          <div role="region" aria-label="Lecture des actus" className="listen-player">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                🎧 Actu {index + 1} sur {items.length}
              </p>
              <p className="truncate text-sm font-semibold">{current.title}</p>
            </div>
            <button type="button" onClick={() => control("previous")} aria-label="Actu précédente" className="p-1.5">
              <SkipBack className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => control(state === "playing" ? "pause" : "resume")} aria-label={state === "playing" ? "Pause" : "Reprendre"} className="flex size-9 items-center justify-center rounded-full bg-white text-black">
              {state === "playing" ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            </button>
            <button type="button" onClick={() => control("next")} aria-label="Actu suivante" className="p-1.5">
              <SkipForward className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => control("stop")} aria-label="Arrêter la lecture" className="p-1.5 text-white/70">
              <X className="size-5" aria-hidden />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
