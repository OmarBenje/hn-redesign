# Roadmap

> **Source de vérité unique.** Les tâches ont existé un temps dans trois formats à trois endroits — un design doc local, deux fichiers JSONL, une issue GitHub — sans que rien ne dise lequel faisait autorité. Ce fichier les réconcilie. En cas de contradiction avec un autre document, **c'est ce fichier qui gagne.**

**État au 2026-08-25 : aucune ligne de code n'existe.** Le dépôt contient un système de design ([`DESIGN.md`](DESIGN.md)) dont chaque valeur a été mesurée, et les captures qui le prouvent. Ce qui suit est ce qui reste à faire.

---

## Phase 0 — la porte

Une seule tâche, et **tout le reste en dépend**.

| | Tâche | Effort | État |
|---|---|---|---|
| **T1** | Spike [Userscripts](https://github.com/quoid/userscripts) : charger, recharger, survivre à un redémarrage de Safari | ~10 min | script prêt — **à exécuter par Omar** |

Le projet suppose que Userscripts charge un fichier local, le recharge après modification, et survit à un redémarrage. **Personne ne l'a exécuté.** Si l'une des trois réponses est non, les quatre heures suivantes sont à jeter et le plan est à refaire autour d'un autre runtime.

### Comment l'exécuter

Le script est [`t1-spike.user.js`](t1-spike.user.js), à la racine. Sélecteur vérifié sur une vraie page HN : la règle CSS écrase bien le `bgcolor="#ff6600"` de l'attribut.

1. **App Store → Userscripts** (Justin Wasack, gratuit). Puis Safari → Réglages → Extensions → cocher Userscripts.
2. Autoriser l'extension sur `news.ycombinator.com` — « Toujours autoriser sur ce site ».
3. Bouton Userscripts dans la barre d'outils → il demande un **dossier de travail** au premier lancement. Choisir **`~/dev/hn-redesign/`** — pas un sous-dossier : Userscripts ne lit qu'un seul dossier, sans récursion, et c'est là que vivront ensuite `hn-redesign.user.js` et `hn-redesign.css`.
4. **Q1 — charger.** Ouvrir `news.ycombinator.com`. Le bandeau doit être vert, avec un badge `T1 v1` en haut à droite.
5. **Q2 — recharger.** Passer `const VERSION = 1` à `2`, sauvegarder, recharger HN. Le badge doit afficher `T1 v2`. *Le numéro de version existe pour ça : sans lui, une modification qui n'est pas prise ressemble à une modification qui l'est.*
6. **Q3 — survivre.** `Cmd+Q` sur Safari, rouvrir, retourner sur HN. Vert et badge toujours là.

Trois oui → supprimer `t1-spike.user.js` et attaquer la phase 2. Un seul non → me le dire, le plan se refait autour d'un autre runtime.

**Prérequis machine :** macOS 12+ et Safari 14.1+.

> [!warning] Correction du 2026-08-25 — la porte bloquait moins que ce fichier ne disait
> « Rien d'autre ne commence avant T1 » était trop fort. T1 tranche le **runtime**, pas les artefacts. Le CSS et le JS s'écrivent et se vérifient dans Chromium headless contre les fixtures — c'est ainsi que tous les prototypes ont été faits — et le chemin de sortie du design doc dit déjà que le même JS/CSS entre tel quel dans une Safari Web Extension le jour où Xcode tient sur le disque.
>
> Formulation exacte : **T1 garde l'itération dans Safari, pas l'écriture.** Si Userscripts échoue, on perd le mode de distribution, pas le code. La phase 2 a donc été faite avant T1, vérifiée sur fixtures. Ce qui reste vraiment conditionné à T1 : voir un rendu Safari, et boucler en moins d'une minute par modification.

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

## Phase 3 — la liste

L'écran où l'on décide quoi lire.

| | Tâche | Effort | Source |
|---|---|---|---|
| **T23** | Ligne fusionnée à 32 px : titre et métadonnée sur une ligne, `hide` restauré au survol | ~1 h 30 | Issue #1 § B — **nouveau** |
| **T24** | Navbar filet orange : 50 px, `box-sizing: border-box`, séparateurs `\|` retirés | ~45 min | Issue #1 § C — **nouveau** |
| **T11** | Favicon de domaine depuis `span.sitestr` | ~20 min | ⚠️ **absorbée par T23**, qui l'inclut avec son repli obligatoire |

Repères mesurés : HN natif 30 posts par écran à 30 px de ligne. Le design initial était à 58 px et 24 posts. T23 vise **32 px et 30 posts**.

---

## Phase 4 — le fil de commentaires

Le cœur du projet.

| | Tâche | Effort |
|---|---|---|
| **T4** | `buildModel()` : un seul parcours produisant `{el, depth, n, textLen, parent, children}` | ~40 min |
| **T5** | `collapse(tr, veutReplié)` **idempotent** — `a.togg` est une bascule, pas un setter | ~20 min |
| **T6** | Replier la **frontière** (frères des nœuds du spine), jamais tous les non-spine | ~25 min |
| **T7** | Thread Spine : descente gloutonne sur `n` pondéré par la longueur moyenne de `.commtext` | ~50 min |
| **T8** | Extraire et porter 5-6 modules de [refined-hacker-news](https://github.com/plibither8/refined-hacker-news) (MIT) | ~45 min |
| **T9** | Garde-fous clavier : `input` / `textarea` / `contenteditable`, et cible masquée | ~30 min |
| **T16** | Les trois éléments neufs : commentaire replié, lien Thread Spine, barre de position | ~40 min |
| **T17** | Formulaire de réponse replié derrière un lien | ~25 min |
| **T18** | Marqueur du commentaire actif : tiret 3×14 px, pas un rail pleine hauteur | ~15 min |
| **T19** | Habiller `input[type=submit]` et les boutons dans les deux thèmes | ~10 min |
| **T20** | Barre de position alignée sur la colonne, pas sur la fenêtre | ~10 min |

---

## Phase 5 — vérification et finition

| | Tâche | Effort | Source |
|---|---|---|---|
| **T10** | `node --test` + `linkedom` + fixtures | ~1 h 15 | |
| **T25** | Lint de cohérence : ≤1 radius, 0 durée, 0 ombre, 0 famille d'icônes | ~40 min | Issue #1 § D — **nouveau** |
| **T12** | Fixer les trois états — initial, spine, restauré — et la réversibilité | ~15 min | |
| **T21** | Rails de profondeur qui expriment la profondeur, pas seulement l'imbrication | ~25 min | |
| **T22** | Interrupteur de thème manuel — classe `hn-dark` / `hn-light`, clé `hn-redesign-theme` | ~35 min | |

---

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
| **T11** | **absorbée par T23** | Le favicon fait partie de la ligne fusionnée, avec son repli obligatoire — 4 domaines sur 30 n'en ont pas. |

---

## Effort total

```
Phase 0   porte                     ~10 min
Phase 1   alignement du système     ~1 h
Phase 2   fondations                ~2 h 10
Phase 3   la liste                  ~2 h 15
Phase 4   le fil                    ~5 h 10
Phase 5   vérification              ~3 h 10
─────────────────────────────────────────────
                                    ~13 h 55 en humain
```

Ordre imposé : **0 → 1 → 2 → (3 ‖ 4) → 5**. Les phases 3 et 4 touchent des fichiers différents et peuvent avancer en parallèle une fois les fondations posées.

---

## Où vit le reste

- **[`DESIGN.md`](DESIGN.md)** — le système de design. Chaque valeur mesurée, chaque contraste calculé, avec les captures qui le prouvent.
- **[`CLAUDE.md`](CLAUDE.md)** — les trois choses qui cassent le projet si on les oublie.
- **[Issue #1](https://github.com/OmarBenje/hn-redesign/issues/1)** — la spec détaillée des phases 1, 3 et 5, avec sélecteurs, fixtures et 14 critères d'acceptation.
- **`design-refs/`** — les captures. `capture.sh` reconstruit les fixtures depuis HN ; elles ne sont pas versionnées, ce sont les écrits d'autres personnes.
