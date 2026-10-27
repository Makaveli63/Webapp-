// GamingBase — lecture hors connexion.
// - Pages et données de navigation : réseau d'abord (contenu toujours frais), copie de secours sinon.
// - Fichiers du site (_next/static) : version gardée en cache (ils ne changent jamais une fois publiés).
// - Le site demande en arrière-plan d'enregistrer les derniers articles (message « precache »).
// Ne concerne que ce site : rien n'est intercepté pour les autres adresses.
const VERSION = "gb-v2";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const SCOPE = new URL(self.registration.scope).pathname; // « /Webapp-/ »
const OFFLINE = `${SCOPE}hors-ligne/`;
const MAX_PAGES = 120;

/** Enregistre une page et les fichiers de code / style dont elle a besoin pour s'afficher hors connexion. */
async function savePage(path) {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  try {
    const res = await fetch(path, { credentials: "same-origin" });
    if (!res.ok) return;
    const html = await res.clone().text();
    await pages.put(path, res);
    const assets = [...new Set(html.match(/\/[^"'\s]*?\/_next\/static\/[^"'\s)]+/g) ?? [])];
    for (const a of assets) {
      if (await statics.match(a)) continue;
      const r = await fetch(a).catch(() => null);
      if (r?.ok) await statics.put(a, r);
    }
    const data = await fetch(`${path}index.txt`).catch(() => null);
    if (data?.ok) await pages.put(`${path}index.txt`, data);
  } catch {
    /* réseau indisponible : on réessaiera */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([savePage(SCOPE), savePage(OFFLINE)]));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function trim() {
  const cache = await caches.open(PAGES);
  const keys = await cache.keys();
  for (const req of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) await cache.delete(req);
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    if (response.ok) {
      await cache.put(request, response.clone());
      trim();
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") return (await cache.match(OFFLINE)) ?? Response.error();
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname.endsWith(".ics")) return;
  if (url.pathname.includes("/_next/static/")) return event.respondWith(cacheFirst(req));
  // Pages, données de navigation (index.txt), index de recherche, widget.json, icônes…
  event.respondWith(networkFirst(req));
});

// Le site envoie la liste des pages à garder pour la lecture hors connexion.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "precache" || !Array.isArray(data.paths)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      for (const path of data.paths.slice(0, 40)) {
        if (typeof path !== "string" || !path.startsWith(SCOPE)) continue;
        if (await cache.match(path)) continue;
        await savePage(path);
      }
      await trim();
    })(),
  );
});
