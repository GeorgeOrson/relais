# 05 — Plan d'amélioration

Flux « Amélioration d'un site existant », étape 5/13. Skill utilisé : `grilling`. Les trois audits (02 UX/UI, 03 code, 04 sécurité) ont été croisés, puis chaque arbitrage a été tranché avec l'utilisateur, une question à la fois (13 questions, toutes validées). **Aucun fichier du site n'a été modifié.**

Les références (B1, C3, S1…) renvoient aux livrables 02, 03 et 04. « UX » désigne l'audit 02, « code » l'audit 03.

## Principe de partage (Q1)

- **Étape 6, Correctifs** : tout ce qui plante, perd des données, échoue sans rien dire ou ouvre une faille. S'y ajoutent deux corrections de mise en page qui ne dépendent pas du style : les grilles de l'Atelier et le thème qui suit Windows.
- **Étapes 7-8, Système de design et Refonte** : tout ce qui est visuel. On ne corrige pas deux fois ce que la refonte remplace.
- **Étape 9, Textes** : les libellés et les consignes.

## Étape 6 — Correctifs, dans l'ordre (Q12)

Quatre lots, avec un commit local par lot dans le dépôt concerné (racine ou `web/`).

### Lot 1 — Sécurité serveur (`server.js`)

1. **S1** : un seul contrôle pour chaque `fichier`, utilisé par `lisProjet`, `agis` et `/api/livrable`. Le chemin résolu doit rester sous `<dossier>/livrables/` et finir par `.md`. Sinon, l'étape est marquée invalide, sans lecture ni renommage. « Refaire » refuse avant la boucle un fichier qui ne finit pas par `.md`.
2. **S3** : le terminal est lancé avec `cwd: dossier` au lieu de mettre le chemin dans la ligne de commande. Le repli passe par `cmd /k`, et `wt.exe` reçoit `-d .`. À la création, les noms contenant `& ^ % ; !` ou un nom réservé de Windows (`CON`, `NUL`, `AUX`…) sont refusés.
3. **S2** : avant d'écrire la consigne, les champs repris de `etat.json` et des flux sont nettoyés : caractères imprimables seulement, longueurs de `nettoieEtapes`. Le rattachement d'un dossier qui a déjà un `etat.json` et qui n'est pas dans `projets.json` demande une confirmation. Elle utilise `use-confirm`, l'outil de confirmation déjà présent dans l'interface, et liste les titres d'étapes trouvés (Q2).
4. **S4 / S5** :
   - en-têtes `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` et `Referrer-Policy: no-referrer` ;
   - refus des requêtes `/api/` venues d'un autre site (`Sec-Fetch-Site` à `cross-site` ou `same-site`) ;
   - `Origin` obligatoire et égal à `http://localhost:4748` ou `http://127.0.0.1:4748` sur les POST ;
   - le contrôle de l'en-tête Host et l'en-tête `x-relais` restent en place.
5. **S7** : les erreurs internes renvoient « Erreur interne » sans détail. Le détail part dans `console.error`.
6. **S8 / code m12** : `req.destroy()` au-delà de 1 Mo.

### Lot 2 — Robustesse serveur (`server.js`)

1. **C2** : écouteur `error` sur la lecture des fichiers statiques.
2. **C3** : un `etat.json`, un `projets.json` ou un flux abîmé ne fait plus échouer `/api/data`. Le projet concerné est signalé, les autres s'affichent. Une erreur d'écriture pendant un GET n'arrête plus le serveur.
3. **C4, option A (Q10)** : si le port 4748 est pris et que c'est bien Relais qui répond, le serveur ouvre le navigateur sur l'instance existante, affiche « Relais tourne déjà » et s'arrête proprement. Si le port est pris par un autre programme, il affiche un message clair.
4. **M2** : « Trouver un skill » n'écrit plus la consigne dans le dossier de Relais lui-même.
5. **M4** : `/api/livrable` répond par un message clair quand le fichier n'existe pas. Une étape validée dont le livrable a disparu est revérifiée.
6. **Mode auto (Q6)** :
   - **m4** : le mode auto ne valide que les étapes terminées après son activation. Celles déjà « À valider » le restent.
   - **M5** : au lancement auto, les étapes restantes passent à « en cours ». L'interface affiche « Session en cours » à la place de « Lancer tout le flux », et garde « Rouvrir dans Claude Code ».
7. **M6** : l'échec de l'ouverture du terminal est signalé. Le `spawn` du repli reçoit un écouteur `error`.
8. **Mineurs serveur (Q5)** :
   - m3 : un flux nommé « Nouveau » ne prend plus l'id réservé `nouveau` ;
   - m5 : au rattachement d'un dossier qui a déjà un flux, un message clair indique que le flux choisi est ignoré, et l'état existant n'est pas écrasé ;
   - m8 : noms réservés de Windows, avec un message clair au lieu d'un 500 ;
   - m9 : repli `etape` quand le slug est vide ;
   - m10 : chemins comparés sans tenir compte de la casse ni du séparateur final, et `parent` relatif refusé ;
   - m11 : un retour sans cible donne un message exact ;
   - m13 : une erreur du sélecteur de dossier est distinguée d'une annulation.
9. **Tests (Q11)**, ajoutés à `test.js` au fil des lots 1 et 2 : S1 (chemin refusé, plus de boucle infinie), S2 (nettoyage), S3 (noms refusés), S4/S5 (en-têtes, refus cross-site et mauvais `Origin`), C3, m3, m4, m9, m10, m11, m12.

### Lot 3 — Interface (`web/src`)

1. **C1** : la racine `<Command>` est ajoutée dans `CommandDialog` (`ui/command.tsx`).
2. **Error boundary par vue (Q9)** : encadré « Cet écran a rencontré une erreur », avec le message et les boutons « Recharger » et « Retour à l'accueil ». La barre latérale reste utilisable. Ça couvre aussi code m2 (ancre d'URL mal formée, avec `decodeURIComponent` protégé).
3. **Code M1 (Q9)** : bandeau fixe « Le serveur Relais ne répond plus. Relance `Relais.bat`. », qui disparaît dès que le serveur répond. Les boutons d'action sont désactivés pendant la coupure.
4. **Brouillon de l'Atelier (UX M5 / code M8, Q8)** :
   - `beforeunload` quand le brouillon n'est pas enregistré ;
   - confirmation « Quitter sans enregistrer ? » sur toute navigation interne (Fermer, barre latérale, palette) ;
   - si le flux disparaît pendant l'édition, l'éditeur reste ouvert avec le bandeau « Ce flux a été supprimé. Enregistre pour le recréer. ».
5. **Code M3** : plus de toast de succès après un échec. **Code M4** : « Voir le livrable » affiche l'erreur. **Code M9** : la suppression d'un flux affiche l'erreur.
6. **Code m14 (Q7)** : bouton « Retirer de la liste », avec confirmation, sur les cartes « Dossier introuvable » de l'Accueil. Il retire seulement l'entrée de `projets.json`, sans toucher aux fichiers.
7. **Mineurs de l'interface (Q5)** :
   - m1 : le réglage « moins d'animations » est suivi en direct ;
   - m6 : le nom n'est plus envoyé en mode dossier existant ;
   - m7 : l'erreur s'affiche sous le bon champ ;
   - m8 : l'aperçu du chemin correspond au dossier créé ;
   - c1 : la ligne de la piste est tracée ;
   - c2 : le compteur de skills est juste ;
   - c3 : les rafraîchissements ne se chevauchent plus.
8. **UX m2** : la boîte « Nouveau projet » présélectionne le flux qu'on regarde, et le vide sous « Dossier parent » disparaît.
9. **Grilles de l'Atelier (UX B2, UX M1, UX m7)** : container queries sur la zone principale (squelette `atelier.tsx:101` et grille `atelier.tsx:309`, grille de l'Accueil). Plus de défilement horizontal à 390 px.
10. **Thème qui suit Windows (UX M7)** : « system » par défaut. `class="dark"` est retiré de `index.html`, et le thème est appliqué avant le premier affichage, pour éviter l'éclair sombre. Le bouton de bascule reste.

### Lot 4 — Dépendances (S9, Q4)

1. `npm audit fix`, sans `--force`.
2. `shadcn` passe en `devDependencies`.
3. `cn@0.5.2` est remplacé par `clsx` + `tailwind-merge` (`lib/utils.ts`).
4. `npm ci` remplace `npm install` dans `Relais.bat`. Le lockfile est régénéré à chaque ajout de dépendance, y compris pendant la refonte.
5. `npm run build` dans `web/`, serveur arrêté, puis vérification à la main dans le navigateur. Le build TypeScript sert de garde-fou.

## Étapes 7-8 — Système de design et Refonte

- Contrastes des couleurs de flux et du titre d'accueil (UX M2, M3), libellés du réseau (UX M4).
- Thème clair soigné au même niveau que le sombre : scènes (UX M8), fond animé (UX c5).
- Animations allégées et arrêtées quand rien ne bouge : SMIL, canvas, réglage « moins d'animations » (UX M6).
- En-tête : séparateur (UX m1), doublon de titre (UX c1). Hiérarchie des boutons, un seul accent (UX m3, m4, m5).
- Thème et fond accessibles quand la barre est repliée (UX m6). Accueil à 768 px, partie visuelle (UX m7). Champs de l'Atelier (UX m8).
- Accessibilité au clavier de la bibliothèque de l'Atelier et sens du « + » (UX m9). Cibles trop petites (UX m10).
- Polices embarquées en local à la place de Google Fonts (UX m11 / S11), ce qui permettra une CSP stricte.
- Mise en page de l'Accueil (UX c2), hauteur des cartes (UX c3).
- Style de l'error boundary, du bandeau de coupure et des confirmations ajoutées à l'étape 6.

## Étape 9 — Textes

- Descriptions des skills et doublons « Grill me » / « Grilling » (UX c4).
- Consigne « Survole un neurone… » pensée pour la souris (UX m9, partie texte).
- Relecture de tous les nouveaux messages ajoutés à l'étape 6.

## Écarté

- **S6, jeton secret contre les programmes locaux (Q3)** : le PC n'a qu'un compte, S1, S2, S4 et S5 ferment le scénario grave, et un jeton casserait les onglets restés ouverts après un redémarrage.
- **Sauvegarde automatique du brouillon de l'Atelier (Q8)** : la confirmation avant de quitter suffit.
- **Outil de test pour l'interface (Q11)** : il faudrait de nouvelles dépendances. Les vérifications seront faites à la main.
- **S10 (secrets) et S12 (`.claude/` d'un dossier rattaché)** : rien à corriger. S12 reste une règle : Relais ne contourne jamais la demande de confiance de Claude Code.

## Contraintes rappelées pour la suite

- Format sur disque inchangé (`etat.json`, `FLUX.md`, `flux/*.json`, `projets.json`). Les projets créés par Relais passent tous le contrôle de S1.
- Port 4748, contrôle de l'en-tête Host et `x-relais` conservés. Serveur sans dépendance npm.
- `web/dist` est recompilé à la main (`npm run build`), serveur arrêté, après validation de chaque étape qui modifie le code.

## Fichiers créés ou modifiés

- `livrables/05-plan-d-amelioration.md` (ce fichier). Aucun autre fichier modifié.
