/** Recherche tolérante aux fautes : normalisation, distance d'édition, correction et suggestions. */

/** Minuscules, sans accents ni ponctuation : « Call-of-Duty: BO7 » → « call of duty bo7 ». */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Chiffres romains seuls (« GTA VI » = « GTA 6 ») ; « x » est laissé tel quel (Xbox Series X, Mega Man X…).
const ROMAN_WORDS: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", xi: "11", xii: "12" };

/**
 * Forme de comparaison de la recherche : normalisée, lettres et chiffres collés séparés (« gta6 » → « gta 6 »),
 * chiffres romains en chiffres (« gta vi » → « gta 6 »). Appliquée au texte cherché comme aux titres.
 */
export const canon = (s: string) =>
  normalize(s)
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(" ")
    .map((w) => ROMAN_WORDS[w] ?? w)
    .join(" ");

/**
 * Distance de Damerau-Levenshtein (insertion, suppression, substitution, lettres inversées),
 * abandonnée dès qu'elle dépasse `max` pour rester rapide.
 */
export function distance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** Fautes tolérées selon la longueur du mot : 0 (≤ 2 lettres), 1 (≤ 5), sinon 2. */
const tolerance = (word: string) => (word.length <= 2 ? 0 : word.length <= 5 ? 1 : 2);

/**
 * Corrige chaque mot inconnu par le mot le plus proche du vocabulaire (le plus fréquent à égalité).
 * Renvoie null si rien n'a été corrigé.
 */
export function correctQuery(query: string, vocab: Record<string, number>): string | null {
  const words = normalize(query).split(" ").filter(Boolean);
  let changed = false;
  const fixed = words.map((w) => {
    if (vocab[w] || /^\d+$/.test(w)) return w;
    const max = tolerance(w);
    let best: string | null = null;
    let bestScore = Infinity;
    for (const [candidate, freq] of Object.entries(vocab)) {
      const d = distance(w, candidate, max);
      if (d > max) continue;
      const score = d * 1000 - freq; // d'abord la proximité, ensuite la fréquence
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (best && best !== w) changed = true;
    return best ?? w;
  });
  return changed ? fixed.join(" ") : null;
}

/**
 * Suggestions de titres pendant la saisie : début de titre, début d'un mot, contenu,
 * puis titres proches malgré une faute dans le dernier mot.
 */
export function suggestTitles(query: string, titles: string[], limit = 6, alt?: (title: string) => string[]): string[] {
  const q = canon(query);
  if (q.length < 2) return [];
  const words = q.split(" ");
  const scored: [number, string][] = [];
  for (const title of titles) {
    // Meilleur score entre le titre et ses autres écritures (« GTA 6 » pour Grand Theft Auto VI).
    let best: number | null = null;
    for (const name of [title, ...(alt?.(title) ?? [])]) {
      const s = scoreTitle(q, words, canon(name));
      if (s !== null && (best === null || s < best)) best = s;
    }
    if (best !== null) scored.push([best * 1000 + title.length, title]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  // Des titres contiennent ce qui est tapé : pas de propositions approximatives en plus (« Solo » ≠ « Nine Sols »).
  const exact = scored.filter(([s]) => s < 3000);
  return (exact.length ? exact.slice(0, limit) : scored.slice(0, Math.min(3, limit))).map(([, t]) => t);
}

/** Score d'un titre (forme canon) : 0 début, 1 début de mot, 2 contenu, 3+ avec fautes ; null s'il ne correspond pas. */
function scoreTitle(q: string, words: string[], t: string): number | null {
  let score: number;
  if (t.startsWith(q)) score = 0;
  else if (` ${t}`.includes(` ${q}`)) score = 1;
  else if (t.includes(q)) score = 2;
  else {
    // Fautes de frappe : chaque mot tapé doit ressembler à un mot du titre (le dernier, à un début de mot).
    const tw = t.split(" ");
    let total = 0;
    let ok = true;
    words.forEach((w, i) => {
      if (!ok) return;
      const isLast = i === words.length - 1;
      const max = isLast && words.length > 1 ? Math.max(1, tolerance(w)) : tolerance(w);
      const d = Math.min(...tw.map((x) => distance(w, isLast ? x.slice(0, Math.max(w.length, 1)) : x, max)));
      if (d > max) ok = false;
      else total += d;
    });
    if (!ok) return null;
    score = 3 + total;
  }
  return score;
}
