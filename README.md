# GamingBase

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
  fetch-news.mjs        Flux RSS + images + résumés IA (avant le build)
  fetch-free-games.mjs  Jeux gratuits Epic / GamerPower
  fetch-calendar.mjs    Calendrier des sorties + visuels des grosses sorties
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
- **Visuels** : vraies images quand elles existent (image fournie par le média dans son flux RSS, visuels officiels Epic/GamerPower, images RAWG ou Steam pour le calendrier, image de partage officielle de la page source pour les grosses sorties), affichées depuis leur site d'origine et créditées. Si une image manque ou ne se charge pas, une illustration SVG thématique prend le relais (`src/components/ui/Cover.tsx`, `src/lib/themes.ts`).
- **Jeux gratuits** : `scripts/fetch-free-games.mjs` (lancé par `npm run news`) lit les données publiques de l'Epic Games Store (jeux de la semaine et de jeudi prochain) et l'API de GamerPower (Steam, GOG, Prime Gaming…). Page `/jeux-gratuits`, compte à rebours jusqu'au jeudi 17 h et rappel d'agenda `public/rappel-jeux-gratuits.ics`. Le site est aussi reconstruit le jeudi juste après le changement.
- **Grosses sorties** : `src/data/releases.json` (titre, nom court, date AAAA-MM-JJ, plateformes, source). Compte à rebours dans le bandeau en tête de chaque page, sur l'accueil et sur `/sorties` ; une sortie disparaît le lendemain de sa date. Pour ajouter un jeu : une entrée de plus dans ce fichier, avec un lien vers l'annonce officielle.
- **Calendrier des sorties** (`/sorties`) : `scripts/fetch-calendar.mjs` liste les jeux qui sortent cette semaine, ce mois-ci et le mois prochain. Avec une clé gratuite RAWG (secret `RAWG_API_KEY`, sur rawg.io/apidocs) : toutes plateformes ; sans clé : sorties PC de Steam.
- **Vidéos** : YouTube intégrée par le média dans l'article (lecteur youtube-nocookie chargé au clic), bandes-annonces Steam/RAWG dans le calendrier, et pour les grosses sorties l'identifiant `youtube` de `releases.json` (vérifié auprès de YouTube au build).
- **Recherche** : index statique `/recherche-index.json` (archive de 4 mois d'actus + jeux : base RAWG des 200 jeux les plus populaires, calendrier, sorties, jeux gratuits) et recherche en direct sur Wikipédia.
- **Tests** : note du média (« 8/10 ») détectée dans le texte du flux ou relevée par l'IA, affichée sur la carte et dans le résumé.
- **Favoris** : enregistrés sur l'appareil du visiteur (localStorage), page `/favoris`.

Complétez les mentions légales (`src/app/mentions-legales/page.tsx`) avant de faire connaître le site.
