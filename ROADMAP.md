# Roadmap

> **Source de vérité unique.** Les tâches ont existé un temps dans trois formats à trois endroits — un design doc local, deux fichiers JSONL, une issue GitHub — sans que rien ne dise lequel faisait autorité. Ce fichier les réconcilie. En cas de contradiction avec un autre document, **c'est ce fichier qui gagne.**

**État au 2026-08-25 : les phases 1 à 6 sont livrées et vérifiées.** Le userscript fait ~1 670 lignes, CSS compris. Quatre suites le vérifient — **45 tests unitaires**, 31 invariants de feuille, 9 budgets de cohérence, **70 assertions au rendu** sur 5 pages — et `#hnmain` revient identique **à l'octet** après `revert()`.

**T1 est franchie** : le userscript tourne dans Safari, confirmé sur la vraie page. Les 25 tâches des phases 0 à 5 sont faites, et les 8 tâches de la phase 6 — la coquille app — le sont aussi (§ Phase 6 ci-dessous).

**En attendant, le script tourne dans Chrome.** [`chrome/`](chrome/) est une extension MV3 dont le content script est une **copie** du userscript, en `world: "MAIN"` — donc le même modèle d'exécution qu'un userscript en `@grant none`. Vérifié sur la vraie page `news.ycombinator.com`, pas seulement sur fixtures.

> [!info] Les chiffres ci-dessous datent d'avant la coquille app
> « 30 posts à 32 px, navbar à 50 px » décrivait le design de liste dense livré en phase 3, remplacé depuis par la coquille app — voir § Phase 6. « 108 commentaires jusqu'à la profondeur 8, Thread Spine 108 → 33 lignes » porte sur le fil de commentaires, qui n'a pas changé de comportement et reste vrai.

> [!warning] Deux choses que seule la vraie page a montrées
> **1. Le premier chargement de l'extension a échoué** sur `Uncaught SyntaxError: Identifier 'addClass' has already been declared`. Le fichier est évalué dans la portée globale de la page ; une seconde évaluation dans le même document tue tout. Le script vit désormais dans une IIFE avec un garde-fou `if (window.hnRedesign) return;` — ce qui règle aussi la fuite de ~30 identifiants dans le global de HN.
>
> **2. Les favicons de domaine ne chargeaient pas.** HN sert `img-src 'self' https://account.ycombinator.com` : les 30 requêtes étaient bloquées, dans Chrome comme dans Safari. **Aucune fixture ne pouvait le montrer** — un fichier `file://` ne porte pas d'en-tête. La fonctionnalité a été **retirée** (T11), pas rafistolée : elle ne s'affichait jamais en production. Le projet retrouve ses zéro requête réseau.

---

## Phase 0 — la porte ✅ **franchie le 2026-08-25**

| | Tâche | État |
|---|---|---|
| **T1** | Spike Userscripts : charger, recharger, survivre à un redémarrage de Safari | ✅ **trois oui**, exécuté par Omar |

| Question | Réponse |
|---|---|
| **Q1 — charger** | oui. Bandeau vert et badge au premier chargement. |
| **Q2 — recharger** | oui, et **dans sa forme forte** : Userscripts surveille le dossier et voit une modification faite **depuis l'extérieur**, sans passer par son éditeur intégré. |
| **Q3 — survivre** | oui. Autorisation et dossier de travail intacts après `Cmd+Q`. |

**Le userscript complet a ensuite été installé et confirmé sur la vraie page dans Safari.**

### Ce que le spike a appris, et qui n'était nulle part

**Le dossier de travail est sous sandbox** et ne se choisit pas depuis le popup — le bouton dossier le **révèle**, il n'ouvre pas de sélecteur. Le chemin est :

```
~/Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/scripts
```

**Un lien symbolique vers `~/dev` n'y marcherait pas** : il sort du bac à sable. On y dépose donc une copie, et [`bin/sync-safari.sh`](bin/sync-safari.sh) la pose. La réponse à Q2 est ce qui rend ce script suffisant : une copie déposée est vue sans intervention. **C'est le circuit de livraison du projet.**

**Prérequis machine :** macOS 12+ et Safari 14.1+.

> [!info] La reformulation du 2026-08-25 était juste, et n'a plus d'objet
> « Rien d'autre ne commence avant T1 » avait été corrigé en « T1 garde l'itération dans Safari, pas l'écriture ». Les phases 1 à 5 ont donc été écrites avant, vérifiées sur fixtures puis dans Chrome. T1 a confirmé le runtime après coup, sans qu'une ligne soit à reprendre.

---

## Phase 1 — aligner le système avant d'écrire du CSS ✅ **faite le 2026-08-25**

→ **[Issue #1](https://github.com/OmarBenje/hn-redesign/issues/1)**, sections A et E.

| | Amendement | État |
|---|---|---|
| **A1** | Tracking en deux paliers : `0` sous 17 px, `-0.012em` au-dessus. Métadonnée à `+0.1px` documentée comme exception | ✅ |
| **A2** | Interligne du corps 23 → **22 px** (ratio 1,47) | ✅ |
| **A3** | `--radius: 2px`, valeur unique du projet | ✅ |
| **A4** | `:focus-visible` spécifié — `outline` 2 px en accent texte, offset 2 px | ✅ |
| **E1** | Prémisse 3 reformulée : le HTML fonctionnel reste *atteignable*, la présentation peut relocaliser des nœuds | ✅ |
| **E2** | L'orange reste l'ancre mais cesse d'être un aplat de 50 px — filet de 3 px, et jamais du texte en clair | ✅ |

**Trois chiffres du système étaient faux et ont été corrigés en re-mesurant au DOM :**

| Affirmation | Réalité mesurée |
|---|---|
| « à 23 px : 11 commentaires ; à 24 px : 10 » | **15 entamés / 14 entiers à 22, 23 et 24 px.** La densité du premier écran ne dépend pas de l'interligne. |
| plancher de densité : 11 commentaires | **14 entiers.** Le plancher était trois crans trop bas — il ne protégeait rien. |
| 25 posts sur la liste | **24.** |

Les trois venaient d'un comptage à l'œil sur capture. Règle retenue : **la densité se mesure au `getBoundingClientRect`.** L'argument pour 22 px n'est donc plus la densité mais les **−935 px** de défilement sur le fil de 206 (35 168 contre 36 103), gratuits.

| Effort réel | ~1 h |
|---|---|

---

## Phase 2 — les fondations ✅ **faite le 2026-08-25**

| | Tâche | Effort | Note |
|---|---|---|---|
| **T2** | Scoper toutes les règles CSS sous `#hnmain` | ~10 min | ✅ vérifié sur la vraie `/login` : 0 classe, 0 feuille, 7 `input` intacts |
| **T3** | `try/catch` global, retrait de l'injection en cas d'erreur | ~20 min | ✅ `revert()` remet HN au pixel — fond `#f6f6ef`, corps 12 px, noir |
| **T13** | Bloc de **16** tokens CSS : `:root`, `@media (prefers-color-scheme: dark)`, classe de surcharge | ~40 min | ✅ 16 tokens, `hn-dark` / `hn-light` gagnent sur la media query |
| **T14** | Cinq règles de rampe de downvote, plancher 3:1, deux thèmes | ~30 min | ✅ 5 crans distincts au rendu ; `test/contraste.mjs` passe |
| **T15** | ~~Charter pour le corps~~ → **SF via `-apple-system`**, corps 15/22 | ~30 min | ✅ `15px/22px`, famille `-apple-system` |

### Deux bugs trouvés au rendu, pas à la relecture

| Symptôme | Cause |
|---|---|
| Le corps restait en Verdana alors que le `td` parent était en SF | `news.css:21` déclare `font-family` sur `.comment`. **Une déclaration directe bat une valeur héritée**, quelle que soit la spécificité. HN en déclare sur **neuf** sélecteurs dans `#hnmain`. |
| Les 30 titres de `/news` passaient à 21 px | `.athing.submission` existe sur les deux pages. Le discriminant de `/item` est `table.fatitem` — 1 sur `/item`, 0 sur `/news`. Sans ça, la pondération par score de la phase 3 n'aurait plus rien eu à pondérer. |

Les deux sont écrits dans `CLAUDE.md`, pièges 4 et 5.

---

## Phase 3 — la liste ✅ **faite le 2026-08-25**

L'écran où l'on décide quoi lire.

| | Tâche | État |
|---|---|---|
| **T23** | Ligne fusionnée à 32 px : titre et métadonnée sur une ligne, `hide` restauré au survol | ✅ **32 px pour les 30 lignes**, 30 posts entiers, dernier à 1376 px sur 1500 |
| **T24** | Navbar filet orange : 50 px, `box-sizing: border-box`, séparateurs `\|` retirés | ✅ 50 px, filet 3 px, 9 liens, 0 séparateur |
| **T11** | Favicon de domaine depuis `span.sitestr` | ⛔ **retirée le 2026-08-25** — la CSP de HN la rend inopérante en production |

Repères : HN natif 30 posts par écran à 30 px de ligne, mais en Verdana 10 px. Le design initial était à 58 px et 24 posts. **La cible de 30 posts est atteinte en typographie lisible.**

La pondération par score (§ La liste de `DESIGN.md`, mécanisme 1) est livrée avec : titres de **15,5 à 19 px**, exposant 0,45, et le palier de tracking appliqué post par post — 0 violation sur 30.

### Trois bugs que seul le rendu a trouvés

| Symptôme | Cause |
|---|---|
| La ligne mesurait 34 px et non 32, alors que 20 + 2 × 6 = 32 | Alignés sur la ligne de base, le titre à 16,5 px et le strut de la `.titleline` à 13,3 px ne partagent pas la même ; le descendant du strut ajoutait 2 px. `vertical-align: middle` sur **tous** les enfants recentre sur le strut → 20 px exactement. |
| Un post sur trente restait non fusionné, à 17 px, sa ligne de métadonnée visible | Les **posts d'emploi n'ont pas de `span.subline`** : leur `td.subtext` porte l'âge et `hide` en enfants directs. Repli sur `td.subtext`. |
| Le même post affichait « 12 hours ago  12 hours ago » | Le lien de commentaires est le *dernier* `a[href^="item?id="]` — mais sur un post d'emploi le seul qui existe est celui de l'âge. Test `!dernier.closest('.age')`. |

### T3 a dû être rebâti

La phase 3 est la première à toucher le **DOM**, pas seulement la feuille. L'échec fermé ne pouvait plus reposer sur le seul retrait de la classe racine : elle n'annule ni un nœud inséré, ni un `style` inline, ni un nœud texte retiré.

Chaque mutation s'enregistre maintenant dans une pile d'annulation et se rejoue à l'envers. **C'est vérifiable, et c'est vérifié** : `test/rendu.sh` compare l'`innerHTML` de `#hnmain` avant `apply()` et après `revert()` — **34 145 caractères identiques, à l'octet**.

Un détail a coûté la première version : sauvegarder `el.style[prop]` et le restaurer rend bien la même *valeur*, mais le CSSOM la re-sérialise — `border:1px white solid` revient en `border: 1px solid white;`. C'est l'attribut `style` **brut** qu'il faut garder.

| Effort réel | ~1 h 30 |
|---|---|

---

## Phase 4 — le fil de commentaires ✅ **faite le 2026-08-25**

Le cœur du projet.

| | Tâche | État |
|---|---|---|
| **T4** | `buildModel()` : un seul parcours produisant `{el, depth, n, textLen, parent, children}` | ✅ 91 nœuds, profondeurs 0–8, un seul endroit connaît `img.width / 40` |
| **T5** | `collapse(tr, veutReplié)` **idempotent** | ✅ deux appels à `true` ne dé-replient jamais |
| **T6** | Replier la **frontière**, jamais tous les non-spine | ✅ 23 replis au lieu de 91 |
| **T7** | Descente gloutonne sur `n` pondéré par la longueur moyenne | ✅ déterministe, chaîne parent-enfant 0>1>2>3>4>5>6 |
| **T8** | Porter 5-6 modules de refined-hacker-news (MIT) | ✅ 5 modules, réécrits sur `buildModel()`, attribution dans `README.md` |
| **T9** | Garde-fous clavier | ✅ `j` `c` `s` tapés dans le `textarea` ne font rien |
| **T16** | Les trois éléments neufs | ✅ aperçu de commentaire replié, lien Thread Spine, barre de position |
| **T17** | Formulaire de réponse replié derrière un lien | ✅ ~250 px repris en haut du fil |
| **T18** | Marqueur du commentaire actif : tiret 3×14 px | ✅ identique sur un commentaire de 1 486 caractères |
| **T19** | Habiller `input[type=submit]` et les boutons | ✅ sur `/item` — voir la réserve ci-dessous |
| **T20** | Barre de position alignée sur la colonne | ✅ `112+1176` contre `112+1176` |

**Le critère du Thread Spine passe, de peu.** 91 lignes visibles → **30**, rapport **3,03** contre 3,00 exigé. Le critère avait déjà été révisé une fois — la promesse initiale de « moins de 30 lignes » avait été retirée parce que replier la seule frontière ne peut pas la garantir sur une forêt large. La mesure confirme le retrait, et la marge est mince : sur un fil plus large, le rapport descendra sous 3.

### T12 tranché, et il fallait trois états

`restaure()` vise l'état d'**avant-spine**, `revert()` l'état du **chargement**. Confondre les deux fait que replier une branche à la main, lancer le spine, puis revenir **rouvre** cette branche. Vérifié dans les deux sens.

### Trois bugs, dont un que seul un test de rendu pouvait voir

| Symptôme | Cause |
|---|---|
| L'indentation restait à 40 px alors que douze règles CSS disaient 22 | **Un `/*` non fermé** dans la feuille. `node --check` ne voit rien — le CSS vit dans un template literal —, la feuille se charge sans erreur, et les douze règles suivantes disparaissent en silence. `test/regles.mjs` compte désormais les délimiteurs. |
| `revert()` laissait 182 `style=""` dans le DOM | Écrire un style inline sur un élément qui n'avait **aucun** attribut `style`. Remplacé par douze règles de palier : zéro déclaration inline dans le fil, et le problème disparaît avec sa cause. |
| Le marqueur du commentaire actif se mesurait à `auto × auto` | Bug **du test**, pas du code. `getComputedStyle` rend une vue **vivante** : lire `marque.width` après avoir retiré la classe rend l'état d'après, pas celui de la mesure. |

### Ce qui a été décidé plutôt que demandé

Trois points que la spec laissait ouverts, tranchés et documentés dans `DESIGN.md` — à rouvrir si le ressenti ne suit pas :

1. **Le score du spine** est `taille × √(longueur relative)`. Le `n` brut désigne la querelle la plus peuplée, le volume brut le monologue le plus long.
2. **`j` / `k` sautent** les commentaires masqués au lieu de déplier l'ancêtre. Déplier annulerait le repli qu'on vient de demander.
3. **Le lien `[racine]`** n'apparaît qu'à partir de la profondeur 2. À la profondeur 1 la racine est la ligne juste au-dessus.

> [!warning] T19 ne peut pas atteindre `/reply` et `/submit`, et c'est structurel
> L'objectif était « aucun élément clair résiduel sur `/item`, `/reply`, `/submit` en mode sombre ». Ces deux pages n'ont pas de `#hnmain` — c'est exactement ce qui met les formulaires hors d'atteinte par construction (T2, critère d'acceptation n°10). Le critère l'emporte sur l'objectif : en sombre, `/reply` et `/submit` restent des pages claires.

| Effort réel | ~2 h 30 |
|---|---|

## Phase 5 — vérification et finition ✅ **faite le 2026-08-25**

| | Tâche | État |
|---|---|---|
| **T10** | `node --test` + `linkedom` + fixtures | ✅ 12 tests sur le calcul pur, exécutant le **vrai** userscript |
| **T25** | Lint de cohérence : ≤1 radius, 0 durée, 0 ombre, 0 famille d'icônes | ✅ `test/lint.mjs`, 9 budgets, vérifié par mutation |
| **T12** | Fixer les trois états et la réversibilité | ✅ **livrée en phase 4** — voir ci-dessus |
| **T21** | Rails de profondeur qui expriment la profondeur | ✅ un trait par ancêtre : 0:0 1:1 … 8:8 |
| **T22** | Interrupteur de thème manuel | ✅ trois états, persistés sous `hn-redesign-theme` |

### T10 — les tests exécutent le vrai fichier, pas une copie

Le script est un seul fichier sans système de modules — contrainte du runtime, pas un choix. On ne peut donc pas l'importer. `test/harness.mjs` le lit, l'exécute dans une fonction dont les paramètres sont les globales du navigateur, et récupère le `window.hnRedesign` que le script expose déjà. **Aucune duplication de logique** : ce qui est testé est ce qui tourne.

Le harness fournit un **simulateur de `a.togg`**, puisqu'il n'y a pas de `hn.js` sous Node. Il calcule son propre arbre depuis les attributs `indent` — un simulateur qui utiliserait `buildModel()` ne testerait plus rien. **Il reproduit HN ; il ne le prouve pas.** La preuve que le vrai `a.togg` se comporte ainsi est dans `test/rendu.sh`, sur la vraie page avec le vrai `hn.js`.

Le test le plus utile est une **vérification croisée** : la taille de sous-arbre que le modèle calcule depuis les seuls attributs `indent` égale l'attribut `n` que HN calcule côté serveur, sur les 91 nœuds. Deux calculs indépendants du même nombre.

### T25 — le lint a été vérifié par mutation

Un lint qui ne trouve jamais rien est indiscernable d'un lint cassé. Six violations ont été injectées puis retirées : un second rayon, une transition, une ombre, un `!important`, une couleur en dur, un token orphelin. **Les six ont été attrapées.**

Deux budgets vont au-delà de la spec, et sont ceux qui attrapent la vraie dérive : **aucune couleur écrite en dur hors des blocs de thème** — donc toute couleur a une variante sombre par construction — et **correspondance exacte entre tokens déclarés et `var()` utilisés**, dans les deux sens.

### T21 — un trait par ancêtre

Un trait unique dit « ceci est imbriqué » et rien de plus : à la profondeur 6 on voit exactement ce qu'on voit à la profondeur 2. La gouttière porte désormais **un trait par niveau d'ancêtre**, donc le nombre de traits *est* la profondeur — elle se compte au lieu de se deviner.

Un seul motif de 22 px suffit, trait de 1 px à 11 px, répété. La gouttière fait `indent` de large, donc elle porte exactement `indent / 22` traits, et zéro à la profondeur 0. **Douze règles de largeur remplacées par une règle de fond.**

### T22 — trois états, pas deux

`auto` n'est pas un défaut paresseux : c'est le seul qui suive l'heure de la journée, et c'est celui qu'on veut la plupart du temps. Les deux autres existent pour le forcer. Le lien affiche l'**état courant** et non l'action — « auto » dit où on en est ; « passer en sombre » dirait où on va et laisserait ignorer d'où on part.

Le comptage des liens natifs de la navbar ne bouge pas : le nôtre porte la classe `__theme` et le critère d'acceptation n°11 compte `.pagetop a:not(.__theme)`.

| Effort réel | ~1 h 30 |
|---|---|

---

## Phase 6 — la coquille app ✅ **faite le 2026-08-25**

Remplacement du design de liste dense livré en phase 3 — pas une variante. Sidebar de navigation fixe, en-tête avec recherche relocalisée, onglets Top/New/Best, colonne de cartes. Décision d'Omar ; la spec complète vit dans `docs/superpowers/specs/2026-08-25-coquille-app-design.md`.

| | Tâche | État |
|---|---|---|
| **1** | La barre latérale — 220 px, `position: fixed`, deux groupes, sept icônes SVG inline | ✅ |
| **2** | Deuxième garde-fou de `sidebar()` — pas de sidebar sur `/item`, `table.fatitem` | ✅ |
| **3** | `detache()` avant `insere()` pour les nœuds relocalisés de `sidebar()` | ✅ — voir le bug ci-dessous |
| **4** | L'en-tête — 92 px, titre de page, formulaire de recherche natif de HN relocalisé | ✅ |
| **5** | Les onglets Top / New / Best — état actif sur `op`, repli sur `location.pathname` | ✅ |
| **6** | La carte — `tr.athing.submission` en `display: grid` sur les trois `td` natifs | ✅ |
| **7** | L'ombre de la carte passe par le token `--ombre`, pas par un budget de lint assoupli en douce | ✅ |
| **8** | Palette neutre froide — 22 tokens en clair, 16 redéfinis en sombre, tous les contrastes recalculés | ✅ |

**Ce qui a été mesuré :**

| Fait | Valeur |
|---|---|
| Hauteur de carte | médiane **102 px**, 0 des 30 cartes hors tolérance ±6 px |
| Densité de liste | **6 cartes entières** dans 1400 × 900 |
| Sidebar | 220 px, `position: fixed` |
| En-tête | 92 px, sur `/news` et sur `/item` |
| Barre d'onglets | 68 px (52 px de conteneur + 16 px de marge), exactement un onglet actif ou zéro |
| Mesure de texte du fil, profondeur 0 | 660 px (était tombée à 645 px avant le second garde-fou de colonne, voir T2 ci-dessus) |
| Tests unitaires | 45, tous verts |
| Assertions au rendu | 70, toutes vertes |
| Règles CSS | 112, sur 22 tokens |

**Ce qui a été perdu :** la pondération par score de titre (15,5 → 19 px selon le score, exposant 0,45). Une carte de hauteur fixe ne peut pas porter un titre qui varie de 3,5 px sans se déformer, ou sans que la métrique de densité cesse d'être vérifiable. Le titre est fixé à 17 px. C'est la **seule fonctionnalité livrée que cette phase supprime** — voir `DESIGN.md` § La liste, *Ce qui est perdu*, pour la décision complète et ce qu'il faudrait pour la rouvrir.

**La densité descend de 7 (visé) à 6 (livré), et c'est un calcul, pas un bug.** En-tête 92 px + barre d'onglets 68 px + marge = 178 px de chrome avant la première carte ; 110 px par carte gouttière comprise ; `floor((900 − 178) / 110) = 6`. Chaque composant est individuellement conforme à sa spec ; le chiffre de 7 du plan initial venait d'une arithmétique qui ne comptait pas le chrome.

### Un bug que seul un rendu réel a montré, deux fois

| Symptôme | Cause |
|---|---|
| `revert()` retirait le logo de HN et sept liens natifs du document | L'undo d'`insere()` est un simple `node.remove()` — correct pour un nœud neuf ou cloné, faux pour un nœud **relocalisé** : il ne le remet jamais à sa place d'origine. Corrigé en passant par `detache(node)` avant `insere(...)` pour tout nœud préexistant que `sidebar()` ou `entete()` déplacent. |
| Le fil de `/item` se mesurait à 645 px au lieu de 660 px | `.hn-side center { margin-left: 220px }` s'appliquait dès que la classe racine était posée, pas seulement quand la sidebar existait réellement. `/item` a `#hnmain` mais pas de sidebar (le fil ne cède pas 220 px) — d'où un deuxième garde-fou explicite, la classe `hn-side`, posée seulement quand `sidebar()` a effectivement rendu quelque chose. |

Aucun des deux n'était visible dans le code lu seul : le premier ne casse rien qu'on puisse voir sans appeler `revert()` sur une vraie page ; le second est une classe CSS mal conditionnée, syntaxiquement correcte.

| Effort réel | ~3 h |
|---|---|

## Ce que les tests ne couvriront jamais

Écrit ici pour que personne ne s'y trompe, y compris moi dans six mois.

`node --test` et `linkedom` couvrent le **calcul pur** : modèle d'arbre, descente du spine, idempotence du repli, calcul de la frontière, contrastes, budget du lint.

Ils ne couvrent **pas** : le focus, `scrollIntoView`, la navigation `J`/`K`, le rendu, les handlers inline de HN, et le comportement de Safari. Environ **8 chemins sur 24**. Une suite verte ne prouve pas que la navigation marche.

**Toutes les captures de ce dépôt viennent de Chromium headless, pas de Safari.** `-apple-system` y résout vers une police distincte et mesurée, mais ce n'est pas une preuve que Safari rend à l'identique. C'est aussi ce que T1 tranchera.

---

## Tâches périmées ou absorbées

| | Statut | Pourquoi |
|---|---|---|
| **T15** (version d'origine) | **réécrite** | Reposait sur Charter. Le serif a été rendu sur le vrai fil puis rejeté. Cinq candidates mesurées avant SF. |
| **T13** (version d'origine) | **corrigée** | Annonçait 14 tokens, il y en a 16. |
| **T11** | **retirée** | Absorbée par T23, puis supprimée : `img-src 'self'` sur HN bloque les requêtes vers Google, donc le favicon ne s'affichait jamais sur la vraie page. Le domaine reste lisible en toutes lettres. |

---

## Effort total

```
Phase 0   porte                     ~10 min    fait
Phase 1   alignement du système     ~1 h       fait
Phase 2   fondations                ~2 h 10    fait
Phase 3   la liste                  ~2 h 15    fait
Phase 4   le fil                    ~5 h 10    fait
Phase 5   vérification              ~3 h 10    fait
Phase 6   la coquille app           ~3 h       fait
─────────────────────────────────────────────────────
                                    ~16 h 55 en humain
```

**Les 25 tâches des phases 0 à 5 sont faites, et les 8 tâches de la phase 6 aussi.** Le projet tourne dans Safari via Userscripts, et dans Chrome via `chrome/`.

Ordre imposé : **0 → 1 → 2 → (3 ‖ 4) → 5 → 6**. Les phases 3 et 4 touchent des fichiers différents et peuvent avancer en parallèle une fois les fondations posées ; la phase 6 remplace ce que la phase 3 avait livré pour la liste, elle ne pouvait donc pas avancer avant elle.

---

## Où vit le reste

- **[`DESIGN.md`](DESIGN.md)** — le système de design. Chaque valeur mesurée, chaque contraste calculé, avec les captures qui le prouvent.
- **[`CLAUDE.md`](CLAUDE.md)** — les onze choses qui cassent le projet si on les oublie.
- **[Issue #1](https://github.com/OmarBenje/hn-redesign/issues/1)** — la spec détaillée des phases 1, 3 et 5, avec sélecteurs, fixtures et 14 critères d'acceptation.
- **`docs/superpowers/specs/2026-08-25-coquille-app-design.md`** — la spec de la phase 6, avec les 14 critères d'acceptation de la coquille app.
- **`design-refs/`** — les captures. `capture.sh` reconstruit les fixtures depuis HN ; elles ne sont pas versionnées, ce sont les écrits d'autres personnes.
