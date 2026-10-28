/** Pastilles de la recherche (en-tête et page Recherche) : les consoles, puis les animes. */
export const PLATFORM_CHIPS = [
  { id: "ps5", label: "PS5", re: /^PS5$/ },
  { id: "xbox", label: "Xbox", re: /^Xbox/ },
  { id: "switch", label: "Switch", re: /^Switch/ },
  { id: "pc", label: "PC", re: /^PC$/ },
  { id: "mobile", label: "Mobile", re: /^(Mobile|iOS|Android)$/ },
  { id: "anime", label: "Animes", re: null },
] as const;

export type PlatformId = (typeof PLATFORM_CHIPS)[number]["id"];

export const isPlatformId = (v: string | null | undefined): v is PlatformId => PLATFORM_CHIPS.some((c) => c.id === v);

/** Le jeu ou l'actu concerne-t-il la plateforme choisie ? (« Multi » compte pour toutes ; aucun jeu pour « Animes ») */
export function onPlatform(list: readonly string[], id: PlatformId | null): boolean {
  if (!id) return true;
  const re = PLATFORM_CHIPS.find((c) => c.id === id)!.re;
  if (!re) return false;
  return list.includes("Multi") || list.some((p) => re.test(p));
}

/** Actu affichée pour la pastille choisie : rubrique Anime pour « Animes », sinon la plateforme. */
export const articleOnPlatform = (a: { platforms: readonly string[]; category?: string }, id: PlatformId | null) =>
  id === "anime" ? a.category === "Anime" : onPlatform(a.platforms, id);

/** Les animes (AniList) n'ont pas de console : affichés avec « Toutes » et « Animes » seulement. */
export const showsAnime = (id: PlatformId | null) => !id || id === "anime";
