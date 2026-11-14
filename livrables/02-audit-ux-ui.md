# 02 — Audit UX/UI

Flux « Amélioration d'un site existant », étape 2/13. Skills utilisés : `ui-ux-pro-max` (grille de priorités : accessibilité, interaction, performance, responsive, typo et couleur, animation, formulaires, navigation) et `run` (site lancé et piloté dans Chrome). **Aucun fichier du site n'a été modifié.**

## Méthode

- Site servi par `server.js` sur `http://127.0.0.1:4748/` (build `web/dist` du 14/11 à 13:04, cohérent avec `web/src`).
- Parcours dans Chrome : Accueil, Projet « Relais », Atelier (`#/flux/amelioration`), Skills, boîte « Nouveau projet », palette de commandes. Aucune action qui écrit sur disque : pas de création, de validation, d'enregistrement ni de bascule de skill.
- Largeurs testées : 1536 × 816 (écran PC, DPR 2), 1100, 768 et 390 px. La fenêtre Chrome étant maximisée, les petites largeurs ont été simulées dans des iframes de la taille voulue : les media queries s'appliquent comme dans une vraie fenêtre.
- Thèmes clair et sombre. Mesures prises par script dans la page : contrastes WCAG calculés sur les couleurs rendues, débordements horizontaux, tailles des cibles, nombre d'animations, polices chargées.
- Code lu pour confirmer les causes : `App.tsx`, `index.css`, `index.html`, `theme-provider.tsx`, `fond-neuronal.tsx`, `reseau.tsx`, `app-sidebar.tsx`, `command-menu.tsx`, `ui/command.tsx`, `nouveau-projet.tsx`, `pages/*.tsx`.

Gravités : **Bloquant** (fonction cassée ou écran inutilisable), **Majeur** (gêne nette, accessibilité en échec), **Mineur** (finition), **Cosmétique**.

## Synthèse

| Gravité | Nombre |
|---|---|
| Bloquant | 2 |
| Majeur | 8 |
| Mineur | 11 |
| Cosmétique | 5 |

Les deux urgences : la palette de commandes fait planter toute l'interface, et l'Atelier est inutilisable entre environ 1024 et 1300 px de large.

## Problèmes relevés

### Bloquants

**B1. Ouvrir la palette de commandes vide tout l'écran.**
- Preuve : toutes les pages, 1536 px et 768 px. Ctrl+K ou clic sur « Rechercher » donne un écran entièrement noir, `#root` vide (longueur du HTML : 0). Console : `TypeError: Cannot read properties of undefined (reading 'subscribe')` (`index-BxzgF1XT.js:54`). Seul un rechargement de la page en sort.
- Cause : `CommandDialog` (`web/src/components/ui/command.tsx:33-63`) place `CommandInput`, `CommandList`… directement dans `DialogContent`, sans la racine `<Command>` de cmdk qui fournit le contexte. Aucune error boundary ne limite les dégâts (`App.tsx`).

**B2. Atelier écrasé entre 1024 et ~1300 px : colonne centrale de 137 px et panneau qui chevauche le contenu.**
- Preuve : Atelier, iframe de 1100 px, barre latérale ouverte. Grille `lg:grid-cols-[260px_minmax(0,1fr)_320px]` (`atelier.tsx:309`) : la colonne centrale mesure 137 px (bibliothèque 260 px, inspecteur 320 px). Les champs « Nom du flux » et « Description » sont illisibles, et le panneau « Réglages de l'étape » se superpose aux champs (capture : textes mêlés « Un site déjà codé passe par audit » / « Réglages de l'étape »).
- Cause : le passage à 3 colonnes se fait sur la largeur de la fenêtre (1024 px) sans tenir compte des 256 px de la barre latérale.

### Majeurs

**M1. Atelier en fenêtre étroite (390 px) : défilement horizontal.**
- Preuve : `#/flux/amelioration` à 390 px, `scrollWidth` 417 px. Le bloc « Nom du flux / Description » et ses champs dépassent (bord droit à 401 et 417 px). Barre de défilement horizontale visible.

**M2. Contraste insuffisant des couleurs de flux sur fond clair.**
- Preuve : page Projet, thème clair, 1536 px. Badge « En cours » : 1,44:1 (texte `#FFD23D` sur blanc). Badge « Retour » : 1,18:1 (`#C6FF3D`). « Validé » : 3,88:1. Minimum WCAG AA à 12 px : 4,5:1.
- Même cause ailleurs : pastille de l'étape courante, numéros `01`, `02`… de l'Atelier (`text-(--c1)`) et icônes des flux dans la barre latérale (vert citron et jaune presque invisibles sur `#f7f5f2`). Les couleurs de flux sont des néons pensés pour le sombre et sont appliquées telles quelles au clair.

**M3. Le mot « créer » du titre d'accueil devient illisible en thème clair.**
- Preuve : Accueil, thème clair. Dégradé `#FF5B1F → #FF2E88 → #FFB21F` : la fin jaune fait environ 1,8:1 sur le fond clair (calcul sur `#FFB21F`).

**M4. Libellés des étapes du réseau à environ 2:1 et tronqués.**
- Preuve : page Projet, 1536 px. Les étapes à faire sont affichées à 40 % d'opacité (`.couche.a-faire`, `index.css`) : texte `oklch(0.72…)` à 40 % sur la scène sombre, environ 2,1:1 (estimé). Libellés coupés à 15 caractères (« Audit de sécuri… », « Système de desi… », « Refonte de l'in… ») et presque collés (5 px entre « Système de desi… » et « Refonte de l'in… »). Le dernier, « Vérification en… », est rogné par le bord droit de la scène.

**M5. Modifications de l'Atelier perdues sans avertissement.**
- Preuve : code `atelier.tsx:283-285`. « Fermer » est un simple lien vers l'accueil, et aucun `beforeunload` ni aucune confirmation ne protège le brouillon. Le badge « Non enregistré » s'affiche, mais un clic dans la barre latérale ou sur « Fermer » jette le travail.

**M6. Animations permanentes nombreuses sur l'Accueil.**
- Preuve : Accueil, 1536 px. 170 animations SVG SMIL (`animate`/`animateMotion`), 43 animations CSS et un canvas plein écran redessiné à chaque image (`fond-neuronal.tsx`, jusqu'à 55 neurones et un test de distance entre chaque paire). Tout tourne en boucle même quand rien ne change. Les animations SMIL ignorent la règle CSS `prefers-reduced-motion` (seul `reseau.tsx` les retire, à la construction du dessin). C'est contraire à l'objectif « aucune lenteur dans les écrans de travail ».

**M7. Le thème ne suit pas Windows par défaut.**
- Preuve : `theme-provider.tsx:17` renvoie `"dark"` quand rien n'est enregistré, et `index.html` force `class="dark"`. Le cadrage demande de suivre le réglage de Windows par défaut.

**M8. En thème clair, les cartes affichent des scènes noires.**
- Preuve : Accueil et Projet, thème clair. La `.scene` reste sombre (`index.css`, « La scène reste sombre dans les deux thèmes »). Résultat : six blocs noirs sur fond crème à l'accueil. Le thème clair n'est donc pas soigné au même niveau que le sombre, contrairement au cadrage.

### Mineurs

**m1. Séparateur de l'en-tête mal placé.** Toutes les pages : le trait vertical entre le bouton de barre latérale et le titre est à `y=0`, haut de 20 px, collé en haut de l'en-tête de 56 px au lieu d'être centré (mesure `getBoundingClientRect`, visible sur les captures à 1536 et 390 px).

**m2. Boîte « Nouveau projet » sans contexte.** Ouverte depuis l'Atelier du flux « Amélioration d'un site existant », elle présélectionne « Création d'entreprise » (le premier flux). Un grand vide reste aussi sous « Dossier parent » (ligne d'aide vide réservée).

**m3. Doubles boutons « Nouveau projet ».** Accueil, 1536 px : un dans l'en-tête et un dans le bloc de titre, à 130 px d'écart, tous deux orange plein.

**m4. Trop d'appels principaux orange.** Accueil : cinq boutons « Démarrer » orange plein, plus deux « Nouveau projet ». Skills : 48 interrupteurs orange alignés. Aucune hiérarchie visuelle, l'œil ne sait pas où aller.

**m5. Couleur d'accent incohérente.** Sur le Projet « Relais », le flux est jaune (`--c1 #FFD23D`) mais la barre de progression, le bouton « Rouvrir dans Claude Code » et la bordure de l'étape choisie dans l'Atelier sont orange (`--primary`). Deux accents se mêlent sur le même écran.

**m6. Thème et fond animé inaccessibles quand la barre latérale est repliée.** Le pied de la barre latérale porte `group-data-[collapsible=icon]:hidden` (`app-sidebar.tsx:131`) et n'a pas d'équivalent en mode icônes.

**m7. Accueil à 768 px : cartes à 216 px de large.** La barre latérale reste ouverte et laisse 497 px au contenu, mais la grille passe à 2 colonnes (`md:grid-cols-2`). Les réseaux deviennent minuscules et le nom du flux revient à la ligne.

**m8. Atelier : champs du flux trop courts.** À 1536 px, « Nom du flux » est coupé (« Amélioration d'un site ex ») et la « Description » tient sur une ligne `Input` alors que c'est une phrase. Pas de texte complet visible sans cliquer.

**m9. Consignes pensées pour la souris.** « Survole un neurone pour voir son étape » s'affiche aussi à 390 px. Dans l'Atelier, les skills de la bibliothèque ont `tabIndex: -1` (`atelier.tsx:608`) : au clavier, seul le « + » fonctionne, et le sens du « + » change selon qu'une étape est choisie ou non (« + ajoute à… » / « + crée une nouvelle étape »). C'est discret et source d'erreurs.

**m10. Cibles trop petites.** Bouton « Retirer » d'un skill dans l'inspecteur : `size-5` (20 × 20 px, `atelier.tsx:688`). Boutons « + » de la bibliothèque en `icon-sm` à 70 % d'opacité. Interrupteur de 32 × 18 px sur la page Projet. Raccourci « Ctrl K » en 10 px.

**m11. Police de titre chargée depuis Internet.** Unbounded vient de `fonts.googleapis.com` (`web/index.html`) alors que Relais est un outil local : sans réseau, les titres tombent sur Geist. Geist, elle, est embarquée (fontsource).

### Cosmétiques

**c1.** En-tête de page et titre en doublon : « Relais » dans l'en-tête et en `h1` juste dessous (page Projet).
**c2.** Accueil, une seule carte « Reprendre » à gauche et deux tiers de largeur vides à 1536 px.
**c3.** Hauteurs de cartes de flux inégales : le badge « Contient un retour » décale les pieds de carte.
**c4.** Bibliothèque de skills : descriptions en anglais, longues et coupées à 2 lignes sur la page Skills ; « Grill me » et « Grilling » côte à côte sans distinction.
**c5.** Fond neuronal aux couleurs néon (orange, rose, citron) : en thème clair, des points colorés flottent sur le crème et brouillent la lecture sans rien apporter.

## Ce qui va bien

- Contrastes du texte courant conformes en sombre et en clair, hors couleurs de flux (aucun échec mesuré sur les textes neutres).
- Lien d'évitement « Aller au contenu », focus placé sur le `h1` à chaque navigation, titres d'onglet par vue.
- Cibles de 44 px au doigt (`@media (pointer: coarse)`), règle CSS `prefers-reduced-motion`, fond neuronal coupé quand Windows demande moins d'animations.
- Annonces du glisser-déposer traduites pour les lecteurs d'écran.
- Accueil et Projet sans débordement horizontal à 390 px.

## Incident pendant l'audit

Au milieu de l'audit, le serveur Relais qui tournait (PID 23116) s'est arrêté. Rien dans `server.js` ne l'arrête de lui-même : il a probablement été fermé. Pour finir l'audit, une instance a été relancée avec `node server.js --no-open`, comme dans `.claude/launch.json`. Le réglage de thème local (`relais-theme`) a été remis à son état initial (vide) à la fin.

## Fichiers créés ou modifiés

- `livrables/02-audit-ux-ui.md` (ce fichier). Aucun autre fichier modifié.
