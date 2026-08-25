# Design System — hn-redesign

> Créé le 2026-08-25 par `/design-consultation`.
> Chaque valeur de ce fichier a été vérifiée : les contrastes sont calculés, la densité est mesurée, et le système entier a été rendu sur le vrai fil de 206 commentaires dans les deux thèmes. Les captures sont dans `design-refs/`.

## Le principe directeur

> **« Enfin je peux lire HN. »**

Une seule phrase, et elle tranche tout le reste. Quand un arbitrage n'est pas couvert par ce fichier, la question à poser est : *est-ce que ça aide à lire un paragraphe ?* Si non, ça dégage.

Une alternative avait été proposée — « je vois où est la vraie discussion » — et **écartée**. Conséquence à retenir : la typographie et le contraste passent devant. Le Thread Spine est une feature du produit, pas la thèse du design.

## Product Context

- **Ce que c'est :** un userscript qui redessine Hacker News dans Safari sur macOS, exécuté par [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT). Ce n'est pas un client alternatif : le DOM appartient à HN.
- **Pour qui :** une personne, Omar, qui ouvre HN une dizaine de fois par jour. Aucun objectif d'adoption.
- **Espace :** restyles de HN. Voisins : Modern for HN (Chrome/FF/Edge, pas Safari), Y Redesign (iOS seulement), Hacker News Stylized (styles seuls), Refined Hacker News (MIT, dernier push 2023).
- **Type :** outil de lecture. Pas une app, pas un dashboard, pas un site marketing.

## Aesthetic Direction

- **Direction :** éditorial dense. La typographie fait tout le travail.
- **Décoration :** minimale. Un seul geste dans tout le système — le fond de page est ~4 % plus sombre que le fond de colonne, dans les deux thèmes. La colonne devient une feuille posée sur un bureau, et l'œil sait où se poser au chargement.
- **Interdits absolus :** aucune carte, aucune icône, aucune ombre, aucun arrondi décoratif, aucun dégradé, aucune animation, aucun bouton là où HN met un lien.
- **Mood :** un texte bien composé qu'on lit dix fois par jour sans y penser. La réussite, c'est de ne pas remarquer le design.

## Typography

Deux familles, une par fonction. **Aucune webfont** — tout est installé localement, zéro requête réseau au chargement d'une page HN.

- **Corps :** `Charter` (`Charter.ttc`, présente sur la machine) — dessinée par Matthew Carter pour les écrans basse résolution. C'est exactement le cas d'usage : des paragraphes longs, à l'écran, tous les jours.
- **Métadonnées et navigation :** sans-serif système. Elle est ici **secondaire**, jamais la police de corps — la règle anti-slop qui interdit `-apple-system` en police principale est respectée.
- **Code :** mono système.
- **Chargement :** aucun. Pile : `"Charter","New York",Charter,serif`.

### Échelle

| Élément | Taille | Interlignage |
|---|---|---|
| Titre de post (`/item`) | 22 px | 29 px |
| Titres de liste (`/news`) | 17 px | 23 px |
| **Corps de commentaire** | **15,5 px** | **24 px** (1,548) |
| Commentaire replié | 13,5 px | 24 px |
| Métadonnée | 12 px | 16 px, `letter-spacing: .1px` |
| Code dans un commentaire | 13 px | 20 px |
| Barre de position | 12 px | 28 px (= hauteur de la barre) |

Le rythme vertical de base est **24 px** : tout descend de là.

Le titre n'est qu'à **1,42×** le corps. C'est volontaire et contre-intuitif : sur HN le titre n'est pas le contenu, c'est l'étiquette du fil. Le contenu, ce sont les commentaires.

`-webkit-font-smoothing: antialiased` **en thème sombre uniquement** — Charter claire sur fond sombre grossit optiquement, et le rendu subpixel par défaut la rend grasse.

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

### ⚠️ La règle de l'orange

**`#ff6600` ne peut pas être du texte en thème clair.** Mesuré : **2,81:1** sur `#FBFAF6`, **2,70:1** sur le beige natif de HN. Il échoue même au plancher de 3:1 de ce système — un lien orange serait moins lisible que le commentaire le plus enterré du fil.

- Aplats de 3 px et plus (bandeau, rail de branche active, marqueur du commentaire actif) → `#FF6600`, dans les deux thèmes.
- Texte, en thème clair → `#BF4300`. Même famille, même lecture, contraste tenu.
- Texte, en thème sombre → `#FF6600` tel quel, il tient à 5,98:1.

*Cette règle invalide la décision DD7 du design doc, qui disait « Thread Spine, état actif en orange ».*

### La rampe de downvote

HN encode le jugement de la communauté dans la pâleur du texte des commentaires. Distribution mesurée sur un fil de 206 : `c00` 190, `c5A` 8, `c73` 3, `c88` 3, `cDD` 1.

**Une règle unique `.commtext { color }` détruit ce signal.** Cinq règles, une par classe, dans chaque thème. Non négociable.

| Cran | Clair | Contraste | Sombre | Contraste | Température |
|---|---|---|---|---|---|
| `.c00` | `#1F1E1A` | 15,97:1 | `#E8E5DE` | 13,97:1 | chaud |
| `.c5A` | `#393834` | 11,24:1 | `#C7C4B9` | 10,06:1 | chaud |
| `.c73` | `#545350` | 7,36:1 | `#A5A39D` | 6,97:1 | chaud |
| `.c88` | `#72716F` | 4,67:1 | `#858481` | 4,70:1 | chaud |
| `.cDD` | `#8D9195` | **3,04:1** | `#636669` | **3,04:1** | **FROID** |

**Deux propriétés à ne jamais casser en modifiant ces valeurs :**

1. **Les cinq crans sont régulièrement espacés en clarté perçue.** Écarts en clair : `+4,73 · +3,87 · +2,70 · +1,63`. Aucun sous 1,6 point. Un plancher naïf à 3:1 écrase le bas de la rampe — deux propositions concurrentes finissaient à `+0,59` et `+0,75` entre les deux derniers crans, soit deux crans visuellement identiques précisément là où le signal social compte le plus. Il faut **étaler la rampe entière**, pas clamper sa fin.

2. **Le dernier cran bascule sur l'axe de teinte.** Quatre crans chauds (≈44°), le dernier froid (≈211°). Quand le canal luminance est épuisé — et il l'est en bas de rampe — la teinte offre un **second canal de discrimination qui ne coûte aucune luminance**. Ce n'est pas un gain de contraste : à luminance égale le contraste est identique (`#8D9195` = 3,04:1, un gris neutre de même clarté = 3,05:1). C'est un gain de *distinguabilité*.

Effet de lecture, vérifié sur le seul `cDD` du fil de référence : le commentaire enterré se lit comme **une note en marge**, pas comme un texte effacé. Sur HN natif il serait à `#dddddd`, 1,25:1, illisible par construction. La censure douce devient une annotation.

Corollaire : la barre de position, le lien Thread Spine et tout élément neuf restent dans la famille **chaude**. Ce qu'on ajoute ne doit jamais se lire comme du contenu déprécié.

### Plancher d'accessibilité

**3:1 sur tout texte de contenu.** Déviation assumée à la règle usuelle de 4,5:1, et la raison est écrite ici pour ne pas être re-litigée : à 4,5:1 sur les cinq crans, la rampe est conservée sur le papier et détruite en pratique. 3:1 garde le signal lisible *en tant que signal* tout en laissant le texte lisible si on décide de le lire. C'est la différence entre enterrer et censurer.

## Spacing

**Base 4 px, rythme vertical 24 px. Six crans, rien d'autre n'existe : `4 · 8 · 12 · 16 · 24 · 48`.**

| Relation | Valeur |
|---|---|
| Métadonnée → corps (même commentaire) | 4 px |
| **Entre deux commentaires frères** | **16 px** |
| **Parent → premier enfant** | **12 px** |
| Entre deux fils racine | 24 px + filet 1 px |
| Indentation par niveau | **22 px** (HN natif : 40) |
| Rail vertical | 1 px, à `indent − 11 px` |
| Padding latéral de colonne | 48 px |
| Barre de position | 28 px de haut, filet supérieur 1 px |

Le **16 px entre frères contre 12 px entre parent et enfant** est le seul geste hiérarchique du système, et il suffit : descendre coûte moins d'espace que passer au suivant, donc la subordination se lit avant même que l'œil ait vu le rail.

L'**indentation à 22 px** paie l'interlignage à 24 px. Sur un fil profondeur 10, elle rend 180 px de mesure, soit environ une ligne de moins tous les six.

## Layout

- **Approche :** colonne unique disciplinée. Pas de grille, pas de sidebar, pas d'asymétrie.
- **Colonne :** 880 px, centrée.
- **Mesure de texte :** 660 px à la profondeur 0, soit ~86 caractères en Charter 15,5. **Bord droit fixe** : c'est l'indentation qui mange la gauche.
- **Plancher de mesure :** 420 px. Au-delà de la profondeur 11, l'indentation cesse d'augmenter.
- **Border radius :** aucun. Il n'y a aucune surface à arrondir.

### Densité — contrainte dure

**15 commentaires visibles sur un viewport 1400 × 1900.** Mesuré, pas estimé.

C'est une contrainte, pas un effet de bord. Aérer et le Thread Spine résolvent le **même** problème — trop de choses à lire — et ils se combattent. Une direction plus généreuse (~6 commentaires par écran) a été rendue puis rejetée : elle doublait le scroll que le Thread Spine existe pour réduire.

Référence : HN natif ~11 commentaires mais avec une mesure de ~150 caractères, hors de tout confort de lecture.

**Toute modification de ce fichier qui fait passer la densité sous 14 commentaires par écran doit être justifiée explicitement.**

## Motion

**Aucune.** HN n'en a pas, un outil de lecture n'en a pas besoin, et la moindre transition entrerait en concurrence avec le texte. Pas d'exception.

## Pourquoi le système est cohérent

Le principe est « enfin je peux lire ». Le serif sert la lecture longue. La densité conservée évite de créer le scroll que le Thread Spine devra combattre. L'interlignage à 24 px met l'air *dans* la ligne plutôt qu'entre les blocs. L'indentation réduite paie cet interlignage en largeur de mesure. L'absence totale de décoration garantit que rien ne concurrence le texte. La rampe de gris fait porter à la couleur la seule information qu'elle doit porter.

Chaque choix finance le suivant. Si l'un saute, vérifier ce qu'il payait.

## Les trois paris

**R1 — Un serif pour le corps, sur un site de code.** Modern for HN, Refined HN et Y Redesign shippent tous du sans. *Statut : rendu et validé sur le fil de 206 commentaires, dans les deux thèmes.*

**R2 — La rampe bascule en température au dernier cran.** *Statut : validé sur le seul `cDD` du fil — il se lit comme une note en marge, pas comme du texte effacé.*

**R3 — L'indentation passe de 40 px à 22.** *Statut : rendu, les rails restent lisibles jusqu'à la profondeur 4. Non vérifié au-delà.*

## Références visuelles

`design-refs/`

| Fichier | Ce que c'est |
|---|---|
| `avant.png` | HN aujourd'hui, viewport 1400×1900 |
| `systeme-clair.png` | Le système appliqué au vrai fil, thème clair |
| `systeme-sombre.png` | Le même en sombre |
| `rampe-cran-froid.png` | Le cran `cDD` sur un commentaire réellement downvoté |
| `E-clair.html`, `E-sombre.html` | Les pages rendues, rejouables |

## Decisions Log

| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-08-25 | Système initial créé | `/design-consultation`. Principe directeur « enfin je peux lire HN » choisi par Omar contre l'alternative « je vois où est la vraie discussion ». |
| 2026-08-25 | Rampe régulière en clarté perçue | Deux propositions concurrentes clampaient le bas de la rampe et écrasaient les deux derniers crans (`+0,59` et `+0,75`). Étaler la rampe entière est la seule façon de tenir le plancher **et** cinq crans distincts. |
| 2026-08-25 | Bascule de teinte sur `cDD` | Second canal perceptif là où la luminance est épuisée. Idée du sous-agent Claude ; sa justification (« le bleu porte moins de luminance ») est fausse — le gain est de la distinguabilité, pas du contraste. |
| 2026-08-25 | `#BF4300` pour l'accent texte en clair | `#ff6600` mesuré à 2,81:1, échoue au plancher. **Invalide DD7 du design doc.** |
| 2026-08-25 | Indentation 22 px | Proposée indépendamment par Codex et le sous-agent. Rend 180 px de mesure à la profondeur 10. |
| 2026-08-25 | Plancher d'accessibilité à 3:1, pas 4,5:1 | À 4,5:1 les cinq crans se ressemblent : la rampe survit sur le papier et meurt en pratique. |

## Ce que ce fichier ne couvre pas

- **La page d'accueil `/news`.** Elle hérite des tokens et de la typographie, mais aucune passe dédiée n'a été faite. À reprendre si le palier A ne suffit pas.
- **Mobile et iOS.** Hors périmètre par décision, pas par oubli.
- **`/newest`, `/ask`, `/show`, `/jobs`.** Même DOM supposé, non vérifié.
- **Les profondeurs supérieures à 4.** Le fil de référence n'allait pas plus loin.
