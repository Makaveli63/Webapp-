# Pixel Underground

Webapp francophone d'actualité jeu vidéo : news, tests et nouvelles consoles, mise à jour automatiquement toutes les 2 heures. Mode clair/sombre selon l'appareil, navigation mobile par onglets, installable sur l'écran d'accueil.

**Stack** : Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 · Lucide React.

## Démarrage

```bash
npm install
npm run news   # optionnel : récupère les actus (sinon, articles de démo)
npm run dev    # http://localhost:3000
```

Scripts : `npm run build` (génère le site statique dans `out/`), `npm run lint`.

## Mise en ligne automatique

Le site est un **export statique** : `npm run build` produit un dossier `out/` hébergeable gratuitement n'importe où.

Le workflow `.github/workflows/deploy.yml` le publie sur **GitHub Pages** :
- à chaque push sur `main` ;
- **toutes les 2 heures**, pour récupérer les nouveaux articles des flux RSS ;
- à la demande (onglet *Actions* → *Publier le site* → *Run workflow*).

Prérequis (une seule fois) : *Settings → Pages → Source : GitHub Actions*. GitHub Pages est gratuit pour les dépôts publics.

## Arborescence

```
scripts/
  fetch-news.mjs Récupération des flux RSS + résumés IA (avant le build)
  csp.mjs        Politique de sécurité ajoutée aux pages (après le build)
src/
  app/           Routes (accueil, actualites, tests, consoles, recherche, mentions-legales)
  components/    layout/ (Navbar, MobileTabBar, Footer, SearchBar), news/, ui/
  data/          Liste des flux RSS, articles de démonstration
  lib/           Lecture des articles, rendu Markdown, formatage
  types/         Modèles TypeScript (Article, Category, Platform)
```

## Contenu

- **Articles** : `npm run news` (`scripts/fetch-news.mjs`) récupère les flux RSS de la presse jeu vidéo francophone (`src/data/feeds.json`, ou variable `RSS_FEEDS`) et rédige pour chaque nouvel article un **résumé original par IA** (offre gratuite de Mistral ou de Google Gemini : secret `AI_API_KEY` et variable `AI_PROVIDER` dans *Settings → Secrets and variables → Actions* ; résumés conservés d'un build à l'autre grâce au cache). Résultat : `.cache/news/articles.json`, lu par le build. Plateformes et rubriques (Actu, Test, Console) sont détectées par mots-clés. Chaque article a sa page sur le site (titre, résumé réécrit, source citée, articles liés) avec un lien vers l'article original ; le texte intégral n'est pas repris (droit d'auteur / droit voisin). Le journal de build indique les flux qui ont répondu. Les articles de démo (`src/data/news.ts`) ne s'affichent que si aucun flux ne répond.
- **Visuels** : chaque article, sortie et jeu gratuit a une illustration dessinée en SVG (`src/components/ui/Cover.tsx`) selon son thème (`src/lib/themes.ts`) : franchise reconnue dans le titre (Zelda → forêt et épée, GTA → coucher de soleil sur la ville, Final Fantasy → cité industrielle, etc.), sinon plateforme. Aucune image de presse n'est reproduite. Pour une sortie, le champ `theme` de `releases.json` choisit le décor.
- **Jeux gratuits** : `scripts/fetch-free-games.mjs` (lancé par `npm run news`) lit les données publiques de l'Epic Games Store (jeux de la semaine et de jeudi prochain) et l'API de GamerPower (Steam, GOG, Prime Gaming…). Page `/jeux-gratuits`, compte à rebours jusqu'au jeudi 17 h et rappel d'agenda `public/rappel-jeux-gratuits.ics`. Le site est aussi reconstruit le jeudi juste après le changement.
- **Grosses sorties** : `src/data/releases.json` (titre, nom court, date AAAA-MM-JJ, plateformes, source). Compte à rebours dans le bandeau en tête de chaque page, sur l'accueil et sur `/sorties` ; une sortie disparaît le lendemain de sa date. Pour ajouter un jeu : une entrée de plus dans ce fichier, avec un lien vers l'annonce officielle.

Complétez les mentions légales (`src/app/mentions-legales/page.tsx`) avant de faire connaître le site.
