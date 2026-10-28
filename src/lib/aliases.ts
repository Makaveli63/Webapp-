import { titleKey } from "@/lib/text";

/** Identifiant de suivi d'un jeu, le même partout (fiche, recherche, sorties) : « jeu-grand-theft-auto-vi ». */
export const gameFollowId = (title: string) => `jeu-${titleKey(title).replace(/\s+/g, "-").slice(0, 80)}`;

/** Autres façons d'écrire un titre de jeu ou d'anime (actus, recherche, notifications). */
export const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10", xi: "11", xii: "12" };
const ARABIC = Object.fromEntries(Object.entries(ROMAN).map(([r, n]) => [n, r]));
const SMALL = new Set(["the", "of", "and", "a", "an", "le", "la", "les", "de", "du", "des", "et"]);

/** Variantes d'un titre : sans sous-titre, sigle (Grand Theft Auto VI → GTA VI / GTA 6), chiffres romains ou arabes. */
export function aliasesOf(...titles: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t.replace(/[^\p{L}\p{N}]/gu, "").length >= 4) out.add(t);
  };
  for (const raw of titles) {
    if (!raw) continue;
    const title = raw.replace(/[™®©]/g, "").trim();
    add(title);
    // « Solo Leveling Season 2 -Arise from the Shadow- » → « Solo Leveling » (les actus parlent de la série).
    const series = title.replace(/\s+(season|saison|part|partie|cour)\s+\d+.*$/i, "").replace(/\s+-[^-]+-\s*$/, "").replace(/\s+(2nd|3rd|\d+th)\s+season.*$/i, "");
    if (series !== title) add(series);
    const after = title.split(/\s*[:–—-]\s+/).slice(1).join(" ");
    if (after.length >= 8) add(after);
    const words = title.split(/[\s:–—-]+/).filter(Boolean);
    const last = words[words.length - 1]?.toLowerCase() ?? "";
    // Object.hasOwn : un dernier mot comme « constructor » ne doit pas trouver une méthode d'objet.
    const swap = (n: string): string | undefined => (Object.hasOwn(ROMAN, n) ? ROMAN[n] : Object.hasOwn(ARABIC, n) ? ARABIC[n] : undefined);
    const num = swap(last) || /^\d+$/.test(last) ? last : "";
    const other = num ? swap(num) : undefined;
    if (other) add([...words.slice(0, -1), other.toUpperCase()].join(" "));
    // Sigle des mots principaux + numéro : « GTA 6 », « GTA VI ».
    const main = (num ? words.slice(0, -1) : words).filter((w) => !SMALL.has(w.toLowerCase()) && /^\p{Lu}/u.test(w));
    if (main.length >= 3) {
      const initials = main.map((w) => w[0]).join("").toUpperCase();
      if (num) {
        add(`${initials} ${num.toUpperCase()}`);
        if (other) add(`${initials} ${other.toUpperCase()}`);
      }
    }
  }
  return [...out].slice(0, 8);
}

