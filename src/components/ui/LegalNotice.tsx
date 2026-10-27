import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export function LegalNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
        <div className="space-y-2">
          <p className="font-semibold text-amber-300">Avertissement légal</p>
          <p>
            Cette section est <strong>informative et pédagogique</strong>. Elle traite du homebrew et de
            la recherche en sécurité, pas du piratage. Nous ne fournissons ni fichiers, ni liens
            vers des contenus protégés.
          </p>
          {!compact && (
            <p>
              Contourner une mesure technique de protection peut être illégal dans votre pays et
              entraîne la perte de garantie et un bannissement des services en ligne.
              Télécharger des jeux que vous n&apos;avez pas achetés est illégal.{" "}
              <Link href="/mentions-legales" className="underline">
                En savoir plus
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
