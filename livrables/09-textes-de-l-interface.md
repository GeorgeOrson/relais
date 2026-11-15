# 09 — Textes de l'interface

Flux « Amélioration d'un site existant », étape 9/13. Skill utilisé : `humanizer:humanizer`. J'ai relu tous les textes visibles de `web/src` (titres, boutons, aides, infobulles, notifications, boîtes de confirmation, états vides, libellés pour lecteur d'écran) et les messages d'erreur de `server.js` affichés dans l'interface. Le sens ne change pas.

Commits locaux : **`7eaddba`** dans `web/` et **`a51ea9c`** à la racine. `web/dist` **n'a pas été recompilé** (règle du cadrage).

## Règles appliquées

- Tutoiement partout, comme dans le reste de l'interface. Le serveur disait « On ne peut sauter… », il dit maintenant « Tu ne peux sauter… ».
- Le sujet est explicite, à la voix active : « Sinon, Relais crée un nouveau dossier » au lieu de « Sinon, un nouveau dossier est créé ».
- Une même action porte un seul nom : « Nouveau flux » partout, et « Nouveau retour » à côté de « Nouvelle étape ».
- Les consignes ne supposent plus une souris (UX m9) et disent ce qu'il faut faire, pas seulement ce qui s'est passé.
- Pas de tiret long dans les textes. Le « — » qui marque un champ vide dans la page Projet est une valeur, pas une phrase : il reste.
- Les phrases du titre répétées en premier dans la description sont supprimées.

## Avant / après

### En-tête, barre latérale, palette

| Où | Avant | Après |
|---|---|---|
| Erreur d'un écran (`App.tsx`) | Cet écran a rencontré une erreur | Cet écran a planté |
| Serveur arrêté (`App.tsx`) | Il s'est sans doute arrêté. Relance-le avec Relais.bat, puis réessaie. | Il est sans doute arrêté. Relance Relais.bat, puis réessaie. |
| Groupe de la barre latérale | Projets en cours | Projets (la liste montre aussi les projets terminés) |
| Infobulle du thème, barre repliée | Thème : Sombre (changer) | Changer de thème (actuel : Sombre) |
| Palette de commandes, description | Aller à un projet, un flux ou une action | Ouvrir un projet ou un flux, ou lancer une action |

### Nouveau projet

| Où | Avant | Après |
|---|---|---|
| Aide pendant « Parcourir » | Une fenêtre de sélection s'est ouverte sur ton bureau. | Choisis le dossier dans la fenêtre qui vient de s'ouvrir. |
| « Utiliser un dossier existant » | Sinon, un nouveau dossier est créé. | Sinon, Relais crée un nouveau dossier. |
| « Valider chaque étape » | Désactivé, une seule session enchaîne tout le flux. | Sinon, une seule session enchaîne tout le flux. |
| Confirmation « Rattacher ce dossier ? » | Il suit déjà le flux « X », qui ne vient pas de ce Relais. Ses étapes seront envoyées à Claude Code comme consignes : … Le flux choisi ici sera ignoré. | Ce dossier suit déjà le flux « X », créé par un autre Relais. Ses étapes deviendront des consignes pour Claude Code : … Le flux choisi ici sera ignoré. |

### Accueil

| Où | Avant | Après |
|---|---|---|
| Sous le titre | Chaque flux enchaîne les bons skills, étape par étape. | Un flux enchaîne des skills, étape par étape. (La suite de la phrase ne change pas.) |
| Légende du réseau d'un projet | Survole un neurone pour voir son étape. | Survole ou touche un neurone pour voir son étape. |
| Carte en pointillés | Créer un flux | Nouveau flux (même libellé que le bouton juste au-dessus) |

### Projet

| Où | Avant | Après |
|---|---|---|
| Légende du réseau | Survole un neurone pour voir son étape, clique pour y aller. | Survole un neurone pour voir son étape, clique dessus pour l'ouvrir. |
| Infobulle d'un neurone | Cadrage — grilling | Cadrage : grilling |
| Confirmation « Refaire » | Le livrable actuel est conservé avec un suffixe, et l'étape repasse à faire. | Le livrable actuel est gardé sous un autre nom (.v1, .v2…) et l'étape repasse à faire. |
| Étape pas encore accessible | Cette étape se lancera quand les précédentes seront faites. | Tu pourras lancer cette étape quand les précédentes seront faites. (L'ancien texte laissait croire à un lancement automatique.) |
| Livrable hors de `livrables/` | Le chemin du livrable de cette étape sort du dossier livrables/ : Relais ne la touche pas. | Le livrable de cette étape pointe hors du dossier livrables/. Relais ne touche pas à cette étape. |

### Atelier

| Où | Avant | Après |
|---|---|---|
| Bouton sous la piste | Retour en arrière | Nouveau retour (l'ancien libellé ressemblait à un bouton de navigation) |
| Description, exemple | En une phrase : de quoi à quoi. | En une phrase : du point de départ au résultat. |
| Panneau vide « Réglages de l'étape » | Sélectionne une étape… Un retour renvoie à une étape déjà faite avant de continuer : 1 → 2 → 3 → 2 → 4. | Choisis une étape… Un retour fait repasser par une étape déjà faite avant de continuer : 1 → 2 → 3 → 2 → 4. |
| Bibliothèque, étape choisie | « + » ajoute à « X ». | « + » ajoute le skill à « X ». |
| Bibliothèque, aucune étape | « + » crée une nouvelle étape. | « + » crée une étape avec le skill. |
| Panneau mobile « Ajouter un skill » | Ajouté à « X ». / Chaque skill touché crée une nouvelle étape. | Le skill choisi sera ajouté à « X ». / Chaque skill choisi crée une nouvelle étape. |
| Carte de retour, sans note | Revoit l'étape à la lumière de ce qui a suivi. | Reprend l'étape en tenant compte de la suite. |
| Carte de retour mal placée | La cible doit être placée avant ce retour, et pas juste avant. | L'étape visée doit être avant ce retour, mais pas juste avant. |
| Réglages du retour, erreur | Choisis une étape placée avant, et pas celle juste avant. | Choisis une étape placée avant ce retour, mais pas celle juste avant. |
| Réglages du retour, aide | L'étape est relancée avec ses skills ; elle relit son ancien livrable et en produit une version révisée. | L'étape est relancée avec ses skills : Claude relit l'ancien livrable et en écrit une version révisée. |
| Quitter sans enregistrer | Les changements apportés à ce flux seront perdus. | Tes changements sur ce flux seront perdus. |
| Supprimer le flux | Le modèle de flux est supprimé. Les projets déjà lancés gardent leur propre copie des étapes. | Les projets déjà lancés avec ce flux gardent leur copie des étapes. (Le titre dit déjà « Supprimer « X » ? ».) |
| Notification d'échec | Enregistrement refusé / Suppression refusée | Impossible d'enregistrer le flux / Impossible de supprimer le flux (l'échec peut venir d'une coupure, pas seulement d'un refus) |

### Messages du serveur (`server.js`)

| Avant | Après |
|---|---|
| Ce dossier suit déjà le flux « X » : son état est gardé et le flux choisi est ignoré. | Ce dossier suit déjà le flux « X ». Relais garde son avancement et ignore le flux choisi. |
| Nom de flux invalide. | Nom de flux invalide : choisis-en un autre. |
| Le terminal n'a pas pu s'ouvrir. La consigne est prête : copie-la et colle-la dans Claude Code. | Le terminal ne s'est pas ouvert. La consigne est prête : copie-la dans Claude Code. |
| Le sélecteur de dossier n'a pas pu s'ouvrir. Tape le chemin à la main. | Le sélecteur de dossier ne s'est pas ouvert. Tape le chemin à la main. |
| Le chemin du livrable de cette étape sort du dossier livrables/ : Relais ne la touche pas. | Le livrable de cette étape pointe hors du dossier livrables/. Relais ne touche pas à cette étape. |
| Le chemin du livrable de « X » sort du dossier livrables/ : Relais ne la lance pas. | Le livrable de « X » pointe hors du dossier livrables/. Relais ne lance pas cette étape. |
| Le chemin de ce livrable sort du dossier livrables/ : Relais ne le lit pas. | Ce livrable pointe hors du dossier livrables/. Relais ne le lit pas. |
| On ne peut sauter que l'étape en cours. | Tu ne peux sauter que l'étape en cours. |

## Relus et laissés tels quels

Ces textes sont déjà clairs et courts : les boutons (« Lancer dans Claude Code », « Copier la consigne », « Valider », « Sauter », « Refaire », « Reprendre », « Parcourir », « Créer le projet »…), les statuts (« À faire », « En cours », « À valider », « Validé », « Sauté »), les états vides (« Aucun projet en cours », « Aucun skill installé… »), les notifications de la page Projet, les annonces du glisser-déposer pour lecteur d'écran, et les autres erreurs du serveur (« Un flux porte déjà ce nom. », « Les étapes se font dans l'ordre… », « Le nom du projet ne peut pas contenir & ^ % ; ou !. »…). Le message « Le retour n° N renvoie à l'étape qui le précède : il ne sert à rien. » est resté tel quel, lui aussi.

## Ce qui n'a pas été fait

- **Descriptions des skills et doublon « Grill me » / « Grilling » (UX c4)** : ces textes viennent des skills installés (leurs fichiers `SKILL.md`), pas de Relais. Les réécrire voudrait dire modifier des plugins tiers, ce qui sort du périmètre. Les deux skills se distinguent déjà par leur identifiant complet, affiché en police mono sous le nom.
- **Descriptions et étapes des flux (`flux/*.json`)** : ce sont des données saisies dans l'Atelier, et le flux qui pilote ce projet en fait partie. Je n'y ai pas touché.
- **Consigne envoyée à Claude Code** : elle n'est pas lue dans l'interface, et `test.js` vérifie sa forme. Je n'y ai pas touché.
- **Messages techniques** (« Hôte refusé », « Requête refusée », « Erreur interne ») : on ne les voit qu'en cas d'appel anormal, et ils restent courts.
- `Relais.bat` est volontairement sans accents (encodage de la console). Pas modifié.

## Vérifications

- `node test.js` : tout passe (« OK », « OK statique », « OK correctifs », « OK http »). Une assertion cherchait l'ancienne formulation du message « Ce dossier suit déjà le flux » : je l'ai mise à jour (`/ignore le flux choisi/`).
- `tsc -b` passe. `eslint` ne remonte que les 2 erreurs déjà connues (`use-mobile.ts`, `use-relais.tsx`).
- Recherche de tirets longs dans `web/src` : il ne reste que le « — » des champs vides de la page Projet.

## À faire après validation

1. Fermer la fenêtre Relais.
2. Lancer `npm run build` dans `web/`.
3. Relancer `Relais.bat` (les messages du serveur changent aussi).

## Fichiers modifiés

- `web/src/App.tsx`
- `web/src/components/app-sidebar.tsx`
- `web/src/components/command-menu.tsx`
- `web/src/components/nouveau-projet.tsx`
- `web/src/components/reseau.tsx`
- `web/src/pages/accueil.tsx`
- `web/src/pages/projet.tsx`
- `web/src/pages/atelier.tsx`
- `server.js` : messages d'erreur et d'information.
- `test.js` : une assertion alignée sur le nouveau texte.
- `livrables/09-textes-de-l-interface.md` (ce fichier).
