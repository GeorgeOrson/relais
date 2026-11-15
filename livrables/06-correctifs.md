# 06 — Correctifs

Flux « Amélioration d'un site existant », étape 6/13. Skill utilisé : `ponytail` (le plus petit changement complet, avec un test quand la logique n'est pas triviale). Les références (S1, C3, m4…) renvoient aux livrables 03 et 04, et l'ordre suit le plan (05).

## Commits

| Dépôt | Commit | Lot |
|---|---|---|
| racine | `69a13f8` | Lots 1 et 2 : sécurité et robustesse du serveur (`server.js`, `test.js`, `Relais.bat` pour C4) |
| `web/` | `02dc57e` | Lot 3 : interface |
| `web/` | `a5e1c19` | Lot 4 : dépendances |
| racine | `4e1d39b` | Lot 4 : `npm ci` dans `Relais.bat` |

**Écart au plan** : les lots 1 et 2 sont dans un seul commit. Ils touchent les mêmes fonctions de `server.js`, et les séparer aurait demandé un découpage à la main, morceau par morceau.

## Lot 1 — Sécurité serveur (`server.js`)

- **S1** : une seule fonction `livrable(dossier, e)` résout le chemin et exige qu'il reste sous `<dossier>/livrables/` et finisse par `.md`. Elle sert dans `lisProjet` (une étape invalide ne change jamais de statut, et elle est marquée `invalide`), dans `agis` (lancer, copier, refaire et valider sont refusés) et dans `/api/livrable`. « Refaire » ne voit donc plus que des `.md` : la boucle infinie n'est plus possible.
- **S3** : `ouvreTerminal` lance `wt.exe -d .` avec `cwd: dossier`. Le repli passe par `cmd /c start "" cmd /k claude …`, lui aussi avec `cwd`. Le chemin n'apparaît plus dans aucune ligne de commande. À la création, les noms qui contiennent `& ^ % ; !` sont refusés, de même que les noms réservés de Windows (`CON`, `NUL`, `COM1`, `nul.txt`…).
- **S2** :
  - `consigne()` nettoie les champs repris de `etat.json` (`propre()` : caractères imprimables seulement, longueurs de `nettoieEtapes`). Les flux sont nettoyés dès leur lecture : `listeFlux` les fait passer par `nettoieEtapes`.
  - La route `/api/projet` (fonction `projet()`) renvoie `{ confirmer: { flux, etapes } }` quand le dossier rattaché a déjà un `etat.json` et ne figure pas dans `projets.json`. L'interface demande alors une confirmation avec `use-confirm`, puis renvoie la requête avec `confirme: true`.
- **S4 / S5** :
  - En-têtes `X-Frame-Options: DENY`, `CSP frame-ancestors 'none'`, `nosniff` et `Referrer-Policy: no-referrer` sur toutes les réponses.
  - Les requêtes `/api/` dont `Sec-Fetch-Site` vaut `cross-site` ou `same-site` sont refusées.
  - Sur les POST, `Origin` doit valoir `http://localhost:4748` ou `http://127.0.0.1:4748`. Le contrôle de Host et l'en-tête `x-relais` restent en place.
- **S7** : la réponse dit seulement « Erreur interne ». Le détail ne sort que dans la console.
- **S8 / m12** : `req.destroy()` au-delà de 1 Mo.

## Lot 2 — Robustesse serveur (`server.js`, `Relais.bat`)

- **C2** : un écouteur `error` sur le flux de lecture des fichiers statiques détruit la réponse au lieu d'arrêter Node.
- **C3** :
  - `registre()` ignore un `projets.json` qui n'est pas un tableau.
  - Un `etat.json` incomplet donne `{ introuvable, abime }`.
  - `/api/data` isole chaque projet dans un `try`.
  - Un flux abîmé est ignoré.
  - Une erreur d'écriture dans `lisProjet` pendant un GET est journalisée sans faire échouer la requête.
- **C4** : en cas d'`EADDRINUSE`, le serveur interroge le port. Si la réponse porte l'en-tête `x-relais: 1`, il affiche « Relais tourne déjà » et ouvre la page. Sinon, il affiche un message clair et sort avec le code 1. `Relais.bat` lance maintenant `node server.js || pause`, pour que ce message reste visible.
- **M2** : « Trouver un skill » écrit sa consigne dans `%TEMP%\relais-trouver-skill`, plus dans le dossier de Relais.
- **M4** : `/api/livrable` répond « Le livrable … n'existe plus » quand le fichier manque. Une étape `valide` dont le livrable a disparu repasse à « à faire ».
- **Mode auto** :
  - **m4** : seule une étape `en-cours` est validée d'office, donc une étape « À valider » le reste.
  - **M5** : au lancement, toutes les étapes visées passent à `en-cours`.
- **M6** : `ouvreTerminal` renvoie une promesse. Les deux `spawn` ont un écouteur `error`. En cas d'échec, l'action répond « Le terminal n'a pas pu s'ouvrir. La consigne est prête : copie-la… ».
- **Mineurs** :
  - **m3** : « Nouveau » devient l'id `nouveau-flux`, et l'id `nouveau` est refusé.
  - **m5** : la réponse porte `info` (« le flux choisi est ignoré »), affichée dans un toast.
  - **m8** : voir S3.
  - **m9** : repli `etape` quand le slug est vide.
  - **m10** : `cle()` compare les chemins sans tenir compte de la casse ni du séparateur final, et `connu` renvoie le chemin enregistré. Un `parent` ou un `existant` relatif est refusé.
  - **m11** : « Le retour n° N ne renvoie à aucune étape. »
  - **m13** : un échec de PowerShell renvoie une erreur (« Tape le chemin à la main ») au lieu de passer pour une annulation.

## Lot 3 — Interface (`web/src`)

- **C1** : la racine `<Command>` est ajoutée dans `CommandDialog` (`ui/command.tsx`).
- **Error boundary** : la classe `Garde` dans `App.tsx` entoure chaque vue (clé = route). Elle affiche « Cet écran a rencontré une erreur » avec les boutons « Recharger » et « Retour à l'accueil ». **m2** : `decodeURIComponent` est protégé dans `use-route.ts`.
- **M1** : quand le serveur ne répond plus après le premier chargement, un bandeau « Le serveur Relais ne répond plus. Relance `Relais.bat`. » s'affiche. La vue est placée dans un `<fieldset disabled>` qui désactive ses boutons, et le bouton « Nouveau projet » de l'en-tête est désactivé aussi.
- **Brouillon de l'Atelier** :
  - `use-route.ts` gagne une garde de navigation (`setGarde`). Elle passe par `va()` et par un écouteur de clic sur les liens `#/`, ce qui couvre « Fermer », la barre latérale et la palette.
  - L'Atelier l'installe avec « Quitter sans enregistrer ? » et ajoute un `beforeunload`.
  - Si le flux disparaît, l'éditeur reste ouvert avec le bandeau « Ce flux a été supprimé. Enregistre pour le recréer. », et « Enregistrer » reste actif.
- **M3 / M4 / M9** : « Trouver un skill » (projet et Atelier) n'affiche plus de succès après un échec. « Voir le livrable » et « Supprimer le flux » affichent l'erreur.
- **M5** : en mode auto, une étape en cours affiche « Session en cours » à côté de « Rouvrir dans Claude Code ».
- **S1, partie interface** : une étape `invalide` affiche un message au lieu de ses boutons.
- **m14** : sur l'Accueil, les cartes « Dossier introuvable » ou « État illisible » ont un bouton « Retirer de la liste », avec confirmation.
- **Mineurs** :
  - **m1** : le hook `use-calme.ts` (`useSyncExternalStore`) sert dans `App.tsx` et `reseau.tsx`.
  - **m6** : le nom est vide en mode dossier existant.
  - **m7** : erreur sous « Nom » si le message parle du nom, sous « Dossier » s'il parle de dossier ou de chemin.
  - **m8** : l'aperçu applique le même nettoyage que le serveur.
  - **c1** : la ligne de la piste est maintenant un trait CSS, parce que `y2` n'accepte pas `calc()`.
  - **c2** : le compteur ne compte que les skills masqués encore installés, dans Skills comme dans l'Atelier.
  - **c3** : seule la réponse au dernier appel compte, et l'intervalle ne relance pas d'appel tant qu'un autre est en cours.
- **UX m2** : la boîte « Nouveau projet » présélectionne le flux de la page Flux ou Projet affichée. La ligne d'aide vide sous « Dossier » n'est plus rendue.
- **Hors plan, ajouté (code M7)** : en mode « dossier existant », le champ ne propose plus `Documents\Projets`. Ce dossier pouvait être transformé en projet par erreur. Le plan ne reprenait pas M7, mais le changement tient en une ligne et évite d'abîmer des données.
- **Grilles (UX B2, M1, m7)** :
  - `<main>` devient un `@container`.
  - Atelier : `@5xl:grid-cols-[…]`, et `useLarge` mesure la zone principale au lieu de la fenêtre.
  - Accueil : `@xl:grid-cols-2 @4xl:grid-cols-3`.
- **Thème (UX M7)** : « system » par défaut. `class="dark"` est retiré de `index.html`, et un script en ligne applique le thème avant le premier affichage.

## Lot 4 — Dépendances

- `cn@0.5.2` est retiré. `lib/utils.ts` utilise maintenant `clsx` + `tailwind-merge`, et les 20 composants `ui/` importent `@/lib/utils`.
- `shadcn` passe en `devDependencies`.
- `npm audit fix` sans `--force` n'a rien corrigé. **Les 12 alertes restent** (2 faibles, 10 modérées), toutes dans des outils de développement (`shadcn` CLI, `typescript-eslint`). Les corriger demanderait `--force`, que le plan exclut.
- `Relais.bat` utilise `npm ci`.

## Vérifications

- **`node test.js`** : `OK`, `OK statique`, `OK correctifs`, `OK http`.
  - Un test existant a changé : le mode auto ne valide plus d'office une étape « À valider » (m4, voulu).
  - Tests ajoutés pour S1 (chemins refusés, pas de boucle, rien de renommé), S2 (pas de ligne injectée, longueur bornée, confirmation, état gardé), S3/m8, m3, m9, m10, m11, m4/M5, M4 et C3 (état, registre et flux abîmés).
  - Des tests HTTP lancent `handle` sur un port libre : en-têtes S4, refus `cross-site` et `same-site`, `Origin` absent ou étranger, Host, `/api/livrable`, corps de plus de 1 Mo.
- Les 5 vrais flux se chargent toujours, et les 13 étapes du projet Relais passent le contrôle S1 (vérifié en lecture seule).
- **Interface** : `tsc -b` passe. `eslint` ne signale que les 2 erreurs qui existaient déjà (`use-mobile.ts`, `use-relais.tsx`). `vite build` réussit dans un dossier temporaire.
- **Navigateur**, sur un banc d'essai : le nouveau `server.js` et la compilation temporaire servis sur le port 4799, avec des données de test et `RELAIS_DRY`. Contrôles faits :
  - la palette s'ouvre (Ctrl+K), cherche et ouvre un projet (C1) ;
  - le thème « Système » est appliqué ;
  - le bouton « Retirer de la liste » s'affiche sur un projet introuvable ;
  - une ancre `#/projet/%E0` mène à l'Accueil au lieu d'un écran vide ;
  - l'Atelier passe à 3 colonnes (260 / 573 / 320 px) sans défilement horizontal, avec une zone principale de 1265 px.

## Ce qui n'a pas été vérifié

- **`web/dist` n'a pas été recompilé, et le serveur en cours (PID 24388) tourne toujours avec l'ancien code.** Le plan prévoit d'arrêter le serveur avant de compiler, mais l'arrêt a été refusé par les permissions. À faire à la main :
  1. fermer la fenêtre Relais ;
  2. lancer `npm run build` dans `web/` ;
  3. relancer `Relais.bat`.
- **Contrôles du navigateur non faits** : une autre extension de Chrome a bloqué toutes les actions au milieu de la vérification. Il reste à vérifier : la confirmation « Quitter sans enregistrer ? », le bandeau de coupure du serveur, la confirmation de rattachement d'un dossier étranger, et l'affichage à 390 px.
- **Ouverture réelle du terminal** (`wt -d .` avec `cwd`, et le repli `cmd`) : pas testée, pour ne pas ouvrir de fenêtres. Le contournement S3 est fermé par construction, puisque le chemin n'est plus dans la ligne de commande. Il reste à confirmer à l'étape 13 que Windows Terminal ouvre bien le bon dossier.

## Fichiers créés ou modifiés

- Racine : `server.js`, `test.js`, `Relais.bat`, `livrables/06-correctifs.md`.
- `web/` :
  - `index.html`, `package.json`, `package-lock.json` ;
  - `src/App.tsx`, `src/lib/utils.ts`, `src/lib/relais.ts` ;
  - `src/hooks/use-calme.ts` (nouveau), `src/hooks/use-route.ts`, `src/hooks/use-relais.tsx` ;
  - `src/components/theme-provider.tsx`, `src/components/nouveau-projet.tsx`, `src/components/reseau.tsx` ;
  - `src/components/ui/command.tsx` et les 19 autres composants `ui/` (import de `cn` seulement) ;
  - `src/pages/accueil.tsx`, `src/pages/atelier.tsx`, `src/pages/projet.tsx`, `src/pages/skills.tsx`.
