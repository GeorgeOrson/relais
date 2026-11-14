# 13 — Vérification en conditions réelles

Flux « Amélioration d'un site existant », étape 13/13. Skill utilisé : `run` (site lancé et piloté dans Chrome). Les références (B1, M2, m9…) renvoient à l'audit UX/UI (02). **Aucun fichier du site n'a été modifié.**

## Méthode

- **Build vérifié** : `web/dist` date du 14/11 à 18:21, comme le dernier commit de `web/` (`2d235ea`) ; aucun fichier de `web/src` n'est plus récent. La page charge `index-ChoSbwN3.js` / `index-Botfrx7Q.css`. On teste donc bien l'état final des étapes 8 à 12.
- **Serveur** : au début de l'étape, le Relais réel ne tournait plus (port 4748 en `TIME_WAIT`, aucun processus `node`). J'ai lancé le vrai `server.js` en `RELAIS_DRY`, avec `RELAIS_DATA` et `RELAIS_FLUX` pointant vers une **copie** du projet et des flux dans le dossier temporaire de la session. `projets.json`, `flux/` et `.relais/` n'ont pas été touchés.
- **Petites largeurs** : la fenêtre Chrome est maximisée, donc `resize_window` n'a aucun effet. Comme aux étapes 8 et 12, j'ai utilisé une copie de `server.js` sur le port 4799, qui renvoie `SAMEORIGIN` au lieu de `DENY`, et des iframes de 1100, 768 et 390 px. Le vrai `server.js` n'a pas été modifié.
- **Mesures** : script injecté dans la page. Contrastes WCAG calculés sur les couleurs rendues (opacités et fonds composés), débordement horizontal (`scrollWidth`/`clientWidth`), cibles de moins de 24 px, animations en cours (`getAnimations()`, `svg.animationsPaused()`).
- **Écran** : 1536 × 816, DPR 2, Windows en thème sombre, sans « réduire les animations ».

Captures dans `livrables/13-captures/`.

## Parcours refaits

| Parcours | Ordinateur (1536) | 1100 | 768 | Mobile (390) |
|---|---|---|---|---|
| Accueil → Reprendre → Projet | OK, sombre et clair | — | OK | OK, sombre et clair |
| Palette Ctrl+K → recherche → ouverture d'un projet | OK | — | — | — |
| Projet : étape en cours, « Rouvrir », « Copier la consigne » | OK (toast « Consigne copiée ») | — | OK | OK |
| Atelier : modifier, quitter (barre latérale, Fermer, Précédent) | OK, boîte de confirmation | OK | **débordement** | OK |
| Atelier : « Ajouter un skill » (panneau) | — | OK | — | OK (étape ajoutée) |
| Nouveau projet depuis l'Atelier | OK | — | — | — |
| Barre latérale repliée : thème et fond animé | OK | — | — | — |
| Skills | OK | — | OK | OK |

## Bilan par point de l'audit

### Réglés

| Réf. | Audit (avant) | Mesure aujourd'hui | Preuve |
|---|---|---|---|
| **B1** | Ctrl+K vide l'écran (`#root` à 0, `TypeError`) | La palette s'ouvre, filtre et ouvre le projet avec Entrée. `#root` intact, aucune erreur en console. | `palette-sombre.jpg` |
| **B2** | Atelier à 1100 px : colonne centrale de 137 px, panneau superposé | Une seule colonne de 1085 px, sans débordement. La bibliothèque passe dans un panneau « Ajouter un skill ». | `atelier-1100.jpg` |
| **M1** | Atelier à 390 px : 417 px pour 390 | 375/375 sur Accueil, Projet, Atelier et Skills, en sombre comme en clair | `atelier-390-ajouter-skill.jpg`, `projet-390-sombre.jpg` |
| **M3** | « créer » à ~1,8:1 en clair | 5,11 à 5,52:1 sur les trois couleurs du dégradé (sombre : 9,5 à 10,7) | `accueil-clair-1536.jpg`, `accueil-390-clair.jpg` |
| **M5** | Brouillon de l'Atelier perdu sans avertissement | « Quitter sans enregistrer ? » s'ouvre au clic sur la barre latérale, sur « Fermer » et sur « Précédent ». Après « Annuler », le brouillon est intact ; « Quitter » mène à l'accueil. | `atelier-garde.jpg` |
| **M6** | 170 SMIL + 43 CSS en boucle sur l'Accueil | Au repos : **0** réseau SVG animé, **0** animation CSS. Au survol d'une carte : 1 réseau et 6 animations CSS. | mesure |
| **M7** | Sombre forcé par défaut | Aucun réglage enregistré : le thème vaut « Système » et suit Windows | mesure |
| **M8** | Scènes noires en thème clair | La scène est claire (`oklch(0.967 …)`) | `projet-clair-1536.jpg` |
| m2 | « Nouveau projet » présélectionne le premier flux | Ouvert depuis l'Atelier « Amélioration… », il présélectionne ce flux. Plus de vide sous « Dossier parent ». | `nouveau-projet-depuis-atelier.jpg` |
| m3, m4 | Deux « Nouveau projet » orange, 5 « Démarrer » pleins, 48 interrupteurs orange | Un seul bouton plein sur l'Accueil. « Démarrer » en contour, interrupteurs graphite. | `accueil-flux-clair-1536.jpg` |
| m5 | Deux accents sur le Projet | « Rouvrir dans Claude Code » est neutre ; seule l'étape garde la couleur du flux | `projet-copier-consigne.jpg` |
| m6 | Thème inaccessible quand la barre est repliée | Deux boutons en mode icônes : « Thème : Clair » et « Fond animé » (`aria-pressed`) | mesure |
| m8 | Nom du flux coupé, description sur une ligne | Champs de 541 px, texte entier, description sur 2 lignes | `atelier-clair-1536.jpg` |
| m11 | Police chargée depuis Google Fonts | Aucune feuille externe, seulement le CSS local | mesure |
| c1, c2, c3 | Titre en double, carte « Reprendre » seule, hauteurs inégales | Titre dans l'en-tête seulement après défilement, carte sur 2 colonnes, cartes de flux à 341/341/341 et 361/361 px | `accueil-clair-1536.jpg` |
| c5 | Fond néon qui brouille le clair | Fond atténué en clair | `accueil-clair-1536.jpg` |

### Réglés en partie

| Réf. | Ce qui reste | Mesure |
|---|---|---|
| **M2** | Le badge « Validé » en thème clair est à **4,39:1**, juste sous 4,5 (3,88 avant). « En cours » 4,76 (1,44 avant), « Retour » 4,58 (1,18 avant), icônes des flux dans la barre latérale ≥ 4,57. Le bouton inactif « Système » du sélecteur de thème est à 4,45. | `projet-clair-1536.jpg` |
| **M4** | Contraste et disposition réglés : libellés à 7,71:1 (sombre) et 6,77:1 (clair), **0 chevauchement, 0 libellé hors de la scène** sur 12. À 1536 px, les titres restent coupés à ~12 caractères (« Audit de séc… »), mais le titre complet est dans la légende au survol et dans l'`aria-label`. | `projet-sombre-1536.jpg` |
| m9 | Accueil : « Survole ou touche un neurone ». Mais la page Projet affiche toujours « Survole un neurone pour voir son étape, clique dessus pour l'ouvrir. », y compris à 390 px. Les lignes de la bibliothèque restent hors de l'ordre de tabulation (choix assumé à l'étape 8, le « + » a un libellé explicite). | `projet-390-sombre.jpg` |
| m10 | Restent sous 24 px : les « + » « Nouveau projet » et « Nouveau flux » de la barre latérale (20 × 20) et les interrupteurs (32 × 18, page Projet et Skills). Le « Retirer » est passé à 24 px. La règle `pointer: coarse` (44 px au doigt) n'a pas pu être vérifiée sans un vrai écran tactile. | mesure |

### Non traité (choix des étapes précédentes)

- **c4** : descriptions des skills en anglais, « Grill me » / « Grilling ». Ces textes viennent des `SKILL.md` installés, ce qui sort du périmètre (étape 9).

## Nouveaux problèmes trouvés

**N1. Majeur : l'Atelier déborde entre 768 et ~880 px de large.** *Corrigé après l'étape, voir la mise à jour ci-dessous.*
- Preuve : iframe de 768 px, barre latérale ouverte. `scrollWidth` 859 pour 753 disponibles. Le bouton « Enregistrer » est coupé et une barre de défilement horizontale apparaît (`atelier-768-debordement.jpg`). Même chose à 800 et 850 px. Rien ne déborde à 900 et 1100 px, ni sur l'Accueil, le Projet ou Skills à 768 px.
- Cause probable : le réseau de l'Atelier (`.scene`, 555 px) impose sa largeur. `reseau.tsx` donne au `<svg>` une largeur fixe `width={W}`, où `W` est mesuré par un `ResizeObserver` sur la boîte `.relative`… que ce même SVG élargit. Le dessin ne peut donc pas devenir plus étroit que sa largeur courante. L'élément `main` de la barre latérale (`min-width: auto`) suit et pousse la page. Sur l'Accueil et le Projet, le réseau est dans une carte qui le contient, d'où l'absence de débordement.
- Piste : `min-w-0 overflow-hidden` sur `.scene` (ou `min-w-0` sur le `main` de `SidebarInset`), puis refaire la mesure à 768.
- L'étape 8 indiquait « aucun débordement à 768 px ». Soit la mesure a été faite sur un autre écran, soit le panneau « Ajouter un skill » de l'étape 12 a changé la mise en page sous `lg`.

**N2. Mineur : quitter l'Atelier en tapant une adresse est parfois annulé sans message.**
- Preuve : Atelier sans brouillon, ancre changée à la main vers `#/`. Sur 3 essais, 2 fois l'Atelier revient tout seul, sans boîte de confirmation (journal : `hashchange #/` puis `hashchange #/flux/amelioration`). Les liens internes et « Précédent » marchent.
- Cause : `web/src/hooks/use-route.ts`, branche « ancre tapée » (`ecart` nul). `history.back()` est asynchrone, et la garde répond `true` aussitôt quand il n'y a rien à enregistrer. `location.hash = voulu` s'exécute donc **avant** le retour arrière, sur l'ancre déjà affichée : rien ne se passe. Le retour arrière ramène ensuite à l'Atelier. En plus, `accepte` reste à `true` : la navigation suivante passera la garde une fois sans demander.
- Piste : attendre le `hashchange` du retour arrière avant de reposer l'ancre, ou ne revenir en arrière que si la garde a quelque chose à protéger.
- Impact faible : il faut taper une adresse dans la barre du navigateur pendant qu'on est dans l'Atelier.

**N3. Mineur : pas de retour après l'ajout d'un skill depuis le panneau mobile.** À 390 px, « + » sur « Grilling » crée bien l'étape (13 → 14) et le badge « Non enregistré » apparaît. Mais le panneau reste ouvert par-dessus, sans toast ni annonce `aria-live` : l'utilisateur ne voit pas ce qui s'est passé.

**N4. Cosmétique : la palette ne cherche ni les étapes ni les skills.** « audit » donne « Aucun résultat. », alors que le projet a 3 étapes « Audit ». La palette ne liste que les actions, les projets et les flux.

## Non vérifié

- Vrai appareil tactile (règle `pointer: coarse`, 44 px) : seule la largeur a été simulée.
- La boîte native « Quitter la page ? » (`beforeunload`) quand on quitte Relais avec un brouillon : le gestionnaire est présent dans `atelier.tsx`, mais une boîte native bloque l'automatisation du navigateur, donc elle n'a pas été déclenchée.
- L'avertissement « Le terminal ne s'est pas ouvert » : en `RELAIS_DRY`, le terminal réussit toujours (comme à l'étape 12).
- m1 (séparateur de l'en-tête) et m7 (largeur des cartes de l'Accueil à 768 px) n'ont pas été remesurés. Sur les captures, le séparateur est centré, et l'Accueil à 768 px ne déborde pas.
- Lecteur d'écran réel. Cadence réelle du fond neuronal (la mesure `requestAnimationFrame` n'était pas fiable dans l'onglet piloté).

## Effets de bord de la vérification

- Le presse-papiers contient la consigne de l'étape 13 (copiée par le test « Copier la consigne »).
- Le choix de thème enregistré pendant le test pour `127.0.0.1:4748` a été remis à vide (« Système »), comme au départ.
- Le Relais réel n'est pas relancé : il était déjà arrêté au début de l'étape. Les serveurs de test sont arrêtés. Pour reprendre, lancer `Relais.bat`.

## Conclusion

Les 2 bloquants et 6 des 8 majeurs de l'audit sont réglés et vérifiés en conditions réelles. M2 et M4 le sont presque : il reste le badge « Validé » à 4,39:1 en clair et des titres de réseau abrégés. Le seul problème qui gêne vraiment est nouveau : **N1**, l'Atelier qui déborde entre 768 et ~880 px. C'est un retour à prévoir sur la refonte de l'interface, avec N2, N3, le texte du Projet (m9) et le badge « Validé » (M2) si on veut tout fermer.

## Mise à jour : N1 corrigé

La piste du réseau était fausse. En masquant les blocs un par un, on trouve le vrai responsable : le titre de l'en-tête. Sur l'Atelier, il affiche le nom du flux, qui est long. Même replié avec `truncate`, il compte à pleine largeur dans le calcul de la largeur minimale de la zone principale (`SidebarInset`, `min-width: auto`). Correction : `min-w-0` sur `SidebarInset` dans `web/src/App.tsx` (commit `40293ee`).

Mesure après correction : **0 px de débordement** sur l'Accueil, le Projet, l'Atelier et Skills, à 1500, 1100, 900, 850, 768 et 390 px (`atelier-768-corrige.jpg`). `node test.js` OK, `tsc -b` sans erreur, eslint : les 2 erreurs déjà connues. `web/dist` a été recompilé.

## Fichiers créés ou modifiés

- `livrables/13-verification-en-conditions-reelles.md` (ce fichier).
- `livrables/13-captures/` (16 captures, dont `atelier-768-corrige.jpg` après la correction de N1) : `palette-sombre.jpg`, `projet-sombre-1536.jpg`, `projet-clair-1536.jpg`, `accueil-clair-1536.jpg`, `accueil-flux-clair-1536.jpg`, `atelier-clair-1536.jpg`, `atelier-garde.jpg`, `atelier-1100.jpg`, `atelier-768-debordement.jpg`, `projet-390-sombre.jpg`, `projet-390-etape-courante.jpg`, `atelier-390-ajouter-skill.jpg`, `accueil-390-clair.jpg`, `nouveau-projet-depuis-atelier.jpg`, `projet-copier-consigne.jpg`.
- Pendant la vérification, aucun fichier du site n'a été modifié. Ensuite, pour N1 : `web/src/App.tsx`. Le banc d'essai (copie du projet, des flux et `server-iframe.js`) est resté dans le dossier temporaire de la session.
