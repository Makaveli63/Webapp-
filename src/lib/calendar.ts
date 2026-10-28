import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { CalendarData, CalendarGame, Release } from "@/types";

/** Écrit par scripts/fetch-calendar.mjs (`npm run news`) avant le build. */
const FILE = path.join(process.cwd(), ".cache", "news", "calendar.json");

export function getCalendar(): CalendarData {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<CalendarData>;
    const games = (Array.isArray(data.games) ? data.games : []).filter(
      (g): g is CalendarGame => !!g && typeof g.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g.date ?? ""),
    );
    return {
      updatedAt: data.updatedAt,
      source: data.source,
      games,
      releaseImages: data.releaseImages ?? {},
      releaseVideos: data.releaseVideos ?? {},
      database: (Array.isArray(data.database) ? data.database : []).filter((g) => !!g && typeof g.title === "string"),
      searchGames: (Array.isArray(data.searchGames) ? data.searchGames : []).filter((g) => !!g && typeof g.title === "string"),
      consolePhotos: data.consolePhotos ?? {},
      anticipated: (Array.isArray(data.anticipated) ? data.anticipated : []).filter(
        (r): r is Release => !!r && typeof r.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? ""),
      ),
    };
  } catch {
    return { games: [], releaseImages: {}, releaseVideos: {}, database: [], searchGames: [], consolePhotos: {}, anticipated: [] };
  }
}

/** Date du jour à Paris, au format AAAA-MM-JJ. */
function parisToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Sorties découpées en : cette semaine (lun.–dim.), reste du mois, mois prochain. */
export function groupCalendar(games: CalendarGame[], now = new Date()) {
  const today = parisToday(now);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lundi
  const weekStart = addDays(today, -weekday);
  const weekEnd = addDays(weekStart, 6);
  const monthEnd = (() => {
    const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
  })();
  const nextMonthEnd = (() => {
    const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 2, 0);
    return d.toISOString().slice(0, 10);
  })();
  return {
    week: games.filter((g) => g.date >= weekStart && g.date <= weekEnd),
    month: games.filter((g) => g.date > weekEnd && g.date <= monthEnd),
    nextMonth: games.filter((g) => g.date > monthEnd && g.date <= nextMonthEnd && g.date > weekEnd),
    today,
  };
}
