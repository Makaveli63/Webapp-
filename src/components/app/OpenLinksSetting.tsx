"use client";

import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";

type AndroidBridge = { GamingBaseApp?: { linksEnabled?: () => boolean; openLinkSettings?: () => void } };

/**
 * Application Android : autoriser l'appli à ouvrir les liens du site (actu partagée par message, réseau social…).
 * Android le demande une fois, dans son réglage « Ouvrir par défaut » ; on y emmène directement.
 */
export function OpenLinksSetting() {
  const [state, setState] = useState<"absent" | "on" | "off">("absent");

  useEffect(() => {
    const bridge = (window as unknown as AndroidBridge).GamingBaseApp;
    if (!bridge?.openLinkSettings) return;
    const check = () => setState(bridge.linksEnabled?.() ? "on" : "off");
    check();
    // Retour depuis le réglage d'Android : l'état est relu.
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (state === "absent") return null;
  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Link2 className={`size-5 shrink-0 ${state === "on" ? "text-accent" : "text-muted"}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-heading">Ouvrir les liens dans l&apos;appli</h2>
          <p className="text-sm text-muted">
            {state === "on"
              ? "Activé : une actu qu'on t'envoie s'ouvre directement dans GamingBase."
              : "Une actu qu'on t'envoie s'ouvre dans le navigateur. Dans le réglage d'Android, touche « Ajouter un lien », coche makaveli63.github.io, puis reviens ici."}
          </p>
        </div>
        {state === "off" && (
          <button
            type="button"
            onClick={() => (window as unknown as AndroidBridge).GamingBaseApp?.openLinkSettings?.()}
            className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white"
          >
            Activer
          </button>
        )}
      </div>
    </section>
  );
}
