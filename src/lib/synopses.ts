import "server-only";
import fs from "node:fs";
import path from "node:path";
import { titleKey } from "@/lib/text";

/** Synopsis en français (scripts/fetch-synopses.mjs), par titre de jeu simplifié. */
export interface Synopsis {
  text: string;
  source: string;
}

let cache: Map<string, Synopsis> | null = null;
function load(): Map<string, Synopsis> {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".cache", "news", "synopses.json"), "utf8")) as Record<string, Partial<Synopsis> | null>;
    for (const [title, s] of Object.entries(raw)) {
      if (s && typeof s.text === "string" && typeof s.source === "string" && s.source.startsWith("https://")) cache.set(titleKey(title), { text: s.text, source: s.source });
    }
  } catch {
    /* pas encore de synopsis */
  }
  return cache;
}

export function synopsisOf(title: string): Synopsis | undefined {
  return load().get(titleKey(title));
}
