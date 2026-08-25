# hn-redesign

Un userscript qui redessine Hacker News dans Safari sur macOS. Exécuté par [Userscripts](https://github.com/quoid/userscripts) (quoid, MIT). Un seul utilisateur.

**La roadmap fait autorite : [`ROADMAP.md`](ROADMAP.md).** 25 taches en 6 phases, revues eng et design passees, verdict CLEARED. En cas de contradiction avec un autre document, ROADMAP.md gagne.

**T1 est une porte, et elle bloque moins qu'il n'y parait.** Le plan suppose que Userscripts charge un fichier local, le recharge apres modification, et survit a un redemarrage de Safari. **Personne ne l'a execute.** Mais T1 tranche le *runtime*, pas les artefacts : le CSS et le JS s'ecrivent et se verifient dans Chromium headless contre les fixtures. **T1 garde l'iteration dans Safari, pas l'ecriture.** Si Userscripts echoue, on perd le mode de distribution, pas le code.

## Design System

Toujours lire `DESIGN.md` avant toute décision visuelle ou d'interface.
Les polices, couleurs, espacements et la direction esthétique y sont définis, chiffrés et vérifiés.
Ne pas en dévier sans accord explicite d'Omar.
En QA, signaler tout code qui ne correspond pas à `DESIGN.md`.

## Les huit choses qui cassent ce projet si on les oublie

1. **Les deux signaux de couleur de HN.** (a) La rampe de downvote sur les commentaires : `.commtext.c00` → `.cDD`. Une règle unique `.commtext { color: X }` la détruit et remonte visuellement les pires commentaires du fil. (b) `a:visited { color:#828282 }` sur la liste : HN grise les titres déjà lus, et `#hnmain a { color: ... }` l'écrase. Les deux se cassent de la même façon — une règle de couleur trop large. Voir `DESIGN.md` § Color.

2. **`a.togg` est une bascule, pas un setter.** HN livre un lien de repli natif sur chaque commentaire, avec `n="<nombre de descendants>"`. Tout repli programmatique doit lire `tr.classList` avant de cliquer, sinon il **dé**-replie les commentaires que HN avait repliés (`noshow`, `coll`). Et ne replier que la **frontière** — les frères des nœuds gardés — jamais tous les non-gardés : replier un parent cache déjà sa descendance, et cliquer les descendants corrompt leur état sans rien changer à l'écran.

3. **Le CSS doit être scopé sous `#hnmain`.** Ce conteneur existe sur `/news` et `/item`, et est **absent** de `/login`, `/submit` et `/reply`, qui sont des `<table border="0">` nus. Scoper sous `#hnmain` protège les formulaires par construction, sans maintenir une liste de routes dans `@match`. Vérifié le 2026-08-25 sur la vraie page `/login` : aucune classe posée, aucune feuille injectée, 7 `input` intacts.

4. **Styler le conteneur ne suffit pas — `news.css` déclare `font-family` sur neuf sélecteurs à l'intérieur de `#hnmain`** : `body`, `td`, `.default`, `.admin`, `.title`, `.subtext td`, `.comhead`, `.comment`, `input`. Une **déclaration directe bat toujours une valeur héritée**, quelle que soit la spécificité. Symptôme observé : le `td` était bien en SF et `.commtext` restait en Verdana, parce que `.comment` (news.css:21) le déclarait au-dessus. D'où le sélecteur universel `#hnmain *:not(input):not(textarea):not(select)` — les contrôles de formulaire sont exclus, HN met la zone de réponse en monospace délibérément.

5. **`.athing.submission` existe sur les deux pages ; `.fatitem` n'existe que sur `/item`.** Sur `/news`, les 30 lignes sont des `tr.athing.submission`. Un sélecteur de titre de post qui passe par `.athing.submission` frappe donc les 30 titres de la liste — vérifié : ils passaient tous à 21 px. Le discriminant est `table.fatitem` (1 sur `/item`, 0 sur `/news`).

6. **Les posts d'emploi n'ont pas de `span.subline`.** Leur `td.subtext` porte l'âge et `hide` en enfants directs. Tout code qui lit `.subline` doit se replier sur `td.subtext`, sinon un post sur trente reste non traité — visible immédiatement : il garde sa hauteur native et sa ligne de métadonnée. Corollaire : sur ces posts, le seul `a[href^="item?id="]` est celui de **l'âge**, pas un lien de commentaires. Le prendre pour tel affiche l'âge deux fois.

7. **Toute mutation du DOM doit s'enregistrer dans la pile d'annulation.** Depuis la phase 3, le script insère des nœuds, pose des classes, écrit des `style` inline et retire des nœuds texte. Retirer la classe racine n'annule rien de tout ça. Passer par `addClass` / `setStyle` / `insere` / `detache` n'est pas une commodité : c'est ce qui fait tenir l'échec fermé. Et `setStyle` sauvegarde l'**attribut `style` brut**, pas la propriété — le CSSOM re-sérialise, et la comparaison de réversibilité échoue sur des espaces.

8. **Un `/*` non ferme dans le CSS avale les regles suivantes, en silence.** Le CSS vit dans un template literal : `node --check` ne le lit pas, la feuille se charge sans erreur, et douze regles d'indentation ont disparu sans que rien ne le signale — l'ecran montrait 40px la ou la feuille disait 22. `node test/regles.mjs` compte desormais les delimiteurs. C'est le meme piege que le backtick du point precedent, en pire : le backtick casse le fichier tout de suite, le commentaire non ferme ne casse rien.

## Contraintes de la machine

- **Pas de Xcode** et ~19 Go libres. Xcode en demande ~40. Aucun plan impliquant un projet Xcode, `safari-web-extension-converter`, ou une extension Safari native n'est réalisable. Userscripts contourne tout ça.
- **Aucune webfont.** La police est San Francisco via `-apple-system`. Zéro requête réseau. Attention : nommer `"SF Pro Text"` ne résout pas, et `system-ui` n'est pas `-apple-system`.

## Structure

```
ROADMAP.md             les 25 taches, en 6 phases — source de verite du reste a faire
DESIGN.md              le systeme de design — source de verite visuelle
CLAUDE.md              ce fichier
hn-redesign.user.js    le script — phases 2, 3 et 4 : tokens, rampe, typo, ligne fusionnee,
                       navbar, modele d'arbre, Thread Spine, clavier, barre de position
README.md              installation, raccourcis, attribution MIT de refined-hacker-news
t1-spike.user.js       jetable, a supprimer une fois T1 repondu
test/contraste.mjs     verifie les 9 couleurs, la regularite L* et la bascule de teinte
test/regles.mjs        21 invariants de la feuille — specificite, rampe, tokens, budget T25
test/rendu.sh          72 assertions au rendu, dont la reversibilite du DOM a l'octet
test/harness.mjs       charge le vrai userscript sous linkedom, hors navigateur
test/modele.test.js    12 tests de calcul pur — modele, spine, repli, frontiere
test/lint.mjs          budget de coherence T25, verifie par mutation
design-refs/           captures de reference + capture.sh
test/                  node --test + linkedom (a creer, T10)
```

**Le CSS vit dans le `.user.js`, en template literal.** Un seul fichier, `@grant none`, aucun format non verifie : Userscripts supporte peut-etre les `.user.css`, mais tant que T1 n'a pas tourne, on ne parie pas dessus.

**`hn-redesign` sur `<html>` est le seul interrupteur.** Le JS ne la pose que si `#hnmain` existe, et toutes les regles en dependent. La retirer rend HN intact meme si la feuille reste dans le document — c'est ce qui fait tenir l'echec ferme (T3) en trois lignes. `window.hnRedesign.revert()` / `.apply()` dans la console pour comparer.

## Tests

`node test/contraste.mjs` — les 9 couleurs contre leur fond dans les deux themes, la regularite de la rampe en **L\*** (pas en ratio de contraste : le ratio n'est pas perceptuel et sa decroissance vers le bas de la rampe fait croire a une irregularite qui n'existe pas), et la bascule de teinte du dernier cran.

`./test/rendu.sh` — ce que node ne peut **pas** voir : hauteurs mesurees au `getBoundingClientRect`, densite, couleurs calculees, rails de profondeur, clavier, et la **reversibilite octet par octet** de `#hnmain` entre `apply()` et `revert()`. 5 pages, 72 assertions.

> Attention en ecrivant une assertion : **`getComputedStyle` rend une vue VIVANTE.** Lire une propriete apres avoir change l'etat rend l'etat d'apres, pas celui de la mesure. Figer en chaines tout de suite. Un marqueur parfaitement fonctionnel s'est mesure a `auto x auto` pour cette raison. Prerequis : `./design-refs/capture.sh ./design-refs/fixtures`. Moteur : Chromium headless via `browse`. **Ce n'est pas Safari.**

`node test/regles.mjs` — les invariants que le rendu **ne peut pas** verifier. Le cas qui justifie ce fichier : `a:visited`. Aucun navigateur ne dit la verite sur une regle `:visited` via `getComputedStyle` — ils mentent tous, deliberement, contre le history sniffing. On ne peut donc pas tester au rendu que les titres deja lus restent gris ; on prouve que la regle existe et qu'elle **gagne en specificite**. Le fichier verifie aussi la parite des tokens entre les trois blocs de theme et le budget de coherence de T25.

> Attention en editant le CSS : il vit dans un template literal. **Un backtick dans un commentaire CSS casse le fichier.** `node --check hn-redesign.user.js` l'attrape immediatement.

## Tests unitaires

`node --test test/*.test.js`, ou `npm test` pour tout enchainer. 12 tests sur le calcul pur : modele d'arbre, descente du Thread Spine, idempotence du repli, calcul de la frontiere, les trois etats.

`test/harness.mjs` execute le **vrai** userscript sous linkedom — il le lit, l'appelle dans une fonction dont les parametres sont les globales du navigateur, et recupere `window.hnRedesign`. Aucune logique dupliquee. Il fournit un **simulateur de `a.togg`**, qui calcule son propre arbre depuis les attributs `indent` : un simulateur qui utiliserait `buildModel()` ne testerait plus rien. **Il reproduit HN, il ne le prouve pas** — la preuve est dans `test/rendu.sh`, avec le vrai `hn.js`.

`node test/lint.mjs` — le budget de coherence (T25). Neuf budgets, dont deux qui vont au-dela de la spec et attrapent la vraie derive : aucune couleur en dur hors des blocs de theme, et correspondance exacte entre tokens declares et `var()` utilises. **Verifie par mutation** : six violations injectees, six attrapees.

**Ne couvre pas, et ne couvrira jamais :** focus, `scrollIntoView`, navigation `J`/`K` reelle, rendu, handlers inline de HN, comportement Safari. **Une suite verte ne prouve pas que la navigation marche.**
