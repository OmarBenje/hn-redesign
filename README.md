# hn-redesign

Un userscript qui redessine Hacker News dans Safari sur macOS. Un seul utilisateur, aucune ambition de distribution.

Le principe directeur est **« enfin je peux lire HN »** : typographie et contraste d'abord, densité surveillée, décoration minimale. Sur `/news`, `/newest` et `/best`, le script ajoute une coquille d'application — une sidebar de navigation fixe à gauche, un en-tête avec le titre et la recherche native de HN relocalisée, une barre d'onglets Top/New/Best — et transforme chaque post en carte. `/item` n'a pas de sidebar : le fil de commentaires reste l'écran central du projet et ne cède pas 220 px de largeur. Le Thread Spine — replier un fil de 91 commentaires sur sa branche dominante — est une fonctionnalité du produit, pas la thèse du design.

## Installation

### Chrome — marche aujourd'hui

1. `chrome://extensions`, activer **Mode développeur**.
2. **Charger l'extension non empaquetée** → choisir le dossier [`chrome/`](chrome/).
3. Ouvrir `news.ycombinator.com`.

`chrome/hn-redesign.js` est une **copie** de `hn-redesign.user.js`, régénérée par [`bin/build-chrome.sh`](bin/build-chrome.sh). Un seul fichier fait foi ; `node test/lint.mjs` échoue si la copie a dérivé.

Le content script tourne en `world: "MAIN"`, c'est-à-dire dans le contexte de la page, exactement comme un userscript en `@grant none`. Ce qui est vérifié dans Chrome est donc ce qui tournera dans Safari. C'est aussi pour ça que tout le fichier vit dans une IIFE : sans elle, une trentaine d'identifiants atterrissent sur le global de HN.

**Vérifié sur la vraie page**, pas seulement sur des fixtures : sidebar à 220 px, en-tête à 92 px, cartes à 102 px de hauteur médiane, 108 commentaires modélisés jusqu'à la profondeur 8, Thread Spine 108 → 33 lignes.

### Safari — vérifié le 2026-08-25

Le runtime est [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT), depuis l'App Store. Puis Safari → Réglages → Extensions → cocher Userscripts, et **« Toujours autoriser sur ce site »** sur `news.ycombinator.com`.

**Le dossier de travail est sous sandbox et ne se choisit pas depuis le popup** — le bouton dossier le *révèle*, il n'ouvre pas de sélecteur. Un lien symbolique vers ce dépôt n'y marche pas non plus : il sort du bac à sable. On y dépose donc une copie :

```bash
./bin/sync-safari.sh
```

Userscripts **surveille ce dossier** : une copie déposée est prise en compte au rechargement de la page, sans passer par son éditeur intégré. C'est ce qui fait de ce script un vrai circuit de livraison.

Vérifié : chargement, rechargement après modification externe, et survie à un `Cmd+Q`.

## Raccourcis

| Touche | Effet |
|---|---|
| `j` / `k` | commentaire suivant / précédent, en sautant ce qui est replié |
| `c` | replier ou déplier le commentaire actif |
| `s` | Thread Spine — replier tout sauf la branche dominante, et revenir |
| `Échap` | quitter la navigation |
| `Cmd`+`Entrée` | envoyer la réponse depuis la zone de texte |
| `Cmd`+`I` | mettre la sélection en italique |

Le thème se change par un lien dans la sidebar (groupe secondaire) : **auto → clair → sombre**. `auto` suit les réglages du système. Le choix est retenu d'une visite à l'autre.

Aucune touche n'est interceptée tant qu'un `input`, un `textarea` ou un élément `contenteditable` a le focus.

## Tests

```bash
npm install                                       # linkedom, seule dependance
./design-refs/capture.sh ./design-refs/fixtures   # recapture les pages HN
npm test                                          # unitaires + feuille + contraste + lint
./test/rendu.sh                                   # 70 assertions au rendu, 5 pages
```

| Suite | Ce qu'elle couvre |
|---|---|
| `node --test test/*.test.js` | 45 tests de calcul pur — modèle d'arbre, Thread Spine, idempotence du repli, frontière, les trois états, garde-fous de la sidebar. Exécute le **vrai** userscript sous linkedom, pas une copie. |
| `node test/regles.mjs` | 31 invariants de la feuille que le rendu ne peut pas voir — dont `a:visited`, qu'aucun navigateur ne dit honnêtement à `getComputedStyle`. |
| `node test/contraste.mjs` | les couleurs contre leur fond, la régularité de la rampe en **L\*** et la bascule de teinte. |
| `node test/lint.mjs` | 9 budgets de cohérence. Vérifié par mutation : six violations injectées, six attrapées. |
| `./test/rendu.sh` | 70 assertions dans Chromium sur 5 pages, dont la réversibilité du DOM **à l'octet**. |

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
| [`ROADMAP.md`](ROADMAP.md) | les 25 tâches des phases 0 à 5, plus les 8 de la phase 6 (coquille app), en 6 phases. **Fait autorité** en cas de contradiction. |
| [`DESIGN.md`](DESIGN.md) | le système de design. Chaque valeur mesurée, chaque contraste calculé. |
| [`CLAUDE.md`](CLAUDE.md) | les onze choses qui cassent ce projet si on les oublie. |
| `hn-redesign.user.js` | le script. Le CSS y vit en template literal. |
| `chrome/` | l'extension MV3. **Générée** — ne jamais l'éditer à la main. |
| `bin/build-chrome.sh` | régénère `chrome/` depuis le userscript et synchronise la version. |
| `design-refs/` | captures de référence et `capture.sh`. Les fixtures ne sont pas versionnées : ce sont les écrits d'autres personnes. |

## Zéro requête réseau

La police est San Francisco via `-apple-system`, aucune webfont. Et il n'y a **pas de favicon de domaine** : le système en a porté un, tiré de `google.com/s2/favicons`, mais Hacker News sert `Content-Security-Policy: img-src 'self' https://account.ycombinator.com` et bloquait les 30 requêtes — dans Chrome comme dans Safari. Aucune fixture locale ne pouvait le montrer, puisqu'un fichier `file://` ne porte pas d'en-tête de réponse.

La fonctionnalité a été retirée plutôt que rafistolée : du code qui ne s'exécute jamais utilement en production est du code mort, même quand il dégrade proprement. Le domaine reste lisible en toutes lettres, là où HN le met déjà.

Mesuré sur `news.ycombinator.com` : **le script n'ajoute aucune requête réseau, et 0 message de console.** La page continue de charger ses propres assets — `news.css`, `hn.js`, `y18.svg` — mais plus rien ne part vers un tiers.
