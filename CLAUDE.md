# hn-redesign

Un userscript qui redessine Hacker News dans Safari sur macOS. Exécuté par [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT). Un seul utilisateur.

**La roadmap fait autorite : [`ROADMAP.md`](ROADMAP.md).** 25 taches en 6 phases, revues eng et design passees, verdict CLEARED. En cas de contradiction avec un autre document, ROADMAP.md gagne.

**T1 est une porte.** Tout le plan suppose que le runtime Userscripts charge un fichier local, le recharge apres modification, et survit a un redemarrage de Safari. Personne ne l'a execute. Rien ne commence avant.

## Design System

Toujours lire `DESIGN.md` avant toute décision visuelle ou d'interface.
Les polices, couleurs, espacements et la direction esthétique y sont définis, chiffrés et vérifiés.
Ne pas en dévier sans accord explicite d'Omar.
En QA, signaler tout code qui ne correspond pas à `DESIGN.md`.

## Les trois choses qui cassent ce projet si on les oublie

1. **Les deux signaux de couleur de HN.** (a) La rampe de downvote sur les commentaires : `.commtext.c00` → `.cDD`. Une règle unique `.commtext { color: X }` la détruit et remonte visuellement les pires commentaires du fil. (b) `a:visited { color:#828282 }` sur la liste : HN grise les titres déjà lus, et `#hnmain a { color: ... }` l'écrase. Les deux se cassent de la même façon — une règle de couleur trop large. Voir `DESIGN.md` § Color.

2. **`a.togg` est une bascule, pas un setter.** HN livre un lien de repli natif sur chaque commentaire, avec `n="<nombre de descendants>"`. Tout repli programmatique doit lire `tr.classList` avant de cliquer, sinon il **dé**-replie les commentaires que HN avait repliés (`noshow`, `coll`). Et ne replier que la **frontière** — les frères des nœuds gardés — jamais tous les non-gardés : replier un parent cache déjà sa descendance, et cliquer les descendants corrompt leur état sans rien changer à l'écran.

3. **Le CSS doit être scopé sous `#hnmain`.** Ce conteneur existe sur `/news` et `/item`, et est **absent** de `/login`, `/submit` et `/reply`, qui sont des `<table border="0">` nus. Scoper sous `#hnmain` protège les formulaires par construction, sans maintenir une liste de routes dans `@match`.

## Contraintes de la machine

- **Pas de Xcode** et ~19 Go libres. Xcode en demande ~40. Aucun plan impliquant un projet Xcode, `safari-web-extension-converter`, ou une extension Safari native n'est réalisable. Userscripts contourne tout ça.
- **Aucune webfont.** La police est San Francisco via `-apple-system`. Zéro requête réseau. Attention : nommer `"SF Pro Text"` ne résout pas, et `system-ui` n'est pas `-apple-system`.

## Structure

```
ROADMAP.md             les 25 taches, en 6 phases — source de verite du reste a faire
DESIGN.md              le systeme de design — source de verite visuelle
CLAUDE.md              ce fichier
hn-redesign.user.js    le script (a creer) — modele, repli, Thread Spine, clavier, navbar
hn-redesign.css        la feuille (a creer) — tokens, typographie, rampe, rails
design-refs/           captures de reference + capture.sh
test/                  node --test + linkedom + fixtures (a creer)
```

## Tests

`node --test`. Couvre le calcul pur : construction du modèle d'arbre, descente du Thread Spine, idempotence du repli, calcul de la frontière.

**Ne couvre pas, et ne couvrira jamais :** focus, `scrollIntoView`, navigation `J`/`K`, rendu, handlers inline de HN, comportement Safari. Environ 8 chemins sur 24. **Une suite verte ne prouve pas que la navigation marche.**
