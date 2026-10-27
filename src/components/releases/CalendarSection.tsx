import type { CalendarGame } from "@/types";
import { CalendarCard } from "./CalendarCard";

interface Props {
  id: string;
  title: string;
  games: CalendarGame[];
  today: string;
  /** Afficher la section même vide (avec un message) */
  showEmpty?: boolean;
}

export function CalendarSection({ id, title, games, today, showEmpty = false }: Props) {
  if (!games.length && !showEmpty) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold text-heading">
        {title} <span className="text-base font-medium text-muted">({games.length})</span>
      </h2>
      {games.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {games.map((g) => (
            <CalendarCard key={g.id} game={g} isToday={g.date === today} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Aucune sortie répertoriée pour cette période.</p>
      )}
    </section>
  );
}
