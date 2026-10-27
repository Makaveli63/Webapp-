import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { GlossaryTerm, Guide } from "@/types";

const CONTENT_DIR = path.join(process.cwd(), "content");

function readDir(sub: string) {
  const dir = path.join(CONTENT_DIR, sub);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      return { slug: file.replace(/\.md$/, ""), data, content };
    });
}

export function getGuides(): Guide[] {
  return readDir("guides")
    .map(({ slug, data, content }) => ({
      slug,
      title: String(data.title),
      description: String(data.description ?? ""),
      console: data.console ?? "Général",
      level: data.level ?? "Débutant",
      tags: (data.tags as string[]) ?? [],
      updatedAt: String(data.updatedAt ?? ""),
      content,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getGuide(slug: string): Guide | undefined {
  return getGuides().find((g) => g.slug === slug);
}

export function getGlossary(): GlossaryTerm[] {
  return readDir("glossaire")
    .map(({ slug, data, content }) => ({
      slug,
      term: String(data.term),
      short: String(data.short ?? ""),
      content,
    }))
    .sort((a, b) => a.term.localeCompare(b.term, "fr"));
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Rend le Markdown en HTML en préfixant les liens internes (/…) par le basePath. */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false });
  return BASE_PATH ? html.replace(/href="\/(?!\/)/g, `href="${BASE_PATH}/`) : html;
}
