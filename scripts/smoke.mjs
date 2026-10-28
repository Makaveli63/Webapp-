// Contrôle avant publication : ouvre les pages du site construit (dossier out/) comme dans l'application iPhone,
// fait quelques recherches, et échoue si une page plante (erreur JavaScript ou « Application error »).
// Usage : node scripts/smoke.mjs   (BASE = NEXT_PUBLIC_BASE_PATH, par défaut /Webapp-)
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Webapp-";
const ROOT = "out";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(`${BASE}/`) && url.pathname !== BASE) return res.writeHead(404).end();
  let file = normalize(join(ROOT, decodeURIComponent(url.pathname.slice(BASE.length))));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    if (!extname(file)) file += ".html";
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}${BASE}`;

const first = async (dir) => (await readdir(join(ROOT, dir)).catch(() => [])).find((f) => !f.includes("."));
const pages = ["/", "/actualites/", "/tests/", "/sorties/", "/anime/", "/jeux-gratuits/", "/promos/", "/videos/", "/classement/", "/consoles/", "/favoris/", "/reglages/", "/recherche/", "/mon-calendrier/", "/collection/", "/jeu-du-jour/", "/anime/fiche/?id=151807"];
for (const dir of ["actualites", "jeux"]) {
  const slug = await first(dir);
  if (slug) pages.push(`/${dir}/${slug}/`);
}
const searches = ["gta", "Gta6", "gta vi", "cyberpunk", "cyberpunk netflix", "zelda", "solo leveling", "ps5", "call of duty", "pokemon"];

// Playwright : installé pour le contrôle (CI) ou déjà présent sur la machine.
const { chromium } = await import("playwright").catch(() => createRequire(import.meta.url)("playwright"));
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GamingBaseApp/iOS",
});
// Comme dans l'app : barre d'onglets native et messages vers l'app.
await ctx.addInitScript(() => {
  document.addEventListener("DOMContentLoaded", () => document.documentElement.setAttribute("data-native-tabs", "1"));
  window.webkit = { messageHandlers: { gamingbase: { postMessage: () => {} } } };
  try {
    localStorage.setItem("gb-notif", "1");
    localStorage.setItem("gb-error-reload", String(Date.now() + 3600_000)); // pas de rechargement automatique : on veut voir l'erreur
  } catch {}
});
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const problems = [];
let where = "";
page.on("pageerror", (e) => problems.push(`${where} : ${e.message}\n    ${(e.stack ?? "").split("\n").slice(1, 4).join("\n    ")}`));
const check = async (label) => {
  const text = await page.locator("body").innerText().catch(() => "");
  if (/Application error|n'a pas pu s'afficher/.test(text)) problems.push(`${label} : la page affiche une erreur`);
};

for (const path of pages) {
  where = path;
  await page.goto(origin + path, { waitUntil: "load" }).catch((e) => problems.push(`${path} : ${e.message}`));
  await page.waitForTimeout(2500);
  await check(path);
}

where = "/recherche/";
await page.goto(`${origin}/recherche/`, { waitUntil: "load" });
await page.waitForTimeout(2500);
for (const q of searches) {
  where = `recherche « ${q} »`;
  const input = page.locator("main input[type=search]").first();
  try {
    await input.fill("");
    await input.pressSequentially(q, { delay: 30 });
  } catch (e) {
    problems.push(`${where} : champ de recherche introuvable (${e.message.split("\n")[0]})`);
    await page.goto(`${origin}/recherche/`, { waitUntil: "load" });
    continue;
  }
  await page.waitForTimeout(1500);
  for (const tab of await page.getByRole("tab").all()) await tab.click({ timeout: 2000 }).catch(() => {});
  await page.getByRole("tab").first().click({ timeout: 2000 }).catch(() => {});
  const status = await page.locator("main p").first().innerText().catch(() => "?");
  console.log(`  ${where} → ${status}`);
  await check(where);
}

await browser.close();
server.close();
if (problems.length) {
  console.error(`\n❌ ${problems.length} problème(s) :\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`\n✅ ${pages.length} pages et ${searches.length} recherches sans erreur.`);
