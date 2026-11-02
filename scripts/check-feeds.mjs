// Test de sources d'actus candidates depuis les serveurs de GitHub (même réseau que la mise à jour du site) :
// pour chaque adresse, statut HTTP, flux trouvé (y compris depuis une page d'accueil), nombre d'articles récents
// et titre du plus récent. Lancé à la main (workflow « Tester des sources »). Aucune donnée n'est enregistrée.
import Parser from "rss-parser";
import { readFileSync } from "node:fs";
import { discoverFeed, TCG_KEYWORDS } from "./fetch-news.mjs";

const UA = "GamingBase/1.0 (agrégateur RSS)";
const list = JSON.parse(readFileSync(process.argv[2] ?? "scripts/feed-candidates.json", "utf8"));
const parser = new Parser();
const isHtml = (t) => /^\s*(<!doctype html|<html)/i.test(t);

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5" }, signal: AbortSignal.timeout(15_000) });
  return { status: res.status, text: res.ok ? await res.text() : "" };
}

async function check({ name, url, topic, match }) {
  try {
    let { status, text } = await get(url);
    if (status !== 200) return `${topic}\t${name}\tHTTP ${status}\t${url}`;
    let feedUrl = url;
    if (isHtml(text)) {
      const origin = new URL(url).origin;
      const tries = [discoverFeed(text, url), ...["/feed/", "/rss", "/rss.xml", "/feed.xml", "/index.xml", "/atom.xml", "/rss/", "/feed/rss/"].map((p) => origin + p)].filter(Boolean);
      feedUrl = null;
      for (const t of tries) {
        const r = await get(t).catch(() => ({ status: 0, text: "" }));
        if (r.status === 200 && !isHtml(r.text) && /<(rss|feed|rdf)/i.test(r.text)) {
          feedUrl = t;
          text = r.text;
          break;
        }
      }
      if (!feedUrl) return `${topic}\t${name}\tpas de flux\t${url}`;
    }
    const feed = await parser.parseString(text);
    const month = Date.now() - 30 * 86_400_000;
    const recent = feed.items
      .filter((i) => !i.isoDate || Date.parse(i.isoDate) > month)
      // « match »: "tcg" : seuls les articles sur les jeux de cartes comptent.
      .filter((i) => match !== "tcg" || TCG_KEYWORDS.test(`${i.title} ${(i.categories ?? []).filter((c) => typeof c === "string").join(" ")}`));
    return `${topic}\t${name}\tOK ${recent.length}/${feed.items.length} récents\t${feedUrl}\t« ${(recent[0]?.title ?? feed.items[0]?.title ?? "").slice(0, 70)} »`;
  } catch (err) {
    return `${topic}\t${name}\terreur ${String(err.message).slice(0, 60)}\t${url}`;
  }
}

const out = [];
for (let i = 0; i < list.length; i += 8) out.push(...(await Promise.all(list.slice(i, i + 8).map(check))));
console.log(out.sort().join("\n"));
