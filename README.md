# Pixel Underground

Webapp francophone d'actualité jeu vidéo et de suivi pédagogique de la scène homebrew (PS5, Switch 2).

**Stack** : Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 · Lucide React.

## Démarrage

```bash
npm install
cp .env.example .env.local   # optionnel : configurer les flux RSS
npm run dev                  # http://localhost:3000
```

Scripts : `npm run build`, `npm start`, `npm run lint`.

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

- **Articles** : `src/data/news.ts` (démo) + flux RSS optionnels via `RSS_FEEDS`, revalidés toutes les 15 min. Les articles RSS renvoient vers leur source.
- **Statut de la scène** : `src/data/scene-status.ts`. ⚠️ Les valeurs actuelles sont des **exemples** à remplacer par des informations vérifiées et sourcées.
- **Guides / glossaire** : fichiers `.md` dans `content/`.

## Ligne éditoriale

La section Scène est informative : pas de fichiers, de clés, de firmwares ni de liens vers des outils de contournement ou des contenus piratés. Complétez les mentions légales (`src/app/mentions-legales/page.tsx`) avant mise en ligne.
