"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "gb-live";

type AppWindow = Window & {
  GamingBaseApp?: { setLiveActivity?: (on: boolean) => void }; // Android
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
};

function sendToApp(on: boolean) {
  const w = window as AppWindow;
  try {
    w.GamingBaseApp?.setLiveActivity?.(on);
    w.webkit?.messageHandlers?.gamingbase?.postMessage({ liveActivity: on });
  } catch {
    /* ancienne version de l'app */
  }
}

/**
 * « Compte à rebours en direct » du jeu épinglé : Live Activity sur iPhone (écran verrouillé, Dynamic Island),
 * notification persistante sur Android. Affiché uniquement dans les applications.
 */
export function LiveActivityToggle() {
  const [inApp, setInApp] = useState(false);
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const app = navigator.userAgent.includes("GamingBaseApp");
    setInApp(app);
    if (!app) return;
    try {
      setOn(localStorage.getItem(KEY) === "1");
    } catch {
      /* stockage indisponible */
    }
    const onResult = (e: Event) => {
      const { enabled, denied } = (e as CustomEvent<{ enabled: boolean; denied: boolean }>).detail ?? {};
      setOn(!!enabled);
      try {
        localStorage.setItem(KEY, enabled ? "1" : "0");
      } catch {
        /* stockage indisponible */
      }
      setMessage(
        denied
          ? /iPhone|iPad/.test(navigator.userAgent)
            ? "Live Activities désactivées : Réglages de l'iPhone → GamingBase → Activités en direct."
            : "Notifications refusées : autorise-les pour GamingBase dans les réglages du téléphone."
          : "",
      );
    };
    window.addEventListener("gb-live", onResult);
    return () => window.removeEventListener("gb-live", onResult);
  }, []);

  if (!inApp) return null;

  const toggle = () => {
    const next = !on;
    setOn(next);
    setMessage("");
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* stockage indisponible */
    }
    sendToApp(next);
  };

  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Timer className={`size-5 shrink-0 ${on ? "text-accent" : "text-muted"}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-heading">Compte à rebours en direct</h2>
          <p className="text-sm text-muted">
            Ton jeu épinglé sur l&apos;écran verrouillé (et la Dynamic Island sur iPhone), avec le temps restant avant sa sortie.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Compte à rebours en direct"
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? "bg-accent" : "bg-surface-2 ring-1 ring-inset ring-border"}`}
        >
          <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{message}</p>}
    </section>
  );
}
