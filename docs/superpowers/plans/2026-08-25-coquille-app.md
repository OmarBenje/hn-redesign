# Coquille « app » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la liste dense de `/news` par une coquille d'application — barre latérale fixe, en-tête avec recherche, onglets Top/New/Best, cartes de 100 px — sans toucher au fil de commentaires ni aux cinq invariants de sûreté du projet.

**Architecture:** Tout vit dans `hn-redesign.user.js`, un fichier unique évalué dans la portée globale de la page (contrainte du runtime Userscripts, pas un choix). Le CSS est un template literal dans ce fichier. Chaque mutation du DOM passe par la pile d'annulation (`addClass` / `setStyle` / `insere` / `detache`) afin que `revert()` rende `#hnmain` identique à l'octet. Les nouvelles fonctions — `sidebar()`, `entete()`, `onglets()`, `cartes()` — s'appellent depuis `apply()` et remplacent `navbar()` + `fusionner()`.

**Tech Stack:** JavaScript ES2020 sans dépendance ni système de modules. Tests : `node --test` + `linkedom` (calcul et DOM), Chromium headless via le binaire `browse` de gstack (géométrie). Aucune webfont, aucune requête réseau.

**Spec:** [`docs/superpowers/specs/2026-08-25-coquille-app-design.md`](../specs/2026-08-25-coquille-app-design.md)

## Global Constraints

Ces contraintes s'appliquent à **chaque** tâche. Elles ne sont pas répétées dans les tâches.

- **Un seul fichier.** Tout le code va dans `hn-redesign.user.js`. Ne pas créer de module, ne pas découper le userscript.
- **Le CSS vit dans un template literal** (`const CSS = \`…\``, ligne 48). Conséquences :
  - **Un backtick dans un commentaire CSS casse le fichier.** Vérifier avec `node --check hn-redesign.user.js` après toute édition du CSS.
  - **Un `/*` non fermé avale les règles suivantes en silence.** `node --check` ne le voit pas. `test/regles.mjs` compte les délimiteurs — le lancer.
- **Aucune requête réseau.** Pas de webfont, pas d'image distante, pas de `fetch`. Les icônes sont du SVG construit en JS.
- **Toute mutation du DOM passe par la pile d'annulation** : `addClass(el, c)`, `setStyle(el, prop, val)`, `insere(parent, node, avant)`, `detache(node)`. Jamais `el.classList.add`, `el.style.x =`, `appendChild` ou `remove()` en direct. `setStyle` sauvegarde l'**attribut `style` brut**, pas la propriété.
- **Tout le CSS est scopé sous `#hnmain`**, sauf trois exceptions autorisées et nommées : `.hn-redesign body`, `.hn-redesign .__side`, `.hn-redesign center`. Aucune autre.
- **Chaque commit régénère la copie Chrome** : `./bin/build-chrome.sh` avant `git add`, sinon `test/lint.mjs` échoue sur « la copie Chrome a dérivé ».
- **Écrire les commentaires et les messages de commit en français sans accents** (le reste du fichier l'est ; rester cohérent).
- **La commande de test complète est `npm test`** = `node --test test/*.test.js && node test/regles.mjs && node test/contraste.mjs && node test/lint.mjs`. Elle doit être verte à la fin de chaque tâche.
- **`./test/rendu.sh` n'est vert qu'à partir de la tâche 8.** Les tâches 1 à 7 le laissent rouge, c'est attendu et normal.

### Palette de référence (calculée et vérifiée — ne pas la recalculer)

| Token | Clair | Sombre |
|---|---|---|
| `--page` | `#F7F7F8` | `#0E0E10` |
| `--surface-1` | `#FFFFFF` | `#18181B` |
| `--surface-2` | `#F1F1F3` | `#232327` |
| `--line` | `#ECECEE` | `#2A2A2F` |
| `--text` | `#0B0B0C` | `#F2F2F3` |
| `--meta` | `#6B7280` | `#9CA0A8` |
| `--author` | `#4B5058` | `#B8BCC3` |
| `--rail` | `#E6E6E9` | `#2E2E34` |
| `--accent` | `#F26207` | `#F26207` |
| `--accent-text` | `#BF4300` | `#F26207` |
| `--visited` | `#8D9195` | `#636669` |
| `--c00` | `#0B0B0C` | `#F2F2F3` |
| `--c5A` | `#2B2D33` | `#CDCFD5` |
| `--c73` | `#4B4E56` | `#A8ABB3` |
| `--c88` | `#6E7179` | `#83868E` |
| `--cDD` | `#968971` | `#736C54` |
| `--ui` | `-apple-system, BlinkMacSystemFont, sans-serif` | — |
| `--mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` | — |
| `--radius-sm` | `6px` | — |
| `--radius-md` | `10px` | — |
| `--radius-full` | `999px` | — |

**21 tokens en clair, 15 redéfinis en sombre.** Les 6 jamais redéfinis : `--ui`, `--mono`, `--radius-sm`, `--radius-md`, `--radius-full`, `--accent`.

Contrastes mesurés (contre `--surface-1`) : `meta` 4,83 / 6,76 · `author` 8,12 / 9,30 · `accent-text` 5,23 / 5,51 · `visited` 3,17 / 3,07 · rampe plancher 3,44 / 3,38 · écart L\* minimal de la rampe 10,0 / 10,3 · bascule de teinte du dernier cran 185° / 177°.

---

## Structure des fichiers

| Fichier | Responsabilité | Sort |
|---|---|---|
| `hn-redesign.user.js` | Le script entier : CSS + JS | **Modifié** par les tâches 1 à 7 |
| `test/harness.mjs` | Charge le vrai userscript sous linkedom | **Modifié** (tâche 2 : hook de transformation) |
| `test/coquille.test.js` | Tests unitaires de la coquille et des cartes | **Créé** (tâches 2 à 6) |
| `test/modele.test.js` | 12 tests du fil de commentaires | **Intouché** |
| `test/contraste.mjs` | Les couleurs contre leur fond, la rampe en L\* | **Réécrit** (tâche 1) |
| `test/regles.mjs` | Invariants de la feuille | **Modifié** (tâches 1, 3, 6) |
| `test/lint.mjs` | Budgets de cohérence T25 | **Modifié** (tâche 1) |
| `test/rendu.sh` | Géométrie dans Chromium | **Modifié** (tâche 8) |
| `DESIGN.md` | Système de design | **Réécrit** (tâche 9) |
| `CLAUDE.md`, `ROADMAP.md`, `README.md` | Documentation | **Modifiés** (tâche 9) |
| `chrome/` | Copie générée | **Régénéré à chaque commit** |

---

## Task 1: La palette et les tokens

Remplace les 16 tokens beiges par les 21 tokens neutres, met à jour tous les `var()` du fichier, et réécrit le test de contraste. Le layout ne change pas — à la fin de cette tâche, la liste dense est toujours là, mais en couleurs froides.

**Files:**
- Modify: `hn-redesign.user.js:49-105` (les trois blocs de thème), puis tout le fichier pour les renommages
- Rewrite: `test/contraste.mjs`
- Modify: `test/regles.mjs:64-68` (comptage des tokens), `test/regles.mjs:71-75` (budgets rayon/ombre)
- Modify: `test/lint.mjs:35`, `test/lint.mjs:38`

**Interfaces:**
- Consomme : rien.
- Produit : les 21 tokens CSS listés dans **Global Constraints**. Toutes les tâches suivantes n'utilisent que ces noms. Renommages à propager : `--col` → `--surface-1`, `--radius` → `--radius-md` (par défaut, sauf indication contraire dans les tâches suivantes). Nouveaux : `--surface-2`, `--line`, `--text`, `--radius-sm`, `--radius-full`.

- [ ] **Step 1: Réécrire `test/contraste.mjs` avec la nouvelle palette**

Le fichier garde sa structure (fonctions `lin`, `Y`, `ratio`, `Lstar`, `teinte` inchangées). Seules les trois constantes de données changent :

```javascript
const FOND = { clair: { col: '#FFFFFF', page: '#F7F7F8' }, sombre: { col: '#18181B', page: '#0E0E10' } };
const PLANCHER = 3.0;   // DESIGN.md, plancher d'accessibilite
const RAMPE_MIN = 8;    // ecart minimal de L* entre deux crans voisins

const TOKENS = [
  ['meta',        '#6B7280', '#9CA0A8'],
  ['author',      '#4B5058', '#B8BCC3'],
  ['accent-text', '#BF4300', '#F26207'],
  ['visited',     '#8D9195', '#636669'],
  ['text',        '#0B0B0C', '#F2F2F3'],
];
const RAMPE = [
  ['c00', '#0B0B0C', '#F2F2F3'],
  ['c5A', '#2B2D33', '#CDCFD5'],
  ['c73', '#4B4E56', '#A8ABB3'],
  ['c88', '#6E7179', '#83868E'],
  ['cDD', '#968971', '#736C54'],
];
```

Remplacer aussi le libellé `'contraste contre le fond de colonne'` par `'contraste contre la surface de carte'`.

- [ ] **Step 2: Lancer le test de contraste, vérifier qu'il passe**

Run: `node test/contraste.mjs`
Expected: PASS — « Tout tient. ». Attendus visibles : rampe claire écarts `+15.4 +14.7 +14.5 +10.0`, rampe sombre `+12.4 +13.2 +14.1 +10.3`, bascule de teinte 185° et 177°.

Si ça échoue, **ne pas modifier les couleurs** : elles ont été calculées et vérifiées. Relire le fichier de test.

- [ ] **Step 3: Remplacer les trois blocs de thème dans le userscript**

Dans `hn-redesign.user.js`, remplacer intégralement les lignes 49 à 105 (du commentaire `/* --- tokens` jusqu'à la fermeture du bloc `.${ROOT}.hn-dark { … }`) par :

```javascript
/* ------------------------------------------------------------------ tokens
   21 tokens. Clair par defaut, sombre par media query, et une classe de
   surcharge qui gagne sur les deux (T22 s'en sert).

   La palette est passee du beige chaud au neutre froid avec la coquille app.
   Les valeurs sont CALCULEES, pas choisies a l'oeil : test/contraste.mjs les
   verifie contre leur fond dans les deux themes, verifie la regularite de la
   rampe en L* et la bascule de teinte du dernier cran. Ne pas y toucher sans
   relancer ce test. */
.${ROOT} {
  --ui: -apple-system, BlinkMacSystemFont, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-full: 999px;

  --page: #F7F7F8;
  --surface-1: #FFFFFF;
  --surface-2: #F1F1F3;
  --line: #ECECEE;
  --text: #0B0B0C;
  --meta: #6B7280;
  --author: #4B5058;
  --rail: #E6E6E9;
  --accent: #F26207;
  --accent-text: #BF4300;
  --visited: #8D9195;

  --c00: #0B0B0C;
  --c5A: #2B2D33;
  --c73: #4B4E56;
  --c88: #6E7179;
  --cDD: #968971;
}

@media (prefers-color-scheme: dark) {
  .${ROOT}:not(.hn-light) {
    --page: #0E0E10;
    --surface-1: #18181B;
    --surface-2: #232327;
    --line: #2A2A2F;
    --text: #F2F2F3;
    --meta: #9CA0A8;
    --author: #B8BCC3;
    --rail: #2E2E34;
    --accent-text: #F26207;
    --visited: #636669;

    --c00: #F2F2F3;
    --c5A: #CDCFD5;
    --c73: #A8ABB3;
    --c88: #83868E;
    --cDD: #736C54;
  }
}

.${ROOT}.hn-dark {
  --page: #0E0E10;
  --surface-1: #18181B;
  --surface-2: #232327;
  --line: #2A2A2F;
  --text: #F2F2F3;
  --meta: #9CA0A8;
  --author: #B8BCC3;
  --rail: #2E2E34;
  --accent-text: #F26207;
  --visited: #636669;

  --c00: #F2F2F3;
  --c5A: #CDCFD5;
  --c73: #A8ABB3;
  --c88: #83868E;
  --cDD: #736C54;
}
```

- [ ] **Step 4: Propager les renommages dans tout le reste du CSS**

Deux renommages mécaniques, sur la totalité du fichier :

```bash
cd /Users/omarbenjelloun/dev/hn-redesign
sed -i '' 's/var(--col)/var(--surface-1)/g; s/var(--radius)/var(--radius-md)/g' hn-redesign.user.js
```

Puis, à la main, **une seule substitution sémantique** : dans la règle de la navbar `.${ROOT} #hnmain .pagetop .hnname a { color: var(--c00); }`, remplacer `var(--c00)` par `var(--text)`. `--c00` est le sommet de la rampe de downvote ; le titre du site n'en fait pas partie, et les deux vont diverger.

- [ ] **Step 5: Rendre les trois tokens neufs non orphelins**

`test/lint.mjs` exige une correspondance **exacte** entre tokens déclarés et `var()` utilisés, dans les deux sens. `--surface-2`, `--line`, `--radius-sm` et `--radius-full` ne sont utilisés par aucune règle à ce stade et feraient échouer le budget « tokens declares et jamais utilises ».

Les câbler sur des règles qui en ont déjà besoin — c'est du vrai travail, pas du remplissage :

```css
/* --line remplace --rail partout ou le trait separe deux zones de l'interface
   plutot que d'exprimer une profondeur d'arbre. --rail reste reserve a la
   gouttiere du fil, ou le NOMBRE de traits est l'information. */
```

- Dans la règle de la navbar `#hnmain > tbody > tr:first-child > td`, remplacer `border-bottom: 1px solid var(--rail)` par `var(--line)`.
- **D'abord vérifier** : `grep -n 'input\[type="submit"\]\|textarea' hn-redesign.user.js`. La tâche T19 en a déjà posé. Si des règles existent, **les compléter** plutôt qu'en ajouter un second jeu — deux blocs concurrents sur le même sélecteur sont exactement la dérive que le lint ne voit pas.
- Ajouter, ou fusionner dans les règles existantes, à la fin du bloc « surfaces » :

```css
/* Le champ de reponse et les boutons de HN reposent sur la surface secondaire.
   Ils y etaient deja en gris natif ; ils passent au token, donc au theme. */
.${ROOT} #hnmain input[type="submit"],
.${ROOT} #hnmain textarea {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text);
}
.${ROOT} #hnmain input[type="submit"] { border-radius: var(--radius-full); padding: 4px 14px; }
```

- [ ] **Step 6: Rouvrir les budgets de rayon et d'ombre**

Dans `test/lint.mjs`, ligne 35, passer le maximum de rayons de `1` à `3` et actualiser la note :

```javascript
budget('valeurs de border-radius', [...css.matchAll(/border-radius:\s*([^;]+);/g)].map(x => x[1].trim()), 3,
  'trois rayons et pas un de plus : sm pour les pilules de metadonnee, md pour les cartes et les onglets, full pour les pastilles');
```

Ligne 38, passer le maximum d'ombres de `0` à `1` :

```javascript
budget('ombres', [...css.matchAll(/box-shadow:\s*([^;]+);/g)].map(x => x[1].trim()), 1,
  'une seule ombre dans tout le systeme, sur la carte, et elle disparait en sombre');
```

Dans `test/regles.mjs`, remplacer les trois assertions du bloc « 4. budget de coherence » par :

```javascript
/* 4. budget de coherence — T25, revise avec la coquille app */
const radius = new Set([...css.matchAll(/border-radius:\s*([^;]+);/g)].map(x => x[1].trim()));
ok(radius.size <= 3, `<= 3 valeurs de border-radius (${[...radius].join(', ') || 'aucune'})`);
ok(!/transition|animation/.test(css), '0 transition, 0 animation');
const ombres = new Set([...css.matchAll(/box-shadow:\s*([^;]+);/g)].map(x => x[1].trim()));
ok(ombres.size <= 1, `<= 1 ombre (${[...ombres].join(', ') || 'aucune'})`);
```

- [ ] **Step 7: Actualiser le comptage de tokens dans `test/regles.mjs`**

Lignes 64 à 68, remplacer par :

```javascript
ok(clair.length === 21, `21 tokens en clair (trouve ${clair.length})`);
ok(media.length === forced.length && media.every((t, i) => t === forced[i]),
   `la media query et .hn-dark redefinissent exactement les memes ${media.length} tokens`);
const jamaisRedefinis = clair.filter(t => !media.includes(t));
ok(jamaisRedefinis.every(t => ['--ui', '--mono', '--radius-sm', '--radius-md', '--radius-full', '--accent'].includes(t)),
   `seuls les tokens sans variante de theme ne sont pas redefinis (${jamaisRedefinis.join(' ')})`);
```

- [ ] **Step 8: Lancer la suite complète**

```bash
node --check hn-redesign.user.js && ./bin/build-chrome.sh && npm test
```

Expected: PASS partout. `test/lint.mjs` doit afficher `21 tokens` en pied. Si « tokens declares et jamais utilises » n'est pas vide, une des règles de l'étape 5 manque.

- [ ] **Step 9: Commit**

```bash
git add hn-redesign.user.js chrome/ test/contraste.mjs test/regles.mjs test/lint.mjs
git commit -m "palette : du beige chaud au neutre froid, 21 tokens

Les valeurs sont calculees, pas choisies : rampe reguliere en L* (ecart
minimal 10,0 clair / 10,3 sombre), bascule de teinte du dernier cran a
185 et 177 degres, plancher 3:1 tenu partout. Budgets de lint rouverts
a 3 rayons et 1 ombre, que la coquille app va utiliser."
```

---

## Task 2: Le harnais accepte une transformation de fixture

Les tests de la coquille ont besoin d'une page **connectée** (avec `#me`) et d'une page **déconnectée**. La fixture `news.html` est déconnectée. Plutôt que de versionner une seconde fixture — les fixtures ne sont pas versionnées, ce sont les écrits d'autres personnes — le harnais gagne un point d'entrée pour transformer le HTML avant analyse.

**Files:**
- Modify: `test/harness.mjs:66-70` (signature de `charge`)
- Create: `test/coquille.test.js`

**Interfaces:**
- Consomme : `charge(fichier, url)` existant.
- Produit : `charge(fichier, url, transforme)` où `transforme` est `(html: string) => string`, appliqué au HTML brut avant `parseHTML`. Par défaut `h => h`. Produit aussi le helper `connecte(html)` exporté depuis `test/coquille.test.js`… **non** : `connecte` est défini dans `test/coquille.test.js` et n'est exporté nulle part, chaque tâche suivante le réutilise depuis ce fichier.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `test/coquille.test.js` :

```javascript
/* La coquille app — sidebar, en-tete, onglets, cartes.
 *
 * Perimetre : la STRUCTURE produite dans le DOM. Ce fichier tourne sous
 * linkedom, qui n'a pas de mise en page : aucune hauteur, aucune largeur,
 * aucune couleur calculee n'est verifiable ici. La geometrie est dans
 * test/rendu.sh, dans Chromium.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { charge } from './harness.mjs';

const NEWS = 'https://news.ycombinator.com/news';

/* Le temoin : la fixture telle quelle, sans que le script tourne. C'est la
   seule facon de comparer un avant et un apres — recharger en neutralisant
   window.hnRedesign ferait sortir charge() sur « le script n a rien expose ». */
const temoinBrut = (fichier, transforme = h => h) =>
  parseHTML(transforme(readFileSync(new URL('../design-refs/fixtures/' + fichier, import.meta.url), 'utf8'))).document;

/* Rend la fixture « connectee » : HN sert <a id="me"> dans la cellule de
   droite quand la session est ouverte, a la place du lien login. */
export const connecte = (pseudo = 'omarbenje') => html =>
  html.replace(/<a href="login\?goto=news">login<\/a>/,
    `<a id="me" href="user?id=${pseudo}">${pseudo}</a> (<a href="logout">logout</a>)`);

test('le harnais applique la transformation de fixture avant analyse', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbenje'));
  const me = document.querySelector('#me');
  assert.ok(me, 'la fixture transformee doit porter #me');
  assert.equal(me.textContent, 'omarbenje');
  assert.equal(me.getAttribute('href'), 'user?id=omarbenje');
});

test('sans transformation la fixture reste deconnectee', () => {
  const { document } = charge('news.html', NEWS);
  assert.equal(document.querySelector('#me'), null);
  assert.ok(document.querySelector('a[href^="login"]'), 'le lien login est la');
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `node --test test/coquille.test.js`
Expected: FAIL sur le premier test — `charge` ignore son troisième argument, donc `#me` est `null`.

- [ ] **Step 3: Ajouter le paramètre au harnais**

Dans `test/harness.mjs`, remplacer la signature et la première ligne du corps de `charge` :

```javascript
export function charge(fichier = 'item.html', url = 'https://news.ycombinator.com/item?id=49426564', transforme = h => h) {
  const html = transforme(readFileSync(new URL('../design-refs/fixtures/' + fichier, import.meta.url), 'utf8'));
```

Et ajouter, juste au-dessus de la fonction, le commentaire qui explique pourquoi :

```javascript
/* Le hook de transformation. Les fixtures ne sont pas versionnees — ce sont
   les ecrits d'autres personnes — donc on ne peut pas en ajouter une variante
   « connectee » au depot. On transforme le HTML brut a la volee : c'est la
   seule difference entre la page qu'un visiteur voit et celle qu'Omar voit,
   et la sidebar en depend entierement. */
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `node --test test/coquille.test.js`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add test/harness.mjs test/coquille.test.js
git commit -m "test : le harnais accepte une transformation de fixture

La sidebar depend entierement de #me, que HN ne sert qu'a une session
ouverte. Les fixtures n'etant pas versionnees, on transforme le HTML
brut plutot que d'ajouter une variante au depot."
```

---

## Task 3: La barre latérale

Construit `nav.__side` : le logo, quatre entrées principales, six liens natifs relocalisés, l'interrupteur de thème. Produit aussi le helper `icone()` que les tâches 4 et 6 réutilisent.

**Files:**
- Modify: `hn-redesign.user.js` — supprimer `navbar()` (ligne ~599-635), ajouter `icone()`, `utilisateur()`, `sidebar()` ; ajouter le CSS de la sidebar ; appeler `sidebar()` depuis `apply()`
- Modify: `test/regles.mjs:79-83` (l'assertion « rien hors de #hnmain »)
- Modify: `test/coquille.test.js`

**Interfaces:**
- Consomme : `addClass`, `setStyle`, `insere`, `detache`, `undo`, `litTheme`, `poseTheme`, `THEMES`, `lienTheme` (tâche 0, existants) ; les tokens de la tâche 1.
- Produit :
  - `icone(nom)` → `SVGSVGElement`. `nom` ∈ `'home' | 'compass' | 'bookmark' | 'user' | 'search' | 'fleche' | 'bulle'`. Jette sur un nom inconnu.
  - `utilisateur()` → `string | null`. Lit `#me`, rend son `textContent` ou `null`.
  - `sidebar()` → `void`. Insère `nav.__side` en premier enfant de `body` et pose `margin-left` sur `center`. Ne fait rien s'il n'y a pas de `#hnmain`.
  - Ces trois-là sont exposés sur `window.hnRedesign`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `test/coquille.test.js` :

```javascript
test('icone rend un SVG inline, jamais une requete', () => {
  const { api } = charge('news.html', NEWS);
  for (const nom of ['home', 'compass', 'bookmark', 'user', 'search', 'fleche', 'bulle']) {
    const svg = api.icone(nom);
    assert.equal(svg.tagName.toLowerCase(), 'svg', `${nom} rend un <svg>`);
    assert.equal(svg.getAttribute('stroke'), 'currentColor', `${nom} suit la couleur du texte`);
    assert.ok(svg.children.length > 0, `${nom} a un trace`);
  }
  assert.throws(() => api.icone('licorne'), /licorne/);
});

test('utilisateur lit #me, et rend null sans session', () => {
  assert.equal(charge('news.html', NEWS, connecte('omarbenje')).api.utilisateur(), 'omarbenje');
  assert.equal(charge('news.html', NEWS).api.utilisateur(), null);
});

test('la sidebar existe sur /news et porte quatre entrees principales', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbenje'));
  const side = document.querySelector('body > nav.__side');
  assert.ok(side, 'nav.__side est le premier enfant de body');
  const principales = [...side.querySelectorAll('.__nav-1 a')];
  assert.deepEqual(principales.map(a => a.textContent.trim()),
    ['Home', 'Explore', 'Bookmarks', 'Profile']);
  assert.deepEqual(principales.map(a => a.getAttribute('href')),
    ['news', 'newest', 'favorites?id=omarbenje', 'user?id=omarbenje']);
  assert.ok(principales.every(a => a.querySelector('svg')), 'chaque entree porte son icone');
});

test('sans session, Bookmarks et Profile sont absents plutot que morts', () => {
  const { document } = charge('news.html', NEWS);
  const principales = [...document.querySelectorAll('.__nav-1 a')];
  assert.deepEqual(principales.map(a => a.textContent.trim()), ['Home', 'Explore']);
});

test('aucun lien de navigation natif n est perdu', () => {
  /* Le critere qui remplace l'ancien comptage sur .pagetop : les liens sont
     DEPLACES dans la sidebar, donc les compter la ou ils etaient ne veut plus
     rien dire. Ce qui doit tenir, c'est qu'aucun ne disparaisse. */
  const avant = new Set();
  for (const a of temoinBrut('news.html').querySelectorAll('.pagetop a')) avant.add(a.getAttribute('href'));

  const { document } = charge('news.html', NEWS);
  const apres = new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  const perdus = [...avant].filter(h => !apres.has(h));
  assert.deepEqual(perdus, [], 'aucun href natif ne disparait');
});

test('les six liens secondaires sont deplaces, pas clones', () => {
  const { document } = charge('news.html', NEWS);
  /* :not(.__range) — le lien natif « newest » est range dans ce groupe lui
     aussi, hors de la vue, parce qu'Explore le represente deja. Le compter
     ici ferait attendre sept liens la ou la maquette en montre six. */
  const secondaires = [...document.querySelectorAll('.__nav-2 a:not(.__range)')].map(a => a.getAttribute('href'));
  assert.deepEqual(secondaires, ['front', 'newcomments', 'ask', 'show', 'jobs', 'submit']);
  for (const href of secondaires)
    assert.equal(document.querySelectorAll(`a[href="${href}"]`).length, 1,
      `${href} existe une seule fois — deplace, pas clone`);
});

test('la sidebar est absente de /item', () => {
  const { document } = charge();
  assert.equal(document.querySelector('nav.__side'), null);
});

test('revert retire la sidebar et rend body intact', () => {
  const { api, document } = charge('news.html', NEWS, connecte('omarbenje'));
  assert.ok(document.querySelector('nav.__side'));
  api.revert();
  assert.equal(document.querySelector('nav.__side'), null);
  assert.equal(document.querySelector('center').getAttribute('style'), null);
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `node --test test/coquille.test.js`
Expected: FAIL — `api.icone is not a function`.

- [ ] **Step 3: Ajouter `icone()` et `utilisateur()`**

Insérer dans `hn-redesign.user.js`, juste avant la section `/* --- T22 le theme */` :

```javascript
/* ---------------------------------------------------------- les icones
   Sept traces, construits en JS. Pas de police d'icones (une requete
   reseau, et le projet est a zero), pas de <img> (la CSP de HN sert
   img-src 'self' — c'est ce qui a tue le favicon de domaine).

   currentColor sur le stroke n'est pas un detail : c'est ce qui fait suivre
   le theme et l'etat actif sans une seule regle de couleur supplementaire. */
const TRACES = {
  home:     'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  compass:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  bookmark: 'M6.5 3.5h11v17l-5.5-4-5.5 4v-17Z',
  user:     'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1.5-3.5 4.2-5.5 7.5-5.5s6 2 7.5 5.5',
  search:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16.2 16.2 21 21',
  fleche:   'M12 19V5M6 11l6-6 6 6',
  bulle:    'M4.5 5.5h15v11h-8l-4.5 3.5v-3.5h-2.5v-11Z',
};

function icone(nom) {
  const d = TRACES[nom];
  if (!d) throw new Error(`[hn-redesign] icone inconnue : ${nom}`);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  return svg;
}

/* Le pseudo, lu dans le DOM. HN sert <a id="me"> en haut a droite quand la
   session est ouverte, et rien du tout sinon. Zero requete, zero reglage :
   c'est ce qui rend Bookmarks et Profile possibles. */
const utilisateur = () => {
  const me = document.querySelector('#me');
  return me ? me.textContent.trim() : null;
};
```

- [ ] **Step 4: Remplacer `navbar()` par `sidebar()`**

Supprimer entièrement la fonction `navbar()` et son en-tête de section, et mettre à la place :

```javascript
/* ------------------------------------------------- la coquille : sidebar
   Le PREMIER noeud que ce script insere hors de #hnmain. Jusqu'ici la
   protection des formulaires etait structurelle : tout vivait sous #hnmain,
   absent de /login, /submit et /reply. Cette garantie cesse d'etre gratuite
   ici — d'ou le garde-fou explicite en tete de fonction. Ne pas le retirer. */
function sidebar() {
  if (!document.querySelector('#hnmain')) return;

  const barre = document.querySelector('#hnmain > tbody > tr:first-child > td');
  if (!barre) return;

  const side = document.createElement('nav');
  side.className = '__side';

  /* Le logo. Deplace depuis la navbar, pas clone : il n'y en a qu'un. */
  const logo = barre.querySelector('img');
  if (logo) {
    const boite = document.createElement('a');
    boite.className = '__logo';
    boite.href = 'news';
    setStyle(logo, 'border', 'none');
    insere(boite, logo, null);
    side.appendChild(boite);
  }

  const pseudo = utilisateur();
  const groupe1 = document.createElement('div');
  groupe1.className = '__nav-1';

  const ENTREES = [
    ['home',     'Home',      'news',      true],
    ['compass',  'Explore',   'newest',    true],
    ['bookmark', 'Bookmarks', pseudo && `favorites?id=${pseudo}`, !!pseudo],
    ['user',     'Profile',   pseudo && `user?id=${pseudo}`,      !!pseudo],
  ];
  const op = document.documentElement.getAttribute('op');
  for (const [ic, libelle, href, actif] of ENTREES) {
    if (!actif) continue;
    const a = document.createElement('a');
    a.href = href;
    a.appendChild(icone(ic));
    a.appendChild(document.createTextNode(libelle));
    if ((href === 'news' && op === 'news') || (href === 'newest' && op === 'newest')) a.className = '__on';
    groupe1.appendChild(a);
  }
  side.appendChild(groupe1);

  /* Les six liens natifs que la maquette ne montre pas. DEPLACES, jamais
     clones : la premisse 3 du systeme dit que le HTML fonctionnel reste
     ATTEIGNABLE, et la presentation a le droit de le relocaliser. Les cloner
     doublerait chaque href et le test de conservation le verrait. */
  const groupe2 = document.createElement('div');
  groupe2.className = '__nav-2';
  for (const href of ['front', 'newcomments', 'ask', 'show', 'jobs', 'submit']) {
    const a = barre.querySelector(`.pagetop a[href="${href}"]`);
    if (a) { insere(groupe2, a, null); }
  }
  side.appendChild(groupe2);

  /* Explore pointe vers newest, dont le lien natif vit dans .pagetop. Il est
     deplace hors ecran plutot que supprime : le supprimer perdrait un href. */
  const natifNewest = barre.querySelector('.pagetop a[href="newest"]');
  if (natifNewest) { addClass(natifNewest, '__range'); insere(groupe2, natifNewest, null); }

  /* T22 — l'interrupteur, en pied de sidebar. Il affiche l'ETAT courant et
     non l'action : « auto » dit ou on en est. */
  lienTheme = document.createElement('a');
  lienTheme.className = '__theme';
  lienTheme.href = 'javascript:void(0)';
  lienTheme.textContent = litTheme();
  lienTheme.addEventListener('click', () => {
    poseTheme(THEMES[(THEMES.indexOf(litTheme()) + 1) % THEMES.length]);
  });
  side.appendChild(lienTheme);
  undo.push(() => { lienTheme = null; });

  insere(document.body, side, document.body.firstChild);
  const centre = document.querySelector('body > center');
  if (centre) setStyle(centre, 'marginLeft', '220px');

  /* Les separateurs « | » de .pagetop sont des noeuds texte litteraux : aucune
     regle CSS ne les atteint, il faut les retirer du DOM. */
  barre.querySelectorAll('.pagetop').forEach(p => {
    [...p.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.includes('|'))
      .forEach(detache);
  });
}
```

- [ ] **Step 5: Ajouter le CSS de la sidebar**

Remplacer toute la section `/* --- navbar T24 */` du CSS (lignes ~239-288, jusqu'à juste avant `/* --- la liste T23`) par :

```css
/* ----------------------------------------------------- la coquille : sidebar
   position: fixed plutot qu'un flex sur body. Le flex creerait un conteneur
   de defilement neuf ; le fixed laisse le defilement a HN, et l'annulation
   est une propriete a retirer plus un noeud a detacher.

   C'est le SEUL bloc de la feuille qui vit hors de #hnmain, avec le fond de
   page. test/regles.mjs le sait et le verifie nommement. */
.${ROOT} .__side {
  position: fixed; top: 0; left: 0; bottom: 0; width: 220px;
  box-sizing: border-box; padding: 20px 12px;
  display: flex; flex-direction: column; gap: 4px;
  background: var(--page); border-right: 1px solid var(--line);
  font-size: 14px; line-height: 20px;
}
.${ROOT} center { margin-left: 220px; }

.${ROOT} .__side .__logo {
  display: block; width: 36px; height: 36px; margin: 0 8px 20px;
  background: var(--accent); border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
}
.${ROOT} .__side .__logo img { width: 22px; height: 22px; }

.${ROOT} .__side .__nav-1 { display: flex; flex-direction: column; gap: 2px; }
.${ROOT} .__side .__nav-1 a {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px; border-radius: var(--radius-md);
  color: var(--author); font-size: 14px; font-weight: 500;
}
.${ROOT} .__side .__nav-1 a svg { width: 18px; height: 18px; flex: none; }
.${ROOT} .__side .__nav-1 a.__on { background: var(--surface-2); color: var(--accent-text); }

/* Le second groupe : les six liens natifs relocalises. Plus discrets, sans
   icone — ce sont des destinations, pas des sections. */
.${ROOT} .__side .__nav-2 {
  display: flex; flex-direction: column; gap: 2px;
  margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line);
}
.${ROOT} .__side .__nav-2 a { padding: 5px 12px; color: var(--meta); font-size: 13px; }
/* Le lien natif « newest » est deja represente par Explore. Il reste dans le
   document — sinon un href disparaitrait — mais hors de la vue. */
.${ROOT} .__side .__nav-2 a.__range { position: absolute; opacity: 0; pointer-events: none; }

.${ROOT} .__side .__theme {
  margin-top: auto; padding: 8px 12px;
  color: var(--meta); font-size: 12px;
}
```

- [ ] **Step 6: Câbler `sidebar()` dans `apply()` et exposer l'API**

Dans `apply()`, remplacer l'appel `navbar();` par `sidebar();`.

Dans l'objet `window.hnRedesign`, ajouter après `buildModel, collapse, calculeSpine, frontiere,` :

```javascript
  icone, utilisateur, sidebar,
```

- [ ] **Step 7: Rouvrir l'assertion « rien hors de #hnmain » dans `test/regles.mjs`**

Cette assertion interdit aujourd'hui toute règle hors `#hnmain` sauf `body`. La sidebar la viole légitimement. Remplacer les deux lignes du bloc « 5. T2 » par :

```javascript
/* 5. T2 — rien hors de #hnmain sauf trois exceptions NOMMEES.
   La sidebar est le premier noeud du projet insere hors de #hnmain : la
   protection des formulaires cesse d'etre structurelle et devient une
   condition a verifier. Cette liste est la moitie du controle ; l'autre est
   le garde-fou en tete de sidebar(), teste dans test/coquille.test.js. */
const HORS_HNMAIN_AUTORISE = /(^|,)\s*\.hn-redesign\s+(body|center|\.__side\b)/;
const horsScope = regles.filter(r => !r.sel.includes('#hnmain') && !r.sel.startsWith('.hn-redesign'));
ok(horsScope.length === 0, `aucune regle hors de .hn-redesign (${horsScope.map(r => r.sel).join(', ') || 'ok'})`);
const horsHnmain = regles.filter(r => !r.sel.includes('#hnmain')
  && !/^\.hn-redesign(\.[\w-]+)?(:not\([^)]*\))?$/.test(r.sel.trim()));
const interdits = horsHnmain.filter(r => !HORS_HNMAIN_AUTORISE.test(r.sel));
ok(interdits.length === 0,
   `hors #hnmain, seuls body, center et .__side (${interdits.map(r => r.sel).join(', ') || 'aucun autre'})`);
```

- [ ] **Step 8: Retirer les assertions de navbar devenues fausses**

Dans `test/regles.mjs`, bloc « 6 », supprimer les trois assertions qui portent sur la navbar disparue : celle sur `navbar.length > 0 && … tr:first-child > td`, celle sur `box-sizing: border-box`, et garder les autres. Les remplacer par :

```javascript
/* la coquille : la sidebar est fixed, jamais un flex sur body */
ok(/\.__side \{[^}]*position:\s*fixed/.test(css.replace(/\s+/g, ' ')),
   'la sidebar est en position fixed — un flex sur body creerait un conteneur de defilement neuf');
ok(!/\bbody \{[^}]*display:\s*flex/.test(css), 'body ne devient pas un conteneur flex');
```

- [ ] **Step 9: Lancer la suite**

```bash
node --check hn-redesign.user.js && ./bin/build-chrome.sh && npm test
```

Expected: PASS. `test/coquille.test.js` doit compter 10 tests verts.

- [ ] **Step 10: Commit**

```bash
git add hn-redesign.user.js chrome/ test/coquille.test.js test/regles.mjs
git commit -m "coquille : la barre laterale, et sept icones en SVG inline

Premier noeud du projet insere hors de #hnmain : la protection des
formulaires cesse d'etre structurelle, d'ou le garde-fou explicite en
tete de sidebar() et l'assertion nommee dans regles.mjs. Les six liens
natifs sont DEPLACES, pas clones — un test verifie qu'aucun href ne
disparait."
```

---

## Task 4: L'en-tête

Transforme la première ligne de `#hnmain` en en-tête : titre de page, formulaire de recherche natif relocalisé, pastille utilisateur.

**Files:**
- Modify: `hn-redesign.user.js` — ajouter `entete()`, l'appeler depuis `apply()`, ajouter le CSS
- Modify: `test/coquille.test.js`

**Interfaces:**
- Consomme : `icone('search')`, `utilisateur()`, `insere`, `addClass` (tâche 3).
- Produit : `entete()` → `void`. Doit être appelée **après** `sidebar()` : elle suppose que le logo et les six liens ont déjà quitté la barre.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `test/coquille.test.js` :

```javascript
test('le formulaire de recherche est celui de HN, deplace et non recree', () => {
  const { document } = charge('news.html', NEWS);
  const formes = [...document.querySelectorAll('form[action*="hn.algolia.com"]')];
  assert.equal(formes.length, 1, 'un seul formulaire de recherche dans le document');
  assert.ok(formes[0].closest('.__entete'), 'il vit desormais dans l en-tete');
  assert.equal(formes[0].querySelector('input[name="q"]').getAttribute('placeholder'),
    'Search stories, comments, or users');
  assert.ok(formes[0].querySelector('svg'), 'la loupe est posee dans le formulaire');
});

test('le titre de page est le nom du site, relocalise', () => {
  const { document } = charge('news.html', NEWS);
  const titre = document.querySelector('.__entete .__titre');
  assert.ok(titre, 'l en-tete porte un titre');
  assert.equal(titre.textContent.trim(), 'Hacker News');
});

test('la pastille porte l initiale du pseudo et mene au profil', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbenje'));
  const pastille = document.querySelector('.__entete .__moi');
  assert.ok(pastille, 'la pastille existe pour une session ouverte');
  assert.equal(pastille.textContent.trim(), 'O');
  assert.equal(pastille.getAttribute('href'), 'user?id=omarbenje');
});

test('sans session, la pastille cede la place au lien login natif', () => {
  const { document } = charge('news.html', NEWS);
  assert.equal(document.querySelector('.__entete .__moi'), null);
  const login = document.querySelector('.__entete a[href^="login"]');
  assert.ok(login, 'le lien login natif reste dans l en-tete');
  assert.equal(login.textContent.trim(), 'login');
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `node --test test/coquille.test.js`
Expected: FAIL — `formes[0].closest('.__entete')` est `null`, le formulaire est encore dans le pied de page.

- [ ] **Step 3: Écrire `entete()`**

Insérer juste après `sidebar()` :

```javascript
/* -------------------------------------------------- la coquille : l'en-tete
   La premiere ligne de #hnmain — le bandeau orange natif — devient l'en-tete.
   Trois cellules, que HN sert deja : le logo (parti dans la sidebar), les
   liens (partis aussi), et login a droite. On y remet trois choses.

   Le formulaire de recherche N'EST PAS FABRIQUE : HN en sert un dans son pied
   de page, <form action="//hn.algolia.com/">. On le DEPLACE. Un formulaire
   fabrique dupliquerait une fonction existante, et le zero requete reseau
   tient parce qu'un action de formulaire n'est qu'une cible de navigation. */
function entete() {
  const barre = document.querySelector('#hnmain > tbody > tr:first-child > td');
  if (!barre) return;
  addClass(barre, '__entete');

  const cellules = [...barre.querySelectorAll('td')];
  const [gauche, centre, droite] = cellules;
  if (!gauche || !centre || !droite) return;

  /* 1. Le titre. b.hnname vit dans .pagetop de la cellule du milieu ; on le
     deplace dans la cellule de gauche, ou il devient le titre de page. */
  const nom = barre.querySelector('.hnname');
  if (nom) { addClass(nom, '__titre'); insere(gauche, nom, null); }

  /* 2. La recherche. */
  const forme = document.querySelector('form[action*="hn.algolia.com"]');
  if (forme) {
    addClass(forme, '__rech');
    /* Le libelle « Search: » est un noeud texte litteral, hors de tout
       element : aucune regle CSS ne l'atteint. Il devient le placeholder. */
    [...forme.childNodes].filter(n => n.nodeType === 3).forEach(detache);
    const champ = forme.querySelector('input[name="q"]');
    if (champ) {
      champ.setAttribute('placeholder', 'Search stories, comments, or users');
      undo.push(() => champ.removeAttribute('placeholder'));
      champ.removeAttribute('size');
      undo.push(() => champ.setAttribute('size', '17'));
      insere(forme, icone('search'), forme.firstChild);
    }
    insere(centre, forme, null);
  }

  /* 3. La pastille. Pas d'avatar : HN n'en sert aucun, et en inventer un
     serait la seule donnee fabriquee du projet. L'initiale du pseudo dit la
     meme chose et elle est vraie. */
  const pseudo = utilisateur();
  if (pseudo) {
    const moi = document.createElement('a');
    moi.className = '__moi';
    moi.href = `user?id=${pseudo}`;
    moi.textContent = pseudo[0].toUpperCase();
    moi.setAttribute('title', pseudo);
    insere(droite, moi, droite.firstChild);
  }
}
```

- [ ] **Step 4: Ajouter le CSS de l'en-tête**

Ajouter à la suite du bloc sidebar :

```css
/* --------------------------------------------------- la coquille : l'en-tete
   Le chemin complet, jamais td:first-child depuis #hnmain : ce selecteur-la
   vise la BARRE et non ses cellules — l'erreur qui colle le logo a gauche et
   fait flotter le reste au centre.

   box-sizing: border-box n'est pas decoratif : en content-box, la hauteur de
   contenu plus les bordures rendent quelques pixels de trop et le critere de
   hauteur echoue sur une barre pourtant juste. */
.${ROOT} #hnmain > tbody > tr:first-child > td {
  background: var(--page);
  border: 0; box-sizing: border-box;
  height: 92px; padding: 0;
}
.${ROOT} #hnmain > tbody > tr:first-child > td > table { width: 100%; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td { vertical-align: middle; padding: 0; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(1) { width: 1px; white-space: nowrap; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(2) { width: 100%; text-align: center; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(3) { width: 1px; white-space: nowrap; text-align: right; }

.${ROOT} #hnmain .__titre { font-size: 30px; line-height: 34px; font-weight: 700; letter-spacing: -0.012em; }
.${ROOT} #hnmain .__titre a { color: var(--text); }

.${ROOT} #hnmain .__rech {
  display: inline-flex; align-items: center; gap: 8px;
  width: 100%; max-width: 460px; height: 40px; padding: 0 16px;
  box-sizing: border-box;
  background: var(--surface-2); border-radius: var(--radius-full);
  color: var(--meta);
}
.${ROOT} #hnmain .__rech svg { width: 16px; height: 16px; flex: none; }
.${ROOT} #hnmain .__rech input {
  flex: 1; min-width: 0; border: 0; background: none; outline: 0;
  font-family: var(--ui); font-size: 14px; color: var(--text);
}

.${ROOT} #hnmain .__moi {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: var(--radius-full);
  background: var(--surface-2); color: var(--author);
  font-size: 15px; font-weight: 600;
}
.${ROOT} #hnmain .pagetop { font-size: 13px; line-height: 16px; color: var(--meta); }
.${ROOT} #hnmain .pagetop a { color: var(--meta); }
```

- [ ] **Step 5: Câbler dans `apply()`**

Après `sidebar();`, ajouter `entete();`. L'ordre est obligatoire : `entete()` suppose que le logo et les six liens ont déjà quitté la barre.

Ajouter `entete,` à l'objet `window.hnRedesign`.

- [ ] **Step 6: Lancer la suite**

```bash
node --check hn-redesign.user.js && ./bin/build-chrome.sh && npm test
```

Expected: PASS — 14 tests dans `coquille.test.js`.

- [ ] **Step 7: Commit**

```bash
git add hn-redesign.user.js chrome/ test/coquille.test.js
git commit -m "coquille : l'en-tete, avec le formulaire de recherche de HN

Le champ n'est pas fabrique : HN en sert un dans son pied de page, on le
deplace. La pastille porte l'initiale du pseudo lu dans #me — pas
d'avatar, HN n'en sert aucun, et l'inventer serait la seule donnee
fausse du projet."
```

---

## Task 5: Les onglets

Insère la barre Top / New / Best sous l'en-tête, avec au plus un onglet actif.

**Files:**
- Modify: `hn-redesign.user.js` — ajouter `onglets()`, l'appeler depuis `apply()`, ajouter le CSS
- Modify: `test/coquille.test.js`

**Interfaces:**
- Consomme : `insere`, `addClass` (existants).
- Produit : `onglets()` → `void`. Insère une `tr.__onglets` entre la ligne d'en-tête et le contenu.

- [ ] **Step 1: Écrire les tests qui échouent**

```javascript
test('trois onglets, un seul actif sur /news', () => {
  const { document } = charge('news.html', NEWS);
  const tabs = [...document.querySelectorAll('.__onglets a')];
  assert.deepEqual(tabs.map(a => a.textContent.trim()), ['Top', 'New', 'Best']);
  assert.deepEqual(tabs.map(a => a.getAttribute('href')), ['news', 'newest', 'best']);
  const actifs = tabs.filter(a => a.className.includes('__on'));
  assert.equal(actifs.length, 1);
  assert.equal(actifs[0].textContent.trim(), 'Top');
});

test('sur /newest c est New qui est actif', () => {
  const { document } = charge('newest.html', 'https://news.ycombinator.com/newest');
  const actifs = [...document.querySelectorAll('.__onglets a')].filter(a => a.className.includes('__on'));
  assert.equal(actifs.length, 1);
  assert.equal(actifs[0].textContent.trim(), 'New');
});

test('sur une route etrangere aux trois, aucun onglet n est actif', () => {
  /* Zero actif plutot qu'un defaut sur Top : souligner Top sur /ask mentirait
     sur ou l'on se trouve. */
  const { document } = charge('news.html', 'https://news.ycombinator.com/ask',
    h => h.replace('op="news"', 'op="ask"'));
  const actifs = [...document.querySelectorAll('.__onglets a')].filter(a => a.className.includes('__on'));
  assert.equal(actifs.length, 0);
});

test('pas d onglets sur /item', () => {
  const { document } = charge();
  assert.equal(document.querySelector('.__onglets'), null);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `node --test test/coquille.test.js`
Expected: FAIL — `.__onglets a` ne rend rien.

- [ ] **Step 3: Écrire `onglets()`**

```javascript
/* --------------------------------------------------- la coquille : onglets
   Les trois routes existent. /best n'est pas dans la navbar native de HN —
   c'est le seul lien de la coquille qui ne relocalise pas un lien existant,
   et c'est assume : la route repond.

   AU PLUS un actif. Si op ne correspond a aucune des trois, aucun ne l'est :
   un defaut sur Top mentirait sur /ask ou /show. */
const ONGLETS = [['Top', 'news'], ['New', 'newest'], ['Best', 'best']];

function onglets() {
  const corps = document.querySelector('#hnmain > tbody');
  const premiere = corps && corps.firstElementChild;
  if (!premiere) return;
  /* Le discriminant de /item est table.fatitem — .athing.submission existe sur
     les deux pages. Sans ce test, un fil de commentaires gagnerait des onglets
     de liste. */
  if (document.querySelector('#hnmain table.fatitem')) return;

  const op = document.documentElement.getAttribute('op');
  const tr = document.createElement('tr');
  tr.className = '__onglets';
  const td = document.createElement('td');
  const boite = document.createElement('div');
  for (const [libelle, href] of ONGLETS) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = libelle;
    if (op === href) a.className = '__on';
    boite.appendChild(a);
  }
  td.appendChild(boite);
  tr.appendChild(td);
  insere(corps, tr, premiere.nextSibling);
}
```

- [ ] **Step 4: Ajouter le CSS des onglets**

```css
/* ---------------------------------------------------- la coquille : onglets */
.${ROOT} #hnmain tr.__onglets > td { padding: 0 0 16px; }
.${ROOT} #hnmain tr.__onglets > td > div {
  display: flex; height: 52px; box-sizing: border-box;
  background: var(--surface-1);
  border: 1px solid var(--line); border-radius: var(--radius-md);
}
.${ROOT} #hnmain tr.__onglets a {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--meta); font-size: 15px; font-weight: 500;
  border-bottom: 2px solid transparent;
}
.${ROOT} #hnmain tr.__onglets a.__on { color: var(--accent-text); border-bottom-color: var(--accent); }
```

- [ ] **Step 5: Câbler dans `apply()`**

Après `entete();`, ajouter `onglets();`. Ajouter `onglets,` à `window.hnRedesign`.

- [ ] **Step 6: Lancer la suite**

```bash
node --check hn-redesign.user.js && ./bin/build-chrome.sh && npm test
```
Expected: PASS — 18 tests dans `coquille.test.js`.

- [ ] **Step 7: Commit**

```bash
git add hn-redesign.user.js chrome/ test/coquille.test.js
git commit -m "coquille : les onglets Top / New / Best

Au plus un actif, et zero si op ne correspond a aucune des trois : un
defaut sur Top mentirait sur /ask."
```

---

## Task 6: La carte

Remplace `fusionner()` par `cartes()`. Chaque `tr.athing.submission` devient une carte en grille : pastille de rang, flèche de vote, puis titre / domaine / métadonnée empilés.

**Files:**
- Modify: `hn-redesign.user.js` — remplacer `fusionner()` (~ligne 636-732) par `cartes()`, remplacer le CSS de la section « la liste T23 »
- Modify: `test/regles.mjs` (assertions de la ligne fusionnée)
- Modify: `test/coquille.test.js`

**Interfaces:**
- Consomme : `icone('fleche')`, `icone('bulle')` (tâche 3) ; `cloneSansId`, `addClass`, `setStyle`, `insere`, `detache` (existants).
- Produit : `cartes()` → `void`. Remplace `fusionner()`. `scoreDe()` devient inutilisé et est supprimé avec elle.

- [ ] **Step 1: Écrire les tests qui échouent**

```javascript
test('les 30 lignes de /news deviennent des cartes', () => {
  const { document } = charge('news.html', NEWS);
  const cartes = [...document.querySelectorAll('#hnmain tr.__card')];
  assert.equal(cartes.length, 30);
  for (const c of cartes) {
    assert.ok(c.querySelector('.__m'), 'chaque carte porte sa ligne de metadonnee');
    assert.ok(c.querySelector('.titleline a'), 'chaque carte porte son titre');
  }
});

test('le point du rang est retire, le rang reste lisible', () => {
  const { document } = charge('news.html', NEWS);
  const rangs = [...document.querySelectorAll('#hnmain tr.__card .rank')].map(r => r.textContent.trim());
  assert.equal(rangs[0], '1');
  assert.equal(rangs[29], '30');
  assert.ok(rangs.every(r => !r.includes('.')), 'aucun point residuel');
});

test('les posts d emploi n ont pas de subline et sont traites quand meme', () => {
  /* Leur td.subtext porte l age et hide en enfants DIRECTS. Sans repli, un
     post sur trente restait non traite, avec sa ligne native visible. */
  const { document } = charge('news.html', NEWS);
  const sansSubline = [...document.querySelectorAll('#hnmain tr.__card')]
    .filter(tr => tr.nextElementSibling && !tr.nextElementSibling.querySelector('.subline'));
  for (const tr of sansSubline) assert.ok(tr.querySelector('.__m'), 'traite malgre l absence de subline');
});

test('l age n est jamais affiche deux fois', () => {
  /* Sur un post d emploi le SEUL a[href^="item?id="] est celui de l age. Le
     prendre pour un lien de commentaires l affichait deux fois. */
  const { document } = charge('news.html', NEWS);
  for (const m of document.querySelectorAll('#hnmain tr.__card .__m')) {
    assert.ok(m.querySelectorAll('.age').length <= 1, 'au plus un age par carte');
  }
});

test('la ligne de metadonnee native est masquee, pas supprimee', () => {
  const { document } = charge('news.html', NEWS);
  const premiere = document.querySelector('#hnmain tr.__card');
  assert.ok(premiere.nextElementSibling.querySelector('td.subtext'), 'la tr native existe encore');
});

test('les icones de metadonnee sont posees', () => {
  const { document } = charge('news.html', NEWS);
  const m = document.querySelector('#hnmain tr.__card .__m');
  assert.ok(m.querySelector('svg'), 'la fleche des points est un SVG inline');
});

test('aucune carte sur /item — .athing.submission y existe aussi', () => {
  const { document } = charge();
  assert.equal(document.querySelectorAll('tr.__card').length, 0);
  assert.ok(document.querySelector('table.fatitem'), 'la fixture item porte bien une fatitem');
});

test('revert rend #hnmain identique a l octet sur /news', () => {
  const { api, document } = charge('news.html', NEWS, connecte('omarbenje'));
  api.revert();
  const apres = document.querySelector('#hnmain').innerHTML;
  assert.equal(apres, temoinBrut('news.html', connecte('omarbenje')).querySelector('#hnmain').innerHTML);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `node --test test/coquille.test.js`
Expected: FAIL — `tr.__card` ne rend rien (le code pose encore `__row`).

- [ ] **Step 3: Remplacer `fusionner()` par `cartes()`**

Supprimer `scoreDe()` et `fusionner()` en entier, et mettre :

```javascript
/* ---------------------------------------------------- la coquille : la carte
   Aucune restructuration du DOM. HN sert deja trois cellules par ligne — le
   rang, la fleche de vote, le titre — et elles tombent exactement aux trois
   emplacements de la maquette une fois la tr passee en grille. Seule la ligne
   de metadonnee est clonee dans la troisieme cellule.

   CLONER et non deplacer : les scripts de HN referencent ces noeuds. Les
   clones perdent leur id — deux #score_<n> dans un meme document casseraient
   getElementById.

   Ce qui a disparu avec la phase 3 : la ponderation par score. Les titres
   allaient de 15,5 a 19px selon le score. Trois lignes empilees dans une
   carte de hauteur fixe ne le supportent pas — la carte se deforme, ou la
   metrique cesse d'etre verifiable. Titre fixe a 17px. C'est la seule
   fonctionnalite que ce chantier supprime ; voir la spec, section 4.4. */
function cartes() {
  /* .athing.submission existe sur /news ET sur /item — 30 lignes d'un cote,
     1 de l'autre. Seul /item l'enveloppe dans <table class="fatitem">. Sans
     ce filtre, cartes() reecrirait la tete d'un fil de commentaires. */
  const lignes = [...document.querySelectorAll('#hnmain tr.athing.submission')]
    .filter(tr => !tr.closest('table.fatitem'));
  if (!lignes.length) return;

  for (const tr of lignes) {
    const titleline = tr.querySelector('.titleline');
    const suivante = tr.nextElementSibling;
    /* Les posts d'emploi n'ont PAS de span.subline : leur td.subtext porte
       l'age et hide en enfants directs. Sans ce repli, un post sur trente
       reste non traite — visible immediatement, il garde sa hauteur native. */
    const subline = suivante && (suivante.querySelector('.subline') || suivante.querySelector('td.subtext'));
    if (!titleline || !subline) continue;

    addClass(tr, '__card');

    /* Le point du rang est un noeud texte litteral : « 1. ». Aucune regle CSS
       ne l'atteint, comme les separateurs « | » de la navbar. */
    const rang = tr.querySelector('.rank');
    if (rang) {
      const t = rang.firstChild;
      if (t && t.nodeType === 3) {
        const propre = document.createTextNode(t.textContent.replace('.', '').trim());
        insere(rang, propre, t);
        detache(t);
      }
    }

    /* Le domaine passe sur sa propre ligne. .sitebit contient des parentheses
       litterales autour du lien : elles sautent avec la ligne. */
    const sitebit = titleline.querySelector('.sitebit');
    if (sitebit) {
      addClass(sitebit, '__site');
      [...sitebit.childNodes].filter(n => n.nodeType === 3).forEach(detache);
    }

    /* La metadonnee. */
    const m = document.createElement('span');
    m.className = '__m';
    const score = subline.querySelector('.score');
    const auteur = subline.querySelector('a.hnuser');
    const age = subline.querySelector('.age');
    /* Le lien de commentaires est le DERNIER a[href^="item?id="] de la ligne —
       l'age en contient un aussi, et il vient avant. Sur un post d'emploi il
       n'y a QUE celui de l'age : sans ce test, l'age etait clone deux fois et
       la carte affichait « 12 hours ago  12 hours ago ». */
    const items = [...subline.querySelectorAll('a[href^="item?id="]')];
    const dernier = items[items.length - 1];
    const commentaires = dernier && !dernier.closest('.age') ? dernier : null;

    if (score) {
      const g = document.createElement('span');
      g.className = '__pts';
      g.appendChild(icone('fleche'));
      g.appendChild(cloneSansId(score));
      m.appendChild(g);
    }
    if (auteur) {
      const a = cloneSansId(auteur);
      a.classList.add('__by');
      m.appendChild(a);
    }
    if (commentaires) {
      const g = document.createElement('span');
      g.className = '__c';
      g.appendChild(icone('bulle'));
      g.appendChild(cloneSansId(commentaires));
      m.appendChild(g);
    }
    if (age) m.appendChild(cloneSansId(age));
    insere(titleline, m, null);

    const hide = subline.querySelector('a[href^="hide?"]');
    if (hide) {
      const h = cloneSansId(hide);
      h.className = '__hide';
      insere(tr.lastElementChild, h, null);
    }

    /* La tr.spacer porte style="height:5px" en inline : le CSS ne la bat pas. */
    const espaceur = suivante.nextElementSibling;
    if (espaceur && espaceur.classList.contains('spacer')) setStyle(espaceur, 'height', '8px');
  }
}
```

- [ ] **Step 4: Remplacer le CSS de la liste**

Remplacer toute la section `/* --- la liste T23 */` par :

```css
/* ------------------------------------------------------ la coquille : la carte
   La tr EST la carte. Grille de deux colonnes : la gouttiere porte la pastille
   de rang en ligne 1 et la fleche de vote en ligne 2 ; le contenu occupe les
   deux lignes de la colonne 2. Les trois td de HN tombent pile dedans, donc
   aucun noeud n'est deplace pour la carte elle-meme. */
.${ROOT} #hnmain tr.__card {
  display: grid;
  grid-template-columns: 40px 1fr;
  grid-template-rows: auto 1fr;
  column-gap: 12px;
  padding: 16px 20px;
  box-sizing: border-box;
  position: relative;
  background: var(--surface-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
}
/* L'ombre ne dit rien sur un fond noir : en sombre, le filet suffit seul. */
@media (prefers-color-scheme: dark) {
  .${ROOT}:not(.hn-light) #hnmain tr.__card { box-shadow: none; }
}
.${ROOT}.hn-dark #hnmain tr.__card { box-shadow: none; }

.${ROOT} #hnmain tr.__card > td.title:first-child { grid-area: 1 / 1; padding: 0; }
.${ROOT} #hnmain tr.__card > td.votelinks { grid-area: 2 / 1; padding: 6px 0 0; }
.${ROOT} #hnmain tr.__card > td.title:last-child { grid-area: 1 / 2 / 3 / 3; padding: 0; }
.${ROOT} #hnmain tr.__card + tr { display: none; }

/* La pastille de rang. Un aplat de 26px a droit a l'orange pur : la regle qui
   l'interdit porte sur le TEXTE, pas sur les surfaces. */
.${ROOT} #hnmain tr.__card .rank {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: var(--radius-full);
  background: var(--accent); color: var(--surface-1);
  font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;
}

/* Les fleches de vote. HN les sert en <div class="votearrow"> de 10x10 avec
   triangle.svg en fond : une IMAGE, donc elles ne suivaient ni les tokens ni
   le theme. clip-path plutot qu'un triangle en bordures : la boite garde ses
   10x10, donc le rotate180 que HN applique a la fleche de downvote tourne
   autour du bon centre. Un triangle en bordures a une boite de 0x0. */
.${ROOT} #hnmain div.votearrow {
  background-image: none;
  background-color: var(--rail);
  clip-path: polygon(50% 12%, 100% 88%, 0 88%);
  margin: 0 auto;
}
.${ROOT} #hnmain .votelinks a:hover div.votearrow { background-color: var(--accent); }

.${ROOT} #hnmain tr.__card .titleline { display: block; }
.${ROOT} #hnmain tr.__card .titleline > a {
  font-size: 17px; line-height: 24px; font-weight: 600;
  letter-spacing: -0.012em; color: var(--text);
}
/* Le gris « deja lu » de HN. Cette regle DOIT battre celle du dessus : sans
   elle, tous les titres se ressemblent et on relit ce qu'on a deja lu.
   Invérifiable au rendu — les navigateurs mentent sur :visited contre le
   history sniffing — donc prouvee par specificite dans test/regles.mjs. */
.${ROOT} #hnmain tr.__card .titleline > a:visited { color: var(--visited); }

.${ROOT} #hnmain tr.__card .__site { display: block; font-size: 14px; line-height: 20px; }
.${ROOT} #hnmain tr.__card .__site a { color: var(--accent-text); }

.${ROOT} #hnmain .__m {
  display: flex; align-items: center; gap: 14px;
  margin-top: 6px; font-size: 13px; line-height: 18px; letter-spacing: .1px;
  color: var(--meta); white-space: nowrap;
}
.${ROOT} #hnmain .__m > * { display: inline-flex; align-items: center; gap: 5px; }
.${ROOT} #hnmain .__m svg { width: 12px; height: 12px; }
.${ROOT} #hnmain .__m .__pts { color: var(--accent-text); }
.${ROOT} #hnmain .__m .score { font-weight: 600; font-variant-numeric: tabular-nums; }
.${ROOT} #hnmain .__m a { color: var(--meta); }
.${ROOT} #hnmain .__m .__by { color: var(--author); }

/* hide : hors flux, donc zero impact sur la hauteur de carte, mais toujours
   atteignable au Tab. Les trois techniques ont ete mesurees : display:none
   tue le Tab, visibility:hidden aussi, opacity:0 le garde mais garde la
   place — d'ou opacity:0 PLUS position:absolute. */
.${ROOT} #hnmain .__hide {
  position: absolute; top: 16px; right: 20px;
  opacity: 0; font-size: 12px; color: var(--meta);
}
@media (any-hover: hover) {
  .${ROOT} #hnmain tr.__card:hover .__hide { opacity: 1; }
}
.${ROOT} #hnmain tr.__card:focus-within .__hide { opacity: 1; }
```

- [ ] **Step 5: Câbler dans `apply()` et actualiser `test/regles.mjs`**

Dans `apply()`, remplacer `fusionner();` par `cartes();`. Ajouter `cartes,` à `window.hnRedesign`.

Dans `test/regles.mjs`, bloc « 6 », remplacer les assertions qui nomment `tr.__row` par leurs équivalents `tr.__card` :

```javascript
ok(aRegle(/tr\.__card \+ tr$/) && /tr\.__card \+ tr\s*\{[^}]*display:\s*none/.test(css),
   'la ligne de metadonnee native est masquee, pas supprimee');
ok(/tr\.__card\s*\{[^}]*position:\s*relative/.test(css),
   'la carte est le repere de positionnement de hide');
ok(/\.__hide \{[^}]*position:\s*absolute[^}]*opacity:\s*0/.test(css.replace(/\s+/g, ' ')),
   'hide est hors flux ET opacity 0 — ni display:none ni visibility, qui tuent le Tab');
ok(/@media \(any-hover: hover\)/.test(css),
   'la revelation au survol est enveloppee dans @media (any-hover: hover)');
ok(/tr\.__card:focus-within .__hide/.test(css),
   'hide est aussi revele au focus clavier, pas seulement au survol');
ok(/tr\.__card\s*\{[^}]*display:\s*grid/.test(css.replace(/\s+/g, ' ')),
   'la carte est une grille — les trois td de HN tombent aux trois emplacements sans etre deplaces');
```

Et actualiser le sélecteur du lien générique attendu par l'assertion `a:visited` : `lienGenerique` cherche `#hnmain a$`. Vérifier qu'il existe toujours dans le CSS ; si oui, l'assertion de spécificité doit passer, `tr.__card .titleline > a:visited` (spécificité 10402) battant `#hnmain a` (10001).

- [ ] **Step 6: Lancer la suite**

```bash
node --check hn-redesign.user.js && ./bin/build-chrome.sh && npm test
```
Expected: PASS — 26 tests dans `coquille.test.js`, `regles.mjs` vert, `lint.mjs` dans le budget (3 rayons, 1 ombre).

- [ ] **Step 7: Commit**

```bash
git add hn-redesign.user.js chrome/ test/coquille.test.js test/regles.mjs
git commit -m "coquille : la carte, en grille sur les trois td de HN

Aucun noeud deplace pour la carte elle-meme : rang, fleche et contenu
tombent aux trois emplacements de la grille. La ponderation par score
disparait — une carte de hauteur fixe ne supporte pas un titre qui varie
de 3,5px. C'est la seule fonctionnalite que ce chantier supprime."
```

---

## Task 7: Le fil de commentaires ré-habillé

Le fil ne change pas fonctionnellement. Seuls ses tokens et ses rayons suivent la nouvelle palette, et sa colonne s'aligne sur la coquille.

**Files:**
- Modify: `hn-redesign.user.js` — section CSS `/* --- le fil, phase 4 */` (lignes ~352-501)

**Interfaces:**
- Consomme : les tokens de la tâche 1.
- Produit : rien de neuf. `habilleFil()`, `buildModel()`, `appliqueSpine()`, `restaure()` sont **intouchés**.

- [ ] **Step 1: Vérifier que les 12 tests du fil sont verts avant de toucher quoi que ce soit**

Run: `node --test test/modele.test.js`
Expected: PASS — 12 tests. Si un seul échoue, **s'arrêter** : une tâche précédente a cassé le fil, et ce n'est pas à celle-ci de le réparer à l'aveugle.

- [ ] **Step 2: Adapter les surfaces du fil**

Dans la section « surfaces » du CSS, remplacer la règle de fond de `#hnmain` :

```css
/* Le fond de page porte la coquille ; #hnmain n'est plus une feuille posee
   dessus, ce sont les cartes qui le sont. Sur /item en revanche la colonne
   redevient une surface, puisqu'il n'y a pas de cartes. */
.${ROOT} body { background: var(--page); }
.${ROOT} #hnmain { background: transparent; padding-bottom: 28px; }
.${ROOT} #hnmain table.fatitem,
.${ROOT} #hnmain tr.athing.comtr {
  background: var(--surface-1);
}
```

- [ ] **Step 3: Propager les rayons et les traits dans la section du fil**

Dans la section `/* --- le fil, phase 4 */`, appliquer ces substitutions :

- Chaque `border-radius: var(--radius-md)` issu du renommage automatique de la tâche 1 sur un **petit** élément (aperçu de commentaire replié, lien de spine, barre de position) passe à `var(--radius-sm)`.
- Les traits qui **séparent** deux zones passent de `var(--rail)` à `var(--line)`.
- Le motif de gouttière `repeating-linear-gradient(… var(--rail) 11px, var(--rail) 12px …)` **garde `--rail`** : c'est là que le token a son sens — le nombre de traits est la profondeur.

- [ ] **Step 4: Vérifier que les invariants du fil tiennent toujours**

Run: `node test/regles.mjs`
Expected: PASS. Les assertions du bloc « 7 » doivent rester vertes : 12 paliers d'indentation à `depth × 22`, le motif de 22 px avec trait à 11 px, l'aperçu révélé par `.coll`, le marqueur de 14 px, la barre non collée au bord.

- [ ] **Step 5: Lancer la suite**

```bash
node --check hn-redesign.user.js && ./bin/build-chrome.sh && npm test
```
Expected: PASS partout.

- [ ] **Step 6: Commit**

```bash
git add hn-redesign.user.js chrome/
git commit -m "le fil suit la nouvelle palette, sans changer de comportement

Les 12 tests de modele et les invariants de gouttiere sont intouches.
--rail reste sur le motif de profondeur, ou le NOMBRE de traits est
l'information ; --line prend les traits qui separent des zones."
```

---

## Task 8: La géométrie, dans Chromium

Réécrit les assertions de `test/rendu.sh` qui portaient sur la liste dense. C'est la seule tâche qui mesure des pixels.

**Files:**
- Modify: `test/rendu.sh`

**Interfaces:**
- Consomme : le userscript complet des tâches 1 à 7.
- Produit : une suite de rendu verte. Prérequis : `./design-refs/capture.sh ./design-refs/fixtures`.

- [ ] **Step 1: S'assurer que les fixtures existent**

```bash
ls design-refs/fixtures/news.html || ./design-refs/capture.sh ./design-refs/fixtures
```

- [ ] **Step 2: Lancer la suite de rendu telle quelle, pour voir l'ampleur**

Run: `./test/rendu.sh`
Expected: FAIL — les assertions de la ligne fusionnée et de la navbar. Noter lesquelles échouent : c'est la liste de travail exacte de cette tâche.

- [ ] **Step 3: Remplacer le bloc « /news — la ligne fusionnee (T23) »**

Remplacer ce bloc de `test/rendu.sh` par :

```bash
echo "/news — la carte"
verdict "$(js '(()=>{
  const r=[...document.querySelectorAll("#hnmain tr.__card")];
  const h=r.map(x=>x.getBoundingClientRect().height).sort((a,b)=>a-b);
  const med=h[Math.floor(h.length/2)];
  const hors=h.filter(v=>Math.abs(v-100)>6).length;
  const t=r.map(x=>getComputedStyle(x.querySelector(".titleline a")).fontSize);
  const rangs=r.map(x=>{const c=getComputedStyle(x.querySelector(".rank"));
    return c.borderTopLeftRadius+" "+c.width});
  return JSON.stringify({
    "30 cartes": [r.length===30, r.length+" cartes"],
    "hauteur 100px +/- 6": [hors===0, "mediane "+med.toFixed(1)+"px, "+hors+" hors tolerance"],
    "titre fixe a 17px": [new Set(t).size===1&&t[0]==="17px", [...new Set(t)].join(", ")],
    "pastille de rang ronde": [rangs.every(v=>v===rangs[0]), rangs[0]]
  });})()')"
[ $? -ne 0 ] && ECHECS=$((ECHECS+1))

echo "/news — la densite"
verdict "$(js '(()=>{
  const r=[...document.querySelectorAll("#hnmain tr.__card")];
  const entiers=r.filter(x=>{const b=x.getBoundingClientRect();return b.top>=0&&b.bottom<=900}).length;
  return JSON.stringify({
    "7 cartes entieres dans 900px": [entiers>=7, entiers+" cartes entieres"]
  });})()')"
[ $? -ne 0 ] && ECHECS=$((ECHECS+1))
```

> La densité se mesure à `getBoundingClientRect`, **jamais à l'œil sur une capture** : cette méthode a produit deux chiffres faux dans ce projet avant d'être abandonnée.

- [ ] **Step 4: Remplacer le bloc de la navbar par celui de la coquille**

```bash
echo "/news — la coquille"
verdict "$(js '(()=>{
  const s=document.querySelector("nav.__side");
  const sr=s?s.getBoundingClientRect():null;
  const cs=s?getComputedStyle(s):null;
  const ent=document.querySelector(".__entete");
  const tabs=[...document.querySelectorAll(".__onglets a")];
  const actifs=tabs.filter(a=>a.className.includes("__on"));
  const rech=document.querySelector(".__rech");
  const centre=document.querySelector("body > center");
  return JSON.stringify({
    "sidebar 220px de large": [sr&&Math.round(sr.width)===220, sr?Math.round(sr.width)+"px":"absente"],
    "sidebar en position fixed": [cs&&cs.position==="fixed", cs?cs.position:"-"],
    "la colonne est decalee de 220px": [centre&&getComputedStyle(centre).marginLeft==="220px",
      centre?getComputedStyle(centre).marginLeft:"-"],
    "en-tete present": [!!ent, ent?Math.round(ent.getBoundingClientRect().height)+"px":"absent"],
    "3 onglets, 1 actif": [tabs.length===3&&actifs.length===1, tabs.length+" onglets, "+actifs.length+" actif"],
    "recherche dans l en-tete": [!!(rech&&rech.closest(".__entete")), rech?"oui":"absente"]
  });})()')"
[ $? -ne 0 ] && ECHECS=$((ECHECS+1))
```

- [ ] **Step 5: Ajouter l'assertion qui protège `/login`**

C'est le risque nouveau du chantier : la sidebar est le premier nœud inséré hors de `#hnmain`.

```bash
page login.html
$BROWSE eval "$TMP/us.js" >/dev/null 2>&1
echo "/login — rien ne doit s y poser"
verdict "$(js '(()=>{
  return JSON.stringify({
    "aucune sidebar": [!document.querySelector("nav.__side"), document.querySelectorAll("nav.__side").length+" trouvee(s)"],
    "aucune classe racine": [!document.documentElement.className.includes("hn-redesign"),
      document.documentElement.className||"(vide)"],
    "aucune feuille injectee": [!document.getElementById("hn-redesign-style"), "ok"],
    "les input sont intacts": [document.querySelectorAll("input").length===7,
      document.querySelectorAll("input").length+" input"]
  });})()')"
[ $? -ne 0 ] && ECHECS=$((ECHECS+1))
```

> Vérifier l'`id` réel de la balise `<style>` dans le userscript (constante `STYLE_ID`) et l'utiliser ici.

- [ ] **Step 6: Vérifier que la réversibilité à l'octet tient sur les deux pages**

Le bloc existant qui compare `window.__av.html` à `#hnmain.innerHTML` après `revert()` reste tel quel. Vérifier qu'il tourne bien sur `/news` **et** sur `/item`, et l'ajouter s'il manque sur l'une des deux.

- [ ] **Step 7: Lancer la suite de rendu**

Run: `./test/rendu.sh`
Expected: PASS — 0 échec. Le compte total d'assertions aura changé ; noter le nouveau chiffre pour la documentation de la tâche 9.

- [ ] **Step 8: Commit**

```bash
git add test/rendu.sh
git commit -m "rendu : la geometrie de la coquille remplace celle de la liste dense

Carte a 100px +/- 6, 7 cartes entieres dans 900px, sidebar a 220px, un
seul onglet actif. Plus l'assertion qui protege /login — la sidebar est
le premier noeud insere hors de #hnmain, cette garantie n'est plus
structurelle."
```

---

## Task 9: La documentation

`DESIGN.md` est réécrit. `CLAUDE.md` gagne le piège que ce chantier introduit. `ROADMAP.md` gagne la phase 6.

**Files:**
- Rewrite: `DESIGN.md`
- Modify: `CLAUDE.md`, `ROADMAP.md`, `README.md`

**Interfaces:**
- Consomme : les valeurs mesurées des tâches 1 à 8 — palette, contrastes, hauteur de carte, densité, compte d'assertions.
- Produit : rien de code.

- [ ] **Step 1: Réécrire `DESIGN.md`**

Sections à réécrire intégralement :

- **Aesthetic Direction.** L'ancienne liste d'interdits est fausse sur quatre points. La remplacer par : *« Cartes, arrondis, une ombre, sept icônes. Interdits qui tiennent : aucun dégradé, aucune animation, aucun bouton là où HN met un lien, aucune donnée fabriquée. »*
- **Typography.** Titre de carte 17/24 poids 600, domaine 14/20, métadonnée 13/18, titre de page 30/34 poids 700. Les deux paliers de tracking sont conservés. Les deux pièges `-apple-system` sont conservés **mot pour mot** — ils sont mesurés et toujours vrais.
- **Color.** La table de la section **Global Constraints** de ce plan, avec les contrastes mesurés. Les sections « la règle de l'orange », « la rampe de downvote » et « `a:visited` » sont conservées en substance avec les nouveaux chiffres.
- **La liste.** Remplacer « ligne fusionnée 32 px, 30 posts » par « carte 100 px, 7 posts ». **Documenter la perte de la pondération par score** et pourquoi.
- **La coquille.** Section neuve : sidebar 220 px, en-tête 92 px, onglets 52 px.

Conserver sans y toucher : le principe directeur, Product Context, et la section sur le serif rejeté (c'est de l'histoire mesurée).

- [ ] **Step 2: Ajouter le piège n°11 à `CLAUDE.md`**

Ajouter à la liste des choses qui cassent le projet :

```markdown
11. **La sidebar est le premier noeud insere hors de `#hnmain`.** Jusqu'a la coquille app, la protection de `/login`, `/submit` et `/reply` etait **structurelle** : tout le CSS vivait sous `#hnmain`, absent de ces trois pages, et le JS ne posait la classe racine que si `#hnmain` existait. `sidebar()` insere dans `body`. Cette garantie n'est donc plus gratuite : elle repose sur le garde-fou `if (!document.querySelector('#hnmain')) return;` en tete de `sidebar()`. Le retirer poserait une barre de navigation sur le formulaire de connexion. Deux tests le gardent — un dans `test/coquille.test.js`, un dans `test/rendu.sh` sur la vraie fixture `/login`.
```

Actualiser aussi les pièges 1, 5 et 6 : ils nomment `.athing.submission`, `.subline` et la rampe, tous toujours vrais, mais la fonction s'appelle désormais `cartes()` et la classe `__card`.

- [ ] **Step 3: Ajouter la phase 6 à `ROADMAP.md`**

Une section « Phase 6 — la coquille app », avec les huit tâches, ce qui a été mesuré, et **ce qui a été perdu** (la pondération par score). Actualiser l'en-tête : « les phases 1 à 5 sont livrées » devient « les phases 1 à 6 ». Actualiser les compteurs d'assertions avec les vrais chiffres de la tâche 8.

- [ ] **Step 4: Actualiser `README.md`**

Les raccourcis clavier ne changent pas. Ce qui change : la description de ce que le script fait sur `/news`, et la mention de la sidebar.

- [ ] **Step 5: Vérifier que la documentation ne ment pas**

```bash
grep -rn "32 px\|32px\|30 posts\|filet orange\|--col\b\|--radius\b\|fusionner\|__row" DESIGN.md CLAUDE.md ROADMAP.md README.md
```
Expected: aucune occurrence qui décrive le comportement **actuel**. Les mentions historiques, dans un paragraphe explicitement au passé, sont légitimes et doivent être laissées.

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md CLAUDE.md ROADMAP.md README.md
git commit -m "docs : DESIGN.md reecrit pour la coquille app

Les interdits absolus etaient faux sur quatre points, ils sont refaits.
Piege 11 ajoute a CLAUDE.md : la sidebar est le premier noeud hors de
#hnmain, donc la protection des formulaires n'est plus structurelle."
```

---

## Task 10: Livraison

Bump de version, régénération de l'extension Chrome, dépôt dans le bac à sable de Userscripts, vérification finale.

**Files:**
- Modify: `hn-redesign.user.js` (en-tête `@version`), `package.json`
- Regenerate: `chrome/`

- [ ] **Step 1: Monter la version**

Dans l'en-tête du userscript, passer `@version` à `2.0.0` — c'est un remplacement de design, pas un correctif. Passer `"version": "2.0.0"` dans `package.json`.

- [ ] **Step 2: Régénérer l'extension et vérifier la synchronisation**

```bash
./bin/build-chrome.sh
node test/lint.mjs
```
Expected: `chrome/hn-redesign.js identique au userscript` et `manifeste et userscript a la meme version — 2.0.0 / 2.0.0`.

- [ ] **Step 3: Lancer tout**

```bash
node --check hn-redesign.user.js && npm test && ./test/rendu.sh
```
Expected: PASS partout, 0 échec.

- [ ] **Step 4: Déposer dans le bac à sable de Safari**

```bash
./bin/sync-safari.sh
```

Le dossier est sous sandbox et ne se choisit pas depuis le popup — le bouton dossier le **révèle**. Userscripts voit une copie déposée depuis l'extérieur sans intervention : c'est la réponse forte à Q2 du spike T1, et c'est ce qui rend ce script suffisant.

- [ ] **Step 5: Vérification humaine sur la vraie page**

Demander à Omar de recharger `news.ycombinator.com` dans Safari et de confirmer, **sur pièce** :

1. La sidebar est là, et Bookmarks / Profile mènent à ses vraies pages.
2. La recherche fonctionne et arrive sur Algolia.
3. `/login` est intacte — aucune sidebar, aucun style.
4. Le fil de commentaires marche encore : `j` / `k`, le Thread Spine, la barre de position.
5. Le thème sombre est correct dans les trois états de l'interrupteur.

> Ce qu'aucun test de ce dépôt ne couvre : le focus, `scrollIntoView`, la navigation `j`/`k` réelle, les handlers inline de HN, et **le comportement de Safari** — toutes les captures viennent de Chromium headless. Une suite verte ne prouve pas que la navigation marche.

- [ ] **Step 6: Commit**

```bash
git add hn-redesign.user.js package.json chrome/
git commit -m "v2.0.0 — la coquille app

Remplacement de design, pas correctif : la liste dense de la phase 3
laisse la place a la sidebar, l'en-tete, les onglets et les cartes."
```

---

## Notes pour l'exécutant

**Les cinq choses qui cassent ce projet, et qui restent vraies :**

1. **Une règle de couleur trop large détruit deux signaux de HN** — la rampe de downvote (`.commtext.c00` → `.cDD`) et `a:visited` sur les titres. Ne jamais écrire `.commtext { color: X }` ni `#hnmain a { color: X }` sans vérifier ce qui les bat.
2. **Une déclaration directe bat toujours une valeur héritée.** `news.css` déclare `font-family` sur neuf sélecteurs dans `#hnmain`. Styler le conteneur ne suffit pas — d'où le sélecteur universel `#hnmain *:not(input):not(textarea):not(select)`.
3. **Un `/*` non fermé dans le CSS avale les règles suivantes, en silence.** `node --check` ne le voit pas. `test/regles.mjs` compte les délimiteurs.
4. **Le fichier est évalué dans la portée globale de la PAGE.** L'IIFE et `if (window.hnRedesign) return;` ne sont pas décoratifs — sans eux, une double injection jette `Identifier has already been declared` et tout s'arrête.
5. **La vraie page a une CSP ; les fixtures non.** HN sert `img-src 'self'`. Ce qui dépend d'un en-tête de réponse **ne se teste pas sur une fixture locale**. Le projet est à zéro requête réseau, ce qui est le plus simple moyen de ne plus jamais rencontrer le problème.

**Si un test échoue de façon inattendue :** ne pas modifier les valeurs de la palette. Elles ont été calculées et vérifiées avant l'écriture de ce plan. Chercher la cause dans le code, pas dans le critère.
