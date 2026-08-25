# hn-redesign

Un userscript qui redessine Hacker News dans Safari sur macOS. Exécuté par [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT). Un seul utilisateur.

**Le plan complet vit dans** `~/.gstack/projects/2ndbrain/omarbenjelloun-main-design-20260824-hn-safari-redesign.md` — 22 tâches, revues eng et design passées, verdict CLEARED.

## Design System

Toujours lire `DESIGN.md` avant toute décision visuelle ou d'interface.
Les polices, couleurs, espacements et la direction esthétique y sont définis, chiffrés et vérifiés.
Ne pas en dévier sans accord explicite d'Omar.
En QA, signaler tout code qui ne correspond pas à `DESIGN.md`.

## Les trois choses qui cassent ce projet si on les oublie

1. **La rampe de downvote.** HN encode le jugement de la communauté dans la pâleur du texte (`.commtext.c00` → `.cDD`). Une règle unique `.commtext { color: X }` la détruit et remonte visuellement les pires commentaires du fil. Cinq règles, une par classe, dans chaque thème. Voir `DESIGN.md` § Color.

2. **`a.togg` est une bascule, pas un setter.** HN livre un lien de repli natif sur chaque commentaire, avec `n="<nombre de descendants>"`. Tout repli programmatique doit lire `tr.classList` avant de cliquer, sinon il **dé**-replie les commentaires que HN avait repliés (`noshow`, `coll`). Et ne replier que la **frontière** — les frères des nœuds gardés — jamais tous les non-gardés : replier un parent cache déjà sa descendance, et cliquer les descendants corrompt leur état sans rien changer à l'écran.

3. **Le CSS doit être scopé sous `#hnmain`.** Ce conteneur existe sur `/news` et `/item`, et est **absent** de `/login`, `/submit` et `/reply`, qui sont des `<table border="0">` nus. Scoper sous `#hnmain` protège les formulaires par construction, sans maintenir une liste de routes dans `@match`.

## Contraintes de la machine

- **Pas de Xcode** et ~19 Go libres. Xcode en demande ~40. Aucun plan impliquant un projet Xcode, `safari-web-extension-converter`, ou une extension Safari native n'est réalisable. Userscripts contourne tout ça.
- **Aucune webfont.** Charter est installée localement (`Charter.ttc`). Zéro requête réseau au chargement d'une page HN.

## Structure

```
hn-redesign.user.js    le script — modèle de commentaires, repli, Thread Spine, clavier
hn-redesign.css        la feuille — tokens, typographie, rampe, rails
DESIGN.md              le système de design (source de vérité visuelle)
design-refs/           captures de référence, rendues sur le vrai fil de 206 commentaires
test/                  node --test + linkedom + fixtures HTML
```

## Tests

`node --test`. Couvre le calcul pur : construction du modèle d'arbre, descente du Thread Spine, idempotence du repli, calcul de la frontière.

**Ne couvre pas, et ne couvrira jamais :** focus, `scrollIntoView`, navigation `J`/`K`, rendu, handlers inline de HN, comportement Safari. Environ 8 chemins sur 24. **Une suite verte ne prouve pas que la navigation marche.**
