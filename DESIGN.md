# Design System — hn-redesign

> Créé le 2026-08-25 par `/design-consultation`. Typographie et page d'accueil révisées le même jour. **Amendé le 2026-08-25 par la phase 1** — tracking, interligne, rayon, focus, et deux chiffres de densité corrigés.
> **Réécrit le 2026-08-25 pour la coquille app (phase 6).** Le design de liste dense — ligne fusionnée de 32 px, navbar en filet orange, pondération par score — est remplacé par une coquille d'application : sidebar fixe, en-tête avec recherche, onglets, cartes. Ce n'est pas une variante, c'est un remplacement ; les chiffres et sections qui décrivaient l'ancien design sont retirés, pas laissés en double. Le detail complet de la decision vit dans `docs/superpowers/specs/2026-08-25-coquille-app-design.md`.
> Chaque valeur de ce fichier a été vérifiée : les contrastes sont calculés, la densité est mesurée **au `getBoundingClientRect`** — jamais à l'œil sur une capture, une méthode qui a produit deux chiffres faux avant d'être abandonnée — et le système entier a été rendu sur la vraie page d'accueil et un vrai fil de 206 commentaires, dans les deux thèmes. Les captures sont dans `design-refs/`.

> Le reste a faire vit dans [`ROADMAP.md`](ROADMAP.md) : 25 taches, 6 phases. Ce fichier-ci ne dit que **a quoi ca doit ressembler**.

## Le principe directeur

> **« Enfin je peux lire HN. »**

Une seule phrase, et elle tranche tout le reste. Quand un arbitrage n'est pas couvert par ce fichier, la question à poser est : *est-ce que ça aide à lire ?* Si non, ça dégage.

Une alternative avait été proposée — « je vois où est la vraie discussion » — et **écartée**. Conséquence à retenir : la typographie et le contraste passent devant. Le Thread Spine est une feature du produit, pas la thèse du design.

## Product Context

- **Ce que c'est :** un userscript qui redessine Hacker News dans Safari sur macOS, exécuté par [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT). Ce n'est pas un client alternatif : le DOM appartient à HN.
- **Pour qui :** une personne, Omar, qui ouvre HN une dizaine de fois par jour. Aucun objectif d'adoption.
- **Espace :** restyles de HN. Voisins : Modern for HN (Chrome/FF/Edge, pas Safari), Y Redesign (iOS seulement), Hacker News Stylized (styles seuls), Refined Hacker News (MIT, dernier push 2023).
- **Type :** outil de lecture. Pas une app, pas un dashboard, pas un site marketing.

## Aesthetic Direction

- **Direction :** coquille d'application. Sidebar de navigation, en-tête, onglets, colonne de cartes. La typographie et la couleur continuent de faire le travail de lecture ; la structure fait désormais le travail d'orientation.
- **Décoration :** cartes, arrondis, une ombre, sept icônes. C'est un changement de doctrine assumé, pas une dérive — voir *Ce qui a été perdu* plus bas pour ce qu'il coûte.
- **Interdits qui tiennent :** aucun dégradé, aucune animation, aucun bouton là où HN met un lien, **aucune donnée fabriquée**. Le dernier est nouveau : le rail droit de la maquette d'origine montrait des « trending topics » et des « saved stories » que HN ne sert pas. Il a été coupé plutôt que rempli de chiffres inventés — la seule mensonge que ce projet aurait pu raconter.
- **Interdits qui ont sauté, et pourquoi.** La liste précédente disait « aucune carte, aucune icône décorative, aucune ombre, aucun arrondi décoratif ». Ces quatre-là sont tombés avec la coquille app : une navigation par sidebar a besoin d'icônes pour rester scannable à 220 px de large, et une colonne de cartes a besoin d'un bord visuel pour se distinguer du fond de page — d'où l'arrondi et l'ombre unique de la carte (§ Color, Ombre et rayon). Aucun des quatre n'est revenu en douce : chacun est compté et budgeté (`test/lint.mjs`), pas laissé libre.
- **Mood :** un texte bien composé qu'on lit dix fois par jour sans y penser, dans une coquille qui se reconnaît d'un coup d'œil. La réussite reste de ne pas remarquer le design — mais on doit désormais remarquer où on est.

## Typography

**Une seule famille : San Francisco, la police système d'Apple.** Aucune webfont, zéro requête réseau.

```css
--ui: -apple-system, BlinkMacSystemFont, sans-serif;
```

### ⚠️ Deux pièges vérifiés

1. **`-apple-system` est le seul chemin vers SF.** Nommer `"SF Pro Text"` ou `"SF Pro Display"` **ne résout pas** — repli silencieux vers autre chose. Mesuré sur la même chaîne à 40 px : `-apple-system` = 872,5 px, `"SF Pro Text"` = 1004,6 px.
2. **`system-ui` n'est pas `-apple-system`.** 44 px d'écart sur la même chaîne. Ne pas les mélanger dans une pile.

### Échelle

| Élément | Taille | Interlignage | Tracking |
|---|---|---|---|
| Titre de post (`/item`) | 21 px | 28 px | `-0.012em` |
| **Titre de page** (en-tête de la coquille, « Hacker News ») | **30 px** | **34 px**, poids 700 | `-0.012em` |
| **Titre de carte** (`/news`) | **17 px, fixe** | 24 px, poids 600 | `-0.012em` |
| Domaine de carte (`.sitestr`) | 14 px | 20 px | `0` |
| Métadonnée de carte | 13 px | 18 px | `0` |
| **Corps de commentaire** | **15 px** | **22 px** (1,47) | `0` |
| Commentaire replié | 13,5 px | 22 px | `0` |
| Métadonnée du fil | 12 px | 16 px | `+0.1px` — **seule exception**, voir ci-dessous |
| Code dans un commentaire | 13 px | 20 px, mono système | `0` |
| Barre de position | 12 px | 28 px (= hauteur de la barre) | `0` |

**Le titre de carte est fixe, il ne varie plus avec le score.** Voir *Ce qui est perdu* en § La liste.

**Tracking : deux paliers, et rien entre les deux.** `letter-spacing: 0` sous 17 px, `-0.012em` de 17 à 24 px. Une seule valeur négative dans tout le système. Le crénage négatif corrige un défaut qui n'apparaît qu'au-dessus de 17 px ; appliqué au corps il resserre un texte qui n'en a pas besoin.

La **métadonnée à 12 px garde `+0.1px`**, tracking *positif*. Ce n'est pas une entorse au palier : c'est la pratique inverse, l'ouverture d'un texte trop petit. Écrit ici pour qu'un lint ou une relecture ne le prenne pas pour une dérive. Le palier ne régit que le crénage négatif.

**L'interlignage du corps est passé de 23 px à 22 px** (ratio 1,47). Gain mesuré sur le fil de référence de 206 commentaires : **35 168 px contre 36 103 px, soit −935 px** de défilement, à densité rigoureusement identique.

> [!warning] Correction du 2026-08-25 — une justification de ce fichier était fausse
> Ce paragraphe affirmait : *« à 24 px, SF ne tient que 10 commentaires par écran ; à 23 px, 11. Un pixel d'interligne vaut un commentaire par écran. »* **C'est faux, et l'affirmation venait d'un comptage à l'œil sur une capture.**
> Re-mesuré au DOM sur le fil de 206, viewport 1400 × 1900, `getBoundingClientRect` :
>
> | Interligne | Hauteur du fil | Commentaires entamés | Commentaires entiers |
> |---|---|---|---|
> | 22 px | 35 168 px | 15 | 14 |
> | 23 px | 36 103 px | 15 | 14 |
> | 24 px | 37 038 px | 15 | 14 |
> | *Charter 15,5/24 (rejetée)* | *36 894 px* | *15* | *14* |
>
> **La densité du premier écran ne bouge pas avec l'interligne.** Le premier écran est dominé par l'en-tête du post et deux ou trois commentaires longs ; ±1 px d'interligne ne déplace rien à cette échelle. Le vrai argument pour 22 px n'est pas la densité, c'est les 935 px de défilement en moins sur le fil entier — gratuits, puisque le ratio 1,47 reste dans la plage de lecture confortable.

Le titre de post n'est qu'à 1,4× le corps. Volontaire : sur HN le titre n'est pas le contenu, c'est l'étiquette du fil.

`-webkit-font-smoothing: antialiased` **en thème sombre uniquement**.

> [!info] Le serif a été essayé et rejeté
> La première version de ce système reposait sur Charter (Matthew Carter, dessinée pour les écrans basse résolution). Rendue sur le vrai fil dans les deux thèmes, puis **rejetée par Omar sur pièce**. Cinq candidates ont été mesurées avant SF — Charter, Seravek, Avenir Next, PT Sans, Lucida Grande. Seravek 400 était la plus économe (1027 lignes contre 1073 pour SF) ; SF a été choisie et son coût compensé par l'interligne.

## Color

**Approche : restreinte.** Un seul accent, hérité de HN. La couleur ne décore jamais ; elle porte de l'information ou elle n'existe pas.

**Bascule de température, 2026-08-25 : du beige chaud au neutre froid.** Le système précédent était calé sur le beige natif de HN. La coquille app rompt avec lui — la maquette approuvée par Omar est neutre et froide. Toutes les paires ci-dessous sont **recalculées**, aucune n'est héritée telle quelle. `test/contraste.mjs` est réécrit sur cette palette.

### Tokens

| Rôle | Token | Clair | Sombre |
|---|---|---|---|
| Fond de page | `--page` | `#F7F7F8` | `#0E0E10` |
| Surface de carte | `--surface-1` | `#FFFFFF` | `#18181B` |
| Surface secondaire (recherche, onglet actif, pastille) | `--surface-2` | `#F1F1F3` | `#232327` |
| Filet | `--line` | `#ECECEE` | `#2A2A2F` |
| Texte | `--text` | `#0B0B0C` | `#F2F2F3` |
| Métadonnée | `--meta` | `#6B7280` (4,83:1) | `#9CA0A8` (6,76:1) |
| Auteur | `--author` | `#4B5058` (8,12:1) | `#B8BCC3` (9,30:1) |
| Rail de profondeur (fil de commentaires uniquement — voir la mise en garde ci-dessous) | `--rail` | `#E6E6E9` | `#2E2E34` |
| **Accent en aplat** (`--accent`) — pastille de rang, soulignement d'onglet, carré du logo, marqueur du commentaire actif | `#F26207` | `#F26207` |
| **Accent texte** (`--accent-text`) | `#BF4300` (5,23:1) | `#F26207` (5,51:1) |
| **Lien visité** (`--visited`) | `#8D9195` (3,17:1) | `#636669` (3,07:1) |
| Rampe de downvote | `--c00` … `--cDD` | recalculée, plancher 3,44:1 | recalculée, plancher 3,38:1 |
| **`--radius-sm` / `--radius-md` / `--radius-full`** | `6px` / `10px` / `999px` | idem | idem |

**22 tokens dans le bloc clair, 16 redéfinis dans chaque bloc sombre** (`prefers-color-scheme` et la classe `hn-dark`). `--accent`, `--radius-*` et `--mono`/`--ui` ne changent pas avec le thème, d'où l'écart.

### `--rail` et `--line` ne sont pas interchangeables

**`--rail` appartient à la gouttière de profondeur du fil, et nulle part ailleurs.** Cette gouttière dessine **un trait par niveau d'ancêtre** — le *nombre* de traits est la profondeur, il se compte au lieu de se deviner (§ Spacing). Un token partagé avec autre chose romprait ce comptage le jour où quelqu'un change `--rail` pour une autre raison.

**`--line` sépare deux zones de l'interface** : bord de carte, bord de sidebar, filet sous la barre de position, cadre de la pilule de recherche. Un exemple concret vit dans le CSS lui-même, en commentaire à côté de la barre de position : *« `--line` et non `--rail` : ce trait sépare la barre de position du fil, ce n'est pas un cran de la gouttière de profondeur. »*

Cette distinction est écrite ici pour qu'un futur `sed` de refactor ne fusionne pas les deux tokens en croyant simplifier — ce serait rendre la profondeur illisible pour économiser une variable.

### ⚠️ La règle de l'orange

**`#F26207` ne peut pas être du texte de corps en thème clair sans mesure.** Mesuré : **3,22:1 sur `#FFFFFF`**, **3,01:1 sur `#F7F7F8`**. Il franchit de justesse le plancher de 3:1 de ce système, et échoue au 4,5:1 du texte de corps.

- Aplats (pastille de rang, soulignement d'onglet, carré du logo, marqueur du commentaire actif) → `#F26207`, dans les deux thèmes.
- Texte accentué, **y compris le domaine de la ligne 2 de la carte** → `--accent-text` : `#BF4300` en clair (5,23:1 sur `--surface-1`), `#F26207` tel quel en sombre (5,51:1).
- Anneau de focus → `--accent-text`, jamais orange pur. Voir § `:focus-visible`.

**`--accent-text` est une valeur distincte de `--accent`, et le reste.** C'est la même règle qu'avant la coquille app, avec les nouveaux chiffres : l'orange pur est réservé aux aplats, jamais au texte en thème clair.

### ⚠️ Les deux signaux de HN qu'une règle de couleur naïve détruit

HN encode **deux** informations différentes dans la couleur du texte. Les deux se cassent de la même façon : une règle trop large qui impose une couleur unique. Les deux survivent intacts à la coquille app.

**1. La rampe de downvote, sur les commentaires.** Distribution mesurée sur un fil de 206 : `c00` 190, `c5A` 8, `c73` 3, `c88` 3, `cDD` 1. Une règle unique `.commtext { color }` la détruit. Cinq règles, une par classe, dans chaque thème, recalculées sur `--surface-1` — plancher mesuré **3,44:1** en clair, **3,38:1** en sombre.

**2. Le lien visité, sur la liste.** `news.css` contient `a:visited { color:#828282 }` — HN grise les titres déjà lus. La carte ajoute `.titleline` sous `tr.__card`, donc la règle visitée doit rester **au moins aussi spécifique** que toute règle de couleur de titre :

```css
#hnmain tr.__card .titleline > a:visited { color: var(--visited); }
```

Invérifiable au rendu — tous les navigateurs mentent sur `:visited` contre le history sniffing — donc prouvé par spécificité dans `test/regles.mjs`, comme avant la coquille app.

### Les deux propriétés de la rampe à ne jamais casser

Recalculées sur la nouvelle palette neutre, avec `--surface-1` comme fond de référence au lieu de l'ancien fond beige.

1. **Les cinq crans restent régulièrement espacés en clarté perçue.** Écarts de **L\*** (CIE), la seule échelle qui approche ce que l'œil voit : **écart minimal entre deux crans consécutifs, 10,0 points en clair, 10,3 en sombre**. `test/contraste.mjs` vérifie cette régularité sur chaque paire de crans adjacents, pas seulement sur le minimum.

Un plancher naïf à 3:1 écrase le bas de la rampe. Il faut **étaler la rampe entière**, pas clamper sa fin — c'est ce que garde la mesure en L\*, jamais en ratio de contraste : le ratio n'est pas perceptuel et sa décroissance mécanique vers le bas de la rampe fait croire à une irrégularité qui n'existe pas.

2. **Le dernier cran bascule sur l'axe de teinte.** Quand le canal luminance est épuisé, la teinte offre un **second canal de discrimination qui ne coûte aucune luminance**. Bascule mesurée : **185° en clair, 177° en sombre**, entre le cran chaud `.c88` et le cran froid `.cDD`. Ce n'est pas un gain de contraste — le plancher de la rampe reste **3,44:1 en clair, 3,38:1 en sombre**, mesuré sur `.cDD` — c'est un gain de *distinguabilité*.

Vérifié sur le seul `cDD` du fil de référence : le commentaire enterré se lit comme **une note en marge**, pas comme un texte effacé. Sur HN natif il serait à `#dddddd`, 1,25:1, illisible par construction.

### `:focus-visible` — la seule affordance d'état du système

```css
:focus-visible {
  outline: 2px solid var(--accent-text);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}
```

`:focus-visible` et non `:focus` : le clavier reçoit l'anneau, la souris ne le reçoit pas. Sur un site fait de liens texte, un anneau à chaque clic serait du bruit permanent.

La couleur est **l'accent texte, pas l'orange pur** — c'est la même règle de l'orange qu'au-dessus, et pour la même raison. Vérifié contre la surface de carte : `#BF4300` sur `#FFFFFF` = **5,23:1** en clair, `#F26207` sur `#18181B` = **5,51:1** en sombre. L'orange pur en clair tomberait à 3,22:1 sur `#FFFFFF` et échouerait au 4,5:1 attendu d'un texte accentué — un anneau de focus à peine lisible est pire qu'absent, parce qu'il donne l'illusion d'être géré.

`outline` et non `border` : l'`outline` ne participe pas au flux, donc l'anneau ne déplace rien au moment où il apparaît. C'est ce qui permet de garder la densité pendant une navigation au clavier.

### Plancher d'accessibilité

**3:1 sur tout texte de contenu.** Déviation assumée à la règle usuelle de 4,5:1 : à 4,5:1 sur les cinq crans, la rampe est conservée sur le papier et détruite en pratique. 3:1 garde le signal lisible *en tant que signal* tout en laissant le texte lisible si on décide de le lire.

`--accent-text`, lui, doit atteindre **4,5:1** sur `--surface-1` dans les deux thèmes — il porte du texte accentué de contenu, pas un signal secondaire de rampe. Mesuré : 5,23:1 en clair, 5,51:1 en sombre, marge confortable au-dessus du plancher.

### Ombre et rayon

- **Une seule ombre**, sur la carte : `0 1px 2px rgba(0,0,0,.04)` (`--ombre`). En thème sombre elle est remplacée par `none` — le filet de bordure porte seul la séparation, une ombre noire sur fond noir ne dit rien.
- **Trois rayons, et pas un de plus** : `--radius-sm: 6px` (pilules de métadonnée), `--radius-md: 10px` (carte, onglets, recherche, logo, anneau de focus), `--radius-full: 999px` (pastille de rang, cercle utilisateur). L'ancien token unique `--radius: 2px` disparaît — il n'a plus de sens une fois que le système a des surfaces à border-rayonner distinctement. `test/lint.mjs` vérifie exactement ces 3 valeurs de rayon et cette seule ombre, ni plus ni moins.

## La liste — `/news` et les pages de listing

C'est l'écran où l'on décide quoi lire. Chaque `tr.athing.submission` **devient** la carte, en `display: grid` — aucune restructuration du DOM de HN, les trois cellules que HN sert (rang, vote, titre) tombent exactement aux emplacements de la maquette.

**Structure de la carte.**

```
grid-template-columns: 40px 1fr;
grid-template-rows: auto 1fr;

  td.title (rang)   → 1 / 1     pastille orange 26px, cercle, chiffre blanc 13px/700
  td.votelinks      → 2 / 1     la fleche de vote, centree
  td.title (titre)  → grid-row: 1 / 3 ; grid-column: 2   le contenu, trois lignes
```

**Le contenu, trois lignes**, chacune construite comme l'ancienne ligne fusionnée le faisait déjà — la `tr.subtext` suivante est clonée par morceaux dans un `span.__m`, puis masquée, jamais déplacée : les scripts de HN la référencent encore.

| Ligne | Contenu | Style |
|---|---|---|
| 1 | Le titre, `a` de `.titleline` | 17 px / 24 px, poids 600, `--text` |
| 2 | Le domaine, `.sitestr` | 14 px / 20 px, `--accent-text` |
| 3 | Métadonnée : `↑ points` · séparateur · `auteur` · `💬 commentaires` · séparateur · `âge` | 13 px / 18 px, `--meta` |

**Les flèches de vote.** HN les sert en `<div class="votearrow">` de 10 × 10 avec `triangle.svg` en fond — une **image**, donc elles ne suivaient ni les tokens ni le thème. `clip-path` et non un triangle en bordures : la boîte garde ses 10 × 10, donc le `rotate180` que HN applique à la flèche de *downvote* tourne autour du bon centre. Un triangle en bordures a une boîte de 0 × 0 et se déplacerait en tournant. Elles prennent `--meta`, `--accent` au survol. *(La flèche de downvote n'a pas pu être vérifiée : elle demande un compte avec assez de karma.)*

> [!info] Il n'y a pas de favicon de domaine
> Le système en a porté un un temps, tiré de `google.com/s2/favicons`. **Il ne s'affichait jamais sur la vraie page** : Hacker News sert `Content-Security-Policy: img-src 'self' https://account.ycombinator.com` et bloque les requêtes, dans Chrome comme dans Safari. Retiré le 2026-08-25, avant la coquille app, et resté retiré depuis : le domaine reste lisible en toutes lettres, ligne 2 de la carte. Le projet reste à **zéro requête réseau**.

### Ce qui est perdu

**La pondération par score de titre a disparu.** Les titres passaient de 15,5 à 19 px selon le score du post, exposant 0,45. C'est la **seule fonctionnalité livrée que la coquille app supprime**, et elle est notée ici pour qu'on sache quoi rouvrir si la liste se met à sembler plate.

La raison est mécanique : trois lignes empilées dans une carte de hauteur fixe ne supportent pas un titre qui varie de 3,5 px — la carte se déforme, ou la métrique de densité cesse d'être vérifiable. Le titre est fixé à **17 px, poids 600**.

### Métrique et densité

- Carte : padding 16 px vertical / 20 px horizontal, fond `--surface-1`, filet 1 px `--line`, rayon `--radius-md`, ombre `--ombre`.
- Gouttière entre cartes : la `tr.spacer` native, portée à 8 px par `setStyle` — elle a `height:5px` en style inline, qu'aucune règle CSS ne bat.
- **Hauteur de carte : médiane 102 px**, 0 des 30 cartes hors tolérance ±6 px. Vérifiée au `getBoundingClientRect`, jamais à l'œil.
- **Densité : 6 cartes entières** dans un viewport de 1400 × 900.

> [!info] La densité de 6 est un calcul, pas une régression
> Le plan visait 7. L'écart vient d'un calcul refait sans compter le chrome de la coquille : en-tête 92 px + barre d'onglets 68 px + espace = **178 px** avant la première carte ; **110 px par carte** en comptant les 8 px de gouttière. `floor((900 − 178) / 110) = 6`. Chaque composant est individuellement conforme à sa propre spec — 92 px, 68 px, 100 px ± 6 — et le résultat de 6 plutôt que 7 est une **conséquence arithmétique** de leur empilement, pas un bug oublié. Écrit ici pour que le prochain lecteur voie une conséquence, pas un regret.

## La coquille

Une barre latérale de navigation fixe à gauche, un en-tête portant le titre de page et la recherche, une barre d'onglets Top / New / Best. **Absente sur `/item`** : le fil de commentaires est le cœur du projet et ne cède pas 220 px de largeur à une navigation qu'il n'utilise pas.

### La sidebar — 220 px

`nav.__side`, insérée en premier enfant de `body`, `position: fixed`, largeur 220 px, hauteur pleine. `center` reçoit `margin-left: 220px` **conditionnellement** — voir la mise en garde ci-dessous. `position: fixed` plutôt qu'un `display: flex` sur `body` : le défilement reste celui de HN, aucun conteneur de scroll nouveau, et l'annulation est une propriété à retirer plus un nœud à détacher.

Deux groupes, séparés d'un filet :

- **Groupe principal** — Home (`news`), Explore (`newest`), et si `#me` existe (session ouverte) Bookmarks (`favorites?id=<user>`) et Profile (`user?id=<user>`). Icône SVG 18 px + libellé, page courante en état actif (fond `--surface-2`, texte `--accent-text`).
- **Groupe secondaire** — les liens natifs de `.pagetop` que la maquette ne montre pas (`past`, `comments`, `ask`, `show`, `jobs`, `submit`), **déplacés**, pas clonés, en 13 px `--meta`.

> [!warning] L'offset de colonne est conditionnel, et c'est un bug corrigé, pas un raffinement
> `.hn-side center { margin-left: 220px }` ne s'applique que si `sidebar()` a effectivement posé la classe `hn-side` — pas inconditionnellement sur toute page portant la classe racine. Sans cette condition, `/item` cédait 220 px à une sidebar qui n'existe pas sur cette page : le fil s'y mesurait à 645 px au lieu des 660 px attendus. Trouvé uniquement en mesurant dans un vrai navigateur — aucun test de calcul pur ne pouvait le voir, une classe CSS mal conditionnée ne casse rien qu'on puisse lire dans le code.

### L'en-tête — 92 px

Sur `/news` comme sur `/item`, identique. Trois zones : titre de page (30 px / 34 px, poids 700, texte de `b.hnname > a` relocalisé), champ de recherche centré (pilule 40 px, fond `--surface-2`, largeur max 460 px), pastille utilisateur (cercle 40 px, initiale de `#me`, ou lien `login` natif si déconnecté).

**Le formulaire de recherche existe déjà.** HN sert `<form method="get" action="//hn.algolia.com/">` dans son pied de page. Il est **déplacé** dans l'en-tête et habillé, pas fabriqué — l'`action` ne change pas, et le zéro requête réseau au chargement est préservé : un `action` de formulaire n'est qu'une cible de navigation, pas une requête.

Le carré orange du logo `y18` reste, réduit à 22 px, arrondi `--radius-md`, en tête de la sidebar.

### La barre d'onglets — 68 px

Conteneur intérieur de 52 px (fond `--surface-1`, filet `--line`, rayon `--radius-md`), plus 16 px de marge sous l'en-tête, soit **68 px de bande** avant la première carte. Trois onglets — Top (`news`), New (`newest`), Best (`best`) — déterminés sur `document.documentElement.getAttribute('op')` avec repli sur `location.pathname`. L'onglet actif porte un soulignement 2 px `--accent` et un texte `--accent-text`. **Exactement un onglet actif sur une route correspondante, zéro sinon** — pas de défaut sur « Top », qui mentirait sur `/ask` ou `/show`.

## Spacing

**Base 4 px. Six crans, rien d'autre n'existe : `4 · 8 · 12 · 16 · 24 · 48`.**

| Relation | Valeur |
|---|---|
| Métadonnée → corps (même commentaire) | 4 px |
| **Entre deux commentaires frères** | **16 px** |
| **Parent → premier enfant** | **12 px** |
| Entre deux fils racine | 24 px + filet 1 px |
| Indentation par niveau | **22 px** (HN natif : 40) |
| Rail vertical | 1 px, à `indent − 11 px` |
| Padding latéral de colonne | 48 px |
| Colonne intérieure de carte (`grid-template-columns`) | 40 px 1fr, `column-gap: 12px` |
| Entre deux cartes de la liste | **8 px** |
| Barre de position | 28 px de haut, filet supérieur 1 px |

> La `tr.spacer` de HN porte `style="height:5px"` **en style inline** : aucune règle de la feuille ne la bat. C'est le JS qui la change à 8 px, via le même mécanisme réversible que le reste. Le 12 px entre posts de l'ancien design de liste n'existe plus : la carte a sa propre gouttière, dérivée de la métrique de densité (§ La liste), pas de l'échelle générale d'espacement.

Le **16 px entre frères contre 12 px entre parent et enfant** est le seul geste hiérarchique du système, et il suffit : descendre coûte moins d'espace que passer au suivant, donc la subordination se lit avant même que l'œil ait vu le rail.

L'**indentation à 22 px** rend 180 px de mesure sur un fil profondeur 10.

**Le rail porte un trait par niveau d'ancêtre, pas un seul.** Un trait unique dit « ceci est imbriqué » et rien de plus : à la profondeur 6 on voit exactement ce qu'on voit à la profondeur 2. Avec un trait par ancêtre, le *nombre* de traits **est** la profondeur — elle se compte au lieu de se deviner. Un motif de 22 px, trait de 1 px à 11 px, répété sur toute la gouttière : elle fait `indent` de large, donc elle porte exactement `indent / 22` traits, et zéro à la profondeur 0. Vérifié au rendu : 0:0, 1:1, … 8:8.

## Layout

- **Approche :** une sidebar fixe à gauche (220 px) plus une colonne unique disciplinée pour le contenu. Pas de grille de contenu, pas d'asymétrie dans la colonne elle-même — la seule asymétrie du système est la sidebar, et elle est structurelle, pas décorative.
- **Colonne :** 880 px, centrée, décalée de 220 px sur les pages qui portent la sidebar (voir § La coquille).
- **Mesure de texte du fil :** 660 px à la profondeur 0. **Bord droit fixe** : c'est l'indentation qui mange la gauche. Sur `/item`, qui n'a pas de sidebar, l'offset de 220 px ne doit **pas** s'appliquer — voir la mise en garde de § La coquille sur la condition `hn-side`.
- **Plancher de mesure :** 420 px. Au-delà de la profondeur 11, l'indentation cesse d'augmenter.
- **Border radius : trois valeurs, `--radius-sm` (6 px), `--radius-md` (10 px), `--radius-full` (999 px).** Voir § Color, Ombre et rayon, pour l'usage de chacune. L'ancienne valeur unique `--radius: 2px` n'existe plus — le système a désormais des surfaces (cartes, onglets, pastilles) qui appellent des rayons différents selon leur rôle.

### Densité — contrainte dure, par écran

**Fil de commentaires : 14 commentaires entiers (15 entamés) sur un viewport 1400 × 1900.** Inchangé par la coquille app — le fil garde son propre habillage, voir § Le fil de commentaires.

**Liste : 6 cartes entières sur un viewport 1400 × 900.** Voir § La liste pour le calcul complet (en-tête + onglets + carte × 6). Ce chiffre remplace les « 24 posts » et « 30 posts » de l'ancien design de liste — la métrique elle-même a changé de nature, d'une ligne à une carte, et n'est plus comparable terme à terme.

C'est une contrainte, pas un effet de bord. Aérer et le Thread Spine résolvent le **même** problème et se combattent, sur le fil. Une direction plus généreuse (~6 commentaires par écran) a été rendue puis rejetée : elle doublait le scroll que le Thread Spine existe pour réduire.

**Toute modification qui fait passer la densité du fil sous 14 commentaires entiers, ou la densité de la liste sous 6 cartes entières, doit être justifiée explicitement.**

> [!warning] Ces deux chiffres ont été corrigés le 2026-08-25, avant la coquille app
> Le plancher disait *11 commentaires* et *25 posts*. Les deux venaient d'un comptage à l'œil sur capture. Re-mesurés au DOM : **14 entiers / 15 entamés** pour le fil, **24** pour la liste — cette dernière valeur, comme les 30 postes de la ligne fusionnée qui l'a suivie, a depuis été remplacée par les 6 cartes entières de la coquille app (§ La liste). Corollaire, toujours vrai : les mesures de densité de ce projet se font au `getBoundingClientRect`, jamais sur une capture.

## Le fil de commentaires

C'est l'écran que le projet existe pour rendre lisible. Livré le 2026-08-25.

### Le Thread Spine

Un fil de 91 commentaires contient une branche principale et une trentaine d'apartés. Le Thread Spine calcule la branche dominante, la garde dépliée, et replie **la frontière** — les frères des nœuds du chemin, jamais tous les non-spine. Replier un parent cache déjà sa descendance ; cliquer aussi les descendants corrompt leur état sans rien changer à l'écran.

**Le score d'une branche** est la taille de son sous-arbre, pondérée par la longueur moyenne de ses commentaires rapportée à celle du fil :

```
score = taille × √(longueur_moyenne_de_la_branche / longueur_moyenne_du_fil)
```

Le `n` brut choisit la branche la plus **peuplée**, qui est souvent une querelle de mots. Le volume de texte brut choisit le **monologue** le plus long. La racine carrée amortit la pondération pour qu'un seul commentaire très long ne batte pas une vraie discussion. Le point de départ est une **racine virtuelle** regroupant tous les commentaires de profondeur 0 — sans ce point fixé explicitement, deux implémentations légitimes désignent deux colonnes différentes. Les égalités sont départagées par l'ordre du document, sinon le spine change d'un rechargement à l'autre.

**Mesuré sur un fil de 91 :** 91 lignes visibles → **30**, rapport 3,03. Le critère est « au moins divisé par 3 » ; il passe, de peu. Un ancien critère promettait « moins de 30 lignes » — il avait été retiré parce que replier la seule frontière ne peut pas le garantir sur une forêt large. La mesure confirme ce retrait.

### Trois états, et la raison pour laquelle il en faut trois

| État | Ce que c'est | Qui y revient |
|---|---|---|
| **initial** | l'état au chargement, replis natifs de HN compris | `revert()`, l'échec fermé |
| **avant-spine** | l'état juste avant que le spine ne soit appliqué | le lien `fil entier` |
| **spine** | la frontière repliée | le lien `fil principal`, la touche `s` |

La distinction n'est pas cosmétique. Sans elle, replier une branche à la main puis lancer le spine et le défaire **rouvre** cette branche — le retour écrase un choix de lecture que personne n'a demandé d'annuler.

### Les trois éléments neufs

- **Commentaire replié** — une ligne : auteur, métadonnée, le compteur `[n more]` que HN fournit déjà, et le début du texte tronqué à 90 caractères, en gris méta à 13,5 px. *Tu sais ce que tu caches.* L'aperçu est inséré pour **tous** les commentaires et révélé par la classe `coll` que HN pose lui-même : aucun code ne tourne au moment du repli.
- **Thread Spine** — un **lien texte** dans la méta du fil, jamais un bouton. HN n'a que des liens ; un bouton trahirait le vocabulaire du site. État actif en accent texte, jamais en orange pur.
- **Barre de position** — 28 px, filet supérieur 1 px, 12 px de texte en gris méta, **alignée sur la colonne de contenu et non sur la fenêtre** : pleine largeur, elle se lit comme une barre d'état de navigateur. Visible seulement pendant la navigation clavier. 28 px sont réservés en bas de `#hnmain`, sinon elle couvre le dernier commentaire.

### Le marqueur du commentaire actif

**Un tiret de 3 × 14 px** en `--accent`, à gauche de la métadonnée. Le doc disait « bordure orange » ; le rendu a montré ce que ça donne sur un commentaire de sept paragraphes — une barre orange de 500 px. Vérifié : la marque est identique sur un commentaire d'une ligne et sur un de 1 486 caractères.

### Clavier

`j` / `k` déplacent, `c` replie, `s` bascule le Thread Spine, `Échap` sort. `Cmd`+`Entrée` envoie une réponse, `Cmd`+`I` met en italique.

**Aucune touche n'existe tant qu'un champ a le focus** — `input`, `textarea`, `contenteditable`, ou n'importe quelle touche avec `Cmd` / `Ctrl` / `Alt`. Sans ce garde-fou, taper « jkjk » dans une réponse navigue dans le fil au lieu d'écrire.

**Un commentaire masqué n'est pas une cible : `j` et `k` le sautent.** L'autre option — déplier l'ancêtre pour y aller — était défendable et a été écartée : déplier annulerait le repli que l'utilisateur vient de demander, ce qui est exactement l'inverse de ce que le Thread Spine sert à faire. *À reconsidérer à l'usage.*

### Les contrôles de formulaire

En thème sombre, le bouton `add comment` natif et le `textarea` sont désormais des **surfaces**, pas du texte nu : fond `--surface-2`, cadre 1 px `--line`, `--radius-full` sur le bouton. Avant la coquille app le système n'avait aucune surface et ces contrôles étaient du texte dans un cadre `--meta` — devenu obsolète une fois que la carte, l'en-tête et les onglets ont introduit `--surface-2` et `--line` comme vocabulaire courant du système ; les contrôles de formulaire s'y sont alignés plutôt que de rester une exception.

**La famille de la zone de réponse n'est pas touchée.** HN la met en monospace délibérément. On corrige les couleurs, pas la voix.

> [!warning] `/reply` et `/submit` restent natifs, et c'est structurel
> T19 visait « aucun élément clair résiduel sur `/item`, `/reply`, `/submit` en mode sombre ». Impossible sans renoncer à T2 : ces deux pages n'ont pas de `#hnmain`, et c'est précisément ce qui met les formulaires hors d'atteinte par construction. T2 l'emporte — c'est un critère d'acceptation, T19 était un objectif. En sombre, `/reply` et `/submit` restent donc des pages claires.

### Le thème

Trois états, et non deux : **auto**, **clair**, **sombre**. `auto` n'est pas un défaut paresseux — c'est le seul qui suive l'heure de la journée, et c'est celui qu'on veut la plupart du temps ; les deux autres existent pour le forcer. La classe est posée sur `<html>` et gagne sur la media query, ce qui est la raison pour laquelle le bloc sombre est écrit **deux fois** dans la feuille.

Le lien vit dans le groupe secondaire de la sidebar (avant la coquille app il vivait dans la navbar, à côté de `login`), et affiche l'**état courant** plutôt que l'action : « auto » dit où on en est ; « passer en sombre » dirait où on va et laisserait ignorer d'où on part. Persisté sous `hn-redesign-theme`, et silencieux si `localStorage` refuse — navigation privée, quota — plutôt que de faire tomber le reste du script.

## Motion

**Aucune.** HN n'en a pas, un outil de lecture n'en a pas besoin, et la moindre transition entrerait en concurrence avec le texte. Pas d'exception.

## Pourquoi le système est cohérent

Le principe est « enfin je peux lire ». Sur le fil, la densité conservée évite de créer le scroll que le Thread Spine devra combattre ; l'interligne à 22 px rend 935 px de défilement sur un fil long sans rien coûter à la lisibilité ni à la densité ; l'indentation réduite rend en largeur ce que l'interligne prend en hauteur. Sur la liste, la coquille app ajoute de la structure — sidebar, en-tête, onglets, cartes — mais garde la même discipline : chaque surface, chaque rayon, chaque ombre est compté et budgeté par `test/lint.mjs`, et rien n'est décoratif sans porter de l'information (l'orange en aplat signale le rang et l'état actif, jamais autre chose). La couleur ne porte que deux informations héritées de HN, et le froid signifie la même chose partout ; l'anneau de focus reprend l'accent texte plutôt que d'introduire une troisième couleur.

Chaque choix finance le suivant. Si l'un saute, vérifier ce qu'il payait.

## Les paris

**R1 — La rampe bascule en température au dernier cran, et le même froid marque les liens visités.** Personne ne l'a fait. *Statut : validé sur le seul `cDD` du fil — il se lit comme une note en marge, pas comme du texte effacé. Toujours vrai après la coquille app, recalculé sur la nouvelle palette.*

~~**R2 — La taille du titre suit le score sur la liste.**~~ *Statut : superseded le 2026-08-25 par la coquille app. Le pari avait été validé (le plancher à 15,5 px empêchait l'effet riche-devient-plus-riche d'enterrer les posts neufs), mais une carte de hauteur fixe ne peut plus porter un titre de taille variable. Voir § La liste, Ce qui est perdu.*

**R3 — L'indentation passe de 40 px à 22.** *Statut : rendu, les rails restent lisibles jusqu'à la profondeur 4. Non vérifié au-delà. Non touché par la coquille app.*

~~**R0 — Un serif pour le corps.**~~ Essayé, rendu, rejeté. Voir la note dans § Typography.

**R4 — La coquille app tient la densité à 6 cartes plutôt que 7.** *Statut : accepté sur pièce par Omar. Le calcul complet vit en § La liste — c'est une conséquence de l'empilement du chrome, pas un raté.*

## Références visuelles

`design-refs/`

| Fichier | Ce que c'est |
|---|---|
| `avant.png` | HN aujourd'hui |
| `liste-clair.png` · `liste-sombre.png` | La liste, système complet |
| `fil-clair.png` · `fil-sombre.png` | Un fil de 206 commentaires |
| `rampe-cran-froid.png` | Le cran `cDD` sur un commentaire réellement downvoté |
| `capture.sh` | Recapture les fixtures depuis HN. Les pages ne sont pas versionnees : ce sont des ecrits d'autres personnes. |

## Decisions Log

| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-08-25 | Système initial créé | `/design-consultation`. Principe directeur « enfin je peux lire HN » choisi contre « je vois où est la vraie discussion ». |
| 2026-08-25 | Rampe régulière en clarté perçue | Deux propositions concurrentes clampaient le bas de la rampe et écrasaient les deux derniers crans (`+0,59`, `+0,75`). |
| 2026-08-25 | Bascule de teinte sur `cDD` | Second canal perceptif là où la luminance est épuisée. Le gain est de la distinguabilité, pas du contraste. |
| 2026-08-25 | `#BF4300` pour l'accent texte en clair | `#ff6600` mesuré à 2,81:1, échoue au plancher. **Invalide DD7 du design doc.** |
| 2026-08-25 | Indentation 22 px | Rend 180 px de mesure à la profondeur 10. |
| 2026-08-25 | Plancher d'accessibilité à 3:1, pas 4,5:1 | À 4,5:1 les cinq crans se ressemblent : la rampe survit sur le papier et meurt en pratique. |
| 2026-08-25 | **Charter abandonnée, SF adoptée** | Serif rendu puis rejeté par Omar sur pièce. Cinq candidates mesurées. **Supersede la décision typographique initiale.** |
| 2026-08-25 | ~~**Interligne du corps 24 → 23 px**~~ | ~~SF coûte 46 lignes de plus que Seravek. 23 px rend le commentaire perdu : 11 par écran.~~ **Superseded le 2026-08-25** — la densité ne dépend pas de l'interligne, voir la ligne suivante. |
| 2026-08-25 | **Interligne du corps → 22 px**, et la densité corrigée | Re-mesuré au DOM : 15 commentaires entamés à 22, 23 **et** 24 px. L'argument « un pixel vaut un commentaire » était faux, issu d'un comptage à l'œil. 22 px se justifie autrement : −935 px de défilement, ratio 1,47, densité inchangée. Plancher corrigé de 11 à 14 commentaires entiers, de 25 à 24 posts. |
| 2026-08-25 | **Tracking en deux paliers** | `0` sous 17 px, `-0.012em` au-dessus. Une seule valeur négative. La métadonnée à 12 px garde `+0.1px`, tracking positif, exception documentée pour qu'elle ne se lise pas comme une dérive. |
| 2026-08-25 | **`--radius: 2px`, valeur unique** | Le projet n'a aucune surface. Anneau de focus et cadres de formulaire, une seule valeur pour tous. Satisfait le budget du lint T25. |
| 2026-08-25 | **`:focus-visible` spécifié** | Le système n'avait aucune spécification de focus. `outline` 2 px en accent texte, offset 2 px. `:focus-visible` et non `:focus` ; accent texte et non orange pur, qui échoue à 2,81:1 en clair. |
| 2026-08-25 | **Padding de colonne réellement appliqué** | Les 48 px étaient spécifiés depuis le début et valaient **7 px** sur la liste : la navbar les avait dans ses propres cellules, le contenu non, et les deux bords gauches ne s'alignaient pas. |
| 2026-08-25 | **8 px autour de la flèche de vote** | La cellule de vote fait 10 px pile. Recentrer la flèche avec `margin: 0` collait rang, flèche et titre. |
| 2026-08-25 | **Flèches de vote habillées** | Elles étaient une image, donc hors du système : ni token, ni thème, et une marge calée sur la ligne de HN. `clip-path` plutôt que bordures, pour que le `rotate180` du downvote tourne juste. |
| 2026-08-25 | **Favicon de domaine retiré** | La CSP de HN bloque les 30 requêtes ; il ne s'affichait jamais en production. Le repli « replier la gouttière » a été retiré avec lui : du code qui ne sert jamais utilement est mort, même quand il dégrade proprement. Rend au projet ses **zéro requête réseau**. |
| 2026-08-25 | **Un trait de rail par ancêtre** | Un trait unique n'exprime que l'imbrication ; le nombre de traits exprime la profondeur. Une règle de fond remplace douze règles de largeur. |
| 2026-08-25 | **Thème à trois états, `auto` par défaut** | `auto` suit l'heure et couvre le cas courant. Le lien affiche l'état, pas l'action. |
| 2026-08-25 | **Score du spine : taille × √(longueur relative)** | Le `n` brut désigne la querelle la plus peuplée ; le volume de texte brut désigne le monologue. La racine carrée amortit pour qu'un commentaire long ne batte pas une discussion. Départage par ordre du document. |
| 2026-08-25 | **`j` / `k` sautent les commentaires masqués** | D10 laissait le choix entre sauter et déplier l'ancêtre. Déplier annulerait le repli qu'on vient de demander. À reconsidérer à l'usage. |
| 2026-08-25 | **Trois états, deux instantanés** | `restaure()` vise l'état d'avant-spine, `revert()` l'état du chargement. Confondre les deux rouvre une branche que l'utilisateur avait repliée à la main. |
| 2026-08-25 | **Cadre des contrôles en `--meta`** | `--rail` est fait pour disparaître (< 1,5:1) ; sur un contrôle sans surface, le cadre est le seul repère et doit passer 3:1. |
| 2026-08-25 | **`/reply` et `/submit` restent natifs en sombre** | T19 le voulait, T2 l'interdit : ces pages n'ont pas de `#hnmain`, ce qui est exactement ce qui protège les formulaires. Le critère d'acceptation l'emporte sur l'objectif. |
| 2026-08-25 | **Espace entre posts : 15 → 12 px** | Contradiction interne du fichier : 15 n'est pas un cran de l'échelle que la même section déclare exhaustive. La règle d'échelle l'emporte. |
| 2026-08-25 | **`--rail-active` renommé `--accent`** | Le token portait déjà tout aplat orange du système — filet de navbar, rail actif, marqueur. Son nom n'en décrivait qu'un usage sur trois, et l'issue #1 § C écrivait déjà `var(--accent)`. Nombre de tokens inchangé : 16. |
| 2026-08-25 | **Nom de l'auteur retiré de la liste** | Commodité, pas fonction. La ligne fusionnée n'a de place que pour ce sur quoi on décide de lire. |
| 2026-08-25 | **La liste entre dans le périmètre** | Pondération par score, hiérarchie de la ligne méta, et préservation de `a:visited`. |
| 2026-08-25 | **Coquille app : remplacement, pas variante** | Design de liste dense (ligne fusionnée 32 px, navbar filet orange, pondération par score) remplacé par sidebar + en-tête + onglets + cartes. Décision d'Omar, spec dans `docs/superpowers/specs/2026-08-25-coquille-app-design.md`. |
| 2026-08-25 | **Pondération par score de titre supprimée** | Une carte de hauteur fixe (102 px médiane) ne supporte pas un titre variant de 3,5 px sans se déformer. Titre fixé à 17 px. Seule fonctionnalité livrée que la coquille app retire — à rouvrir si la liste semble plate. |
| 2026-08-25 | **Palette neutre froide, tous les tokens recalculés** | La maquette approuvée est neutre, pas beige. `--accent-text` distinct de `--accent` reconduit avec de nouveaux chiffres (5,23:1 / 5,51:1). Rampe de downvote recalculée sur `--surface-1`. |
| 2026-08-25 | **Trois rayons et une ombre, budget rouvert** | `--radius: 2px` unique n'a plus de sens une fois les cartes introduites. `test/lint.mjs` rouvre le budget à 3 rayons distincts et 1 ombre, et continue de vérifier qu'aucune couleur n'est écrite en dur hors des tokens. |
| 2026-08-25 | **`--rail` réservé à la gouttière de profondeur du fil** | La distinction avec `--line` (séparateur générique) est écrite explicitement pour qu'un renommage mécanique ne fusionne pas les deux et ne casse le comptage de profondeur par nombre de traits. |
| 2026-08-25 | **Offset de colonne conditionné à `hn-side`** | `margin-left: 220px` sur `center` appliqué inconditionnellement cédait 220 px à une sidebar absente sur `/item` — le fil mesurait 645 px au lieu de 660. Trouvé en mesurant dans un vrai navigateur, pas par lecture du code. |
| 2026-08-25 | **Densité de liste acceptée à 6 cartes, pas 7** | `floor((900 − 178) / 110) = 6`, où 178 px est le chrome (en-tête + onglets + marge) et 110 px le pas d'une carte. Chaque composant est conforme individuellement ; 6 est la conséquence de leur empilement. |
| 2026-08-25 | **« Aucune donnée fabriquée » ajouté aux interdits** | Le rail droit de la maquette (trending topics, saved stories) est coupé plutôt que rempli de chiffres que HN ne sert pas. |

## Ce que ce fichier ne couvre pas

- **Le pied de page.** Les séparateurs `|` de `Guidelines | FAQ | Lists…` et le filet orange natif du bas ne sont pas traités.
- **Le rail droit de la maquette d'origine.** « Trending topics » et « Saved stories » sont coupés, pas construits — décision d'Omar, HN ne sert aucune de ces données et les fabriquer aurait été la seule donnée mensongère du projet.
- **Mobile et iOS.** Hors périmètre par décision, pas par oubli.
- **Les états de survol et les transitions.** Aucune animation dans ce projet.
- **`/newest`, `/ask`, `/show`, `/jobs`, `/front`.** Même DOM supposé que `/news`, non vérifié.
- **Les fils paginés.** HN pagine les très longs fils ; le spine serait alors calculé sur un arbre partiel. Non vérifié — il faudrait un fil de 500+.
- **Le rendu réel dans Safari, *mesuré*.** Le userscript y a été installé et confirmé sur pièce le 2026-08-25 — l'interface est la bonne. Mais toutes les captures et tous les chiffres de ce fichier viennent de Chromium, où `-apple-system` résout vers autre chose que San Francisco. Aucune valeur n'a été re-mesurée dans Safari.
