import type { Platform } from "@/types";

/** Décors dessinés en SVG (components/ui/Cover.tsx). */
export type Scene =
  | "forest"
  | "city"
  | "industrial"
  | "spy"
  | "space"
  | "racing"
  | "sport"
  | "blocks"
  | "horror"
  | "shooter"
  | "darkfantasy"
  | "waves"
  | "rings"
  | "split"
  | "grid"
  | "abstract";

export interface Theme {
  id: string;
  scene: Scene;
  /** Couleurs du fond d'écran dynamique quand on consulte ce sujet */
  glow?: readonly [string, string, string];
  /** Palette : [ciel haut, ciel bas, élément 1, élément 2, élément 3, accent] */
  colors: readonly [string, string, string, string, string, string];
}

export const THEMES = {
  zelda: { id: "zelda", scene: "forest", glow: ["#4caf50", "#e9c46a", "#7ec8e3"], colors: ["#7ec8e3", "#f8e9b0", "#2f6b3a", "#3f8a46", "#5aa84f", "#e9c46a"] },
  nintendo: { id: "nintendo", scene: "forest", glow: ["#ff4b55", "#4fc3f7", "#7bd36a"], colors: ["#4fc3f7", "#d4f3ff", "#2e9d4f", "#47b85d", "#7bd36a", "#ff4b55"] },
  gta: { id: "gta", scene: "city", glow: ["#ff6a88", "#ffb36b", "#8a3ffc"], colors: ["#2b1055", "#ff6a88", "#ffd56b", "#1b0f2e", "#12091f", "#ff9a5a"] },
  ff: { id: "ff", scene: "industrial", glow: ["#3dff9a", "#1d4d3c", "#22d3ee"], colors: ["#04070a", "#0f2e25", "#3dff9a", "#0b1612", "#7dffbf", "#1d4d3c"] },
  spy: { id: "spy", scene: "spy", glow: ["#d4af37", "#8c7322", "#3a3a3a"], colors: ["#050505", "#1d1a12", "#d4af37", "#8c7322", "#f5e6b3", "#2a2617"] },
  space: { id: "space", scene: "space", glow: ["#7c5cff", "#22d3ee", "#c7b8ff"], colors: ["#03041a", "#1b1347", "#7c5cff", "#c7b8ff", "#ffffff", "#22d3ee"] },
  racing: { id: "racing", scene: "racing", glow: ["#ff7e5f", "#ef476f", "#ffd166"], colors: ["#ff7e5f", "#2b2d42", "#1c1c24", "#ffd166", "#ef476f", "#3a3d5c"] },
  sport: { id: "sport", scene: "sport", glow: ["#2b9348", "#55a630", "#fff7c2"], colors: ["#1f7a3a", "#2b9348", "#e9f5db", "#55a630", "#fff7c2", "#0b3d1d"] },
  blocks: { id: "blocks", scene: "blocks", glow: ["#5dbb3f", "#87ceeb", "#8b5a2b"], colors: ["#87ceeb", "#d6f1ff", "#5dbb3f", "#8b5a2b", "#7d7d7d", "#ffffff"] },
  horror: { id: "horror", scene: "horror", glow: ["#7a1f2b", "#2a1b2e", "#9aa39e"], colors: ["#0b0f0d", "#2a1b2e", "#e8e2c8", "#9aa39e", "#050505", "#7a1f2b"] },
  shooter: { id: "shooter", scene: "shooter", glow: ["#c97b3a", "#ff3b3b", "#6b6b6b"], colors: ["#2f2f35", "#c97b3a", "#6b6b6b", "#1f1f1f", "#ff3b3b", "#e8a15a"] },
  darkfantasy: { id: "darkfantasy", scene: "darkfantasy", glow: ["#415a77", "#e0b354", "#1b263b"], colors: ["#0d1b2a", "#415a77", "#f1e3c3", "#1b263b", "#06101c", "#e0b354"] },
  ps: { id: "ps", scene: "waves", glow: ["#1f4fd1", "#4f8bff", "#2fd3a7"], colors: ["#081646", "#1f4fd1", "#4f8bff", "#9cc0ff", "#ffffff", "#2fd3a7"] },
  xbox: { id: "xbox", scene: "rings", glow: ["#107c10", "#5ee36a", "#2ecc40"], colors: ["#041a0b", "#107c10", "#5ee36a", "#b8ffbf", "#ffffff", "#2ecc40"] },
  switch: { id: "switch", scene: "split", glow: ["#00b8ff", "#ff3c5a", "#7c5cff"], colors: ["#07080c", "#1a1d24", "#00b8ff", "#ff3c5a", "#e6e8ee", "#ffd166"] },
  pc: { id: "pc", scene: "grid", glow: ["#ff4fd8", "#22d3ee", "#a3ff5c"], colors: ["#07080d", "#1a1e29", "#ff4fd8", "#22d3ee", "#a3ff5c", "#7c5cff"] },
  multi: { id: "multi", scene: "abstract", glow: ["#6246ea", "#22d3ee", "#ff6a88"], colors: ["#1b1036", "#6246ea", "#22d3ee", "#ff6a88", "#ffd166", "#ffffff"] },
} as const satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;

/** Franchises reconnues dans les titres → décor associé. */
const FRANCHISES: [RegExp, ThemeId][] = [
  [/zelda|hyrule|link'?s awakening/i, "zelda"],
  [/\b(mario|luigi|kirby|donkey kong|yoshi|pok[eé]mon|animal crossing|splatoon|metroid|pikmin|smash bros)\b/i, "nintendo"],
  [/\b(gta|grand theft auto|vice city|red dead|mafia|watch dogs|saints row|sleeping dogs)\b/i, "gta"],
  [/\b(final fantasy|ff ?(vii|7|xiv|xvi)|cyberpunk|deus ex|kingdom hearts|nier)\b/i, "ff"],
  [/\b(007|james bond|hitman|metal gear|splinter cell|dishonored)\b/i, "spy"],
  [/\b(halo|starfield|mass effect|star wars|destiny|no man'?s sky|outer wilds|star citizen|dead space)\b/i, "space"],
  [/\b(forza|gran turismo|mario kart|need for speed|f1 ?2\d|the crew|burnout|motorfest|wrc)\b/i, "racing"],
  [/\b(ea sports fc|fc ?2\d|fifa|nba ?2k|madden|efootball|rocket league|football|ligue 1|tennis)\b/i, "sport"],
  [/\b(minecraft|lego|roblox|terraria|stardew|hytale)\b/i, "blocks"],
  [/\b(resident evil|silent hill|alan wake|until dawn|outlast|dying light|evil within|horreur|horror|zombie)\b/i, "horror"],
  [/\b(call of duty|modern warfare|black ops|battlefield|counter-strike|valorant|apex|overwatch|fortnite|doom|rainbow six|delta force)\b/i, "shooter"],
  [/\b(elden ring|souls|bloodborne|witcher|diablo|skyrim|elder scrolls|baldur'?s gate|dragon age|god of war|ghost of|assassin'?s creed|shogun|monster hunter|lies of p)\b/i, "darkfantasy"],
];

const PLATFORM_THEME: Partial<Record<Platform, ThemeId>> = {
  PS5: "ps",
  Xbox: "xbox",
  "Switch 2": "switch",
  PC: "pc",
};

/** Décor d'un sujet : franchise reconnue dans le texte, sinon plateforme principale. */
export function themeFor(text: string, platforms: readonly Platform[] = []): Theme {
  const franchise = FRANCHISES.find(([re]) => re.test(text))?.[1];
  if (franchise) return THEMES[franchise];
  const platform = platforms.length === 1 ? PLATFORM_THEME[platforms[0]] : undefined;
  return THEMES[platform ?? "multi"];
}
