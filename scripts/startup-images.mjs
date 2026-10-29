// Images de démarrage iOS (site ajouté à l'écran d'accueil) : la dernière image de l'animation
// d'ouverture (fond et manette au centre), pour qu'iOS passe de l'icône au site sans écran blanc.
// Usage, après « npm run build » : node scripts/startup-images.mjs   → public/splash/*.jpg
// Les tailles d'écran sont celles de src/lib/startup-images.ts.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const html = fs.readFileSync(path.resolve("out/index.html"), "utf8");
const svg = html.match(/<svg[^>]*class="splash-logo-icon"[^>]*>.*?<\/svg>/s)?.[0];
if (!svg) throw new Error("logo de l'écran d'ouverture introuvable dans out/index.html");
const src = fs.readFileSync(path.resolve("src/lib/startup-images.ts"), "utf8");
const DEVICES = [...src.matchAll(/\[(\d+), (\d+), (\d)\]/g)].map((m) => m.slice(1).map(Number));
// Mêmes couleurs que --bg et --accent de globals.css.
const THEMES = { light: { bg: "#f6f7fb", accent: "#6246ea" }, dark: { bg: "#0b0d12", accent: "#7c5cff" } };

{
  const browser = await chromium.launch();
  fs.mkdirSync("public/splash", { recursive: true });
  for (const [w, h, dpr] of DEVICES) {
    for (const [name, t] of Object.entries(THEMES)) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      await page.setContent(`<body style="margin:0;height:100vh;display:grid;place-items:center;
        background:radial-gradient(circle at 50% 45%, color-mix(in srgb, ${t.accent} 22%, ${t.bg}), ${t.bg} 65%)">
        <div style="width:112px;height:112px;filter:drop-shadow(0 10px 30px color-mix(in srgb, ${t.accent} 50%, transparent))">
        ${svg.replace('class="splash-logo-icon"', 'width="112" height="112"')}</div></body>`);
      await page.screenshot({ path: `public/splash/${w}x${h}@${dpr}-${name}.jpg`, type: "jpeg", quality: 88 });
      await page.close();
    }
  }
  await browser.close();
  console.log(`[splash] ${DEVICES.length * 2} images dans public/splash/`);
}
