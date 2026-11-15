# 07 — Système de design

Flux « Amélioration d'un site existant », étape 7/13. Skill utilisé : `design-system`, avec une architecture de tokens en trois couches et son validateur `validate-tokens.cjs`. Le point de départ est l'existant : neutres « pierre » en oklch, accent orange, 6 paires de couleurs de flux néon écrites en dur, Unbounded chargée depuis Google Fonts, échelles Tailwind par défaut.

## Décisions prises avec l'utilisateur

1. **L'interface est neutre et la couleur vient seulement des flux.** Les boutons principaux, interrupteurs, barres de progression et anneaux de focus sont blanc cassé en sombre et graphite en clair. Seules les paires `--c1`/`--c2` d'un flux apportent de la couleur. Les audits UX m4 (trop d'appels orange) et m5 (deux accents sur un écran) sont réglés à la source.
2. **Geist seule.** Les titres sont en Geist semi-grasse et serrée. Unbounded et Google Fonts sont retirées (UX m11 / S11), donc plus aucune police ne vient d'Internet.

## Où tout est défini

Tout est dans **`web/src/index.css`**, découpé en trois couches.

| Couche | Emplacement | Contenu |
|---|---|---|
| Correspondance Tailwind | `@theme inline` | `--color-*`, `--radius-*`, `--font-*`, `--shadow-carte/flottant/lueur-flux` → classes `bg-card`, `text-sur-flux`, `shadow-lueur-flux`… |
| Valeurs fixes | `@theme static` | `--tracking-display/titre`, `--ease-sortie`, `--ease-ressort` (toujours émis en variables) |
| 1. Primitives | 1er bloc `:root` | gris `--n-0` → `--n-1000`, teintes `--teinte-*`, `--radius`, `--cible-min`, `--scene-maille` |
| 2. Sémantiques, clair | 2e bloc `:root` | fond, texte, bordure, barre latérale, ombres, scène, clarté des flux et des statuts |
| 2. Sémantiques, sombre | `.dark` | les mêmes rôles, pour le thème de référence |
| Couleurs dérivées | `:root, .dark` | `--flux-*`, `--success`, `--warning`, `--destructive`, `--chart-*` calculées depuis la clarté du thème |
| Rôles typographiques | `@utility` | `text-display`, `text-titre`, `text-sous-titre`, `text-surtitre` |
| 3. Composants | `.scene`, `.couche`, `.lisere`… | réseau neuronal, liseré de l'étape en cours, apparitions |

Règle : un composant n'utilise jamais une primitive (`--n-*`, `--teinte-*`) ni une valeur hexadécimale. Il passe par un rôle sémantique.

## Tokens retenus

### Couleurs neutres

Gris graphite légèrement froids (oklch, teinte 270, chroma ≤ 0,01), qui remplacent les gris « pierre » chauds.

| Rôle | Clair | Sombre |
|---|---|---|
| `background` | `n-50` | `n-1000` (≈ #0b0b0d) |
| `card` / `popover` | `n-0` | `n-950` / `n-900` |
| `foreground` | `n-950` | `n-50` |
| `muted-foreground` | `n-600` | `n-400` |
| `primary` (action principale) | `n-950`, texte `n-50` | `n-50`, texte `n-1000` |
| `secondary`, `accent` (survol) | `n-150` | `n-850` |
| `border` / `input` | `n-200` / `n-300` | blanc 8 % / 12 % |
| `ring` | `n-500` | `n-400` |
| `sidebar` | `n-100` | `n-950` |

### Couleurs de flux

8 teintes nommées : `braise`, `mandarine`, `ambre`, `soleil`, `citron`, `menthe`, `rose`, `orchidee`. Chaque couleur se calcule ainsi : `oklch(var(--flux-l) var(--flux-c) var(--teinte-x))`.

- **Sombre** : clarté 0,80, lumineuse (≈ 10:1 sur le fond).
- **Clair** : clarté 0,53, foncée pour tenir le contraste. Ça règle UX M2 : le badge « En cours » passe de 1,44:1 à plus de 5:1.
- `lib/relais.ts` ne contient plus de couleur hexadécimale. `couleurs()` renvoie `var(--flux-…)`, donc les pastilles, badges et réseaux changent de couleur avec le thème.
- `--sur-flux` : texte posé sur une couleur de flux pleine (pastille de l'étape courante). Il est blanc en clair et noir en sombre.

### Statuts

`--success` (valide), `--warning` (à valider), `--destructive` : même logique, avec une clarté propre au thème (`--statut-l`). « En cours » prend la couleur du flux, « À faire » et « Sauté » restent en `muted-foreground`.

### Contrastes vérifiés

Ils sont calculés par script, de oklch vers sRGB, avec réduction de chroma hors gamut. **Tous les couples passent 4,5:1.**

| Couple | Clair | Sombre |
|---|---|---|
| Flux sur fond, carte et scène (8 teintes) | 4,52 à 5,77 | 9,95 à 11,65 |
| `sur-flux` sur pastille de flux | 4,97 à 5,77 | 10,19 à 11,65 |
| Succès / attention / danger | 4,85 à 6,08 | 9,79 à 11,65 |
| Texte discret | 6,77 à 7,45 | 7,73 à 7,91 |
| Bouton principal | 19,07 | 19,52 |

### Typographie

- Famille unique : `Geist Variable`, plus `Geist Mono Variable` pour les numéros, raccourcis et noms de skills. Les deux sont embarquées via fontsource.
- `text-display` : titre d'accueil. 36 px, puis 48 px à partir de 640 px. Graisse 600, interlettrage −0,035 em.
- `text-titre` : `h1` des vues. 24 px, puis 30 px. Graisse 600, interlettrage −0,025 em.
- `text-sous-titre` : 18 px, graisse 600. `text-surtitre` : 12 px en capitales espacées, couleur discrète.
- Corps : `text-sm` (14 px). **Le plus petit texte autorisé est `text-xs` (12 px).** Les `text-[10px]` et `text-[11px]` ont été supprimés.

### Espacements, rayons, ombres, mouvement

- **Espacements** : échelle Tailwind de 4 px, réduite à `0.5 · 1 · 1.5 · 2 · 3 · 4 · 6 · 8 · 10`. C'est déjà ce que le code utilise à plus de 95 % (`gap-2`, `gap-4`, `gap-3` en tête). Marges de page `p-4 sm:p-6 lg:p-8`, intérieur des cartes `p-4` ou `p-5`, écart entre sections `gap-8` ou `gap-10`.
- **Rayons** : `--radius` passe de 0,7 rem à 0,625 rem (10 px). Les dérivés `radius-sm` à `radius-4xl` sont inchangés. Les badges et pastilles restent en `rounded-full`.
- **Ombres** : `shadow-carte` (filet de 1 px et ombre courte), `shadow-flottant` (menus, boîtes de dialogue), `shadow-lueur-flux` (halo de la couleur du flux, réservé à l'étape courante). `--lueur` donne un voile très léger pour les lueurs de fond de l'étape 8.
- **Mouvement** : `ease-sortie` pour les entrées, `ease-ressort` pour les petits rebonds. Durées de 150 ms pour un survol, 250 ms pour un changement d'état, 450 ms pour l'entrée d'une vue. La règle `prefers-reduced-motion` est conservée.
- **Cible au doigt** : `--cible-min` (44 px), utilisé par la règle `pointer: coarse`.

### Règles des composants

| Composant | Règle |
|---|---|
| Bouton | Un seul `default` (neutre plein) par zone. Le reste est en `outline`, `secondary` ou `ghost`. `destructive` sert seulement aux suppressions. Les variantes shadcn ne changent pas : elles lisent les nouveaux tokens. |
| Badge de statut | `outline` teinté : bordure à 50 % et fond à 10 % de `success`, `warning` ou `--c1`. |
| Pastille d'étape | Neutre. Elle devient `--c1` plein avec `text-sur-flux` et `shadow-lueur-flux` quand l'étape est en cours. |
| Carte | `bg-card`, `border`, `shadow-carte`. |
| Scène du réseau | Tokens `--scene-*` : **claire en thème clair** (UX M8) et graphite en sombre. Libellés en `--scene-texte-doux`. Les étapes à faire ne sont plus estompées que dans le dessin, et leur libellé reste lisible (UX M4, partie contraste). |
| Fond neuronal | Il lit `--flux-*` et `--scene-influx` dans le CSS, et les relit quand le thème change. En clair, il prend donc les teintes foncées (UX c5, partie couleur). |
| Liseré, apparitions | Ils utilisent `--c1`/`--c2` et les courbes `ease-*`. |

## Travail fait dans le code

- `web/src/index.css` : réécriture des tokens en trois couches, rôles typographiques, scène qui suit le thème, couleurs codées en dur remplacées par des tokens.
- `web/src/lib/relais.ts` : la palette des flux utilise les tokens `--flux-*` au lieu des codes hexadécimaux.
- `web/src/components/fond-neuronal.tsx` : les couleurs sont lues dans les tokens au lieu des 5 codes hexadécimaux.
- `web/src/components/reseau.tsx` : la légende passe de `text-white` à `text-scene-texte` / `text-scene-texte-doux`.
- `web/src/pages/accueil.tsx` : `text-display`, et le dégradé de « créer » utilise `--flux-braise/rose/ambre`, ce qui le rend lisible en clair (UX M3).
- `web/src/pages/projet.tsx`, `atelier.tsx`, `skills.tsx` : `text-titre`. Dans `projet.tsx`, la pastille courante utilise `text-sur-flux shadow-lueur-flux`. Dans `atelier.tsx`, `text-[11px]` devient `text-xs`.
- `web/src/components/app-sidebar.tsx` : le nom « Relais » est en Geist (`tracking-titre`). `web/src/App.tsx` : le raccourci « Ctrl K » passe de 10 px à 12 px.
- `web/index.html` : liens Google Fonts retirés.
- Commit local `dcdace0` dans `web/`.

## Vérifications

- `tsc -b` passe. `vite build` réussit dans un dossier temporaire, et le CSS produit contient bien tous les nouveaux tokens et utilitaires, sans aucune trace d'Unbounded.
- `eslint` : seules les 2 erreurs déjà connues restent (`use-mobile.ts`, `use-relais.tsx`).
- `validate-tokens.cjs` : 3 alertes, qui sont les définitions des primitives elles-mêmes (`--radius`, `--cible-min`, `--scene-maille`). Il n'y a plus aucune valeur en dur dans les composants hors `ui/`.
- Contrastes : voir le tableau plus haut.

## Ce qui n'a pas été fait ou vérifié

- **Aucune vérification dans le navigateur.** `web/dist` n'a pas été recompilé, conformément à la règle du cadrage : l'interface en service garde l'ancien style jusqu'à la compilation qui suit la validation.
- **Laissé à l'étape 8 (Refonte)** :
  - le logo `public/relais.svg`, encore en dégradé orange, alors que l'identité est maintenant neutre ;
  - l'application des règles de composants écran par écran (hiérarchie des boutons, `shadow-carte` sur les cartes, liseré) ;
  - le grain et les lueurs de fond ;
  - l'arrivée animée ;
  - l'allègement des animations (UX M6).
- Les composants shadcn de `components/ui/` n'ont pas été retouchés. Ils lisent les tokens sémantiques, donc ils changent de style sans modification.

## Fichiers créés ou modifiés

- `web/index.html`
- `web/src/index.css`
- `web/src/lib/relais.ts`
- `web/src/components/fond-neuronal.tsx`, `web/src/components/reseau.tsx`, `web/src/components/app-sidebar.tsx`
- `web/src/App.tsx`
- `web/src/pages/accueil.tsx`, `web/src/pages/projet.tsx`, `web/src/pages/atelier.tsx`, `web/src/pages/skills.tsx`
- `livrables/07-systeme-de-design.md` (ce fichier)
