"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

const KEY = "gb-error-reload";

/**
 * Le site a été mis à jour pendant que l'app était ouverte : l'ancien code ne comprend plus les nouvelles
 * pages. On recharge une fois tout seul (sans boucle) ; sinon, écran d'erreur avec un bouton.
 */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 15_000) return false; // déjà rechargé à l'instant : on n'insiste pas
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* stockage indisponible : on recharge quand même une fois */
  }
  window.location.reload();
  return true;
}

export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
    reloadOnce();
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl" aria-hidden>
        🎮
      </p>
      <h1 className="mt-3 text-xl font-bold text-heading">Oups, la page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">Le site vient sûrement d&apos;être mis à jour. Recharge la page pour avoir la nouvelle version.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
      >
        <RefreshCw className="size-4" aria-hidden /> Recharger
      </button>
      {reset && (
        <button type="button" onClick={reset} className="mt-2 text-sm font-semibold text-accent underline underline-offset-2">
          Réessayer sans recharger
        </button>
      )}
      <p className="mt-6 max-w-sm break-words text-[11px] text-muted/70">Détail : {error.message || "erreur inconnue"}</p>
    </div>
  );
}

/** Fichier de code introuvable (ancienne version encore ouverte après une mise à jour) : rechargement. */
export function StaleBuildGuard() {
  useEffect(() => {
    const stale = (msg: string) => /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(msg);
    const onError = (e: ErrorEvent) => stale(String(e.message)) && reloadOnce();
    const onRejection = (e: PromiseRejectionEvent) => stale(String(e.reason?.message ?? e.reason)) && reloadOnce();
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
