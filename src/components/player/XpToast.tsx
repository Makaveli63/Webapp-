"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { award, onPlayer, readPlayer, restorePlayer, titleOf, type XpEvent } from "@/lib/player";

/**
 * Île « +20 XP » / « Niveau 8 atteint », dans le style de l'île du suivi des jeux.
 * Monté une fois dans la page : compte aussi la visite du jour (série de jours).
 */
export function XpToast() {
  const [toast, setToast] = useState<(XpEvent & { key: number }) | null>(null);

  useEffect(() => {
    let timer = 0;
    const off = onPlayer((e) => {
      // Pas d'île tant que le profil n'est pas créé : l'XP s'accumule quand même.
      if (!e || !e.gain || !readPlayer().pseudo || (e.quiet && !e.leveledUp && !e.badge)) return;
      window.clearTimeout(timer);
      setToast({ ...e, key: Date.now() });
      timer = window.setTimeout(() => setToast(null), e.leveledUp || e.badge ? 3400 : 2200);
    });
    restorePlayer().finally(() => award("visit"));
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  const title = toast.leveledUp ? `Niveau ${toast.level} atteint` : toast.badge ? `Succès : ${toast.badge}` : toast.label;
  const sub = toast.leveledUp ? `Titre : ${titleOf(toast.level)}` : toast.badge ? toast.label : `Niveau ${toast.level}`;
  return createPortal(
    <div key={toast.key} role="status" className="follow-toast">
      <div className="follow-toast-body">
        <span className={`xp-toast-level ${toast.leveledUp ? "xp-toast-up" : ""}`}>{toast.level}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{title}</span>
          <span className="block truncate text-xs text-white/75">{sub}</span>
        </span>
        <span className="ml-1 shrink-0 font-bold tabular-nums text-[#b9a4ff]">+{toast.gain} XP</span>
      </div>
    </div>,
    document.body,
  );
}
