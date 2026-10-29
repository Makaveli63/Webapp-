"use client";

import { Bell, BellOff, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_PUSH_PREFS, disablePush, enablePush, PUSH_PLATFORMS, pushOn, pushSupport, readPushPrefs, savePushPrefs, type PushPrefs, type PushSupport } from "@/lib/push";

/**
 * Notifications sur le site (hors applications) : nouvelles actus par plateforme, anime, jeu du jour
 * et grosses sorties la veille. L'autorisation n'est demandée qu'au toucher de l'interrupteur.
 */
export function WebPushToggle() {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PUSH_PREFS);

  useEffect(() => {
    setSupport(pushSupport());
    setOn(pushOn() && typeof Notification !== "undefined" && Notification.permission === "granted");
    setPrefs(readPushPrefs());
  }, []);

  if (support === "unsupported") return null;
  if (support === "ios-home-screen")
    return (
      <section className="glass rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-semibold text-heading">Notifications sur iPhone et iPad</h2>
            <p className="mt-1 text-sm text-muted">
              Touche <Share className="inline size-4 align-text-bottom" aria-label="Partager" /> puis « Sur l&apos;écran d&apos;accueil », ouvre GamingBase depuis
              l&apos;icône, et reviens ici pour activer les alertes.
            </p>
          </div>
        </div>
      </section>
    );

  const toggle = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (on) {
        await disablePush();
        setOn(false);
      } else {
        const res = await enablePush(prefs);
        setOn(res === "ok");
        if (res === "denied") setMessage("Notifications bloquées : autorise-les pour ce site dans les réglages du navigateur (cadenas à gauche de l'adresse).");
      }
    } catch (err) {
      setMessage((err as Error).message || "Impossible d'activer les notifications pour l'instant.");
    } finally {
      setBusy(false);
    }
  };
  const update = (patch: Partial<PushPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePushPrefs(next).catch(() => setMessage("Réglage enregistré sur cet appareil, il sera envoyé à la prochaine connexion."));
  };
  const togglePlatform = (code: string) => update({ platforms: prefs.platforms.includes(code) ? prefs.platforms.filter((c) => c !== code) : [...prefs.platforms, code] });

  const Icon = on ? Bell : BellOff;
  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Icon className={`size-5 shrink-0 ${on ? "text-accent" : "text-muted"}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-heading">Alertes GamingBase</h2>
          <p className="text-sm text-muted">Les nouvelles actus, même quand le site est fermé.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Alertes GamingBase"
          disabled={busy}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${on ? "bg-accent" : "bg-surface-2 ring-1 ring-inset ring-border"}`}
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
              {PUSH_PLATFORMS.map(([label, code]) => {
                const active = prefs.platforms.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePlatform(code)}
                    className={`rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset ${active ? "bg-accent text-white ring-accent" : "glass-pill text-muted ring-border hover:text-fg"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Option label="Actu anime" hint="Séries, films et annonces anime." checked={prefs.anime} onChange={(v) => update({ anime: v })} />
          <Option label="🧩 Jeu du jour" hint="Un rappel chaque jour vers 11 h." checked={prefs.daily} onChange={(v) => update({ daily: v })} />
          <Option label="🚀 Grosses sorties" hint="La veille de la sortie, vers 18 h." checked={prefs.releases} onChange={(v) => update({ releases: v })} />
        </div>
      )}
    </section>
  );
}

function Option({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
      <span>
        <span className="block text-sm font-semibold text-heading">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
