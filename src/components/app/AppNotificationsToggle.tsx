"use client";

import { Bell, BellOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toggleFollow, useFollows } from "@/lib/follows";
import { DEFAULT_PREFS, NOTIF_KEY as KEY, PREFS_EVENT, PREFS_KEY, readPrefs, sendPrefs, sendToApp, type Prefs } from "@/lib/notif-prefs";

const PLATFORM_CHOICES = ["PS5", "Switch 2", "Xbox", "PC"];

/**
 * Interrupteur des notifications de nouveaux articles, affiché uniquement dans les applications
 * Android et iPhone (qui vérifient le site en arrière-plan). Désactivé par défaut : au choix.
 */
export function AppNotificationsToggle() {
  const [inApp, setInApp] = useState(false);
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const follows = useFollows();

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
    window.addEventListener(PREFS_EVENT, resend);
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
      window.removeEventListener(PREFS_EVENT, resend);
    };
  }, []);

  if (!inApp) return null;

  const toggle = () => {
    const next = !on;
    setOn(next);
    setMessage("");
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
    window.dispatchEvent(new Event(PREFS_EVENT)); // synchronisation entre appareils
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
            hint="Les jeux de Ma bibliothèque (« Je l'ai » et « Je le veux »)."
            checked={prefs.myGames}
            onChange={(v) => update({ myGames: v })}
          />
          <Option label="Inclure l'actu anime" hint="Séries, films et annonces anime." checked={prefs.anime} onChange={(v) => update({ anime: v })} />
          <div>
            <p className="text-sm font-semibold text-heading">🔔 Jeux et animes suivis</p>
            <p className="text-xs text-muted">
              Chaque actu qui en parle arrive tout de suite (même hors des filtres et du résumé du soir), et chaque nouvel épisode d&apos;un anime suivi aussi.
              Touchez « Suivre » sur la fiche d&apos;un jeu ou d&apos;un anime.
            </p>
            {follows && follows.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {follows.map((f) => (
                  <li key={f.id} className="glass-pill inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm ring-1 ring-inset ring-border">
                    <Link href={f.href} className="max-w-[14rem] truncate font-semibold text-heading">
                      {f.kind === "anime" ? "🌸" : "🎮"} {f.title}
                    </Link>
                    <button type="button" onClick={() => toggleFollow(f)} aria-label={`Ne plus suivre ${f.title}`} className="rounded-full px-2 text-muted hover:text-fg">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">Aucun pour l&apos;instant.</p>
            )}
          </div>
          <Option
            label="💸 Alertes prix"
            hint="Une notification quand un jeu « Je le veux » de Ma bibliothèque passe en promo (Steam)."
            checked={prefs.priceAlerts}
            onChange={(v) => update({ priceAlerts: v })}
          />
          <Option
            label={`Résumé ${digestMoment(prefs.digestTime)}`}
            hint={`Une seule notification par jour, à ${clockLabel(prefs.digestTime)}, au lieu d'une par article.`}
            checked={prefs.digest}
            onChange={(v) => update({ digest: v })}
          />
          {prefs.digest && (
            <div className="ml-8 flex flex-wrap items-center gap-2">
              {DIGEST_PRESETS.map(([label, time]) => (
                <button
                  key={time}
                  type="button"
                  aria-pressed={prefs.digestTime === time}
                  onClick={() => update({ digestTime: time })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${prefs.digestTime === time ? "bg-accent text-white ring-accent" : "glass-pill text-heading ring-border"}`}
                >
                  {label}
                </button>
              ))}
              <label className="inline-flex items-center gap-1.5 text-xs text-muted">
                ou à
                <input
                  type="time"
                  value={prefs.digestTime}
                  onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && update({ digestTime: e.target.value })}
                  aria-label="Heure du résumé"
                  className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-heading"
                />
              </label>
            </div>
          )}
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

/** Raccourcis d'heure du résumé quotidien. */
const DIGEST_PRESETS = [
  ["☀️ Matin · 8 h", "08:00"],
  ["Midi · 12 h", "12:00"],
  ["🌙 Soir · 19 h", "19:00"],
] as const;

/** « du matin », « du midi », « de l'après-midi » ou « du soir », selon l'heure choisie. */
function digestMoment(time: string): string {
  const h = Number(time.slice(0, 2));
  return h < 5 || h >= 18 ? "du soir" : h < 11 ? "du matin" : h < 14 ? "du midi" : "de l'après-midi";
}

/** « 08:00 » → « 8 h », « 07:30 » → « 7 h 30 ». */
const clockLabel = (time: string) => `${Number(time.slice(0, 2))} h${time.slice(3) === "00" ? "" : ` ${time.slice(3)}`}`;
