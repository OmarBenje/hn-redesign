# Design System — hn-redesign

> Créé le 2026-08-25 par `/design-consultation`. Typographie et page d'accueil révisées le même jour.
> Chaque valeur de ce fichier a été vérifiée : les contrastes sont calculés, la densité est mesurée, et le système entier a été rendu sur la vraie page d'accueil et un vrai fil de 206 commentaires, dans les deux thèmes. Les captures sont dans `design-refs/`.

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

| Élément | Taille | Interlignage |
|---|---|---|
| Titre de post (`/item`) | 21 px | 28 px, `letter-spacing: -.015em` |
| **Titres de liste (`/news`)** | **15,5 → 19 px** | 1,34 — voir *Pondération par score* |
| **Corps de commentaire** | **15 px** | **23 px** (1,53) |
| Commentaire replié | 13,5 px | 23 px |
| Métadonnée | 12 px | 16 px, `letter-spacing: .1px` |
| Code dans un commentaire | 13 px | 20 px, mono système |
| Barre de position | 12 px | 28 px (= hauteur de la barre) |

**L'interlignage de 23 px sur le corps n'est pas un arrondi, c'est une contrainte.** À 24 px, SF ne tient que 10 commentaires par écran et viole le plancher de densité. À 23 px : 11 commentaires, fil de 36 062 px — à 0,5 % de la meilleure candidate testée. Un pixel d'interligne vaut un commentaire par écran.

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
| Métadonnée | `#6E6B64` (5,0:1) | `#8A867C` (5,0:1) |
| Auteur | `#4A4741` (8,3:1) | `#B0ABA0` (8,2:1) |
| Rail de profondeur | `#E4E0D4` | `#2E2C28` |
| Rail de branche active | `#FF6600` | `#FF6600` |
| **Accent texte** | **`#BF4300`** (5,00:1) | `#FF6600` (5,98:1) |
| **Lien visité** | **`#8D9195`** | `#636669` |

### ⚠️ La règle de l'orange

**`#ff6600` ne peut pas être du texte en thème clair.** Mesuré : **2,81:1** sur `#FBFAF6`, **2,70:1** sur le beige natif de HN. Il échoue même au plancher de 3:1 de ce système — un lien orange serait moins lisible que le commentaire le plus enterré du fil.

- Aplats de 3 px et plus (bandeau, rail de branche active, marqueur du commentaire actif) → `#FF6600`, dans les deux thèmes.
- Texte, en thème clair → `#BF4300`.
- Texte, en thème sombre → `#FF6600` tel quel, il tient à 5,98:1.

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

1. **Les cinq crans sont régulièrement espacés en clarté perçue.** Écarts en clair : `+4,73 · +3,87 · +2,70 · +1,63`. Aucun sous 1,6 point. Un plancher naïf à 3:1 écrase le bas de la rampe — deux propositions concurrentes finissaient à `+0,59` et `+0,75` entre les deux derniers crans, soit deux crans visuellement identiques précisément là où le signal social compte le plus. Il faut **étaler la rampe entière**, pas clamper sa fin.

2. **Le dernier cran bascule sur l'axe de teinte.** Quatre crans chauds (≈44°), le dernier froid (≈211°). Quand le canal luminance est épuisé, la teinte offre un **second canal de discrimination qui ne coûte aucune luminance**. Ce n'est pas un gain de contraste : à luminance égale le contraste est identique (`#8D9195` = 3,04:1, un gris neutre de même clarté = 3,05:1). C'est un gain de *distinguabilité*.

Vérifié sur le seul `cDD` du fil de référence : le commentaire enterré se lit comme **une note en marge**, pas comme un texte effacé. Sur HN natif il serait à `#dddddd`, 1,25:1, illisible par construction.

### Plancher d'accessibilité

**3:1 sur tout texte de contenu.** Déviation assumée à la règle usuelle de 4,5:1 : à 4,5:1 sur les cinq crans, la rampe est conservée sur le papier et détruite en pratique. 3:1 garde le signal lisible *en tant que signal* tout en laissant le texte lisible si on décide de le lire.

## La liste — `/news` et les pages de listing

C'est l'écran où l'on décide quoi lire. Trois mécanismes, tous vérifiés sur la vraie page.

**1. Pondération par score.** La taille du titre suit le score du post :

```
taille = 15,5 + (score / score_max)^0.45 × 3,5      →  15,5 px à 19 px
```

L'exposant 0,45 écrase le haut de la gamme et étale le bas, sinon un post à 1186 points écraserait tout le reste. **Le plancher à 15,5 px est une contrainte** : aucun titre ne doit descendre sous la taille de lecture. Une version antérieure descendait à 14,5 px et enterrait un Show HN à 9 points — exactement le genre de post neuf qui a besoin d'être vu.

**2. Favicon du domaine.** `https://www.google.com/s2/favicons?sz=32&domain=<sitestr>`, 14×14, `border-radius: 2px`. Le domaine est déjà dans le DOM sous `span.sitestr`.
**Repli obligatoire :** 4 domaines sur 30 n'ont pas de favicon chez Google. Sans `onerror` qui pose `visibility:hidden`, l'alignement des titres devient irrégulier. Ne jamais `display:none` — l'espace doit rester réservé.

**3. Hiérarchie de la ligne de métadonnées.** Le nombre de commentaires est **la seule chose colorée** de la ligne (`--accent-text`) : c'est là qu'on clique. Le score est en `--c2` et en gras, en chiffres tabulaires. `hide`, `past`, `favorite` restent en gris méta. L'âge reste en gris méta.

**Densité mesurée : 25 posts visibles** sur un viewport 1400 × 1500 (HN natif : 30, mais en Verdana 10 px).

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
| Entre deux posts de la liste | 15 px |
| Barre de position | 28 px de haut, filet supérieur 1 px |

Le **16 px entre frères contre 12 px entre parent et enfant** est le seul geste hiérarchique du système, et il suffit : descendre coûte moins d'espace que passer au suivant, donc la subordination se lit avant même que l'œil ait vu le rail.

L'**indentation à 22 px** rend 180 px de mesure sur un fil profondeur 10.

## Layout

- **Approche :** colonne unique disciplinée. Pas de grille, pas de sidebar, pas d'asymétrie.
- **Colonne :** 880 px, centrée.
- **Mesure de texte :** 660 px à la profondeur 0. **Bord droit fixe** : c'est l'indentation qui mange la gauche.
- **Plancher de mesure :** 420 px. Au-delà de la profondeur 11, l'indentation cesse d'augmenter.
- **Border radius :** aucun, sauf 2 px sur les favicons.

### Densité — contrainte dure

**11 commentaires sur un viewport 1400 × 1900. 25 posts sur 1400 × 1500.** Mesurés, pas estimés.

C'est une contrainte, pas un effet de bord. Aérer et le Thread Spine résolvent le **même** problème et se combattent. Une direction plus généreuse (~6 commentaires par écran) a été rendue puis rejetée : elle doublait le scroll que le Thread Spine existe pour réduire.

**Toute modification qui fait passer la densité sous 11 commentaires ou 24 posts par écran doit être justifiée explicitement.**

## Motion

**Aucune.** HN n'en a pas, un outil de lecture n'en a pas besoin, et la moindre transition entrerait en concurrence avec le texte. Pas d'exception.

## Pourquoi le système est cohérent

Le principe est « enfin je peux lire ». La densité conservée évite de créer le scroll que le Thread Spine devra combattre. L'interligne à 23 px est le prix exact payé pour tenir cette densité avec SF. L'indentation réduite rend en largeur ce que l'interligne prend en hauteur. L'absence totale de décoration garantit que rien ne concurrence le texte. La couleur ne porte que deux informations, toutes deux héritées de HN, et le froid signifie la même chose partout.

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
| 2026-08-25 | **Interligne du corps 24 → 23 px** | SF coûte 46 lignes de plus que Seravek sur le vrai corpus. 23 px rend le commentaire perdu : 11 par écran, fil à 0,5 % de la meilleure candidate. |
| 2026-08-25 | **La liste entre dans le périmètre** | Pondération par score, favicon avec repli, hiérarchie de la ligne méta, et préservation de `a:visited`. |

## Ce que ce fichier ne couvre pas

- **Mobile et iOS.** Hors périmètre par décision, pas par oubli.
- **Les états de survol et les transitions.** Aucune animation dans ce projet.
- **`/newest`, `/ask`, `/show`, `/jobs`, `/front`.** Même DOM supposé que `/news`, non vérifié.
- **Les profondeurs supérieures à 4.** Le fil de référence n'allait pas plus loin.
- **Le rendu réel dans Safari.** Toutes les captures viennent de Chromium headless. `-apple-system` y résout vers une police distincte, mesurée, mais ce n'est pas une preuve que Safari rend à l'identique.
