# 01 — Cadrage

Flux « Amélioration d'un site existant », étape 1/13. Décisions prises avec l'utilisateur par questions-réponses (skill `grilling`).

## Le site existant

Relais est un outil local Windows qui pilote des flux de travail dans Claude Code.

- **Serveur** : `server.js` (Node, aucune dépendance, `127.0.0.1:4748`) gère les flux (`flux/*.json`), les projets (`projets.json`, `.relais/etat.json`, `FLUX.md`, `livrables/`), écrit `.relais/consigne.md` et ouvre Claude Code dans Windows Terminal. `skills.js` liste les skills installés, `test.js` teste le moteur.
- **Interface** : `web/` (React 19, TypeScript, Vite 8, Tailwind 4, shadcn/ui), compilée dans `web/dist` et servie par le serveur. Vues : Accueil, Projet (suivi et validation des étapes), Atelier (éditeur de flux en glisser-déposer, `web/src/pages/atelier.tsx`, 725 lignes), Skills. Plus une palette de commandes, un fond animé « neuronal » (`fond-neuronal.tsx`) et un graphe « réseau » (`reseau.tsx`).
- **Style actuel** : neutres pierre chauds, accent orange « braise », Geist et Unbounded, fond animé aux couleurs néon, thèmes clair et sombre.
- **Lancement** : `Relais.bat` (installe et compile l'interface au premier lancement).

## À qui il sert

Un seul utilisateur, l'auteur, en local sur son PC Windows. Rien n'est distribué ni partagé.

## Ce qui gêne

« L'interface est moche. » L'utilisateur veut être ébahi en ouvrant Relais.

## Objectifs d'amélioration, par ordre de priorité

1. **Une interface qui impressionne** (priorité absolue).
   - Direction sombre et premium, dans l'esprit de Linear, Raycast ou Vercel : fond très sombre, lueurs subtiles, léger grain, typographie très nette, mouvements fluides.
   - Un vrai moment « waouh » à l'ouverture (arrivée animée sur l'Accueil), puis une finition soignée et cohérente sur tous les écrans de travail (Projet, Atelier, Skills), y compris la progression des étapes.
   - Thèmes clair et sombre soignés au même niveau. Par défaut, Relais suit le réglage de Windows et garde le bouton de bascule.
   - Toute l'identité visuelle peut être refaite : logo `relais.svg`, typographies, accent, fond neuronal, graphe réseau. Seul le nom « Relais » est conservé.
2. **Corriger les bugs et fluidifier les parcours existants** relevés par les audits (Atelier, création de projet, lancement et validation des étapes).
3. **Rester correct partout** : accessibilité, animations désactivées quand Windows demande moins d'animations, aucune lenteur dans les écrans de travail, une fenêtre étroite qui reste utilisable.

## Contraintes : ce qu'il ne faut pas casser

- Le format des fichiers sur disque : `.relais/etat.json`, `FLUX.md`, `flux/*.json`, `projets.json`. Les projets existants doivent rester lisibles.
- La règle « un livrable présent veut dire que l'étape est terminée ».
- Le lancement par `Relais.bat` et l'ouverture de Claude Code dans Windows Terminal (avec repli sur cmd).
- Le port 4748 et les protections de sécurité : contrôle de l'en-tête Host et en-tête `x-relais` sur les POST.
- Le serveur reste sans aucune dépendance npm.
- Relais pilote le flux qui le modifie : `web/dist` n'est recompilé qu'après validation de chaque étape qui modifie le code.

## Cadre accordé

- L'interface peut recevoir quelques dépendances justifiées (bibliothèque d'animation comme `motion`, polices).
- Cible : le PC d'abord. Le responsive doit éviter qu'une fenêtre étroite soit cassée, sans viser un vrai usage sur téléphone.
- Claude gère git : commits locaux à chaque étape de modification, sans rien envoyer en ligne.

## Hors périmètre

- Les nouvelles fonctions.
- Les changements d'architecture ou de stack (découpage du serveur, autre framework).
- Le changement de nom de l'outil.
- Un vrai usage sur mobile.
- Toute publication ou tout envoi en ligne (pas de remote git, pas de déploiement).

## Travail fait pendant cette étape

- Lecture du code : `server.js`, `skills.js`, `Relais.bat`, `flux/amelioration.json`, `web/package.json`, `web/src/` (App, pages, composants, styles).
- Mise sous git, sans remote :
  - `web/` : premier commit `c1b3c79` (« État initial de l'interface avant le flux d'amélioration »).
  - Racine : dépôt créé, premier commit `9c5b526` (« État initial du serveur avant le flux d'amélioration »).
  - Identité git locale des deux dépôts : `sampi`.

## Fichiers créés ou modifiés

- `.gitignore` (racine, créé) : ignore `web/` (dépôt à part), `.relais/`, `FLUX.md` et `projets.json` (état réécrit par Relais).
- `.git/` (racine) et `web/.git/` : commits initiaux.
- `livrables/01-cadrage.md` (ce fichier).
