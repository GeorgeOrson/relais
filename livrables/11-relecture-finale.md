# 11 — Relecture finale

Flux « Amélioration d'un site existant », étape 11/13. Skill utilisé : `code-review` (niveau high), lancé sur le dépôt racine (`9c5b526..HEAD`). L'interface est relue à la main (dépôt `web/`, `c1b3c79..HEAD`).

## Périmètre relu

| Dépôt | Plage | Fichiers |
|---|---|---|
| racine | `9c5b526..fa95cbb` (étapes 6, 9, 10) | `server.js`, `test.js`, `Relais.bat` |
| `web/` | `c1b3c79..8e4bfdb` (étapes 6 à 10) | `src/App.tsx`, `src/hooks/*`, `src/lib/*`, `src/pages/*`, `src/components/*` (dont `ui/*` : imports seulement), `index.html`, `package.json` |

Vérifications lancées :
- `node test.js` : tout passe (OK, statique, correctifs, http).
- `npx tsc -b` dans `web/` : aucune erreur.
- `npx eslint src` dans `web/` : 2 erreurs `react-hooks/set-state-in-effect`, dans `use-mobile.ts:14` et `use-relais.tsx:55`. Elles existaient avant le flux : ce ne sont pas des régressions.

Cette étape ne modifie aucun fichier. Les corrections reviennent à l'étape suivante.

## Problèmes trouvés, classés par gravité

### Grave

**G1. Le mode auto valide d'office des étapes « À valider »** (`server.js:318`, `agis`). *Vérifié par un essai.*
En mode auto, « lancer » ou « copier » met toutes les étapes restantes en `en-cours`, y compris celles qui sont déjà `termine`. Au rafraîchissement suivant, `lisProjet` voit le livrable présent et le statut `en-cours`, et passe ces étapes en `valide`. Cela défait la règle m4 de l'étape 6 (« le mode auto ne valide que ce que sa session a écrit »).
Essai : étapes `[a-faire, termine, a-faire]`, passage en auto, puis « copier » sur l'étape 1. Résultat : `[en-cours, valide, en-cours]`.
→ Exclure les étapes `termine` de la mise en `en-cours` (ou ne marquer que les étapes `a-faire`).

### Moyen

**M1. Une étape `invalide` bloque tout le projet** (`server.js:308`).
`agis` refuse toutes les actions sur une étape invalide, y compris « sauter » et « refaire ». Comme elle n'est jamais `valide` ni `saute`, elle reste l'étape courante : les étapes suivantes deviennent inaccessibles. Le contrôle `dans()` tient compte de la casse, ce qui ajoute des faux positifs sous Windows (`Livrables/01-x.md`, `.MD`).
→ Autoriser « sauter » sur une étape invalide, et comparer les chemins sans tenir compte de la casse (comme `cle()`).

**M2. Les consignes perdent les retours à la ligne** (`server.js:28`, `propre`).
`propre()` remplace aussi `\n` par une espace. Or `consigne()` l'applique à `objectif`, à `livrable` et à la note des retours. Une liste à puces écrite dans l'Atelier arrive sur une seule ligne dans `.relais/consigne.md`. Avant l'étape 6, `texte()` gardait les sauts de ligne.
→ Garder `\n` (et `\t`) dans `propre`, ou l'appliquer seulement au titre et aux noms.

**M3. Un dossier Relais venu d'ailleurs peut être rattaché sans confirmation** (`server.js:414`, `projet`).
La confirmation « Rattacher ce dossier ? » ne se déclenche que par le champ `existant`. Si on crée un nouveau projet (nom + dossier parent) et que le dossier visé existe déjà avec un `.relais/etat.json`, `creeProjet` le rattache en silence, sans confirmation ni message d'information.
→ Dans `projet()`, calculer le dossier final dans les deux cas avant de tester `etat.json`.

**M4. Une requête trop grosse ne reçoit pas son message d'erreur** (`server.js:408`, `body`).
`req.destroy()` ferme le socket juste après le rejet. La réponse 400 « Requête trop grosse. » ne part donc jamais, et le client voit une erreur réseau. Défaut préexistant au passage : les morceaux reçus sont collés comme des chaînes, ce qui peut abîmer un caractère accentué coupé entre deux morceaux.
→ `req.setEncoding('utf8')`, puis arrêter de lire sans détruire le socket avant l'envoi de la réponse.

### Mineur

- **m1. Un échec du terminal laisse l'étape `en-cours`** (`server.js:432`). Le message dit « La consigne est prête : copie-la », mais la réponse 400 ne contient pas la consigne. L'utilisateur doit penser à cliquer sur « Copier la consigne ».
- **m2. Les flux abîmés disparaissent sans trace** (`server.js:50`, `listeFlux`). Un flux qui ne passe plus `nettoieEtapes` (par exemple un retour vers l'étape juste avant) est ignoré sans message dans la console. Un fichier sans `id` est gardé avec `id: undefined`.
- **m3. `fichier` est tronqué à 200 caractères dans la consigne** (`server.js:245`) alors que `lisProjet` surveille le chemin complet. Cela ne concerne qu'un `etat.json` importé, avec un chemin très long.
- **m4. L'interdiction de `& ^ % ; !` dans le nom ne sert plus** (`server.js:218-219`). Le dossier ne passe plus que par `cwd`, et `existant` et `parent` acceptent ces caractères. La règle gêne (« R&D » est refusé) sans rien protéger.
- **m5. Les flux sont relus et revalidés à chaque appel `/api/data`** (toutes les 4 s), sans cache, contrairement à `skills()`.
- **m6. `supprimeFlux` garde sa propre copie de l'expression `ID`** (`server.js:139`) : les deux règles peuvent diverger.
- **m7. Après la désactivation du mode auto, les étapes suivantes restent `en-cours`** (`regleAuto`). L'affichage est trompeur (« Rouvrir dans Claude Code » sur une étape jamais lancée), mais le fonctionnement reste juste.
- **m8. Le bouton « précédent » du navigateur ne passe pas par la garde de l'Atelier** (`web/src/hooks/use-route.ts`). Seuls les liens internes et `va()` demandent confirmation : un brouillon peut se perdre par l'historique. C'est une limite de la protection ajoutée à l'étape 6, pas une régression.

### Relu sans problème trouvé

- Interface : protection contre les réponses lentes dans `use-relais.tsx`, `Garde` (error boundary) remis à zéro à chaque route, bandeau de coupure du serveur avec `fieldset disabled`, thème appliqué dès `index.html` (clé `relais-theme` identique dans `theme-provider.tsx`), mise en pause des animations SMIL et du fond (`useCalme`, IntersectionObserver), `cn` refait avec clsx et tailwind-merge.
- Serveur : en-têtes de sécurité, contrôles `Origin` et `Sec-Fetch-Site` (sans proxy Vite, donc sans conflit en développement), comparaison des chemins sans casse dans le registre, démarrage avec port déjà pris.
- « Session en cours » à côté de « Rouvrir dans Claude Code » en mode auto est voulu (M5 de l'étape 6).

## Note sur la vérification

Pour vérifier G1, un essai a lancé `server.js` sans `RELAIS_DATA`, et a donc inscrit un projet temporaire dans le vrai `projets.json`. L'entrée a été retirée et le dossier temporaire supprimé : `projets.json` contient de nouveau seulement `C:\Users\<utilisateur>\Documents\Relais`.

## Fichiers

- Créé : `livrables/11-relecture-finale.md`.
- Modifié pendant l'essai puis remis en état : `projets.json` (non suivi par git).
- Aucun fichier de code modifié.

## Recommandation pour la suite

Corriger d'abord G1, M1, M2 et M3, chacun avec un test dans `test.js`. M4 et les points mineurs peuvent se faire dans le même lot s'il reste du temps.
