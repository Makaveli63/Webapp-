"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

/**
 * « Makaveli63 » dans le pied de page : 5 appuis rapides ouvrent le tableau de bord.
 * Accès discret pour l'app installée sur l'écran d'accueil (pas de barre d'adresse pour taper /admin).
 * Sans le mot de passe, la page ne montre que le formulaire de connexion.
 */
export function SecretAdminTap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const taps = useRef<number[]>([]);
  const onTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      router.push("/admin");
    }
  };
  return (
    <button type="button" onClick={onTap} className="cursor-text select-none font-semibold text-accent">
      {children}
    </button>
  );
}
