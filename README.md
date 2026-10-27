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
- **Recherche** : index statique `/recherche-index.json` (archive de 4 mois d'actus + jeux : base RAWG des 200 jeux les plus populaires, calendrier, sorties, jeux gratuits) et recherche en direct sur Wikipédia. Suggestions de jeux pendant la saisie et correction des fautes de frappe (« cal of dutty » → « call of duty ») via `src/lib/fuzzy.ts`.
- **Tests** : note du média (« 8/10 ») détectée dans le texte du flux ou relevée par l'IA, affichée sur la carte et dans le résumé.
- **Favoris** : enregistrés sur l'appareil du visiteur (localStorage), page `/favoris`.
- **Commentaires et « j'aime »** (Supabase, gratuit) : pseudo sans compte, filtre côté serveur (insultes, propos racistes/haineux, contournements « c0nn4rd », liens), anti-spam par IP hachée, signalement (masqué à 3 signalements), cœurs façon X sur les articles et les commentaires. Mise en place : exécuter `supabase/schema.sql` dans Supabase → SQL Editor, puis ajouter les variables `SUPABASE_URL` (Project URL, dans *Integrations → Data API*) et `SUPABASE_ANON_KEY` (clé *Publishable* `sb_publishable_…`, ou l'ancienne clé *anon*) dans *Settings → Secrets and variables → Actions → Variables*. Sans elles, ces fonctions sont simplement masquées.
- **Relecture orthographique** : les titres des sources passent par une relecture IA qui corrige uniquement les fautes de frappe (« promtions » → « promotions ») ; une correction trop éloignée de l'original est refusée, et les adresses des pages ne changent pas.
- **Promos** (`/promos`) : réductions Steam en euros (données publiques de la boutique) et articles « promotions » consoles.
- **Ma collection** (`/collection`) : « Je l'ai » / « Je le veux » sur les sorties, promos et jeux de la recherche, avec les promos et actus qui les concernent.
- **Comparateur de notes** : sur la page Tests et sur chaque test, les notes des autres sites pour le même jeu.
- **Vidéos** (`/videos`) : bandes-annonces des grosses sorties, du calendrier et des actus.
- **Ajouter au calendrier** : un fichier `.ics` par grosse sortie (`public/calendrier/`, généré au build), avec rappel la veille.
- **Sondage de la semaine** et **synchronisation entre appareils** (code secret, sans compte) : exécuter `supabase/extras.sql` après `schema.sql`.
- **Notifications des apps** : filtres par plateforme, tests seulement, « mes jeux » (collection) et résumé du soir.
- **Fiches de jeux** (`/jeux/<jeu>`) : tests et moyenne de la presse, note des lecteurs, pronostics, durée de vie (RAWG), promos, actus, bande-annonce.
- **Classement et tendances** (`/classement`) : meilleurs jeux par plateforme et par mois, jeux les plus cités de la semaine.
- **Badges**, **recherche vocale**, **partage** (aperçu Open Graph), **couleur du site** au choix, **lecture hors connexion** (service worker `public/sw.js`).
- **Tes articles** : rédigés dans le tableau de bord, publiés à la mise à jour suivante (`scripts/fetch-admin-articles.mjs`, HTML neutralisé).
- **Rapport hebdomadaire** ntfy (pg_cron). Mise en place de tout ce bloc : activer pg_cron (Database → Extensions), puis exécuter `supabase/community.sql`.
- **Anime** (`/anime`) : actus anime (flux Adala News, AnimOtaku, Journal du Japon), épisodes de la semaine avec compte à rebours et prochaines sorties (API publique AniList), liens vers les plateformes officielles uniquement.
- **Tableau de bord privé** (`/admin/`, absent des menus, non indexé) : pages vues, visiteurs uniques, provenance, appareils, articles les plus aimés et modération des commentaires (masquer, réafficher, supprimer). Mesure d'audience sans cookie ni IP stockée. Mise en place : exécuter `supabase/stats.sql` après `schema.sql`, puis dans le SQL Editor `select public.admin_set_password('…');` (10 caractères minimum, 5 essais ratés max. par 15 min).
- **Notifications sur le téléphone** (ntfy, gratuit) : nouveau commentaire et nouveaux « j'aime » (regroupés, au plus une notification par article tous les quarts d'heure). Mise en place : exécuter `supabase/notifications.sql`, installer l'app ntfy, s'abonner à un sujet secret, puis `select public.admin_set_notifications('mon-sujet-secret', true);`.
- **Épingler un compte à rebours** : l'icône 📌 sur une sortie la place en tête du bandeau et dans *Mes favoris* (enregistré sur l'appareil).
- **Vraies photos des consoles** : photos sous licence libre récupérées sur Wikipédia/Wikimedia Commons (crédit affiché), utilisées pour les articles sans image.
- **Thème** : automatique, clair ou sombre (bouton dans l'en-tête, `public/theme.js`). **Fond d'écran dynamique** dont les couleurs suivent l'onglet, le jeu de l'article lu et, sur l'accueil, les sujets les plus consultés.

Complétez les mentions légales (`src/app/mentions-legales/page.tsx`) avant de faire connaître le site.
