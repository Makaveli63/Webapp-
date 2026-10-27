import { BellRing, CalendarPlus } from "lucide-react";
import { formatDayTime } from "@/lib/format";
import { Countdown } from "@/components/ui/Countdown";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Rappel hebdomadaire : prochain changement des jeux Epic + ajout à l'agenda (chaque jeudi 17 h). */
export function ReminderBox({ nextRefresh }: { nextRefresh: string }) {
  const date = formatDayTime(nextRefresh);
  return (
    <aside className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
      <p className="flex items-start gap-2 font-semibold text-heading">
        <BellRing className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <span>
          Nouveaux jeux gratuits Epic{" "}
          <span className="text-accent">
            <Countdown target={nextRefresh} fallback={`le ${date}`} />
          </span>
        </span>
      </p>
      <p className="mt-1 text-sm text-muted">
        Epic Games offre de nouveaux jeux chaque jeudi à 17 h. Prochain changement : {date}.
      </p>
      <a
        href={`${BASE_PATH}/rappel-jeux-gratuits.ics`}
        download
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-heading hover:border-accent/60 sm:w-auto"
      >
        <CalendarPlus className="size-4 text-accent" aria-hidden /> Ajouter le rappel à mon agenda
      </a>
    </aside>
  );
}
