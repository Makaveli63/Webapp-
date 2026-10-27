# Pixel Underground

Webapp francophone d'actualité jeu vidéo et de suivi pédagogique de la scène homebrew (PS5, Switch 2).

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
content/
  guides/        Guides pédagogiques (Markdown + frontmatter)
  glossaire/     Définitions des termes techniques
src/
  app/           Routes (accueil, actualites, scene, recherche, mentions-legales)
  components/    layout/ (Navbar, Footer, SearchBar), news/, scene/, ui/
  data/          Données mockées : articles, matrice de statut
  lib/           Chargement du contenu Markdown, agrégation RSS, formatage
  types/         Modèles TypeScript (Article, FirmwareStatus, Guide…)
```

## Contenu

- **Articles** : `npm run news` (`scripts/fetch-news.mjs`) récupère les flux RSS de la presse jeu vidéo francophone (`src/data/feeds.json`, ou variable `RSS_FEEDS`) et rédige pour chaque nouvel article un **résumé original par IA** (offre gratuite de Mistral ou de Google Gemini : secret `AI_API_KEY` et variable `AI_PROVIDER` dans *Settings → Secrets and variables → Actions* ; résumés conservés d'un build à l'autre grâce au cache). Résultat : `.cache/news/articles.json`, lu par le build. Plateformes et sujets « Scène » (hack, homebrew, failles…) sont détectés par mots-clés. Chaque article a sa page sur le site (titre, résumé réécrit, source citée, articles liés) avec un lien vers l'article original ; le texte intégral n'est pas repris (droit d'auteur / droit voisin). Le journal de build indique les flux qui ont répondu. Les articles de démo (`src/data/news.ts`) ne s'affichent que si aucun flux ne répond.
- **Statut de la scène** : `src/data/scene-status.ts`. ⚠️ Les valeurs actuelles sont des **exemples** à remplacer par des informations vérifiées et sourcées.
- **Guides / glossaire** : fichiers `.md` dans `content/`.

## Ligne éditoriale

La section Scène est informative : pas de fichiers, de clés, de firmwares ni de liens vers des outils de contournement ou des contenus piratés. Complétez les mentions légales (`src/app/mentions-legales/page.tsx`) avant mise en ligne.
