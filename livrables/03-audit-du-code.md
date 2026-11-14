# 03 — Audit du code

Flux « Amélioration d'un site existant », étape 3/13. Skill utilisé : `code-review` (niveau high). **Aucun fichier du site n'a été modifié.**

## Méthode

- Le skill `code-review` relit un diff. Les deux dépôts sont propres (racine `cf8c41e`, `web/` `9ba58d5`), donc il n'a relu que les livrables 01 et 02, en les confrontant au code. Ses remarques utiles sont reprises ci-dessous (marquées « revue »).
- Relecture complète faite à la main, ligne à ligne : `server.js`, `skills.js`, `test.js`, `Relais.bat`, et dans `web/src/` : `App.tsx`, `main.tsx`, `hooks/*`, `lib/*`, `pages/*`, `components/*` (pour `components/ui/*`, seulement `command.tsx`, `dialog.tsx` et le paquet `cn`).
- Vérifications exécutées, sans rien écrire dans le projet : `node test.js` passe (« OK », « OK statique »). Un script lancé sur des dossiers temporaires confirme C3 (état corrompu : `etat.etapes is not iterable`), m3 (`slug('Nouveau') === 'nouveau'`) et m9 (un titre « 日本 » donne un slug vide).
- Les numéros de ligne renvoient aux fichiers tels qu'ils sont au commit initial.

Gravités : **Critique** (plantage, perte de données ou écran vide), **Majeur** (fonction qui donne un faux résultat ou échoue sans rien dire), **Mineur** (cas limite mal géré), **Cosmétique**.

## Synthèse

| Gravité | Nombre |
|---|---|
| Critique | 4 |
| Majeur | 9 |
| Mineur | 14 |
| Cosmétique | 3 |

Les trois urgences sont la palette de commandes, qui plante toute l'interface, un `etat.json` illisible, qui suffit à bloquer tous les projets, et deux erreurs non gérées qui peuvent arrêter le serveur.

## Critiques

**C1. La palette de commandes plante toute l'application.** (déjà B1 dans l'audit UX, cause confirmée)
- `web/src/components/ui/command.tsx:33-63` : `CommandDialog` met ses enfants dans `DialogContent` sans la racine `<Command>` de cmdk, donc `CommandInput` et `CommandList` n'ont pas de contexte (`reading 'subscribe'`).
- Aucune error boundary n'existe (`App.tsx`, `main.tsx`), donc une seule exception de rendu vide tout `#root`.
- Correctif à placer dans `CommandDialog`, pas dans `command-menu.tsx`, pour que tous les usages en profitent (revue).

**C2. Le serveur peut s'arrêter sur une erreur de lecture d'un fichier statique.** (revue)
- `server.js:381` : `fs.createReadStream(file).pipe(res)` n'a pas d'écouteur `error`. Si le fichier disparaît ou est verrouillé entre `fichierStatique()` et la lecture (par exemple pendant un `npm run build` qui réécrit `web/dist`, ou sur un EBUSY Windows), l'erreur n'est pas gérée et Node s'arrête.
- C'est une explication plausible de l'arrêt du serveur noté pendant l'audit UX.

**C3. Un seul `etat.json` abîmé bloque tous les projets.**
- `server.js:161` : `lisProjet` parcourt `etat.etapes` sans rien vérifier. Un `etat.json` lisible mais incomplet (sans `etapes`, ou une étape sans `fichier`) lève une `TypeError`.
- `server.js:384` : `/api/data` appelle `registre().map(lisProjet)`, donc l'exception fait échouer toute la réponse (500). Au premier chargement, l'interface affiche « Le serveur Relais ne répond pas ». Ensuite, elle garde des données figées sans rien signaler (voir M1).
- Même effet si `projets.json` contient autre chose qu'un tableau (`server.js:132`, `.map` sur un objet), si un flux n'a pas de `nom` (`server.js:45`, `a.nom.localeCompare`) ou si le dossier d'un projet est en lecture seule (`sauve` appelé dans un GET, `server.js:170`).

**C4. Port déjà pris : le serveur plante au démarrage.** (revue)
- `server.js:405` : `listen` n'a pas de gestionnaire `error`. Si une instance tourne déjà sur 4748, `Relais.bat` affiche une pile d'erreur EADDRINUSE et se ferme, sans ouvrir le navigateur ni expliquer quoi faire.
- Au moment de cet audit, une instance écoute sur 127.0.0.1:4748 (PID 12684). C'est sans doute celle qui pilote ce flux : je ne l'ai pas arrêtée.

## Majeurs

**M1. Si le serveur s'arrête après le premier chargement, rien ne le signale.**
- `web/src/hooks/use-relais.tsx:36-43` enregistre l'erreur, mais `App.tsx:70` n'affiche l'écran d'erreur que si `!data`. Une fois des données reçues, l'interface reste figée sur un état périmé. Les boutons échouent un par un, ou pas du tout (voir M4).

**M2. « Trouver un skill » écrase la consigne du projet Relais.**
- `server.js:319` : `trouveSkill` écrit `.relais/consigne.md` dans `__dirname`, c'est-à-dire dans le dossier de Relais. Comme Relais est lui-même un projet suivi par Relais, ce clic remplace la consigne de l'étape en cours (ce fichier-ci) et ouvre Claude dans le dépôt de Relais.

**M3. Message de succès affiché même quand l'action échoue.**
- `web/src/pages/atelier.tsx:627-628` et `web/src/pages/projet.tsx:69-70` : `await api(...).catch(toast.error)`, puis `toast("Claude Code s'ouvre…")` sans condition. En cas d'erreur, l'utilisateur voit l'erreur puis l'annonce de succès.

**M4. « Voir le livrable » échoue sans rien dire.**
- `web/src/pages/projet.tsx:45-47` : l'appel n'est pas dans le `try/catch` du reste de `agis`, donc une erreur devient une promesse rejetée non gérée, sans toast.
- Côté serveur, `server.js:389` fait un `readFileSync` sans vérifier l'existence du fichier, donc un livrable absent donne un 500 « Erreur interne ».
- Ce cas arrive en pratique : `server.js:164` ne revérifie jamais une étape `valide`. Si son livrable est supprimé ou renommé à la main, l'étape reste validée et « Voir » ne marche plus.

**M5. Mode automatique : l'interface propose de relancer une session déjà en cours.**
- `server.js:262` ne passe en `en-cours` que la première étape visée. Dès que Claude écrit le premier livrable, `lisProjet` la valide (`server.js:165`) et l'étape suivante, toujours `a-faire`, devient la courante.
- `web/src/pages/projet.tsx:282` affiche alors « Lancer tout le flux » alors que la session enchaîne déjà les étapes. Un clic ouvre une seconde session de Claude Code en parallèle, dans le même dossier.

**M6. L'échec de l'ouverture du terminal n'est pas signalé.**
- `server.js:236-242` : `ouvreTerminal` ne renvoie rien. Si `wt.exe` puis `cmd` échouent, l'étape est quand même marquée `en-cours` et l'interface affiche « Claude Code s'ouvre ».
- `server.js:238` : le `spawn` du repli `cmd` n'a pas d'écouteur `error`. S'il échoue, l'erreur n'est pas gérée et le serveur s'arrête.

**M7. « Utiliser un dossier existant » propose par défaut le dossier parent.**
- `web/src/components/nouveau-projet.tsx:33` remplit le champ avec `data.parent` (`Documents\Projets`). Si l'utilisateur active « Utiliser un dossier existant » sans le changer, `server.js:178-189` transforme tout `Documents\Projets` en projet (`.relais/`, `livrables/`, `FLUX.md`), et l'aperçu `Projet : …\Projets` (`nouveau-projet.tsx:79`) ne l'en empêche pas.

**M8. Brouillon de l'Atelier perdu sans avertissement.** (déjà M5 dans l'audit UX)
- `web/src/pages/atelier.tsx:283-285` : il n'y a ni confirmation ni `beforeunload`. S'y ajoute un cas propre au code : si le flux disparaît des données pendant l'édition (supprimé dans un autre onglet), `atelier.tsx:108` remplace l'éditeur par « Flux introuvable » et le brouillon est perdu.

**M9. Supprimer un flux : une erreur ne s'affiche pas.**
- `web/src/pages/atelier.tsx:207-214` : `api("/api/flux/supprimer")` n'a pas de `try/catch`. En cas d'échec, il n'y a aucun message, la promesse rejetée n'est pas gérée et l'utilisateur reste sur l'éditeur sans savoir si le flux est supprimé.

## Mineurs

**m1. « Moins d'animations » n'est lu qu'une fois.** (revue) `web/src/App.tsx:31` (`useMemo(..., [])`) et `web/src/components/reseau.tsx:20,109` lisent `prefers-reduced-motion` au montage ou au dessin, sans écouter ses changements. Un changement du réglage Windows ne compte qu'après un rechargement.

**m2. Ancre d'URL mal formée : écran vide.** `web/src/hooks/use-route.ts:12` : `decodeURIComponent` lève une `URIError` sur une ancre comme `#/projet/%E0`, et sans error boundary toute l'interface disparaît.

**m3. Un flux nommé « Nouveau » ne peut plus être ouvert.** `server.js:115` lui donne l'id `nouveau`, que `web/src/pages/atelier.tsx:108` et `hooks/use-route.ts` (`#/flux/nouveau`) réservent à la création. « Modifier » ouvre alors un flux vierge.

**m4. Activer le mode automatique valide d'office les étapes « À valider ».** `server.js:165` : au rafraîchissement suivant, toute étape `termine` passe à `valide`, sans confirmation (`web/src/pages/projet.tsx:213`). Désactiver le mode ne revient pas en arrière.

**m5. Rattacher un dossier Relais existant ignore le flux choisi sans rien dire.** `server.js:186` garde l'ancien état, alors que la boîte de dialogue laisse choisir un flux et un mode. Seul `test.js` l'indique.

**m6. Le nom saisi est envoyé même en mode « dossier existant ».** `web/src/components/nouveau-projet.tsx:63` : un nom tapé puis masqué par l'interrupteur devient le nom du projet rattaché (`server.js:191`).

**m7. Erreurs affichées sous le mauvais champ.** `web/src/components/nouveau-projet.tsx:73` : la regex `/dossier|FLUX/i` attrape aussi « Flux inconnu. », qui s'affiche sous « Dossier ».

**m8. L'aperçu du chemin ne correspond pas au dossier créé.** `nouveau-projet.tsx:79` montre le nom brut (« Essai: site? »), alors que `server.js:182` retire les caractères interdits (« Essai site »). Les noms réservés de Windows (`CON`, `NUL`, `AUX`…) ne sont pas filtrés : `mkdirSync` échoue et renvoie un 500 « Erreur interne » au lieu d'un message clair.

**m9. Titre d'étape sans lettre latine : livrable `01-.md`.** `server.js:195` construit le nom de fichier avec `slug(e.titre)`, qui peut être vide (« 日本 », « 🚀 »), alors que `ids()` (`server.js:55`) prévoit bien le repli `etape`.

**m10. Doublons possibles dans `projets.json`.** `server.js:179,200` compare les chemins comme des chaînes. Sous Windows, `C:\X` et `c:\x\` désignent le même dossier mais créent deux entrées. Un `parent` relatif est aussi résolu depuis le dossier où tourne le serveur (`server.js:184`).

**m11. Retour sans cible : message d'erreur trompeur.** `web/src/pages/atelier.tsx:190` envoie `retour: ""` quand la cible est inconnue. `server.js:77` teste `if (e.retour)`, prend l'élément pour une étape et répond « L'étape N n'a pas de titre ».

**m12. Requête trop grosse mal coupée.** `server.js:351` rejette la promesse au-delà de 1 Mo, mais continue de lire et d'accumuler le corps, puis appelle `resolve` à la fin (sans effet). La requête n'est pas interrompue (`req.destroy()`).

**m13. Les erreurs du sélecteur de dossier passent pour une annulation.** `server.js:313` : un échec de PowerShell renvoie `{ annule: true }`, et l'interface (`nouveau-projet.tsx`) ne dit rien.

**m14. L'Accueil ne permet pas de retirer un projet introuvable.** La route `/api/projet/retirer` (`server.js:360`) existe mais aucune vue ne l'appelle. Une carte « Dossier introuvable » (`web/src/pages/accueil.tsx:48-54`) reste affichée pour toujours.

## Cosmétiques

**c1. La ligne verticale de la piste ne s'affiche pas.** `web/src/pages/atelier.tsx:464` : `y2="calc(100% - 24px)"` n'est pas une valeur valide pour l'attribut SVG `y2` (ce n'est pas une propriété CSS), donc la ligne pointillée qui relie les cartes n'est pas tracée comme prévu.

**c2. Compteur de skills visibles faux.** `web/src/pages/skills.tsx:36` : `skills.length - masques.size` compte aussi les skills masqués qui ont depuis été désinstallés.

**c3. Rafraîchissements qui se chevauchent.** `web/src/hooks/use-relais.tsx:47` lance un appel toutes les 4 s sans attendre la fin du précédent. Une réponse lente peut arriver après une plus récente et afficher un état plus ancien quelques secondes.

## Corrections à apporter aux livrables précédents (revue)

- Audit UX m6 : le `SidebarFooter` masqué en mode icônes est à `app-sidebar.tsx:124`, pas à la ligne 131.
- Audit UX B2 : le squelette de chargement (`atelier.tsx:101`, `lg:grid-cols-[260px_1fr_320px]`) a le même défaut que la ligne 309. B2 et m7 viennent de la même cause : les grilles changent selon la largeur de la fenêtre et ignorent les 256 px de la barre latérale. Des container queries sur la zone principale régleraient les deux.
- Audit UX M7 : le choix du sombre par défaut est voulu (commentaire de `theme-provider.tsx`). Passer à « system » demande aussi de retirer `class="dark"` de `index.html` et d'appliquer le thème avant le premier affichage, sinon chaque chargement en thème clair commence par un éclair sombre.
- Cadrage : `Relais.bat` ne recompile `web/dist` que si `index.html` est absent. Le recompilage « après validation de chaque étape » devra donc être fait à la main (`npm run build` dans `web/`), et de préférence serveur arrêté, à cause de C2.

## Ce qui va bien

- Contrôle de l'en-tête Host et de `x-relais` sur tous les POST. Fichiers statiques bornés à `web/dist`, ce que couvre `test.js`.
- Le sélecteur de dossier passe le chemin de départ par une variable d'environnement, jamais dans le texte du script PowerShell.
- La logique des retours (`verifieRetours`, `deroule`) est la même côté serveur et côté interface, et elle est testée.
- Le serveur ne fait que des écritures synchrones, donc pas de course entre le rafraîchissement et les actions.

## Fichiers créés ou modifiés

- `livrables/03-audit-du-code.md` (ce fichier). Aucun autre fichier modifié.
