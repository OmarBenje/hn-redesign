# hn-redesign

Un userscript qui redessine Hacker News dans Safari sur macOS. Un seul utilisateur, aucune ambition de distribution.

Le principe directeur est **« enfin je peux lire HN »** : typographie et contraste d'abord, densité conservée, aucune décoration. Le Thread Spine — replier un fil de 91 commentaires sur sa branche dominante — est une fonctionnalité du produit, pas la thèse du design.

## Installation

### Chrome — marche aujourd'hui

1. `chrome://extensions`, activer **Mode développeur**.
2. **Charger l'extension non empaquetée** → choisir le dossier [`chrome/`](chrome/).
3. Ouvrir `news.ycombinator.com`.

`chrome/hn-redesign.js` est une **copie** de `hn-redesign.user.js`, régénérée par [`bin/build-chrome.sh`](bin/build-chrome.sh). Un seul fichier fait foi ; `node test/lint.mjs` échoue si la copie a dérivé.

Le content script tourne en `world: "MAIN"`, c'est-à-dire dans le contexte de la page, exactement comme un userscript en `@grant none`. Ce qui est vérifié dans Chrome est donc ce qui tournera dans Safari. C'est aussi pour ça que tout le fichier vit dans une IIFE : sans elle, une trentaine d'identifiants atterrissent sur le global de HN.

**Vérifié sur la vraie page**, pas seulement sur des fixtures : 30 posts à 32 px, navbar à 50 px, 108 commentaires modélisés jusqu'à la profondeur 8, Thread Spine 108 → 33 lignes.

### Safari — quand tu es devant ton Mac

Le runtime est [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT), depuis l'App Store. Il lit **un seul dossier, sans récursion** : pointer son dossier de travail sur la racine de ce dépôt.

> **T1 n'a pas encore été exécuté.** Personne n'a vérifié que Userscripts charge ce fichier, le recharge après modification et survit à un redémarrage de Safari. Le mode d'emploi du test est dans [`ROADMAP.md`](ROADMAP.md), phase 0.

## Raccourcis

| Touche | Effet |
|---|---|
| `j` / `k` | commentaire suivant / précédent, en sautant ce qui est replié |
| `c` | replier ou déplier le commentaire actif |
| `s` | Thread Spine — replier tout sauf la branche dominante, et revenir |
| `Échap` | quitter la navigation |
| `Cmd`+`Entrée` | envoyer la réponse depuis la zone de texte |
| `Cmd`+`I` | mettre la sélection en italique |

Le thème se change par un lien dans la navbar, à côté de `login` : **auto → clair → sombre**. `auto` suit les réglages du système. Le choix est retenu d'une visite à l'autre.

Aucune touche n'est interceptée tant qu'un `input`, un `textarea` ou un élément `contenteditable` a le focus.

## Tests

```bash
npm install                                       # linkedom, seule dependance
./design-refs/capture.sh ./design-refs/fixtures   # recapture les pages HN
npm test                                          # unitaires + feuille + contraste + lint
./test/rendu.sh                                   # 72 assertions au rendu, 5 pages
```

| Suite | Ce qu'elle couvre |
|---|---|
| `node --test test/*.test.js` | 12 tests de calcul pur — modèle d'arbre, Thread Spine, idempotence du repli, frontière, les trois états. Exécute le **vrai** userscript sous linkedom, pas une copie. |
| `node test/regles.mjs` | 29 invariants de la feuille que le rendu ne peut pas voir — dont `a:visited`, qu'aucun navigateur ne dit honnêtement à `getComputedStyle`. |
| `node test/contraste.mjs` | les 9 couleurs contre leur fond, la régularité de la rampe en **L\*** et la bascule de teinte. |
| `node test/lint.mjs` | 9 budgets de cohérence. Vérifié par mutation : six violations injectées, six attrapées. |
| `./test/rendu.sh` | 72 assertions dans Chromium sur 5 pages, dont la réversibilité du DOM **à l'octet**. |

**Ce qui n'est pas couvert, et ne le sera pas :** le rendu réel dans Safari. Tout ce dépôt est mesuré dans Chromium headless, où `-apple-system` résout vers une police distincte. Une suite verte ne prouve pas que Safari rend à l'identique.

## Attribution

Cinq modules sont portés de **[refined-hacker-news](https://github.com/plibither8/refined-hacker-news)** — Mihir Chaturvedi, licence MIT, copyright 2019-2021. Ils ont été réécrits pour lire le modèle d'arbre commun (`buildModel()`) au lieu de refaire chacun leur propre parcours du DOM : c'est la duplication de `img.width / 40` entre `collapse-root-comment.js` et `comments-ui-tweaks.js` qui a motivé ce modèle.

| Module d'origine | Ce qu'il devient ici |
|---|---|
| `click-comment-indent-to-toggle` | cliquer la gouttière replie — passe par `collapse()`, donc idempotent, ce que l'original n'était pas |
| `collapse-root-comment` | lien `[racine]`, à partir de la profondeur 2 seulement |
| `backticks-to-monospace` | les backticks deviennent du `<code>`, réversible |
| `highlight-unread-comment` | marque `nouveau` sur ce qui est arrivé depuis la dernière visite ; `localStorage` au lieu de `browser.storage.local`, absent en `@grant none` |
| `key-bindings-on-input-fields` | `Cmd`+`Entrée` et `Cmd`+`I` dans la zone de réponse |

Le texte de la licence MIT de refined-hacker-news s'applique à ces portions.

## Où vit quoi

| Fichier | Rôle |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | les 25 tâches, en 6 phases. **Fait autorité** en cas de contradiction. |
| [`DESIGN.md`](DESIGN.md) | le système de design. Chaque valeur mesurée, chaque contraste calculé. |
| [`CLAUDE.md`](CLAUDE.md) | les sept choses qui cassent ce projet si on les oublie. |
| `hn-redesign.user.js` | le script. Le CSS y vit en template literal. |
| `chrome/` | l'extension MV3. **Générée** — ne jamais l'éditer à la main. |
| `bin/build-chrome.sh` | régénère `chrome/` depuis le userscript et synchronise la version. |
| `design-refs/` | captures de référence et `capture.sh`. Les fixtures ne sont pas versionnées : ce sont les écrits d'autres personnes. |

## Le favicon de domaine ne marche pas sur la vraie page

Hacker News sert `Content-Security-Policy: img-src 'self' https://account.ycombinator.com`. Les 30 requêtes vers `google.com/s2/favicons` sont donc **bloquées par le navigateur**, dans Chrome comme dans Safari — ce n'est pas un bug de l'extension, et aucune fixture locale ne pouvait le montrer, puisqu'un fichier `file://` ne porte pas d'en-tête.

Le repli est en place : chaque image qui échoue passe en `visibility:hidden`, et **quand elles échouent toutes**, la gouttière de 22 px est repliée plutôt que de réserver de la place pour du vide. Mesuré sur la vraie page : les 30 lignes tiennent toujours exactement 32 px.

Pour les récupérer il faudrait relâcher la CSP de HN via `declarativeNetRequest`. C'est une décision de sécurité, pas une décision de design : non prise.
