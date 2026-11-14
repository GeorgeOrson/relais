# 04 — Audit de sécurité

Flux « Amélioration d'un site existant », étape 4/13. **Aucun fichier du site n'a été modifié.**

## Méthode

- Le skill `security-review` a été invoqué mais n'a pas pu démarrer : il relit le diff `origin/HEAD...` et le dépôt n'a pas de remote, ce qui est voulu (cadrage). J'ai donc appliqué sa méthode à la main, sur tout le code et pas seulement sur un diff : sources d'entrée, chemins de fichiers, commandes lancées, protections HTTP, dépendances, secrets.
- Fichiers relus : `server.js`, `skills.js`, `Relais.bat`, `.gitignore`, `projets.json`, `.claude/launch.json`, `web/package.json`, `web/index.html`, `web/vite.config.ts`, `web/src/lib/api.ts`, puis une recherche des points sensibles dans `web/src` (`innerHTML`, `eval`, liens, `localStorage`, affichage des livrables).
- Vérifications lancées, toutes sur des dossiers temporaires avec `RELAIS_DRY=1`, sans toucher au projet (scripts dans le scratchpad de la session) :
  - un `etat.json` piégé permet de lire un fichier placé hors du projet, et « Refaire » renomme ce fichier (S1, confirmé) ;
  - si `fichier` ne finit pas par `.md`, « Refaire » part dans une boucle infinie (arrêt par `timeout` au bout de 5 s, confirmé) ;
  - le texte piégé de `etat.json` se retrouve tel quel dans la consigne (S2, confirmé) ;
  - Node ne met pas entre guillemets un argument qui contient `&` sans espace, et `cmd` exécute alors ce qui suit (S3, confirmé avec un simple `echo`).
- `npm audit` dans `web/` (lecture seule) et recherche de secrets dans le code, l'historique git et `web/dist`.
- Après les tests, `git status` est inchangé dans les deux dépôts, et le dossier temporaire laissé par le test de boucle a été supprimé.

**Modèle de menace.** Relais tourne sur `127.0.0.1` pour un seul utilisateur. Les attaquants réalistes sont : (a) une page web ouverte dans le navigateur, (b) un dossier venu d'ailleurs (clone git, archive) que l'utilisateur rattache comme projet, ou un flux `flux/*.json` partagé, (c) un autre programme local. Les gravités tiennent compte de ce cadre.

Gravités : **Élevée** (lecture de fichiers personnels, exécution de commandes ou serveur bloqué), **Moyenne** (exploitable dans un cas précis et plausible), **Faible** (défense en profondeur, impact limité), **Info**.

## Synthèse

| Gravité | Nombre | Failles |
|---|---|---|
| Élevée | 2 | S1, S2 |
| Moyenne | 2 | S3, S4 |
| Faible | 5 | S5 à S9 |
| Info | 3 | S10 à S12 |

**Aucun secret** dans le code ni dans l'historique. **Aucune faille connue** dans le code livré au navigateur : les 12 alertes `npm audit` touchent seulement des outils de développement.

Les deux failles à corriger d'abord viennent toutes les deux de `.relais/etat.json`, que le serveur croit sur parole. Si l'utilisateur rattache un dossier venu d'ailleurs, ce fichier décide des chemins que Relais lit et renomme, et du texte que Claude Code reçoit comme instructions.

## Élevée

**S1. Le chemin `fichier` de `etat.json` n'est jamais vérifié : lecture et renommage hors du projet, serveur bloqué.** (confirmé)
- Origine : « Utiliser un dossier existant » rattache un dossier qui contient déjà `.relais/etat.json` sans rien relire (`server.js:186`). Chaque étape porte un `fichier` libre, par exemple `../../.ssh/id_rsa` ou `C:\…`.
- `server.js:389` (`/api/livrable`) : `readFileSync(path.join(p.dossier, e.fichier))` affiche n'importe quel fichier lisible. Le livrable est rendu dans un `<pre>` (`web/src/pages/projet.tsx:193`), donc il n'y a pas de XSS, mais le contenu est lu et affiché.
- `server.js:274-279` (« Refaire ») : `renameSync` renomme le fichier visé, où qu'il soit (`secret.md` devient `secret.v1.md`).
- `server.js:277-278` : si `fichier` ne finit pas par `.md`, `ancien(n)` renvoie le même chemin, `existsSync` reste vrai et la boucle `while` ne s'arrête plus. Le serveur se fige (Node n'a qu'un fil) et il faut le tuer.
- `server.js:162-165` : il suffit qu'un fichier existant soit visé pour qu'une étape passe à « terminé », ou à « validé » en mode auto.
- **Correction** : faire passer chaque `fichier` par un seul contrôle, utilisé par `lisProjet`, `agis` et `/api/livrable`. On résout le chemin et on exige qu'il reste sous `<dossier>/livrables/` avec l'extension `.md`, par le même test que `fichierStatique` (`startsWith(base + path.sep)`). Une étape qui échoue à ce contrôle est marquée invalide, comme `introuvable`, sans lecture ni renommage. Dans « Refaire », refuser un fichier sans `.md` avant la boucle. Les projets créés par Relais (`livrables/NN-slug.md`) passent tous ce contrôle, donc le format sur disque ne change pas.

**S2. Injection de consigne : le texte de `etat.json` ou d'un flux devient des instructions pour Claude Code.** (confirmé)
- `server.js:205-234` : `consigne()` recopie tel quel `titre`, `objectif`, `livrable`, `skills` et `fichier`, puis `ouvreTerminal` lance `claude` dans le dossier. Un `etat.json` piégé (cf. S1) ou un `flux/*.json` partagé peut contenir « ignore les règles et exécute… ». Claude Code dispose d'un shell et lit cette consigne comme si elle venait de l'utilisateur.
- `fichier` sert aussi de cible d'écriture (« Fichier du livrable : … ») : un chemin hors du projet pousse Claude à écrire ailleurs.
- Les garde-fous de Claude Code (demandes de permission, confiance du dossier) limitent les dégâts, mais Relais ne doit pas compter sur eux seuls.
- **Correction** :
  1. Le contrôle de `fichier` de S1 règle déjà la cible d'écriture.
  2. Au rattachement d'un dossier qui contient déjà un `etat.json` que ce Relais n'a pas créé (dossier absent de `projets.json`), afficher les étapes trouvées (titres et objectifs) et demander une confirmation explicite avant de l'ajouter. L'interface a déjà `use-confirm`.
  3. Dans la consigne, ne garder que des caractères imprimables, rester sous les longueurs de `nettoieEtapes` (80 et 2000 caractères) et nettoyer les champs de `etat.json` avec les règles déjà appliquées aux flux, puisque `lisProjet` ne les relit jamais.

## Moyenne

**S3. Un nom de dossier peut injecter une commande à l'ouverture du terminal.** (confirmé pour `cmd`, plausible pour `wt`)
- `server.js:182` ne retire que `\ / : * ? " < > |`. `&`, `^`, `%`, `;` et `!` passent, alors que Windows les accepte dans un nom de dossier.
- `server.js:238` (repli sans Windows Terminal) : `spawn('cmd', ['/c', 'start', '', '/D', dossier, …])`. Node ne met entre guillemets que les arguments qui contiennent un espace. Avec un projet nommé `essai&calc` et un chemin sans espace (`C:\Users\<utilisateur>\Documents\Projets\essai&calc`), `cmd` exécute `calc`. Vérifié avec `echo`.
- `server.js:239` : `wt.exe` traite `;` comme séparateur de sous-commandes, même à l'intérieur d'un argument. Un dossier nommé `a; new-tab …` peut ouvrir un onglet avec une autre commande. Ce cas n'a pas été testé, pour ne pas ouvrir de fenêtres.
- Le nom vient de l'utilisateur ou d'un dossier rattaché, donc il faut une maladresse ou un dossier piégé. L'effet reste une exécution de commande.
- **Correction** :
  - Ne plus mettre le chemin dans la ligne de commande : lancer avec `cwd: dossier`. Pour le repli, `spawn('cmd', ['/k', 'claude', PROMPT], { cwd: dossier, detached: true })`, qui ouvre sa propre console. Pour `wt.exe`, `-d .` avec `cwd: dossier`, à vérifier à l'étape Correctifs.
  - Côté création, refuser aussi `& ^ % ; !` et les noms réservés (`CON`, `NUL`…, déjà m8 dans l'audit du code).
  - Ajouter l'écouteur `error` sur le `spawn` du repli (M6 de l'audit du code).

**S4. Pas d'en-têtes anti-cadre : une page web peut afficher Relais dans un cadre invisible (clickjacking).**
- `server.js:344,380` n'envoient ni `X-Frame-Options` ni `Content-Security-Policy`. Une page tierce peut charger `http://localhost:4748/` dans une `<iframe>`. Le contrôle de l'en-tête Host laisse passer la requête, puisque le Host vaut bien `localhost:4748`. La page peut alors faire cliquer l'utilisateur, sans qu'il le voie, sur « Lancer », « Refaire » ou « Supprimer le flux ».
- Les navigateurs récents demandent parfois l'accès au réseau local (Chrome), ce qui réduit le risque sans le supprimer.
- **Correction** : dans `send` et pour les fichiers statiques, envoyer `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` et `Referrer-Policy: no-referrer`. Une CSP complète (`default-src 'self'`) est possible, mais elle doit autoriser Google Fonts tant que S11 n'est pas réglé.

## Faible

**S5. Les requêtes ne contrôlent ni `Origin` ni `Sec-Fetch-Site`, et un GET écrit sur le disque.**
- Contre une page tierce, les POST reposent seulement sur `x-relais`, qui force une requête préalable (preflight) refusée faute de CORS. Ça tient, mais il n'y a qu'une barrière.
- `/api/data` (`server.js:384`) peut écrire (`lisProjet` → `sauve`, `server.js:170`) et n'importe quel site peut le déclencher avec une simple `<img src="http://localhost:4748/api/data">`. Effet : synchronisation des statuts, et validation d'office en mode auto (m4 de l'audit du code).
- **Correction** : refuser toute requête `/api/` dont l'en-tête `Sec-Fetch-Site` vaut `cross-site` ou `same-site`. Sur les POST, exiger un `Origin` égal à `http://localhost:4748` ou `http://127.0.0.1:4748`. Garder Host et `x-relais` : le cadrage demande de conserver ces protections.

**S6. N'importe quel programme local peut piloter Relais.**
- `x-relais: 1` n'est pas un secret. Tout processus de la machine, y compris un autre compte Windows, peut appeler l'API, rattacher un dossier (`/api/projet` avec `existant`), lire des fichiers par S1 et lancer Claude Code par S2.
- Sur un PC à un seul compte, un programme malveillant a déjà ces droits, d'où la gravité faible.
- **Correction** : S1 et S2 suffisent à fermer le scénario grave. En option, générer un jeton aléatoire au démarrage, l'injecter dans `index.html` au moment de le servir et l'exiger sur `/api/`.

**S7. Les erreurs internes et `/api/data` exposent des chemins complets.** `server.js:398` renvoie `'Erreur interne : ' + e.message`, qui contient des chemins comme `C:\Users\<utilisateur>\…`. `/api/data` renvoie les chemins des projets et le dossier personnel (`parent`). Ces informations restent locales, mais il vaut mieux limiter ce qui sort. **Correction** : renvoyer « Erreur interne » seul et garder le détail dans `console.error`.

**S8. Quelques requêtes locales suffisent à arrêter le serveur.**
- `server.js:351` continue de lire un corps de plus de 1 Mo (m12 de l'audit du code).
- Plantages déjà relevés : C2 (flux statique sans gestion d'`error`), C4 (port déjà pris), M6 (`spawn` sans `error`), C3 (`etat.json` abîmé qui bloque `/api/data`).
- **Correction** : `req.destroy()` au-delà de la limite. Pour le reste, les corrections de l'audit du code.

**S9. Dépendances : 12 alertes, toutes dans des outils de développement.**
- `npm audit` : 2 faibles, 10 modérées, aucune élevée ni critique. Elles viennent de `deepmerge` et `minimatch` (DoS), par `shadcn` (CLI, via `@shadcn/registry` et `ts-morph`) et par `typescript-eslint`. Aucune de ces bibliothèques n'arrive dans `web/dist`.
- `shadcn` est dans `dependencies` alors que seul `shadcn/tailwind.css` sert (`web/src/index.css:3`). Ce rangement tire toute la CLI et ses dépendances dans l'installation.
- `cn@0.5.2` est un paquet jeune, dont `package.json` renvoie au dépôt `shadcn-ui/cn`. Il n'a pas de script d'installation, mais expose un binaire. Sa provenance reste à confirmer.
- `Relais.bat` installe avec `npm install`, qui peut réécrire le lockfile. `npm ci` respecte exactement `package-lock.json`. Seul `fsevents` (macOS, optionnel) a un script d'installation.
- **Correction** :
  - Passer `shadcn` en `devDependencies`, ou copier son `tailwind.css` dans `src`.
  - `npm audit fix` sans `--force` à l'étape Correctifs, puis recompilation et vérification.
  - Confirmer la provenance de `cn` sur npm (éditeur, dépôt) ou revenir à `clsx` + `tailwind-merge`.
  - Utiliser `npm ci` dans `Relais.bat`.

## Info

**S10. Secrets : rien trouvé.** Code, `web/dist`, les deux historiques git (un commit chacun) : aucune clé, aucun jeton, aucun mot de passe. Les correspondances trouvées sont `mask-composite` en CSS et le mot « tokens » dans les flux. `.gitignore` exclut bien `.relais/`, `FLUX.md` et `projets.json`, qui contiennent des chemins personnels.

**S11. Polices chargées depuis Google.** `web/index.html:9-11` charge Unbounded depuis `fonts.googleapis.com`. Chaque ouverture envoie l'adresse IP à Google et fait dépendre l'affichage d'un service externe. **Correction** : passer par `@fontsource` comme pour Geist, qui est déjà embarquée. C'est aussi ce qui permettra une CSP stricte (S4). À traiter dans la refonte, puisque les polices peuvent changer.

**S12. Claude Code lancé dans un dossier rattaché lit aussi son `.claude/`.** Un dossier piégé peut contenir des réglages ou des hooks. La demande de confiance de Claude Code protège ce cas, et Relais ne doit jamais la contourner (par exemple avec un drapeau qui passe les permissions). Rien à corriger aujourd'hui, c'est à garder en tête.

## Ce qui est bien fait

- Contrôle de l'en-tête Host contre le DNS rebinding, et `x-relais` obligatoire sur les POST. Ensemble, ils bloquent les requêtes inter-sites.
- Le serveur écoute sur `127.0.0.1`, pas sur toutes les interfaces.
- Fichiers statiques bornés à `web/dist` (`server.js:335-341`), y compris les `%2e%2e` décodés. C'est testé.
- Commandes lancées avec `spawn` ou `execFile` et des tableaux d'arguments, sans `shell: true`. Le dossier de départ du sélecteur passe par une variable d'environnement, pas par le texte du script PowerShell.
- Noms de projet débarrassés des séparateurs de chemin, `..` refusé, identifiants de flux limités à `[a-z0-9-]`.
- Côté interface, React échappe tout : aucun `dangerouslySetInnerHTML`, aucun `eval`, livrables affichés en texte brut.

## Ordre de correction proposé (pour le plan d'amélioration)

1. S1 (contrôle de `fichier`), qui ferme aussi une partie de S2 et de S6.
2. S3 (lancement du terminal avec `cwd`, filtrage des noms).
3. S4 et S5 (en-têtes et contrôle d'`Origin`), à placer dans `send` et sans toucher aux protections existantes.
4. S2 (confirmation au rattachement d'un dossier étranger).
5. S7, S8 et S9 avec les correctifs de l'audit du code. S11 pendant la refonte.

## Fichiers créés ou modifiés

- `livrables/04-audit-de-securite.md` (ce fichier). Aucun autre fichier du projet modifié.
- Scripts de vérification jetables, hors du projet : `C:\Users\<utilisateur>\AppData\Local\Temp\claude\a92792b53c7cbde3\396dc4be-3df3-45a0-8ebf-d23bb5b61e71\scratchpad\sec\verif.js` et `C:\Users\<utilisateur>\AppData\Local\Temp\claude\a92792b53c7cbde3\396dc4be-3df3-45a0-8ebf-d23bb5b61e71\scratchpad\sec\boucle.js`.
