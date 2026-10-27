import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getFreeGames, nextEpicRefresh } from "@/lib/free-games";
import { FreeGameCard } from "./FreeGameCard";
import { ReminderBox } from "./ReminderBox";

/** Bloc de la page d'accueil : jeux Epic gratuits de la semaine + rappel. */
export function FreeGamesTeaser() {
  const data = getFreeGames();
  const epicNow = data.games.filter((g) => g.store === "Epic Games" && g.status === "now").slice(0, 3);
  return (
    <section aria-labelledby="free-title">
      <div className="flex items-end justify-between gap-4">
        <h2 id="free-title" className="text-xl font-bold text-heading">Jeux gratuits de la semaine</h2>
        <Link href="/jeux-gratuits" className="flex shrink-0 items-center gap-1 py-1 text-sm text-muted hover:text-fg">
          Tout voir <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4">
        <ReminderBox nextRefresh={nextEpicRefresh(data)} />
      </div>
      {epicNow.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {epicNow.map((g) => (
            <FreeGameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </section>
  );
}
