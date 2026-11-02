import type { Metadata } from "next";
import { Suspense } from "react";
import { GameSheet } from "@/components/games/GameSheet";

export const metadata: Metadata = { title: "Fiche jeu", description: "Date de sortie, plateformes, note, bande-annonce, actus et ton suivi du jeu." };

// Site statique : fiche des jeux de la grande base de recherche (sans page dédiée), lue dans l'index de recherche.
export default function GameSheetPage() {
  return (
    <Suspense fallback={<p className="text-muted">Chargement…</p>}>
      <GameSheet />
    </Suspense>
  );
}
