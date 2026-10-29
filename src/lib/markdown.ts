import "server-only";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Rend le Markdown (contenus locaux uniquement) en HTML en préfixant les liens internes par le basePath. */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false });
  const processedHtml = BASE_PATH ? html.replace(/href="\/(?!\/)/g, `href="${BASE_PATH}/`) : html;
  return DOMPurify.sanitize(processedHtml);
}
