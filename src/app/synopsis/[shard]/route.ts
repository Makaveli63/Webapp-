import fs from "node:fs";
import path from "node:path";
import { titleKey } from "@/lib/text";

/**
 * Synopsis en français des jeux (scripts/fetch-synopses.mjs), publiés en petits fichiers statiques par
 * première lettre du titre (/synopsis/a.json…) : la fiche d'un jeu ne télécharge que le sien.
 */
export const dynamic = "force-static";

const SHARDS = [..."abcdefghijklmnopqrstuvwxyz", "0"];

function all(): Record<string, string> {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".cache", "news", "synopses.json"), "utf8")) as Record<string, { text?: string } | null>;
    return Object.fromEntries(Object.entries(raw).filter(([, s]) => typeof s?.text === "string").map(([t, s]) => [titleKey(t), s!.text!]));
  } catch {
    return {};
  }
}

export function generateStaticParams() {
  return SHARDS.map((s) => ({ shard: `${s}.json` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ shard: string }> }) {
  const shard = (await params).shard.replace(/\.json$/, "");
  const entries = Object.entries(all()).filter(([k]) => (/[a-z]/.test(k.charAt(0)) ? k.charAt(0) : "0") === shard);
  return Response.json(Object.fromEntries(entries));
}
