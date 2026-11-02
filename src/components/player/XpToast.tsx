"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { feedback } from "@/lib/feedback";
import { award, levelOf, onPlayer, readPlayer, restorePlayer, titleOf, type XpEvent } from "@/lib/player";
import confetti from "canvas-confetti";

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

      // Trigger effects
      if (typeof window !== 'undefined') {
        if (e.leveledUp || e.badge) {
          feedback("success");
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.2 },
            colors: ['#b9a4ff', '#8b5cf6', '#d99a1e', '#f5d27a'],
            zIndex: 100,
            disableForReducedMotion: true
          });
        }
      }

      timer = window.setTimeout(() => setToast(null), e.leveledUp || e.badge ? 3400 : 2200);
    });
    restorePlayer().finally(() => award("visit"));
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  return <Island toast={toast} />;
}

/** Nombre d'étincelles qui s'envolent du « +XP ». */
const SPARKS = 9;

function Island({ toast }: { toast: XpEvent & { key: number } }) {
  const title = toast.leveledUp ? `Niveau ${toast.level} atteint` : toast.badge ? `Succès : ${toast.badge}` : toast.label;
  const sub = toast.leveledUp ? `Titre : ${titleOf(toast.level)}` : toast.badge ? toast.label : `Niveau ${toast.level}`;
  const bar = useRef<HTMLSpanElement>(null);
  const sparks = useRef<HTMLSpanElement>(null);

  // Jauge : part de l'ancienne progression et se remplit (jusqu'au bout puis repart de zéro si on passe un niveau).
  // Étincelles : directions et délais au hasard, posés en CSSOM (pas de style en ligne avec la CSP).
  useLayoutEffect(() => {
    const xp = readPlayer().xp;
    const now = levelOf(xp);
    const before = levelOf(Math.max(0, xp - toast.gain));
    const from = (before.into / before.need) * 100;
    const to = (now.into / now.need) * 100;
    const el = bar.current;
    if (el) {
      el.style.setProperty("--xp-from", `${from}%`);
      el.style.setProperty("--xp-to", `${toast.leveledUp ? 100 : to}%`);
      el.style.setProperty("--xp-after", `${to}%`);
      el.dataset.levelup = toast.leveledUp ? "1" : "";
    }
    sparks.current?.querySelectorAll<HTMLElement>("i").forEach((s, i) => {
      const angle = -Math.PI / 2 + (i / (SPARKS - 1) - 0.5) * 2.2 + (Math.random() - 0.5) * 0.3;
      const dist = 26 + Math.random() * 22;
      s.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      s.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      s.style.setProperty("--d", `${120 + i * 25 + Math.random() * 60}ms`);
    });
  }, [toast]);

  return createPortal(
    <div key={toast.key} role="status" className={`follow-toast ${toast.leveledUp || toast.badge ? "xp-toast-glow" : ""}`}>
      <div className="follow-toast-body">
        <span className={`xp-toast-level ${toast.leveledUp ? "xp-toast-up" : ""}`}>{toast.level}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          <span className="block truncate text-xs text-white/75">{sub}</span>
          <span className="xp-gauge mt-1.5 block" aria-hidden>
            <span ref={bar} className="xp-gauge-fill block" />
          </span>
        </span>
        <span className="relative ml-1 shrink-0 font-bold tabular-nums text-[#b9a4ff]">
          <span className="xp-gain-pop inline-block">+{toast.gain} XP</span>
          <span ref={sparks} className="xp-sparks" aria-hidden>
            {Array.from({ length: SPARKS }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </span>
      </div>
    </div>,
    document.body,
  );
}
