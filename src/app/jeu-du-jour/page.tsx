import type { Metadata } from "next";
import { DailyGame } from "@/components/daily/DailyGame";
import { getDailyCandidates } from "@/lib/daily-candidates";

export const metadata: Metadata = { title: "Jeu du jour" };

// Jeux connus avec un visuel : chaque jour, le même est choisi pour tout le monde (dans le navigateur).
export default async function DailyGamePage() {
  const candidates = await getDailyCandidates();
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Jeu du jour</h1>
      <p className="mt-2 text-muted">Devine le jeu caché derrière l&apos;image floue. 5 essais, l&apos;image se précise à chaque erreur. Le même jeu pour tout le monde, un nouveau chaque jour.</p>
      <DailyGame candidates={candidates} />
    </div>
  );
}
