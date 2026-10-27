/** Titre simplifié (minuscules, sans accents ni ponctuation) pour comparer des titres de jeux. */
export const titleKey = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Le texte parle-t-il de ce jeu ? (titre entier, mots entiers) */
export function mentions(text: string, gameTitle: string): boolean {
  const k = titleKey(gameTitle);
  return k.length >= 3 && ` ${titleKey(text)} `.includes(` ${k} `);
}
