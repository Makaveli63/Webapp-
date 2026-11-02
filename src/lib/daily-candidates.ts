import { dailyAnswer, parisDay, type DailyCandidate } from "@/lib/daily";
import { getGames } from "@/lib/games";

// Jeux connus avec un visuel : chaque jour, le même est choisi pour tout le monde (dans le navigateur).
export async function getDailyCandidates(): Promise<DailyCandidate[]> {
  const today = new Date().toISOString().slice(0, 10);
  const released = (await getGames()).filter((g) => g.image?.startsWith("https://") && g.date && g.date <= today);
  // Les jeux bien notés d'abord (plus connus) ; sinon, tous les jeux sortis avec un visuel.
  const known = released.filter((g) => (g.rating ?? 0) >= 72);
  return (known.length >= 30 ? known : released)
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 600)
    .map((g) => ({
      title: g.title,
      image: g.image!,
      year: g.date!.slice(0, 4),
      genres: g.genres.slice(0, 3),
      platforms: g.platforms.slice(0, 4),
      slug: g.slug,
      ...(g.rating ? { rating: g.rating } : {}),
      ...(g.playtime ? { playtime: g.playtime } : {}),
    }));
}

/**
 * Jeux du jour d'aujourd'hui et de demain (heure de Paris), calculés à la mise à jour du site :
 * la carte de l'accueil prend celui du jour de l'appareil, même juste après minuit.
 */
export async function getDailyPicks(): Promise<{ day: string; image: string; title: string }[]> {
  const candidates = await getDailyCandidates();
  const now = Date.now();
  return [now, now + 86_400_000]
    .map((t) => parisDay(new Date(t)))
    .map((day) => ({ day, pick: dailyAnswer(candidates, day) }))
    .filter((x): x is { day: string; pick: DailyCandidate } => !!x.pick)
    .map(({ day, pick }) => ({ day, image: pick.image, title: pick.title }));
}
