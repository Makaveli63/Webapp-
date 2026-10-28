"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FORMATS, getByMalIds, https, titleOf, type AniMedia } from "@/lib/anilist";
import { malRecommendations } from "@/lib/anime-sources";

/** Thèmes AniList les plus courants, en français ; les autres gardent leur nom d'origine. */
const TAGS_FR: Record<string, string> = {
  "Anti-Hero": "Anti-héros",
  Cyberpunk: "Cyberpunk",
  Gore: "Gore",
  "Overpowered Main Character": "Protagoniste surpuissant",
  "Hidden Ability": "Dons cachés",
  "Male Protagonist": "Héros masculin",
  "Female Protagonist": "Héroïne",
  "Ensemble Cast": "Personnages multiples",
  Isekai: "Isekai",
  "Video Games": "Jeux vidéo",
  "Virtual World": "Monde virtuel",
  Dungeon: "Donjons",
  Magic: "Magie",
  Demons: "Démons",
  Vampire: "Vampires",
  Zombie: "Zombies",
  Mecha: "Mecha",
  Robots: "Robots",
  "Super Power": "Super-pouvoirs",
  "Martial Arts": "Arts martiaux",
  Swordplay: "Combats à l'épée",
  Revenge: "Vengeance",
  Tragedy: "Tragédie",
  "Coming of Age": "Passage à l'âge adulte",
  "School": "École",
  "School Club": "Club scolaire",
  Shounen: "Shōnen",
  Seinen: "Seinen",
  Shoujo: "Shōjo",
  Josei: "Josei",
  "Time Skip": "Ellipse temporelle",
  "Time Manipulation": "Voyage dans le temps",
  "Post-Apocalyptic": "Post-apocalyptique",
  Dystopian: "Dystopie",
  Survival: "Survie",
  Military: "Militaire",
  "Primarily Adult Cast": "Personnages adultes",
  "Primarily Teen Cast": "Personnages adolescents",
  "Found Family": "Famille de cœur",
  "Love Triangle": "Triangle amoureux",
  Iyashikei: "Iyashikei (apaisant)",
  "Slapstick": "Humour burlesque",
  Parody: "Parodie",
  "Urban Fantasy": "Fantasy urbaine",
  "Dark Fantasy": "Dark fantasy",
  "High Fantasy": "High fantasy",
  "Philosophy": "Philosophie",
  Politics: "Politique",
  Crime: "Crime",
  Detective: "Enquête",
  Yakuza: "Yakuza",
  Ninja: "Ninjas",
  Samurai: "Samouraïs",
  Space: "Espace",
  Aliens: "Extraterrestres",
  Monster: "Monstres",
  "Monster Girl": "Filles monstres",
  Witch: "Sorcières",
  Kingdom: "Royaume",
  "Rehabilitation": "Rédemption",
  Reincarnation: "Réincarnation",
  "Body Swapping": "Échange de corps",
  Cooking: "Cuisine",
  Music: "Musique",
  Idol: "Idols",
  Sports: "Sport",
  Football: "Football",
  Basketball: "Basket",
  "Battle Royale": "Battle royale",
  Tournament: "Tournoi",
  "Classic Literature": "Adaptation littéraire",
  "Episodic": "Épisodique",
  "Nudity": "Nudité",
  Guns: "Armes à feu",
  "Assassins": "Assassins",
  Mafia: "Mafia",
};
// Catégories de thèmes peu utiles en vitrine (pastilles techniques ou de public).
const HIDDEN_CATEGORIES = new Set(["Technical", "Sexual Content"]);

/** Thèmes précis d'AniList (sans ceux qui révèlent l'histoire), en pastilles. */
export function AnimeThemes({ media }: { media: AniMedia }) {
  const tags = (media.tags ?? [])
    .filter((t) => !t.isMediaSpoiler && !t.isGeneralSpoiler && t.rank >= 60 && !HIDDEN_CATEGORIES.has(t.category ?? ""))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 10);
  if (!tags.length) return null;
  return (
    <section aria-labelledby="themes-title">
      <h2 id="themes-title" className="text-xl font-bold text-heading">🏷️ Thèmes</h2>
      <p className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t.name} title={`Pertinence : ${t.rank} %`} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-fg">
            {TAGS_FR[t.name] ?? t.name}
          </span>
        ))}
      </p>
    </section>
  );
}

/**
 * « Si tu as aimé… » : recommandations des fans d'AniList, complétées par celles de MyAnimeList (Jikan)
 * quand AniList en a peu. Chaque vignette ouvre la fiche de l'anime sur le site.
 */
export function AnimeRecommendations({ media }: { media: AniMedia }) {
  const fromAniList = (media.recommendations?.nodes ?? [])
    .filter((n) => n.rating > 0 && n.mediaRecommendation && !n.mediaRecommendation.isAdult && n.mediaRecommendation.type !== "MANGA")
    .map((n) => n.mediaRecommendation!);
  const [fromMal, setFromMal] = useState<AniMedia[]>([]);

  useEffect(() => {
    if (fromAniList.length >= 8 || !media.idMal) return;
    const controller = new AbortController();
    malRecommendations(media.idMal, controller.signal)
      .then((ids) => getByMalIds(ids, controller.signal).then((list) => ({ ids, list })))
      .then(({ ids, list }) => setFromMal([...list].sort((a, b) => ids.indexOf(a.idMal ?? 0) - ids.indexOf(b.idMal ?? 0))))
      .catch(() => {}); // MyAnimeList indisponible : les recommandations d'AniList suffisent
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois par anime
  }, [media.id, media.idMal]);

  const seen = new Set<number>([media.id]);
  const items = [...fromAniList, ...fromMal].filter((m) => !seen.has(m.id) && seen.add(m.id)).slice(0, 12);
  if (!items.length) return null;
  return (
    <section aria-labelledby="recs-title">
      <h2 id="recs-title" className="text-xl font-bold text-heading">✨ Si tu as aimé {titleOf(media)}</h2>
      <p className="mt-1 text-sm text-muted">Conseillés par les fans sur AniList{fromMal.length ? " et MyAnimeList" : ""}.</p>
      <ul className="scroll-row -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {items.map((m) => (
          <li key={m.id} className="w-32 shrink-0 snap-start sm:w-36">
            <Link href={`/anime/fiche?id=${m.id}`} className="group block">
              <span className="block aspect-[2/3] overflow-hidden rounded-xl bg-surface-2">
                {https(m.coverImage?.large) && (
                  // eslint-disable-next-line @next/next/no-img-element -- site statique
                  <img
                    src={https(m.coverImage?.large)}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => e.currentTarget.classList.add("invisible")}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </span>
              <span className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-heading">{titleOf(m)}</span>
              <span className="block text-xs text-muted">
                {[m.format && (FORMATS[m.format] ?? m.format), m.startDate?.year, typeof m.averageScore === "number" && `⭐ ${m.averageScore}`].filter(Boolean).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Liens vers les autres encyclopédies (recherche sur le titre : ces sites n'ont pas d'accès public à leurs données). */
export function AnimeSeeAlso({ media }: { media: AniMedia }) {
  const q = encodeURIComponent(media.title.romaji || titleOf(media));
  const links = [
    { name: "MyAnimeList", url: media.idMal ? `https://myanimelist.net/anime/${media.idMal}` : `https://myanimelist.net/anime.php?q=${q}` },
    { name: "AniList", url: https(media.siteUrl) ?? `https://anilist.co/anime/${media.id}` },
    { name: "Nautiljon (FR)", url: `https://www.nautiljon.com/animes/?q=${q}` },
    { name: "Anime-Planet", url: `https://www.anime-planet.com/anime/all?name=${q}` },
    { name: "LiveChart", url: `https://www.livechart.me/search?q=${q}` },
  ];
  return (
    <section aria-labelledby="seealso-title">
      <h2 id="seealso-title" className="text-xl font-bold text-heading">📚 Voir aussi</h2>
      <p className="mt-1 text-sm text-muted">Staff, doubleurs, mangas et light novels liés, sur les grandes encyclopédies de l&apos;anime.</p>
      <p className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.name}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-border hover:ring-accent"
          >
            {l.name} <ExternalLink className="size-3" aria-hidden />
          </a>
        ))}
      </p>
    </section>
  );
}
