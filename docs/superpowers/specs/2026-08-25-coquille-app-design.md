# Coquille « app » — design

> Statut : **approuvé par Omar le 2026-08-25.** Remplace le design de liste livré en phase 3.
> Ce document décrit *ce qu'on construit et pourquoi*. Le *comment, dans quel ordre* vit dans le plan d'implémentation qui le suit.

## 1. Ce qu'on fait

Redessiner `news.ycombinator.com` en coquille d'application : une barre latérale de navigation fixe à gauche, un en-tête portant le titre de page et la recherche, une barre d'onglets Top / New / Best, et une colonne de cartes.

**C'est un remplacement, pas une variante.** Le design dense livré en phase 3 — ligne fusionnée de 32 px, navbar en filet orange, 30 posts par écran — disparaît. `DESIGN.md` est réécrit, pas amendé.

### Ce que ça coûte, explicitement

`DESIGN.md` § Aesthetic Direction énonce aujourd'hui : *« Interdits absolus : aucune carte, aucune icône décorative, aucune ombre, aucun arrondi décoratif, aucun dégradé, aucune animation, aucun bouton là où HN met un lien. »* La nouvelle direction contredit quatre de ces sept interdits — cartes, icônes, ombre, arrondis. Les trois autres tiennent : **aucun dégradé, aucune animation, aucun bouton là où HN met un lien.**

Le principe directeur — *« Enfin je peux lire HN »* — reste l'arbitre des cas non couverts. Il cesse en revanche de trancher en faveur de la densité : la nouvelle liste montre 7 à 8 posts par écran contre 30. C'est une décision prise en connaissance de cause, pas un effet de bord.

## 2. Ce qui ne change pas

Cinq invariants portent la sûreté du projet. Aucun n'est touché, et chacun reste vérifié après le chantier.

| Invariant | Pourquoi il tient |
|---|---|
| **Tout le CSS scopé sous `#hnmain`** (sauf `body` et la sidebar, tous deux sous `.hn-redesign`) | `/login`, `/submit`, `/reply` n'ont pas de `#hnmain`. Les formulaires restent hors d'atteinte par construction. |
| **La pile d'annulation** — `addClass` / `setStyle` / `insere` / `detache` | La coquille insère plus de nœuds que la phase 3 n'en insérait. Chacun passe par la pile. |
| **Réversibilité à l'octet** de `#hnmain` entre `apply()` et `revert()` | Assertion existante de `test/rendu.sh`, conservée telle quelle. |
| **L'IIFE et le garde-fou `if (window.hnRedesign) return;`** | Double injection inoffensive. |
| **Zéro requête réseau** | Aucune webfont, aucun favicon, aucun `fetch`. Les deux icônes sont du SVG inline. |

## 3. La coquille

### 3.1 Structure du document

HN sert :

```html
<body><center><table id="hnmain">…</table></center></body>
```

On y ajoute **un seul nœud de premier niveau** :

- `nav.__side` inséré en premier enfant de `body`, en `position: fixed`, largeur 220 px, hauteur pleine.
- `center` reçoit `margin-left: 220px`.

`position: fixed` plutôt qu'un `display: flex` sur `body` : le défilement reste celui de HN (aucun conteneur de scroll nouveau), et l'annulation est une propriété à retirer plus un nœud à détacher.

**La sidebar ne s'affiche que sur `/news`, `/newest`, `/best`, `/front`, `/ask`, `/show`, `/jobs`.** Sur `/item` la coquille se réduit à l'en-tête : le fil est le cœur du projet et ne cède pas 220 px.

### 3.2 La barre latérale

Deux groupes, séparés d'un filet.

**Groupe principal** — quatre entrées, icône SVG inline + libellé, celle de la page courante en état actif (fond `--surface-2`, texte `--accent-text`) :

| Entrée | Cible | Condition |
|---|---|---|
| Home | `news` | toujours |
| Explore | `newest` | toujours |
| Bookmarks | `favorites?id=<user>` | seulement si `#me` existe |
| Profile | `user?id=<user>` | seulement si `#me` existe |

`<user>` se lit dans `document.querySelector('#me')` — le lien que HN pose en haut à droite quand la session est ouverte. **Aucune requête, aucune configuration.** Déconnecté, les deux entrées sont simplement absentes.

**Groupe secondaire** — les liens natifs de `.pagetop` que la maquette ne montre pas : `past`, `comments`, `ask`, `show`, `jobs`, `submit`. Rendus en 13 px, couleur `--meta`, sans icône.

> **Pourquoi ce second groupe est obligatoire.** Prémisse 3 du système : *le HTML fonctionnel reste atteignable, la présentation peut le relocaliser.* Les six liens sont **déplacés**, pas clonés — ils quittent `.pagetop` pour la sidebar. Le critère d'acceptation qui comptait `.pagetop a:not(.__theme)` est remplacé par un comptage sur la sidebar : **la somme des liens natifs avant et après `apply()` est égale.**

### 3.3 L'en-tête

La première `tr` de `#hnmain` — celle qui portait la navbar orange — devient l'en-tête, en trois zones :

1. **Titre de page**, 30 px / 34 px, poids 700, tracking `-0.012em`. Le texte est celui de `b.hnname > a` (« Hacker News »), relocalisé.
2. **Champ de recherche**, centré, largeur max 460 px, pilule de 40 px de haut, fond `--surface-2`, icône loupe SVG à gauche, `placeholder` « Search stories, comments, or users ».

   > **Le formulaire existe déjà.** HN sert `<form method="get" action="//hn.algolia.com/">` dans son pied de page. On le **déplace** dans l'en-tête et on l'habille. On n'en fabrique pas un — et le zéro requête réseau est préservé, un `action` de formulaire n'étant qu'une cible de navigation.

3. **Pastille utilisateur**, cercle de 40 px. **Pas d'avatar : HN n'en sert aucun.** Le cercle porte l'initiale majuscule du pseudo lu dans `#me`, sur fond `--surface-2`, et lie vers `user?id=<user>`. Déconnecté, la zone porte le lien `login` natif, habillé en pilule discrète.

Le carré orange du logo `y18` reste, réduit à 36 px, arrondi `--radius-md`, en tête de la sidebar.

### 3.4 La barre d'onglets

Trois onglets sous l'en-tête, dans un conteneur de 52 px, fond `--surface-1`, filet `--line`, rayon `--radius-md` :

| Onglet | Cible |
|---|---|
| Top | `news` |
| New | `newest` |
| Best | `best` |

Les trois routes sont réelles. `/best` n'apparaît pas dans la navbar native de HN ; c'est le seul lien de la coquille qui n'est pas relocalisé d'un lien existant, et c'est assumé — la route répond.

L'onglet actif se détermine sur `document.documentElement.getAttribute('op')`, avec repli sur `location.pathname`. Il porte un soulignement de 2 px en `--accent` et un texte en `--accent-text`. Aucun autre onglet n'est souligné ; **si `op` ne correspond à aucun des trois, aucun onglet n'est actif** — pas de défaut sur « Top », qui mentirait sur `/ask` ou `/show`.

## 4. La carte

### 4.1 Structure

Aucune restructuration du DOM de HN. Chaque `tr.athing.submission` **devient** la carte, en `display: grid`.

HN sert trois cellules dans cette `tr` :

```html
<tr class="athing submission">
  <td class="title"><span class="rank">1.</span></td>
  <td class="votelinks">…<div class="votearrow">…</td>
  <td class="title"><span class="titleline"><a>titre</a><span class="sitebit">…</span></span></td>
</tr>
```

Elles tombent exactement aux trois emplacements de la maquette :

```
grid-template-columns: 40px 1fr;
grid-template-rows: auto 1fr;

  td.title (rang)   → 1 / 1     pastille orange, 26px, cercle, chiffre blanc 13px/700
  td.votelinks      → 2 / 1     la flèche de vote, centrée
  td.title (titre)  → grid-row: 1 / 3 ; grid-column: 2   le contenu, trois lignes
```

**Le point du rang** (`1.` → `1`) est un nœud texte à retirer, comme la phase 3 retirait les séparateurs `|`. Il passe par `detache`.

### 4.2 Le contenu, trois lignes

| Ligne | Contenu | Style |
|---|---|---|
| 1 | Le titre, `a` de `.titleline` | 17 px / 24 px, poids 600, `--text`, tracking `-0.012em` |
| 2 | Le domaine, `.sitestr` | 14 px / 20 px, `--accent-text` |
| 3 | Métadonnée | 13 px / 18 px, `--meta` |

**La ligne de métadonnée** est construite comme `fusionner()` le fait déjà : la `tr` suivante (`.subtext`) est clonée par morceaux dans un `span.__m`, puis masquée. Ordre : `↑ points` · séparateur · `auteur` · `💬 commentaires` · séparateur · `âge`. Les séparateurs sont des filets verticaux de 1 px, pas des caractères.

**Les deux pièges de la phase 3 restent des pièges et sont reconduits :**

1. **Les posts d'emploi n'ont pas de `span.subline`** — leur `td.subtext` porte l'âge et `hide` en enfants directs. Repli sur `td.subtext`, sinon un post sur trente garde sa ligne de métadonnée native.
2. **Sur un post d'emploi, le seul `a[href^="item?id="]` est celui de l'âge.** Le test `!dernier.closest('.age')` reste, sinon l'âge s'affiche deux fois.
3. **`.athing.submission` existe aussi sur `/item`.** Le filtre `!tr.closest('table.fatitem')` reste, sinon la tête d'un fil est réécrite en carte.

### 4.3 Métrique

- Carte : padding 16 px vertical / 20 px horizontal, fond `--surface-1`, filet 1 px `--line`, rayon `--radius-lg`.
- Gouttière entre cartes : la `tr.spacer` native, portée à 8 px par `setStyle` (elle a `height:5px` en inline, que le CSS ne bat pas).
- **Hauteur cible : 100 px ± 6.** Vérifiée au `getBoundingClientRect`, jamais à l'œil.
- **Densité cible : 7 posts entiers** dans un viewport de 1400 × 900. C'est le critère, et il remplace le plancher de 14 commentaires.

### 4.4 Ce qui est perdu

**La pondération par score de la phase 3 disparaît.** Les titres passaient de 15,5 à 19 px selon le score, exposant 0,45. Trois lignes empilées dans une carte de hauteur fixe ne supportent pas un titre qui varie de 3,5 px : la carte se déforme ou la métrique cesse d'être vérifiable. Le titre est fixé à 17 px.

C'est la seule fonctionnalité livrée que ce chantier supprime. Elle est notée ici pour qu'on sache quoi rouvrir si la liste se met à sembler plate.

### 4.5 Les icônes

**Deux, et deux seulement**, en SVG inline (aucune requête, aucune police d'icônes) :

- une flèche montante, 12 px, devant le nombre de points ;
- une bulle de commentaire, 12 px, devant le nombre de commentaires.

Plus les quatre icônes de la sidebar (18 px) et la loupe de la recherche, soit **sept SVG en tout**. Toutes du même trait : 1,5 px, `currentColor`, `stroke-linecap: round`. Le budget de lint passe de 0 à 2 **familles** d'icônes déclarées — la vérification porte sur `font-family` contenant `icon|awesome|material`, qui reste à **0** : nos icônes sont des `<svg>`, pas une police.

## 5. La couleur

### 5.1 Bascule de température

Le système passe du **beige chaud** au **neutre froid** de la maquette.

| Rôle | Token | Clair | Sombre (dérivé) |
|---|---|---|---|
| Fond de page | `--page` | `#F7F7F8` | `#0E0E10` |
| Surface de carte | `--surface-1` | `#FFFFFF` | `#18181B` |
| Surface secondaire (recherche, onglet actif, pastille) | `--surface-2` | `#F1F1F3` | `#232327` |
| Filet | `--line` | `#ECECEE` | `#2A2A2F` |
| Texte | `--text` | `#0B0B0C` | `#F2F2F3` |
| Métadonnée | `--meta` | `#6B7280` | `#9CA0A8` |
| Auteur | `--author` | `#4B5058` | `#B8BCC3` |
| Rail de profondeur | `--rail` | `#E6E6E9` | `#2E2E34` |
| Accent en aplat | `--accent` | `#F26207` | `#F26207` |
| Accent texte | `--accent-text` | `#BF4300` (5,23:1 sur `#FFFFFF`, 4,88:1 sur `#F7F7F8`) | `#F26207` (5,51:1 sur `#18181B`) |
| Lien visité | `--visited` | `#8D9195` | `#636669` |
| Rampe | `--c00`…`--cDD` | recalculée | recalculée |

**Le thème sombre est inventé.** La maquette est claire uniquement. Il est dérivé du clair en conservant la régularité en L\* de la rampe et la bascule de teinte du dernier cran. L'interrupteur à trois états (T22, `auto` / `hn-light` / `hn-dark`, persisté sous `hn-redesign-theme`) est conservé sans modification.

### 5.2 Les contraintes de contraste, non négociables

- **Plancher de 3:1** sur tout texte de contenu, dans les deux thèmes.
- **`#F26207` ne peut pas être du texte en thème clair sans mesure.** Mesuré : **3,22:1 sur `#FFFFFF`, 3,01:1 sur `#F7F7F8`** — il franchit le plancher de 3:1 de justesse, et échoue au 4,5:1 du texte de corps. `--accent-text` est une valeur **distincte** : `#BF4300` en clair — la valeur déjà retenue par le système actuel, qui donne 5,23:1 sur la carte blanche — et `#F26207` tel quel en sombre, où il vaut 5,51:1. C'est elle que porte tout texte accentué, **y compris le domaine de la ligne 2 de la carte**. L'orange pur reste réservé aux aplats : pastille de rang, soulignement d'onglet, carré du logo, marqueur du commentaire actif.
- **Chaque paire est recalculée**, pas héritée. `test/contraste.mjs` est réécrit sur la nouvelle palette.

### 5.3 Les deux signaux de HN, intacts

Les deux se cassent de la même façon — une règle de couleur trop large — et les deux survivent au chantier :

1. **La rampe de downvote** `.commtext.c00` → `.cDD`, cinq règles distinctes par thème, jamais une règle unique sur `.commtext`. Recalculée sur `--surface-1`.
2. **`a:visited`** sur les titres de liste. La règle doit **gagner en spécificité** sur toute règle de couleur de titre — la carte ajoute `.__card a`, donc le sélecteur visité doit être au moins aussi spécifique. Invérifiable au rendu (tous les navigateurs mentent sur `:visited`), donc prouvé par `test/regles.mjs` comme aujourd'hui.

### 5.4 Ombre et rayon

- **Une seule ombre**, sur la carte : `0 1px 2px rgba(0,0,0,.04)`. En thème sombre elle est remplacée par le seul filet — une ombre noire sur fond noir ne dit rien.
- **Trois rayons** : `--radius-sm: 6px` (pilules de métadonnée), `--radius-md: 10px` (carte, onglets, recherche, logo), `--radius-full: 999px` (pastille de rang, cercle utilisateur). Le token `--radius: 2px` disparaît.

## 6. Le fil de commentaires

**Fonctionnellement inchangé.** Thread Spine, rails de profondeur (un trait par ancêtre), navigation `j`/`k`, barre de position, marqueur du commentaire actif, aperçu de commentaire replié, formulaire de réponse replié, les cinq modules portés de refined-hacker-news : tout reste, à l'identique.

Ce qui change est l'habillage : nouveaux tokens, nouveaux rails, en-tête de la coquille en haut de page. **La sidebar n'apparaît pas sur `/item`.**

L'indentation de 22 px, le motif de gouttière, les trois états (`apply` / `restaure` / `revert`) et l'idempotence du repli ne sont pas touchés.

## 7. Les tests

### 7.1 Ce qui est réécrit

| Fichier | Portée du changement |
|---|---|
| `DESIGN.md` | **Réécrit.** Direction esthétique, palette, échelle typographique, métrique de la liste. Les sections Color § rampe, § `a:visited` et § règle de l'orange sont conservées en substance, avec les nouveaux chiffres. |
| `test/contraste.mjs` | Réécrit sur la nouvelle palette : les couleurs contre leurs fonds dans les deux thèmes, la régularité de la rampe en **L\*** (jamais en ratio de contraste), la bascule de teinte du dernier cran. |
| `test/rendu.sh` | Les assertions de la liste — ligne à 32 px, navbar à 50 px, 30 posts par écran, filet orange de 3 px — sont remplacées par : carte à 100 px ± 6, **7 posts entiers** dans 1400 × 900, sidebar à 220 px, en-tête, onglet actif unique. Estimation : ~25 des 72 assertions. |
| `test/regles.mjs` | Parité des tokens entre les trois blocs de thème (la liste change), spécificité de `a:visited` contre les nouveaux sélecteurs de carte, comptage des délimiteurs de commentaire. |
| `test/lint.mjs` | Budgets rouverts : rayons 1 → **3**, ombres 0 → **1**. Restent à 0 : durées d'animation, `!important`, familles d'icônes, couleurs en dur hors des blocs de thème, tokens orphelins, `var()` sans déclaration. Tracking négatif reste à 1 valeur. |

### 7.2 Ce qui ne bouge pas

- `test/modele.test.js` — 12 tests de calcul pur sur le fil. Aucun n'est touché.
- `test/harness.mjs` — charge le vrai userscript sous linkedom.
- L'assertion de **réversibilité à l'octet** de `#hnmain`. Elle devient plus exigeante, pas moins : la coquille mute davantage.

### 7.3 Deux vérifications nouvelles

1. **Conservation des liens natifs.** Le nombre de liens de navigation atteignables après `apply()` est ≥ celui d'avant. Remplace le comptage sur `.pagetop`, qui n'a plus de sens une fois les liens relocalisés.
2. **`/login` reste intacte.** Vérification existante à conserver et à étendre : la sidebar ne doit **pas** s'y insérer. Elle n'a pas de `#hnmain`, donc la classe racine n'est pas posée — mais la sidebar est insérée dans `body`, hors `#hnmain`, et doit donc être explicitement conditionnée à la présence de `#hnmain`.

> Le point 2 est le risque nouveau le plus sérieux de ce chantier. Jusqu'ici, tout le CSS vivait sous `#hnmain` et la protection des formulaires était structurelle. La sidebar est le **premier nœud inséré hors de `#hnmain`** : sa condition d'insertion doit être vérifiée explicitement, elle n'est plus garantie par construction.

### 7.4 Ce que les tests ne couvriront jamais

Inchangé, et redit : le focus, `scrollIntoView`, la navigation `j`/`k` réelle, les handlers inline de HN, le comportement de Safari. **Toutes les captures viennent de Chromium headless.** Une suite verte ne prouve pas que la navigation marche.

## 8. Critères d'acceptation

1. `nav.__side` mesure 220 px et est présente sur `/news`, absente sur `/item` et sur `/login`.
2. Sur `/login` : 0 classe posée, 0 feuille injectée, 0 nœud inséré, les `input` intacts.
3. Les 30 cartes de `/news` mesurent 100 px ± 6 au `getBoundingClientRect`.
4. 7 posts entiers visibles dans un viewport de 1400 × 900.
5. Le nombre de liens de navigation natifs atteignables après `apply()` est ≥ celui d'avant.
6. Exactement un onglet actif, ou zéro si `op` ne correspond à aucune des trois routes.
7. Le champ de recherche est le formulaire natif de HN, déplacé — `action` inchangé.
8. La pastille utilisateur porte l'initiale de `#me`, ou le lien `login` si `#me` est absent.
9. Les 5 crans de la rampe de downvote sont distincts au rendu, dans les deux thèmes, plancher 3:1.
10. `--accent-text` atteint ≥ 4,5:1 sur `--surface-1` dans les deux thèmes.
11. Le fil de `/item` conserve ses 12 tests de modèle au vert et son rapport de Thread Spine ≥ 3,0.
12. `#hnmain` revient **identique à l'octet** après `revert()`, sur `/news` et sur `/item`.
13. `node test/lint.mjs` passe avec les budgets révisés ; `0 !important`, `0` couleur en dur, `0` token orphelin.
14. Zéro requête réseau sortante au chargement, vérifiée sur la vraie page.

## 9. Hors périmètre

- Le rail droit de la maquette — « Trending topics » et « Saved stories ». **Coupé**, décision d'Omar : HN ne sert aucune de ces données, et les fabriquer afficherait des chiffres faux. La colonne de cartes récupère la largeur.
- L'avatar photographique. HN n'en sert pas.
- `/reply` et `/submit` en thème sombre. Elles n'ont pas de `#hnmain` — c'est exactement ce qui protège les formulaires. Contrainte structurelle, déjà actée en phase 4.
- Toute pagination, tout défilement infini, toute mise en cache.

## 10. Addenda (2026-08-25, revue finale de branche)

Ce document reste l'autorité liante. Les deux points ci-dessous ne sont **pas** corrigés dans le corps du texte ci-dessus : un spec qui change silencieusement pour coller au code cesse d'être un spec. Ce qui suit consigne l'écart et sa raison.

**Sur le critère 4 et le § 4.3 — « 7 posts entiers ».** Le design livré tient **6** cartes entières dans 1400 × 900, pas 7, et le calcul est sain : en-tête 92 px + barre d'onglets 68 px + interstice 18 px = 178 px avant la première carte ; 110 px par carte (102 px de carte + 8 px d'interstice) ; `floor((900 − 178) / 110) = 6`. Chaque composant — en-tête, onglets, carte — est conforme à sa propre spec, déjà revue et livrée dans une tâche antérieure. C'est la **somme** des trois qui n'avait jamais été vérifiée : le chiffre de 7 dans ce document venait d'une arithmétique faite en écrivant le plan, sans compter le chrome au-dessus de la première carte. `DESIGN.md` et `ROADMAP.md` enregistrent déjà 6 ; `test/rendu.sh` vérifie `6 cartes entieres dans 900px`, avec le calcul en commentaire à côté de l'assertion.

**Sur le § 4.3 — `--radius-lg` pour la carte.** Ce token n'existe pas. Le § 5.4 du même document déclare exactement trois rayons — `--radius-sm`, `--radius-md`, `--radius-full` — et assigne `--radius-md` à la carte, aux onglets, à la recherche et au logo. Le code suit le § 5.4, qui fait autorité sur ce point ; le § 4.3 se contredisait lui-même en citant un quatrième rayon jamais déclaré.
