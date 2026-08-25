# Design System — hn-redesign

> Créé le 2026-08-25 par `/design-consultation`. Typographie et page d'accueil révisées le même jour. **Amendé le 2026-08-25 par la phase 1** — tracking, interligne, rayon, focus, et deux chiffres de densité corrigés.
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

- **Direction :** dense et sobre. La typographie et la couleur font tout le travail.
- **Décoration :** minimale. Un seul geste dans tout le système — le fond de page est ~4 % plus sombre que le fond de colonne, dans les deux thèmes. La colonne devient une feuille posée sur un bureau, et l'œil sait où se poser au chargement.
- **Interdits absolus :** aucune carte, aucune icône décorative, aucune ombre, aucun arrondi décoratif, aucun dégradé, aucune animation, aucun bouton là où HN met un lien.
- **Mood :** un texte bien composé qu'on lit dix fois par jour sans y penser. La réussite, c'est de ne pas remarquer le design.

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
| **Titres de liste (`/news`)** | **15,5 → 19 px** | 1,34 — voir *Pondération par score* | `0` sous 17 px, `-0.012em` au-dessus |
| **Corps de commentaire** | **15 px** | **22 px** (1,47) | `0` |
| Commentaire replié | 13,5 px | 22 px | `0` |
| Métadonnée | 12 px | 16 px | `+0.1px` — **seule exception**, voir ci-dessous |
| Code dans un commentaire | 13 px | 20 px, mono système | `0` |
| Barre de position | 12 px | 28 px (= hauteur de la barre) | `0` |

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

### Tokens

| Rôle | Clair | Sombre |
|---|---|---|
| Fond de page | `#EFEDE4` | `#121110` |
| Fond de colonne | `#FBFAF6` | `#1A1917` |
| Métadonnée | `#6E6B64` (5,09:1) | `#8A867C` (4,84:1) |
| Auteur | `#4A4741` (8,86:1) | `#B0ABA0` (7,68:1) |
| Rail de profondeur | `#E4E0D4` | `#2E2C28` |
| **Accent en aplat** (`--accent`) — filet de navbar, rail de branche active, marqueur du commentaire actif | `#FF6600` | `#FF6600` |
| **Accent texte** | **`#BF4300`** (5,00:1) | `#FF6600` (5,98:1) |
| **Lien visité** | **`#8D9195`** | `#636669` |
| **Anneau de focus** | **`#BF4300`** (5,00:1) | `#FF6600` (5,98:1) |
| **`--radius`** | `2px` | `2px` |

### ⚠️ La règle de l'orange

**`#ff6600` ne peut pas être du texte en thème clair.** Mesuré : **2,81:1** sur `#FBFAF6`, **2,70:1** sur le beige natif de HN. Il échoue même au plancher de 3:1 de ce système — un lien orange serait moins lisible que le commentaire le plus enterré du fil.

- Aplats de 3 px et plus (filet de navbar, carré du logo, rail de branche active, marqueur du commentaire actif) → `#FF6600`, dans les deux thèmes.
- Texte, en thème clair → `#BF4300`.
- Texte, en thème sombre → `#FF6600` tel quel, il tient à 5,98:1.
- Anneau de focus → accent texte, jamais orange pur. Voir § `:focus-visible`.

Mesuré le 2026-08-25 sur la navbar livrée : le filet `#FF6600` donne **2,81:1** contre le fond de colonne clair et **5,98:1** contre le sombre. Le plancher de 3:1 de ce système porte sur le **texte de contenu** — le filet n'en est pas, il n'énonce rien qu'il faille lire. Le chiffre est consigné ici pour qu'il ne se redécouvre pas comme un bug.

**L'orange cesse d'être une barre pleine.** Le bandeau natif de 50 px devient un **filet de 3 px** plus le carré du logo (T24, spec dans l'issue #1 § C). L'ancre visuelle subsiste — on reconnaît HN immédiatement — sans que 50 px d'orange saturé se disputent l'attention avec le premier titre de la liste. C'est le seul endroit du système où l'orange occupe une surface, et il en occupe désormais 3 px.

### ⚠️ Les deux signaux de HN qu'une règle de couleur naïve détruit

HN encode **deux** informations différentes dans la couleur du texte. Les deux se cassent de la même façon : une règle trop large qui impose une couleur unique.

**1. La rampe de downvote, sur les commentaires.** Distribution mesurée sur un fil de 206 : `c00` 190, `c5A` 8, `c73` 3, `c88` 3, `cDD` 1. Une règle unique `.commtext { color }` la détruit. Cinq règles, une par classe, dans chaque thème.

| Cran | Clair | Contraste | Sombre | Contraste | Température |
|---|---|---|---|---|---|
| `.c00` | `#1F1E1A` | 15,97:1 | `#E8E5DE` | 13,97:1 | chaud |
| `.c5A` | `#393834` | 11,24:1 | `#C7C4B9` | 10,06:1 | chaud |
| `.c73` | `#545350` | 7,36:1 | `#A5A39D` | 6,97:1 | chaud |
| `.c88` | `#72716F` | 4,67:1 | `#858481` | 4,70:1 | chaud |
| `.cDD` | `#8D9195` | **3,04:1** | `#636669` | **3,04:1** | **FROID** |

**2. Le lien visité, sur la liste.** `news.css` contient `a:visited { color:#828282 }` — HN grise les titres déjà lus. Une règle `#hnmain a { color: var(--c0) }` l'écrase. Il faut une règle explicite :

```css
#hnmain .titleline > a:visited { color: var(--visited) !important; }
```

Le token `--visited` reprend volontairement la valeur du cran froid `cDD`. **Même grammaire dans tout le système : ce qui est froid est ce qui est derrière toi** — soit rejeté par la communauté, soit déjà lu par toi.

### Les deux propriétés de la rampe à ne jamais casser

1. **Les cinq crans sont régulièrement espacés en clarté perçue.** Écarts de **L\*** (CIE), la seule échelle qui approche ce que l'œil voit :

| | cran 1→2 | 2→3 | 3→4 | 4→5 |
|---|---|---|---|---|
| clair | +12,26 | +11,81 | +12,37 | +12,29 |
| sombre | +11,88 | +12,12 | +11,85 | +12,12 |

Écart maximal à la moyenne : **0,3 point sur 12**. La rampe est quasi parfaitement uniforme.

> [!warning] Correction du 2026-08-25 — ce paragraphe citait la mauvaise grandeur
> Il annonçait des écarts de `+4,73 · +3,87 · +2,70 · +1,63` en les appelant « clarté perçue ». **Ce sont des écarts de *ratio de contraste***, pas de L\* : 15,97−11,24, 11,24−7,36, etc.
> Le ratio de contraste n'est pas perceptuel — il s'écrase mécaniquement vers le bas de la rampe. Citer sa décroissance pour prouver une régularité **démontrait le contraire de ce qui était affirmé.** En L\*, la vraie grandeur, la régularité est là et elle est meilleure qu'annoncée.

Un plancher naïf à 3:1 écrase le bas de la rampe — deux propositions concurrentes finissaient à `+0,59` et `+0,75` de ratio entre les deux derniers crans, soit deux crans visuellement identiques précisément là où le signal social compte le plus. Il faut **étaler la rampe entière**, pas clamper sa fin.

2. **Le dernier cran bascule sur l'axe de teinte.** Quatre crans chauds (≈44°), le dernier froid (≈211°). Quand le canal luminance est épuisé, la teinte offre un **second canal de discrimination qui ne coûte aucune luminance**. Ce n'est pas un gain de contraste : à luminance égale le contraste est identique (`#8D9195` = 3,04:1, un gris neutre de même clarté = 3,05:1). C'est un gain de *distinguabilité*.

Vérifié sur le seul `cDD` du fil de référence : le commentaire enterré se lit comme **une note en marge**, pas comme un texte effacé. Sur HN natif il serait à `#dddddd`, 1,25:1, illisible par construction.

### `:focus-visible` — la seule affordance d'état du système

```css
:focus-visible {
  outline: 2px solid var(--accent-text);
  outline-offset: 2px;
  border-radius: var(--radius);
}
```

`:focus-visible` et non `:focus` : le clavier reçoit l'anneau, la souris ne le reçoit pas. Sur un site fait de liens texte, un anneau à chaque clic serait du bruit permanent.

La couleur est **l'accent texte, pas l'orange pur** — c'est la même règle de l'orange qu'au-dessus, et pour la même raison. Vérifié contre le fond de colonne : `#BF4300` sur `#FBFAF6` = **5,00:1** en clair, `#FF6600` sur `#1A1917` = **5,98:1** en sombre. L'orange pur en clair tomberait à 2,81:1 et échouerait au plancher de 3:1 — un anneau de focus invisible est pire qu'absent, parce qu'il donne l'illusion d'être géré.

`outline` et non `border` : l'`outline` ne participe pas au flux, donc l'anneau ne déplace rien au moment où il apparaît. C'est ce qui permet de garder la densité pendant une navigation au clavier.

### Plancher d'accessibilité

**3:1 sur tout texte de contenu.** Déviation assumée à la règle usuelle de 4,5:1 : à 4,5:1 sur les cinq crans, la rampe est conservée sur le papier et détruite en pratique. 3:1 garde le signal lisible *en tant que signal* tout en laissant le texte lisible si on décide de le lire.

## La liste — `/news` et les pages de listing

C'est l'écran où l'on décide quoi lire. Trois mécanismes, tous vérifiés sur la vraie page.

**1. Pondération par score.** La taille du titre suit le score du post :

```
taille = 15,5 + (score / score_max)^0.45 × 3,5      →  15,5 px à 19 px
```

L'exposant 0,45 écrase le haut de la gamme et étale le bas, sinon un post à 1186 points écraserait tout le reste. **Le plancher à 15,5 px est une contrainte** : aucun titre ne doit descendre sous la taille de lecture. Une version antérieure descendait à 14,5 px et enterrait un Show HN à 9 points — exactement le genre de post neuf qui a besoin d'être vu.

> [!info] Il n'y a pas de favicon de domaine — retiré le 2026-08-25
> Le système en a porté un, tiré de `google.com/s2/favicons`. **Il ne s'affichait jamais sur la vraie page** : Hacker News sert `Content-Security-Policy: img-src 'self' https://account.ycombinator.com` et bloque les 30 requêtes, dans Chrome comme dans Safari. Aucune fixture locale ne pouvait le montrer — un fichier `file://` ne porte pas d'en-tête de réponse.
>
> Un repli avait d'abord été ajouté (gouttière repliée quand tout échoue). Il a été **retiré à son tour** : du code qui ne s'exécute jamais utilement en production est du code mort, même quand il dégrade proprement. Le domaine reste lisible en toutes lettres dans `.sitebit`, où HN le met déjà.
>
> **Effet de bord retrouvé : zéro requête réseau.** C'était vrai de la typographie, ce ne l'était plus de la liste. Ça l'est de nouveau — mesuré sur la vraie page, 0 requête sortante et 0 message de console.

**2. Les flèches de vote.** HN les sert en `<div class="votearrow">` de 10 × 10 avec `triangle.svg` en fond — une **image**, donc elles ne suivaient ni les tokens ni le thème, et gardaient en sombre le gris choisi pour un fond beige. Leur marge `3px 2px 6px` était par ailleurs calée sur la ligne de 30 px en Verdana de HN. Elles prennent maintenant `--meta`, `--accent` au survol, et une marge nulle.

**`clip-path` et non un triangle en bordures.** La boîte garde ses 10 × 10, donc le `rotate180` que HN applique à la flèche de *downvote* tourne autour du bon centre. Un triangle en bordures a une boîte de 0 × 0 et se déplacerait en tournant. *(La flèche de downvote n'a pas pu être vérifiée : elle demande un compte avec assez de karma.)*

**3. Hiérarchie de la ligne de métadonnées.** Le nombre de commentaires est **la seule chose colorée** de la ligne (`--accent-text`) : c'est là qu'on clique. Le score est en `--c2` et en gras, en chiffres tabulaires. `hide`, `past`, `favorite` restent en gris méta. L'âge reste en gris méta.

**Densité livrée le 2026-08-25 : 30 posts entiers, hauteur de ligne 32 px pour les 30 lignes**, viewport 1400 × 1500, dernier post à 1376 px. Mesuré au `getBoundingClientRect`. HN natif est à 30 px de ligne pour 30 posts, mais en Verdana 10 px : le redesign atteint la densité native en typographie lisible. La valeur antérieure de 58 px et 24 posts est superseded.

### La ligne fusionnée — structure livrée

`[titre 15,5–19 px] [(domaine)] [score · âge · N comments]`, le tout sur **une** ligne de 32 px. La seconde `<tr>` passe en `display: none` ; ses nœuds utiles sont **clonés**, jamais déplacés — les scripts de HN les référencent encore. Les clones perdent leur `id` : deux `#score_<n>` dans le même document et `getElementById` renvoie le clone.

Deux choses cessent d'être visibles, et restent dans le DOM :

- `hide` — **restauré au survol et au focus**. `position: absolute` plus `opacity: 0` : les trois techniques de masquage ont été mesurées, `display:none` et `visibility:hidden` tuent le `Tab`, `opacity:0` seul garde la place. Il faut les deux. La révélation au survol est enveloppée dans `@media (any-hover: hover)`.
- **Le nom de l'auteur** — abandon assumé. Commodité, pas fonction.

> [!warning] Le titre à 32 px ne tenait pas sans un troisième réglage
> Le calcul disait 20 px de ligne plus 2 × 6 px de padding = 32. Le rendu donnait **34**. Alignés sur la ligne de base, le titre à 16,5 px et le strut de la `.titleline` à 13,3 px ne partagent pas la même, et le descendant du strut ajoutait 2 px. `vertical-align: middle` sur **tous** les enfants de `.titleline` recentre tout sur le strut et la boîte retombe à 20 px exactement, pour les 30 lignes.

## Navbar

**Le bandeau de 50 px cesse d'être un aplat orange ; il devient un filet de 3 px.** L'ancre visuelle subsiste — on reconnaît HN au premier coup d'œil — sans que 50 px d'orange saturé se disputent l'attention avec le premier titre de la liste.

| | Valeur |
|---|---|
| Hauteur totale | **50 px**, `box-sizing: border-box` |
| Filet supérieur | 3 px `--accent` |
| Filet inférieur | 1 px `--rail` |
| Fond | `--col` — la barre est la colonne |
| Logo `y18.svg` | 20 px, `--radius` |
| `Hacker News` | 14 px, 600, `--c00` |
| Liens de navigation | 13 px, `--meta`, `gap: 20px` en flex |
| Page active | `--accent-text` |
| Séparateurs `\|` | retirés — ce sont des nœuds texte, aucune règle CSS ne les atteint |

**Le sélecteur est un chemin complet, et ce n'est pas du zèle.** La barre est un `<td bgcolor="#ff6600">` qui contient une **table imbriquée** de trois cellules. Viser `td:first-child` depuis `#hnmain` touche la barre *et* ses cellules : c'est l'erreur qui colle le logo à gauche et fait flotter la navigation au centre. D'où `#hnmain > tbody > tr:first-child > td`.

**`box-sizing: border-box` n'est pas optionnel.** En `content-box`, 46 px de contenu plus 4 px de bordures rendent 51 px, et le critère de hauteur échoue sur une barre pourtant juste.

**La page active n'est jamais marquée sur `/news`.** Il n'y existe aucun item de navigation à marquer, et pointer `a[href="news"]` reviendrait à souligner le nom du site. `newest`, `ask`, `show`, `jobs` sont marqués depuis l'attribut `op` de `<html>`.

> [!info] Le `letter-spacing: -.002em` de l'issue #1 § C n'a pas été implémenté
> Il est antérieur à l'amendement A1, qui interdit tout crénage négatif sous 17 px. La navbar est à 13 px : `letter-spacing: 0`. À cette taille la valeur valait −0,026 px de toute façon.

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
| Entre deux posts de la liste | **12 px** |
| Barre de position | 28 px de haut, filet supérieur 1 px |

> [!warning] Contradiction interne, tranchée le 2026-08-25
> Ce tableau annonçait **15 px** entre deux posts, alors que la ligne au-dessus déclare que l'échelle n'a que six crans — `4 · 8 · 12 · 16 · 24 · 48` — et que « rien d'autre n'existe ». 15 n'en fait pas partie. Tranché en faveur de la règle d'échelle, qui est la contrainte structurante : **12 px**. Conséquence mesurée : pas de dette de densité, les 30 posts tiennent à 1376 px sur 1500.
>
> La `tr.spacer` de HN porte `style="height:5px"` **en style inline** : aucune règle de la feuille ne la bat. C'est le JS qui la change, via le même mécanisme réversible que le reste.

Le **16 px entre frères contre 12 px entre parent et enfant** est le seul geste hiérarchique du système, et il suffit : descendre coûte moins d'espace que passer au suivant, donc la subordination se lit avant même que l'œil ait vu le rail.

L'**indentation à 22 px** rend 180 px de mesure sur un fil profondeur 10.

**Le rail porte un trait par niveau d'ancêtre, pas un seul.** Un trait unique dit « ceci est imbriqué » et rien de plus : à la profondeur 6 on voit exactement ce qu'on voit à la profondeur 2. Avec un trait par ancêtre, le *nombre* de traits **est** la profondeur — elle se compte au lieu de se deviner. Un motif de 22 px, trait de 1 px à 11 px, répété sur toute la gouttière : elle fait `indent` de large, donc elle porte exactement `indent / 22` traits, et zéro à la profondeur 0. Vérifié au rendu : 0:0, 1:1, … 8:8.

## Layout

- **Approche :** colonne unique disciplinée. Pas de grille, pas de sidebar, pas d'asymétrie.
- **Colonne :** 880 px, centrée.
- **Mesure de texte :** 660 px à la profondeur 0. **Bord droit fixe** : c'est l'indentation qui mange la gauche.
- **Plancher de mesure :** 420 px. Au-delà de la profondeur 11, l'indentation cesse d'augmenter.
- **Border radius : une seule valeur dans tout le projet, `--radius: 2px`.** Le système n'a aucune surface — ni carte, ni panneau. Trois usages seulement : l'anneau de focus, le cadre des boutons et celui de la zone de réponse. Tous prennent la même valeur, et c'est ce qui fait passer le lint de cohérence (T25 : ≤ 1 rayon distinct).

### Densité — contrainte dure

**14 commentaires entiers (15 entamés) sur un viewport 1400 × 1900. 24 posts sur 1400 × 1500.** Mesurés au DOM, pas comptés à l'œil.

C'est une contrainte, pas un effet de bord. Aérer et le Thread Spine résolvent le **même** problème et se combattent. Une direction plus généreuse (~6 commentaires par écran) a été rendue puis rejetée : elle doublait le scroll que le Thread Spine existe pour réduire.

**Toute modification qui fait passer la densité sous 14 commentaires entiers ou 24 posts par écran doit être justifiée explicitement.**

> [!warning] Ces deux chiffres ont été corrigés le 2026-08-25
> Le plancher disait *11 commentaires* et *25 posts*. Les deux venaient d'un comptage à l'œil sur capture. Re-mesurés au DOM : **14 entiers / 15 entamés** pour le fil, **24** pour la liste. Le plancher de commentaires était donc trois crans trop bas — il ne protégeait rien. Corollaire : les mesures de densité de ce projet se font au `getBoundingClientRect`, jamais sur une capture.

**Cible de la liste : 30 posts**, atteinte par la ligne fusionnée à 32 px (T23, mesurée sur prototype : hauteur médiane 32 px, 30 posts entamés). Tant que T23 n'est pas livrée, le plancher reste 24.

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

En thème sombre, le bouton `add comment` natif est un rectangle blanc au milieu d'une page noire. Il prend le fond de colonne et un cadre de 1 px.

**Le cadre est en `--meta`, pas en `--rail`.** Le système n'a aucune surface : ces contrôles sont du texte dans un cadre de 1 px, et ce cadre est la **seule** chose qui les rend repérables. Il doit donc passer le plancher — `--meta` donne 5,09:1 en clair et 4,84:1 en sombre contre le fond de colonne, là où `--rail`, fait pour disparaître derrière le texte, tombe sous 1,5:1.

**La famille de la zone de réponse n'est pas touchée.** HN la met en monospace délibérément. On corrige les couleurs, pas la voix.

> [!warning] `/reply` et `/submit` restent natifs, et c'est structurel
> T19 visait « aucun élément clair résiduel sur `/item`, `/reply`, `/submit` en mode sombre ». Impossible sans renoncer à T2 : ces deux pages n'ont pas de `#hnmain`, et c'est précisément ce qui met les formulaires hors d'atteinte par construction. T2 l'emporte — c'est un critère d'acceptation, T19 était un objectif. En sombre, `/reply` et `/submit` restent donc des pages claires.

### Le thème

Trois états, et non deux : **auto**, **clair**, **sombre**. `auto` n'est pas un défaut paresseux — c'est le seul qui suive l'heure de la journée, et c'est celui qu'on veut la plupart du temps ; les deux autres existent pour le forcer. La classe est posée sur `<html>` et gagne sur la media query, ce qui est la raison pour laquelle le bloc sombre est écrit **deux fois** dans la feuille.

Le lien vit dans la navbar, à côté de `login`, et affiche l'**état courant** plutôt que l'action : « auto » dit où on en est ; « passer en sombre » dirait où on va et laisserait ignorer d'où on part. Persisté sous `hn-redesign-theme`, et silencieux si `localStorage` refuse — navigation privée, quota — plutôt que de faire tomber le reste du script.

## Motion

**Aucune.** HN n'en a pas, un outil de lecture n'en a pas besoin, et la moindre transition entrerait en concurrence avec le texte. Pas d'exception.

## Pourquoi le système est cohérent

Le principe est « enfin je peux lire ». La densité conservée évite de créer le scroll que le Thread Spine devra combattre. L'interligne à 22 px rend 935 px de défilement sur un fil long sans rien coûter à la lisibilité ni à la densité. L'indentation réduite rend en largeur ce que l'interligne prend en hauteur. L'absence totale de décoration garantit que rien ne concurrence le texte — et laisse au système un seul rayon, une seule durée (aucune), une seule ombre (aucune). La couleur ne porte que deux informations, toutes deux héritées de HN, et le froid signifie la même chose partout ; l'anneau de focus reprend l'accent texte plutôt que d'introduire une troisième couleur.

Chaque choix finance le suivant. Si l'un saute, vérifier ce qu'il payait.

## Les paris

**R1 — La rampe bascule en température au dernier cran, et le même froid marque les liens visités.** Personne ne l'a fait. *Statut : validé sur le seul `cDD` du fil — il se lit comme une note en marge, pas comme du texte effacé.*

**R2 — La taille du titre suit le score sur la liste.** *Statut : rendu sur la vraie page d'accueil. Le plancher à 15,5 px empêche l'effet riche-devient-plus-riche d'enterrer les posts neufs.*

**R3 — L'indentation passe de 40 px à 22.** *Statut : rendu, les rails restent lisibles jusqu'à la profondeur 4. Non vérifié au-delà.*

~~**R0 — Un serif pour le corps.**~~ Essayé, rendu, rejeté. Voir la note dans § Typography.

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

## Ce que ce fichier ne couvre pas

- **Le pied de page.** Les séparateurs `|` de `Guidelines | FAQ | Lists…` et le filet orange natif du bas ne sont pas traités. T24 ne portait que sur la barre du haut.
- **Mobile et iOS.** Hors périmètre par décision, pas par oubli.
- **Les états de survol et les transitions.** Aucune animation dans ce projet.
- **`/newest`, `/ask`, `/show`, `/jobs`, `/front`.** Même DOM supposé que `/news`, non vérifié.
- **Les fils paginés.** HN pagine les très longs fils ; le spine serait alors calculé sur un arbre partiel. Non vérifié — il faudrait un fil de 500+.
- **Le rendu réel dans Safari, *mesuré*.** Le userscript y a été installé et confirmé sur pièce le 2026-08-25 — l'interface est la bonne. Mais toutes les captures et tous les chiffres de ce fichier viennent de Chromium, où `-apple-system` résout vers autre chose que San Francisco. Aucune valeur n'a été re-mesurée dans Safari.
