import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Hors connexion", robots: { index: false } };

/** Page affichée quand une page n'a pas été enregistrée et qu'il n'y a pas de réseau. */
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <p className="text-5xl" aria-hidden>
        📡
      </p>
      <h1 className="mt-4 text-2xl font-extrabold text-heading">Pas de connexion</h1>
      <p className="mt-2 text-muted">
        Cette page n&apos;a pas encore été enregistrée pour la lecture hors connexion. Les derniers articles et les pages déjà
        ouvertes restent disponibles.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
          Accueil
        </Link>
        <Link href="/actualites" className="rounded-full px-5 py-2.5 text-sm font-semibold text-heading ring-1 ring-inset ring-border">
          Dernières actus
        </Link>
      </div>
    </div>
  );
}
