# Roadmap

> **Source de vérité unique.** Les tâches ont existé un temps dans trois formats à trois endroits — un design doc local, deux fichiers JSONL, une issue GitHub — sans que rien ne dise lequel faisait autorité. Ce fichier les réconcilie. En cas de contradiction avec un autre document, **c'est ce fichier qui gagne.**

**État au 2026-08-25 : aucune ligne de code n'existe.** Le dépôt contient un système de design ([`DESIGN.md`](DESIGN.md)) dont chaque valeur a été mesurée, et les captures qui le prouvent. Ce qui suit est ce qui reste à faire.

---

## Phase 0 — la porte

Une seule tâche, et **tout le reste en dépend**.

| | Tâche | Effort |
|---|---|---|
| **T1** | Spike [Userscripts](https://github.com/quoid/userscripts) : charger un `.user.js` de trois lignes, le modifier, redémarrer Safari | ~10 min |

Le projet suppose que Userscripts charge un fichier local, le recharge après modification, et survit à un redémarrage. **Personne ne l'a exécuté.** Si l'une des trois réponses est non, les quatre heures suivantes sont à jeter et le plan est à refaire autour d'un autre runtime.

Rien d'autre ne commence avant que T1 réponde oui trois fois.

---

## Phase 1 — aligner le système avant d'écrire du CSS

→ **[Issue #1](https://github.com/OmarBenje/hn-redesign/issues/1)**, sections A et E.

Amendements de valeurs dans `DESIGN.md` : tracking en deux paliers, interligne du corps à 22 px, token `--radius`, spécification `:focus-visible`, et deux amendements de prémisses.

**Doit précéder toute la phase 2.** Après, chaque valeur est dupliquée dans la feuille de style et la corriger coûte dix fois plus.

| Effort | ~1 h |
|---|---|

---

## Phase 2 — les fondations

| | Tâche | Effort | Note |
|---|---|---|---|
| **T2** | Scoper toutes les règles CSS sous `#hnmain` | ~10 min | protège `/login`, `/submit`, `/reply` par construction |
| **T3** | `try/catch` global, retrait de l'injection en cas d'erreur | ~20 min | échec fermé : HN reste utilisable si le script casse |
| **T13** | Bloc de **16** tokens CSS : `:root`, `@media (prefers-color-scheme: dark)`, classe de surcharge | ~40 min | ⚠️ le doc d'origine disait 14 — `--radius` et `--visited` se sont ajoutés |
| **T14** | Cinq règles de rampe de downvote, plancher 3:1, deux thèmes | ~30 min | une règle unique `.commtext{color}` détruirait le signal |
| **T15** | ~~Charter pour le corps~~ → **SF via `-apple-system`**, corps 15/22 | ~30 min | ⚠️ **réécrite.** Charter a été rendue puis rejetée. Voir `DESIGN.md` § Typography |

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
