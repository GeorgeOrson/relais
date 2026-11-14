# 08 — Refonte de l'interface

Flux « Amélioration d'un site existant », étape 8/13. Skills utilisés : `ui-ux-pro-max` (grille de priorités : accessibilité, interaction, performance, responsive, animation) et `ponytail` (le plus petit changement complet). Les références (M6, m3, c2…) renvoient à l'audit UX/UI (02). Le travail applique la partie « Étapes 7-8 » du plan (05) avec les tokens de l'étape 7.

Commit local **`12440ed`** dans `web/`. `web/dist` **n'a pas été recompilé** (règle du cadrage : compilation à la main, serveur arrêté, après validation).

## Méthode de vérification

- Banc d'essai dans le dossier temporaire de la session : une copie de `server.js` sur le port 4799, en `RELAIS_DRY`, avec une **copie** du projet Relais et des flux. Le vrai `.relais/`, `projets.json` et `flux/` n'ont pas été touchés.
- Captures « avant » : compilation de l'état validé à l'étape 7 (commit `85fcdce`). Captures « après » : compilation de cette étape.
- Petites largeurs : iframes de 390, 768 et 1100 px. Pour ça, la copie du serveur sur le banc renvoyait `X-Frame-Options: SAMEORIGIN` au lieu de `DENY`. **Le vrai `server.js` n'a pas été modifié.**
- Mesures faites par script dans la page : défilement horizontal, animations en cours, chevauchement des libellés, position du séparateur.

Les captures sont dans `livrables/08-captures/`.

| Écran | Avant | Après |
|---|---|---|
| Accueil, sombre | `avant-accueil-sombre.jpg` | `apres-accueil-sombre.jpg` |
| Accueil, clair | `avant-accueil-clair.jpg` | `apres-accueil-clair.jpg` |
| Projet | `avant-projet.jpg` | `apres-projet.jpg`, `apres-projet-defile.jpg` (titre dans l'en-tête après défilement) |
| Atelier | `avant-atelier.jpg` | `apres-atelier.jpg`, `apres-atelier-390.png` |
| Barre repliée | — | `apres-barre-repliee.jpg` |

## Écrans modifiés et choix de design

### Animations (UX M6), le chantier principal

| Mesure, Accueil à 1512 px | Avant | Après |
|---|---|---|
| Réseaux SVG qui animent | 6 sur 6 | 0 au repos, 1 au survol |
| Animations CSS en cours | 51 | 0 au repos, 10 au survol d'une carte |
| Fond neuronal | 55 neurones, à chaque image | 40 au plus, 30 images/s |

- **Réseau** (`reseau.tsx`) : un `IntersectionObserver` met en pause le dessin qui sort de l'écran. Pour SMIL, ça passe par `pauseAnimations()`, car SMIL ignore le CSS. Pour les axones, c'est `animation-play-state: paused` via `.scene[data-pause]`. Sur l'Accueil et dans l'Atelier, la nouvelle option `survolSeul` ne fait circuler le signal qu'au survol ou au focus. Choix : le mouvement sert à montrer le chemin quand on regarde un flux, pas à occuper l'écran. Sur la page Projet, le réseau reste animé tant qu'il est visible, car c'est l'écran de suivi.
- **Fond neuronal** (`fond-neuronal.tsx`) : limité à 30 images/s, ce qui suffit pour une dérive lente, et moins de neurones. En clair, son intensité passe de 0,55 à 0,35 : il reste un murmure au lieu de brouiller la lecture (UX c5).
- La règle `prefers-reduced-motion` et `useCalme` restent en place, sans changement.

### Réseau : libellés (UX M4, partie disposition)

- Avant : coupe fixe à 15 caractères, libellés collés (« Audit de sécuri… » touchait « Plan d'amélioration »), le dernier rogné par le bord.
- Après : la coupe suit l'écart réel entre deux étapes, et chaque libellé est recentré pour rester dans la scène. Mesure sur la page Projet : 12 libellés, **0 chevauchement, 0 hors de la scène**. Le titre complet reste dans la légende au survol et dans l'`aria-label`.

### En-tête (UX m1, c1, m3)

- Séparateur vertical centré. Il était à `y=0`, il est maintenant à 18 px dans une barre de 56 px. Le `data-vertical:self-stretch` de shadcn l'emportait, d'où le `self-center!`.
- Le titre de l'en-tête n'apparaît que lorsque le `h1` de la page est sorti de l'écran (fondu de 150 ms, `aria-hidden` tant qu'il double le `h1`). Plus de « Relais » répété deux fois en haut de la page Projet.
- « Nouveau projet » de l'en-tête passe en `outline` et disparaît sur l'Accueil, où le bouton du titre suffit. Règle « un seul `default` par zone » : sur les autres écrans, l'action pleine reste celle de la page (« Lancer », « Enregistrer »).

### Accueil (UX m4, c2, c3)

- Cartes de flux : « Démarrer » passe en `outline` et « Modifier » en `ghost`. Il ne reste qu'un seul bouton plein sur l'écran, « Nouveau projet ».
- Le badge « Contient un retour » est supprimé. L'information est déjà dans la légende (« 12 étapes · 1 retour · 9 skills »), et le badge décalait les pieds de carte.
- Un projet seul occupe deux colonnes au lieu de laisser deux tiers de largeur vides.
- Les titres de section utilisent `text-sous-titre`, et le survol des cartes utilise `shadow-flottant` (150 ms).

### Barre latérale (UX m6) et logo

- En mode icônes, deux boutons remplacent le pied de la barre. Le premier fait tourner le thème (Clair → Sombre → Système), et son infobulle indique le thème actif. Le second active ou coupe le fond animé (`aria-pressed`). Vérifié : un clic fait passer le thème de clair à sombre.
- Le logo est maintenant neutre, conformément à l'identité de l'étape 7. Dans la barre, il est dessiné en ligne avec `bg-primary` / `text-primary-foreground`, et suit donc le thème. Le favicon `public/relais.svg` est graphite avec un filet clair.

### Atelier (UX M1, m8, m9, m10)

- **390 px** : le défilement horizontal persistait après l'étape 6 (417 px pour 373 disponibles). Les grilles sans colonnes déclarées prenaient la largeur minimale de leur contenu. Le correctif est `grid-cols-1` (`minmax(0, 1fr)`) sur l'éditeur, la section centrale et la piste. Résultat : 373/373, et les écrans Accueil, Projet et Skills font aussi 373/373. À 768 et 1100 px, il n'y a aucun débordement. Sur l'écran complet, on garde 3 colonnes de 260, 588 et 320 px.
- Les champs du flux sont empilés : le nom tient en entier, et la description est une `Textarea` de 2 lignes qui s'agrandit avec le texte.
- Le « + » de la bibliothèque a un libellé qui dit ce qu'il fait : « Ajouter Grilling à « Cadrage » » ou « Créer une étape avec Grilling », dans `aria-label` et `title`. Il n'est plus à 70 % d'opacité.
- Le bouton « Retirer » d'un skill passe de 20 à 24 px (WCAG 2.5.8). Au doigt, la règle `pointer: coarse` donne déjà 44 px aux boutons.
- Le réseau de l'Atelier n'anime qu'au survol.

### Composants et états

- **Cartes** : `shadow-carte` dans le composant `ui/card.tsx` (une classe), ce qui applique la règle de l'étape 7 partout. L'étape en cours garde son liseré, avec `shadow-flottant`.
- **Titres** : « Projet introuvable » et « Flux introuvable » passent en `text-titre`, comme les autres `h1`.
- **États vides** : la page Skills distingue « aucun résultat pour la recherche » de « aucun skill installé », dans un encadré en pointillés. C'est le même style que les autres états vides (piste vide, aucun projet).
- **Chargement et erreurs** : les squelettes, l'error boundary, le bandeau de coupure et l'écran « serveur arrêté » de l'étape 6 utilisent déjà les tokens neutres et `text-destructive`. Ils n'ont pas eu besoin de changement.

## Ce qui n'a pas été fait

- **Grain et lueurs de fond, arrivée animée**, que l'étape 7 évoquait : ils ne figurent pas dans le plan (05), et ils ajouteraient du mouvement là où l'audit en demande moins. Laissés de côté.
- **Textes** : la consigne « Survole un neurone… » (inadaptée au doigt), les descriptions des skills et « Grill me » / « Grilling » relèvent de l'étape 9.
- **Bibliothèque de l'Atelier au clavier** : les lignes restent hors de l'ordre de tabulation (`tabIndex -1`). Le « + », maintenant explicite, est le chemin clavier. Rendre chaque ligne glissable au clavier doublerait les arrêts de tabulation.
- **Contrôles non faits** : le vrai mode tactile (simulé seulement par la largeur), un lecteur d'écran réel, et le thème clair à 390 px (vérifié seulement à pleine largeur).
- `eslint` : seules les 2 erreurs déjà connues restent (`use-mobile.ts`, `use-relais.tsx`). `tsc -b` passe.

## À faire après validation

1. Fermer la fenêtre Relais.
2. Lancer `npm run build` dans `web/`.
3. Relancer `Relais.bat`.

## Fichiers créés ou modifiés

- `web/src/components/reseau.tsx` : pause hors écran, `survolSeul`, libellés.
- `web/src/components/fond-neuronal.tsx` : cadence, densité, intensité en clair.
- `web/src/index.css` : règle `.scene[data-pause] .vif`.
- `web/src/App.tsx` : séparateur, titre d'en-tête conditionnel, bouton « Nouveau projet ».
- `web/src/components/app-sidebar.tsx` : logo en ligne, réglages en mode icônes.
- `web/src/components/ui/card.tsx` : `shadow-carte`.
- `web/src/pages/accueil.tsx`, `web/src/pages/atelier.tsx`, `web/src/pages/projet.tsx`, `web/src/pages/skills.tsx`.
- `web/public/relais.svg` : favicon neutre.
- `livrables/08-captures/` : 4 captures avant, 7 captures après.
- `livrables/08-refonte-de-l-interface.md` (ce fichier).
