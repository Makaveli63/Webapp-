import type { Metadata } from "next";
import { DailyGame, type DailyCandidate } from "@/components/daily/DailyGame";
import { getGames } from "@/lib/games";

export const metadata: Metadata = { title: "Jeu du jour" };

// Jeux connus avec un visuel : chaque jour, le même est choisi pour tout le monde (dans le navigateur).
export default async function DailyGamePage() {
  const today = new Date().toISOString().slice(0, 10);
  const released = (await getGames()).filter((g) => g.image?.startsWith("https://") && g.date && g.date <= today);
  // Les jeux bien notés d'abord (plus connus) ; sinon, tous les jeux sortis avec un visuel.
  const known = released.filter((g) => (g.rating ?? 0) >= 72);
  const candidates: DailyCandidate[] = (known.length >= 30 ? known : released)
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 600)
    .map((g) => ({ title: g.title, image: g.image!, year: g.date!.slice(0, 4), genres: g.genres.slice(0, 2), platforms: g.platforms.slice(0, 3), slug: g.slug }));
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Jeu du jour</h1>
      <p className="mt-2 text-muted">Devine le jeu caché derrière l&apos;image floue. 5 essais, l&apos;image se précise à chaque erreur. Le même jeu pour tout le monde, un nouveau chaque jour.</p>
      <DailyGame candidates={candidates} />
    </div>
  );
}
