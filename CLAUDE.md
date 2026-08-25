# hn-redesign

Un userscript qui redessine Hacker News dans Safari sur macOS. Exécuté par [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT). Un seul utilisateur.

**La roadmap fait autorite : [`ROADMAP.md`](ROADMAP.md).** 25 taches en 6 phases, revues eng et design passees, verdict CLEARED. En cas de contradiction avec un autre document, ROADMAP.md gagne.

**T1 est une porte.** Tout le plan suppose que le runtime Userscripts charge un fichier local, le recharge apres modification, et survit a un redemarrage de Safari. Personne ne l'a execute. Rien ne commence avant.

## Design System

Toujours lire `DESIGN.md` avant toute décision visuelle ou d'interface.
Les polices, couleurs, espacements et la direction esthétique y sont définis, chiffrés et vérifiés.
Ne pas en dévier sans accord explicite d'Omar.
En QA, signaler tout code qui ne correspond pas à `DESIGN.md`.

## Les cinq choses qui cassent ce projet si on les oublie

1. **Les deux signaux de couleur de HN.** (a) La rampe de downvote sur les commentaires : `.commtext.c00` → `.cDD`. Une règle unique `.commtext { color: X }` la détruit et remonte visuellement les pires commentaires du fil. (b) `a:visited { color:#828282 }` sur la liste : HN grise les titres déjà lus, et `#hnmain a { color: ... }` l'écrase. Les deux se cassent de la même façon — une règle de couleur trop large. Voir `DESIGN.md` § Color.

2. **`a.togg` est une bascule, pas un setter.** HN livre un lien de repli natif sur chaque commentaire, avec `n="<nombre de descendants>"`. Tout repli programmatique doit lire `tr.classList` avant de cliquer, sinon il **dé**-replie les commentaires que HN avait repliés (`noshow`, `coll`). Et ne replier que la **frontière** — les frères des nœuds gardés — jamais tous les non-gardés : replier un parent cache déjà sa descendance, et cliquer les descendants corrompt leur état sans rien changer à l'écran.

3. **Le CSS doit être scopé sous `#hnmain`.** Ce conteneur existe sur `/news` et `/item`, et est **absent** de `/login`, `/submit` et `/reply`, qui sont des `<table border="0">` nus. Scoper sous `#hnmain` protège les formulaires par construction, sans maintenir une liste de routes dans `@match`. Vérifié le 2026-08-25 sur la vraie page `/login` : aucune classe posée, aucune feuille injectée, 7 `input` intacts.

4. **Styler le conteneur ne suffit pas — `news.css` déclare `font-family` sur neuf sélecteurs à l'intérieur de `#hnmain`** : `body`, `td`, `.default`, `.admin`, `.title`, `.subtext td`, `.comhead`, `.comment`, `input`. Une **déclaration directe bat toujours une valeur héritée**, quelle que soit la spécificité. Symptôme observé : le `td` était bien en SF et `.commtext` restait en Verdana, parce que `.comment` (news.css:21) le déclarait au-dessus. D'où le sélecteur universel `#hnmain *:not(input):not(textarea):not(select)` — les contrôles de formulaire sont exclus, HN met la zone de réponse en monospace délibérément.

5. **`.athing.submission` existe sur les deux pages ; `.fatitem` n'existe que sur `/item`.** Sur `/news`, les 30 lignes sont des `tr.athing.submission`. Un sélecteur de titre de post qui passe par `.athing.submission` frappe donc les 30 titres de la liste — vérifié : ils passaient tous à 21 px. Le discriminant est `table.fatitem` (1 sur `/item`, 0 sur `/news`).

## Contraintes de la machine

- **Pas de Xcode** et ~19 Go libres. Xcode en demande ~40. Aucun plan impliquant un projet Xcode, `safari-web-extension-converter`, ou une extension Safari native n'est réalisable. Userscripts contourne tout ça.
- **Aucune webfont.** La police est San Francisco via `-apple-system`. Zéro requête réseau. Attention : nommer `"SF Pro Text"` ne résout pas, et `system-ui` n'est pas `-apple-system`.

## Structure

```
ROADMAP.md             les 25 taches, en 6 phases — source de verite du reste a faire
DESIGN.md              le systeme de design — source de verite visuelle
CLAUDE.md              ce fichier
hn-redesign.user.js    le script — phase 2 faite : tokens, rampe, typographie, echec ferme
t1-spike.user.js       jetable, a supprimer une fois T1 repondu
test/contraste.mjs     verifie les 9 couleurs, la regularite L* et la bascule de teinte
design-refs/           captures de reference + capture.sh
test/                  node --test + linkedom (a creer, T10)
```

**Le CSS vit dans le `.user.js`, en template literal.** Un seul fichier, `@grant none`, aucun format non verifie : Userscripts supporte peut-etre les `.user.css`, mais tant que T1 n'a pas tourne, on ne parie pas dessus.

**`hn-redesign` sur `<html>` est le seul interrupteur.** Le JS ne la pose que si `#hnmain` existe, et toutes les regles en dependent. La retirer rend HN intact meme si la feuille reste dans le document — c'est ce qui fait tenir l'echec ferme (T3) en trois lignes. `window.hnRedesign.revert()` / `.apply()` dans la console pour comparer.

## Tests

`node --test`. Couvre le calcul pur : construction du modèle d'arbre, descente du Thread Spine, idempotence du repli, calcul de la frontière.

**Ne couvre pas, et ne couvrira jamais :** focus, `scrollIntoView`, navigation `J`/`K`, rendu, handlers inline de HN, comportement Safari. Environ 8 chemins sur 24. **Une suite verte ne prouve pas que la navigation marche.**
