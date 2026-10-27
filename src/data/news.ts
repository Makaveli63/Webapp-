import type { Article } from "@/types";

/**
 * Articles fictifs servant de contenu de démonstration
 * et de repli lorsque les flux RSS sont indisponibles.
 */
export const mockArticles: Article[] = [
  {
    slug: "showcase-automne-switch-2",
    title: "Switch 2 : ce qu'il faut retenir du showcase d'automne",
    excerpt:
      "Nouvelles exclusivités, portages tiers et mise à jour système : récapitulatif des annonces.",
    content: `Le showcase d'automne a mis l'accent sur les **exclusivités de fin d'année** et sur plusieurs portages tiers très attendus.

## Les annonces principales

- Deux exclusivités datées pour décembre ;
- Une vague de portages issus du catalogue PC ;
- Une mise à jour système améliorant la gestion des sauvegardes.

## Notre avis

Le rythme de sorties reste soutenu. Reste à voir comment les portages tireront parti du matériel.

> Article de démonstration — contenu fictif.`,
    platforms: ["Switch 2"],
    tags: ["Nintendo", "Showcase", "Annonces"],
    author: "Rédaction",
    publishedAt: "2026-10-26T09:00:00Z",
    source: { name: "Pixel Underground" },
  },
  {
    slug: "ps5-mise-a-jour-systeme-octobre",
    title: "PS5 : la mise à jour système d'octobre détaillée",
    excerpt:
      "Améliorations de l'interface, correctifs de sécurité et nouvelles options d'accessibilité.",
    content: `Sony déploie une nouvelle mise à jour système. Au programme : **ergonomie**, **accessibilité** et **sécurité**.

## Ce qui change

1. Réorganisation du centre de contrôle ;
2. Nouvelles options de sous-titres ;
3. Correctifs de sécurité (détails non communiqués).

Comme toujours, les correctifs de sécurité ferment des failles potentielles : si vous possédez une console de recherche, lisez notre section *Scène* avant de mettre à jour.

> Article de démonstration — contenu fictif.`,
    platforms: ["PS5"],
    tags: ["Sony", "Firmware", "Mise à jour"],
    author: "Rédaction",
    publishedAt: "2026-10-25T15:30:00Z",
    source: { name: "Pixel Underground" },
  },
  {
    slug: "steam-soldes-automne-selection",
    title: "Soldes d'automne : notre sélection PC à moins de 15 €",
    excerpt: "Indés, classiques et pépites méconnues : dix jeux à ne pas rater.",
    content: `Les soldes d'automne sont lancés. Voici notre sélection de **dix jeux** à petit prix.

## Indés

- Un roguelite au gameplay nerveux ;
- Un jeu narratif primé.

## Classiques

- Un RPG culte remasterisé ;
- Un jeu de stratégie incontournable.

> Article de démonstration — contenu fictif.`,
    platforms: ["PC"],
    tags: ["Bons plans", "Soldes"],
    author: "Rédaction",
    publishedAt: "2026-10-24T11:00:00Z",
    source: { name: "Pixel Underground" },
  },
  {
    slug: "xbox-game-pass-novembre",
    title: "Game Pass : les jeux qui arrivent en novembre",
    excerpt: "Un line-up chargé avec plusieurs sorties day one.",
    content: `Le catalogue s'enrichit en novembre avec plusieurs **sorties day one** sur Xbox et PC.

> Article de démonstration — contenu fictif.`,
    platforms: ["Xbox", "PC"],
    tags: ["Microsoft", "Abonnement"],
    author: "Rédaction",
    publishedAt: "2026-10-23T18:00:00Z",
    source: { name: "Pixel Underground" },
  },
  {
    slug: "conference-securite-consoles-bilan",
    title: "Conférence sécurité : bilan des présentations sur les consoles",
    excerpt:
      "Divulgation responsable, primes aux bugs et recherche matérielle : le point sur les talks.",
    content: `Plusieurs chercheurs ont présenté leurs travaux sur la **sécurité des consoles** lors d'une conférence spécialisée.

## Tendances

- Montée en puissance des programmes de *bug bounty* des constructeurs ;
- Divulgation responsable : les failles présentées étaient déjà corrigées ;
- Intérêt croissant pour la recherche matérielle.

Retrouvez les notions abordées dans notre [glossaire](/scene/glossaire).

> Article de démonstration — contenu fictif.`,
    platforms: ["PS5", "Switch 2"],
    tags: ["Sécurité", "Scène", "Conférence"],
    author: "Rédaction",
    publishedAt: "2026-10-22T08:00:00Z",
    source: { name: "Pixel Underground" },
  },
  {
    slug: "multi-sortie-jeu-action-attendu",
    title: "Le jeu d'action le plus attendu de l'année sort cette semaine",
    excerpt: "Disponible sur PS5, Xbox, PC et Switch 2 : tout ce qu'il faut savoir.",
    content: `Après plusieurs reports, le titre arrive enfin sur **toutes les plateformes**.

> Article de démonstration — contenu fictif.`,
    platforms: ["Multi", "PS5", "Xbox", "PC", "Switch 2"],
    tags: ["Sortie", "Action"],
    author: "Rédaction",
    publishedAt: "2026-10-21T10:00:00Z",
    source: { name: "Pixel Underground" },
  },
];
