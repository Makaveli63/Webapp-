import type { Article } from "@/types";

/**
 * Nom du jeu testé, déduit du titre : « Test de Ghost of Yotei : notre verdict » → « ghost of yotei »,
 * « 1000xResist Nintendo Switch 2 Edition, le test » → « 1000xresist ». Vide si rien d'exploitable.
 */
export function testedGame(title: string): string {
  const t = title
    .replace(/^\s*(notre\s+)?(test|critique|review|avis)\s*(express\s*)?(:|de |du |des |d['’]|-|–)?\s*/i, "")
    .replace(/[,:–—|-]\s*(le|notre|l['’]|la)?\s*(test|critique|verdict|avis)\b.*$/i, "")
    .split(/\s+[:–—|]\s+|\s+-\s+|\s*:\s+/)[0]
    .replace(/\((ps5|ps4|switch 2|switch|xbox[^)]*|pc|steam deck)\)/gi, "")
    .replace(/\b(sur|on)\s+(ps5|ps4|switch 2|switch|xbox series|xbox|pc)\b.*$/i, "")
    .replace(/\b(nintendo\s+)?switch 2 edition\b|\bnintendo switch 2\b|\bnintendo switch\b|\bps5\b|\bpc\b|\bxbox series x\|?s?\b/gi, "");
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface ScoreGroup {
  key: string;
  game: string;
  tests: Article[];
  /** Moyenne ramenée sur 20 */
  average: number;
}

/** Note convertie sur 20 (« 8/10 » → 16). */
export function on20(score: string): number | null {
  const [v, s] = score.replace(",", ".").split("/").map(Number);
  return v >= 0 && s > 0 ? (v / s) * 20 : null;
}

/** Jeux testés par au moins deux sites différents, avec leurs notes. */
export function scoreGroups(articles: Article[], minSources = 2): ScoreGroup[] {
  const groups = new Map<string, Article[]>();
  for (const a of articles) {
    if (a.category !== "Test" || !a.score) continue;
    const k = testedGame(a.title);
    if (k.length < 3) continue;
    const list = groups.get(k) ?? [];
    if (!list.some((x) => x.source.name === a.source.name)) list.push(a);
    groups.set(k, list);
  }
  return [...groups.entries()]
    .filter(([, tests]) => tests.length >= minSources)
    .map(([key, tests]) => {
      const notes = tests.map((t) => on20(t.score!)).filter((n): n is number => n !== null);
      return {
        key,
        game: key.replace(/\b\w/g, (c) => c.toUpperCase()),
        tests,
        average: notes.reduce((s, n) => s + n, 0) / Math.max(1, notes.length),
      };
    })
    .sort((a, b) => b.tests.length - a.tests.length || b.average - a.average);
}

/** Autres tests du même jeu (pour la page d'un test). */
export function otherTests(article: Article, articles: Article[]): Article[] {
  if (article.category !== "Test") return [];
  const k = testedGame(article.title);
  if (k.length < 3) return [];
  return articles.filter((a) => a.slug !== article.slug && a.category === "Test" && a.score && testedGame(a.title) === k);
}
