import "server-only";
import polls from "@/data/polls.json";
import { getUpcomingReleases } from "@/lib/releases";

export interface Poll {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

/** Semaine ISO (« 2026-W44 ») : un nouveau sondage chaque lundi. */
export function isoWeek(date = new Date()): { id: string; index: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return { id: `${year}-W${String(week).padStart(2, "0")}`, index: year * 53 + week };
}

/** Sondage de la semaine, choisi à tour de rôle dans src/data/polls.json. */
export function currentPoll(now = new Date()): Poll {
  const { id, index } = isoWeek(now);
  const p = polls[index % polls.length];
  const options =
    p.options === "releases"
      ? getUpcomingReleases(now)
          .slice(0, 5)
          .map((r) => ({ id: r.id, label: r.short ?? r.title }))
      : (p.options as { id: string; label: string }[]);
  return { id, question: p.question, options };
}
