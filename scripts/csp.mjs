// Ajoute une Content-Security-Policy stricte à chaque page de l'export statique.
// GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP : la politique est donc
// injectée en <meta>, avec l'empreinte SHA-256 de chaque script inline généré
// par Next.js. Tout autre script (injection XSS) est bloqué par le navigateur.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out");

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith(".html") ? [full] : [];
  });
}

// Origine Supabase autorisée pour les requêtes (commentaires / j'aime), si configurée au build.
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const sha256 = (s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;

function policy(scriptHashes, styleHashes) {
  return [
    "default-src 'none'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trim(),
    `style-src 'self' ${styleHashes.join(" ")}`.trim(),
    // Images des médias et des boutiques (flux RSS, Epic, Steam, RAWG…), chargées en HTTPS sans référent.
    "img-src 'self' data: https:",
    "font-src 'self'",
    // Vidéos : lecteur YouTube sans cookie (chargé au clic) et bandes-annonces MP4/WebM en HTTPS.
    "frame-src https://www.youtube-nocookie.com",
    "media-src https:",
    // Recherche en direct sur Wikipédia (API publique, sans cookie).
    // + Supabase (commentaires et « j'aime ») si configuré.
    `connect-src 'self' https://fr.wikipedia.org https://graphql.anilist.co ${SUPABASE_ORIGIN}`.trim(),
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

let count = 0;
for (const file of htmlFiles(OUT_DIR)) {
  const html = readFileSync(file, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;

  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const csp = policy([...new Set(scripts.map(sha256))], [...new Set(styles.map(sha256))]);

  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}"/>`;
  // Juste après <meta charset> : celui-ci doit rester dans les 1024 premiers octets.
  const updated = html.replace(/<meta charSet="utf-8"\/>/i, (m) => `${m}${meta}`);
  if (updated === html) throw new Error(`Balise <meta charset> introuvable dans ${file}`);
  writeFileSync(file, updated);
  count++;
}
console.log(`[csp] Politique de sécurité ajoutée à ${count} pages.`);
