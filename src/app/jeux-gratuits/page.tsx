import type { Metadata } from "next";
import { FreeGameCard } from "@/components/free/FreeGameCard";
import { ReminderBox } from "@/components/free/ReminderBox";
import { getFreeGames, nextEpicRefresh } from "@/lib/free-games";
import type { FreeGame } from "@/types";

export const metadata: Metadata = {
  title: "Jeux gratuits de la semaine",
  description: "Les jeux offerts cette semaine sur Epic Games, Steam, GOG et ailleurs, avec un rappel chaque jeudi.",
};

function Grid({ games }: { games: FreeGame[] }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {games.map((g) => (
        <FreeGameCard key={g.id} game={g} />
      ))}
    </div>
  );
}

export default function FreeGamesPage() {
  const data = getFreeGames();
  const epicNow = data.games.filter((g) => g.store === "Epic Games" && g.status === "now");
  const epicNext = data.games.filter((g) => g.store === "Epic Games" && g.status === "upcoming");
  const others = data.games.filter((g) => g.store !== "Epic Games");

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Jeux gratuits de la semaine</h1>
        <p className="mt-2 text-muted">Les jeux à récupérer gratuitement et à garder pour toujours.</p>
        <div className="mt-5">
          <ReminderBox nextRefresh={nextEpicRefresh(data)} />
        </div>
      </header>

      <section aria-labelledby="epic-now">
        <h2 id="epic-now" className="text-xl font-bold text-heading">Gratuits en ce moment sur Epic Games</h2>
        {epicNow.length ? (
          <Grid games={epicNow} />
        ) : (
          <p className="mt-3 text-sm text-muted">
            {data.epicAvailable ? "Aucun jeu gratuit en ce moment." : "Liste momentanément indisponible, réessayez plus tard."}
          </p>
        )}
      </section>

      {epicNext.length > 0 && (
        <section aria-labelledby="epic-next">
          <h2 id="epic-next" className="text-xl font-bold text-heading">Bientôt gratuits sur Epic Games</h2>
          <Grid games={epicNext} />
        </section>
      )}

      <section aria-labelledby="others">
        <h2 id="others" className="text-xl font-bold text-heading">Sur les autres boutiques</h2>
        <p className="mt-1 text-sm text-muted">Steam, GOG, Prime Gaming… Liste fournie par GamerPower.</p>
        {others.length ? (
          <Grid games={others} />
        ) : (
          <p className="mt-3 text-sm text-muted">
            {data.othersAvailable ? "Aucune offre en ce moment." : "Liste momentanément indisponible, réessayez plus tard."}
          </p>
        )}
      </section>
    </div>
  );
}
