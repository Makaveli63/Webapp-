/** Recherche tolérante aux fautes : normalisation, distance d'édition, correction et suggestions. */

/** Minuscules, sans accents ni ponctuation : « Call-of-Duty: BO7 » → « call of duty bo7 ». */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
export function suggestTitles(query: string, titles: string[], limit = 6): string[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const words = q.split(" ");
  const scored: [number, string][] = [];
  for (const title of titles) {
    const t = normalize(title);
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
      if (!ok) continue;
      score = 3 + total;
    }
    scored.push([score * 1000 + t.length, title]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, t]) => t);
}
