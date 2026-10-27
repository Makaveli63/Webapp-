"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "gb-notif";

type AppWindow = Window & {
  GamingBaseApp?: { setNotifications?: (on: boolean) => void }; // Android
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
};

function sendToApp(on: boolean) {
  const w = window as AppWindow;
  try {
    w.GamingBaseApp?.setNotifications?.(on);
    w.webkit?.messageHandlers?.gamingbase?.postMessage({ notifications: on });
  } catch {
    /* hors application */
  }
}

/**
 * Interrupteur des notifications de nouveaux articles, affiché uniquement dans les applications
 * Android et iPhone (qui vérifient le site en arrière-plan). Désactivé par défaut : au choix.
 */
export function AppNotificationsToggle() {
  const [inApp, setInApp] = useState(false);
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const app = navigator.userAgent.includes("GamingBaseApp");
    setInApp(app);
    if (!app) return;
    let saved = false;
    try {
      saved = localStorage.getItem(KEY) === "1";
    } catch {
      /* stockage indisponible */
    }
    setOn(saved);
    if (saved) sendToApp(true); // garde l'app synchronisée (réinstallation, nouvel appareil)
    const onResult = (e: Event) => {
      const { enabled, denied } = (e as CustomEvent<{ enabled: boolean; denied: boolean }>).detail ?? {};
      setOn(!!enabled);
      try {
        localStorage.setItem(KEY, enabled ? "1" : "0");
      } catch {
        /* stockage indisponible */
      }
      setMessage(denied ? "Notifications refusées : autorise-les pour GamingBase dans les réglages du téléphone." : "");
    };
    window.addEventListener("gb-notif", onResult);
    return () => window.removeEventListener("gb-notif", onResult);
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

  const Icon = on ? Bell : BellOff;
  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Icon className={`size-5 shrink-0 ${on ? "text-accent" : "text-muted"}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-heading">Notifications des nouveaux articles</h2>
          <p className="text-sm text-muted">Une notification quand une actu ou un test arrive sur GamingBase.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Notifications des nouveaux articles"
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
