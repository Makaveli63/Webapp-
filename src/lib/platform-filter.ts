/** Pastilles « plateforme » de la recherche (en-tête et page Recherche). */
export const PLATFORM_CHIPS = [
  { id: "ps5", label: "PS5", re: /^PS5$/ },
  { id: "xbox", label: "Xbox", re: /^Xbox/ },
  { id: "switch", label: "Switch", re: /^Switch/ },
  { id: "pc", label: "PC", re: /^PC$/ },
  { id: "mobile", label: "Mobile", re: /^(Mobile|iOS|Android)$/ },
] as const;

export type PlatformId = (typeof PLATFORM_CHIPS)[number]["id"];

export const isPlatformId = (v: string | null | undefined): v is PlatformId => PLATFORM_CHIPS.some((c) => c.id === v);

/** Le jeu ou l'actu concerne-t-il la plateforme choisie ? (« Multi » compte pour toutes) */
export function onPlatform(list: readonly string[], id: PlatformId | null): boolean {
  if (!id) return true;
  const re = PLATFORM_CHIPS.find((c) => c.id === id)!.re;
  return list.includes("Multi") || list.some((p) => re.test(p));
}
