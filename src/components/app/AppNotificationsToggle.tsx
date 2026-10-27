"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "gb-notif";
const PREFS_KEY = "gb-notif-prefs";

/** Réglages envoyés aux applications (filtrage des articles avant notification). */
interface Prefs {
  platforms: string[]; // vide = toutes
  testsOnly: boolean;
  myGames: boolean; // seulement les jeux de Ma collection
  digest: boolean; // un résumé par jour (vers 19 h) au lieu d'une notification par article
  anime: boolean; // inclure l'actu anime
}
const DEFAULT_PREFS: Prefs = { platforms: [], testsOnly: false, myGames: false, digest: false, anime: true };
const PLATFORM_CHOICES = ["PS5", "Switch 2", "Xbox", "PC"];

function readPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Titres de Ma collection (jeux voulus et possédés) pour le filtre « mes jeux ». */
function collectionTitles(): string[] {
  try {
    const c = JSON.parse(localStorage.getItem("gb-collection") ?? "{}");
    return [...(c.wanted ?? []), ...(c.owned ?? [])].map((g: { title?: string }) => g.title).filter((t): t is string => typeof t === "string").slice(0, 200);
  } catch {
    return [];
  }
}

function sendPrefs(prefs: Prefs) {
  const payload = { ...prefs, games: collectionTitles() };
  const w = window as AppWindow & { GamingBaseApp?: { setNotificationPrefs?: (json: string) => void } };
  try {
    w.GamingBaseApp?.setNotificationPrefs?.(JSON.stringify(payload));
    w.webkit?.messageHandlers?.gamingbase?.postMessage({ notifPrefs: payload });
  } catch {
    /* hors application */
  }
}

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
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

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
    const p = readPrefs();
    setPrefs(p);
    sendPrefs(p);
    if (saved) sendToApp(true); // garde l'app synchronisée (réinstallation, nouvel appareil)
    // Ma collection ou les réglages changent (ici ou par synchronisation) : on prévient l'app.
    const resend = () => {
      const latest = readPrefs();
      setPrefs(latest);
      sendPrefs(latest);
    };
    window.addEventListener("gb-collection-change", resend);
    window.addEventListener("gb-notif-prefs-change", resend);
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
    return () => {
      window.removeEventListener("gb-notif", onResult);
      window.removeEventListener("gb-collection-change", resend);
      window.removeEventListener("gb-notif-prefs-change", resend);
    };
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

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible */
    }
    sendPrefs(next);
    window.dispatchEvent(new Event("gb-notif-prefs-change")); // synchronisation entre appareils
  };
  const togglePlatform = (p: string) =>
    update({ platforms: prefs.platforms.includes(p) ? prefs.platforms.filter((x) => x !== p) : [...prefs.platforms, p] });

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

      {on && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <fieldset>
            <legend className="text-sm font-semibold text-heading">Plateformes</legend>
            <p className="text-xs text-muted">Aucune cochée = toutes.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_CHOICES.map((p) => {
                const active = prefs.platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePlatform(p)}
                    className={`rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset ${active ? "bg-accent text-white ring-accent" : "glass-pill text-muted ring-border hover:text-fg"}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Option label="Seulement les tests" hint="Avec leur note." checked={prefs.testsOnly} onChange={(v) => update({ testsOnly: v })} />
          <Option
            label="Seulement mes jeux"
            hint="Les jeux de Ma collection (« Je l'ai » et « Je le veux »)."
            checked={prefs.myGames}
            onChange={(v) => update({ myGames: v })}
          />
          <Option label="Inclure l'actu anime" hint="Séries, films et annonces anime." checked={prefs.anime} onChange={(v) => update({ anime: v })} />
          <Option
            label="Résumé du soir"
            hint="Une seule notification par jour, vers 19 h, au lieu d'une par article."
            checked={prefs.digest}
            onChange={(v) => update({ digest: v })}
          />
        </div>
      )}
    </section>
  );
}

function Option({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-sm font-semibold text-heading">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
