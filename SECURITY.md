# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique. Utilisez le signalement privé de GitHub :
onglet **Security → Report a vulnerability** de ce dépôt.

Nous accusons réception sous 7 jours.

## Mesures en place

- Site 100 % statique : aucun serveur, aucune base de données, aucun formulaire, aucun cookie, aucun traceur.
- Content-Security-Policy stricte sur chaque page (scripts inline autorisés uniquement par empreinte SHA-256).
- Protection anti-clickjacking, politique de référent restreinte, HTTPS imposé par GitHub Pages.
- Flux RSS filtrés : liens `http(s)` uniquement, taille et délai limités, contenu affiché en texte brut.
- CI : actions épinglées par SHA, permissions minimales, installation sans scripts, vérification des signatures npm.
- Dependabot et CodeQL activés.
