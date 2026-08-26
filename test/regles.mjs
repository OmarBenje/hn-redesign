#!/usr/bin/env node
/* Verifie les invariants de la feuille que le RENDU ne peut pas verifier.
 *
 * Le cas qui justifie ce fichier : `a:visited`. Aucun navigateur ne dit la
 * verite sur une regle :visited via getComputedStyle — ils mentent tous,
 * deliberement, pour empecher le history sniffing. Un test de rendu sur la
 * preservation des liens visites est donc structurellement impossible.
 * Ce qu'on peut prouver, c'est que la regle existe et qu'elle GAGNE.
 *
 * Usage : node test/regles.mjs
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../hn-redesign.user.js', import.meta.url), 'utf8');
const m = src.match(/const CSS = `([\s\S]*?)`;/);
if (!m) { console.error('CSS introuvable dans le userscript'); process.exit(1); }
/* Les commentaires doivent partir AVANT le decoupage en regles : sans ca le
 * bloc de commentaire qui precede un selecteur en fait partie, et le calcul
 * de specificite compte les mots du commentaire. C'est ce qui a fait passer
 * le lien generique a 20631 au lieu de 10101 au premier jet de ce fichier. */
const css = m[1].replaceAll('${ROOT}', 'hn-redesign').replace(/\/\*[\s\S]*?\*\//g, '');

const echecs = [];
const ok = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'ECHEC'} ${msg}`); if (!cond) echecs.push(msg); };

/* specificite (id, classe, element) — suffisant pour ce fichier : pas de
 * :not() imbrique porteur, pas de style inline, pas de !important. */
const spec = sel => {
  const s = sel.replace(/:not\([^)]*\)/g, '').replace(/\*/g, '').trim();
  const id = (s.match(/#[\w-]+/g) || []).length;
  const cls = (s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g) || []).length;
  const el = (s.match(/(^|[\s>+~])[a-z][\w-]*/g) || []).length;
  return id * 10000 + cls * 100 + el;
};

const regles = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .map(r => ({ sel: r[1].trim(), body: r[2] }))
  .filter(r => !r.sel.startsWith('@'));

console.log('\ninvariants de la feuille\n');

/* 1. tout concurrent d'un lien de titre doit etre battu par UN :visited.
 *
 * L'ancienne version de ce test ne comparait que la premiere regle
 * :visited contre #hnmain a. Insuffisant : sur une carte, le vrai
 * concurrent est tr.__card .titleline > a a (1,3,2), qui bat le
 * :visited GENERIQUE a (1,3,1). Seule tr.__card .titleline > a:visited
 * a (1,4,2) sauve le signal — et rien ne le verifiait. Ce test compare
 * donc CHAQUE regle qui colore un lien de titre a TOUTE regle :visited
 * de lien de titre : il suffit qu'UNE la batte, mais il en faut une pour
 * chacune. */
const couleur = r => /\bcolor\s*:/.test(r.body);
const lienDeTitre = sel => /\.titleline > a$/.test(sel) || /#hnmain a$/.test(sel);
const concurrents = regles.filter(r => couleur(r) && !r.sel.includes(':visited')
  && r.sel.split(',').some(s => lienDeTitre(s.trim())));
const visites = regles.filter(r => couleur(r) && r.sel.includes(':visited')
  && r.sel.split(',').some(s => /\.titleline > a:visited$/.test(s.trim())));
ok(concurrents.length > 0, `au moins une regle colore un lien de titre (${concurrents.length})`);
ok(visites.length > 0, `au moins une regle :visited de lien de titre existe (${visites.length})`);
const specVisiteMax = visites.length ? Math.max(...visites.flatMap(r => r.sel.split(',').map(spec))) : -1;
for (const c of concurrents) {
  const sc = Math.max(...c.sel.split(',').map(spec));
  ok(sc < specVisiteMax,
    `"${c.sel}" (${sc}) est battue par le :visited le plus specifique (${specVisiteMax}) — sinon ce titre deja lu redevient noir`);
}

/* 2. la rampe a bien cinq crans distincts, jamais une regle unique */
const crans = ['c00', 'c5A', 'c73', 'c88', 'cDD'];
const trouves = crans.filter(c => new RegExp(`\\.commtext\\.${c}\\b`, 'i').test(css));
ok(trouves.length === 5, `la rampe a 5 regles distinctes (${trouves.join(' ')})`);
ok(!/\.commtext\s*\{[^}]*\bcolor\s*:/.test(css), 'aucune regle .commtext{color} globale qui ecraserait la rampe');

/* 3. parite des tokens entre les trois blocs de theme */
const bloc = re => { const b = css.match(re); return b ? [...b[1].matchAll(/(--[\w-]+)\s*:/g)].map(x => x[1]) : []; };
const clair = bloc(/\.hn-redesign \{([\s\S]*?)\}/);
const media = bloc(/@media \(prefers-color-scheme: dark\) \{\s*\.hn-redesign:not\(\.hn-light\) \{([\s\S]*?)\}/);
const forced = bloc(/\.hn-redesign\.hn-dark \{([\s\S]*?)\}/);
ok(clair.length === 22, `22 tokens en clair (trouve ${clair.length})`);
ok(media.length === forced.length && media.every((t, i) => t === forced[i]),
   `la media query et .hn-dark redefinissent exactement les memes ${media.length} tokens`);
const jamaisRedefinis = clair.filter(t => !media.includes(t));
ok(jamaisRedefinis.every(t => ['--ui', '--mono', '--radius-sm', '--radius-md', '--radius-full', '--accent'].includes(t)),
   `seuls les tokens sans variante de theme ne sont pas redefinis (${jamaisRedefinis.join(' ')})`);

/* 3 bis. le champ de recherche bat la regle generique de champ texte.
   Meme piege que a:visited, autre endroit : deux regles a specificite EGALE,
   celle qui vient plus bas gagne. La generique de T19 vit apres la notre dans
   la feuille, donc a egalite le champ de recherche portait sa bordure de 1px
   par-dessus la pilule. On prouve ici que le classement tient par SPECIFICITE
   et non par position, seule facon qu'un reagencement du fichier ne le casse
   pas en silence. */
const rech = regles.find(r => /\.__rech input/.test(r.sel));
const champGenerique = regles.find(r => /#hnmain input\[type="text"\]$/.test(r.sel.trim()));
ok(!!rech, 'la regle du champ de recherche existe');
if (rech && champGenerique) {
  const sr = Math.max(...rech.sel.split(',').map(spec));
  const sg = Math.max(...champGenerique.sel.split(',').map(spec));
  ok(sr > sg, `le champ de recherche (${sr}) bat la regle generique (${sg}) — pas de double pilule`);
}

/* 4. budget de coherence — T25, revise avec la coquille app */
const radius = new Set([...css.matchAll(/border-radius:\s*([^;]+);/g)].map(x => x[1].trim()));
ok(radius.size <= 3, `<= 3 valeurs de border-radius (${[...radius].join(', ') || 'aucune'})`);
ok(!/transition|animation/.test(css), '0 transition, 0 animation');
const ombres = new Set([...css.matchAll(/box-shadow:\s*([^;]+);/g)].map(x => x[1].trim()));
ok(ombres.size <= 1, `<= 1 ombre (${[...ombres].join(', ') || 'aucune'})`);

/* 5. T2 — rien hors de #hnmain sauf trois exceptions NOMMEES.
   La sidebar est le premier noeud du projet insere hors de #hnmain : la
   protection des formulaires cesse d'etre structurelle et devient une
   condition a verifier. Cette liste est la moitie du controle ; l'autre est
   le garde-fou en tete de sidebar(), teste dans test/coquille.test.js. */
/* "center" seul n'est plus autorise : HN enveloppe aussi chaque fleche de
 * vote dans un <center> (div.votearrow), et un bare center frappait les 31
 * du document, pas seulement le wrapper de #hnmain. Seul body > center,
 * le wrapper de page, passe desormais. */
const HORS_HNMAIN_AUTORISE = /(^|,)\s*\.hn-redesign(\.[\w-]+)?\s+(body(\s*>\s*center)?|\.__side\b)/;
const horsScope = regles.filter(r => !r.sel.includes('#hnmain') && !r.sel.startsWith('.hn-redesign'));
ok(horsScope.length === 0, `aucune regle hors de .hn-redesign (${horsScope.map(r => r.sel).join(', ') || 'ok'})`);
const horsHnmain = regles.filter(r => !r.sel.includes('#hnmain')
  && !/^\.hn-redesign(\.[\w-]+)?(:not\([^)]*\))?$/.test(r.sel.trim()));
const interdits = horsHnmain.filter(r => !HORS_HNMAIN_AUTORISE.test(r.sel));
ok(interdits.length === 0,
   `hors #hnmain, seuls body, center et .__side (${interdits.map(r => r.sel).join(', ') || 'aucun autre'})`);

/* 6. la ligne fusionnee et la coquille — T23 / T24 */
const aRegle = re => regles.some(r => re.test(r.sel));
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
/* la coquille : la sidebar est fixed, jamais un flex sur body */
ok(/\.__side \{[^}]*position:\s*fixed/.test(css.replace(/\s+/g, ' ')),
   'la sidebar est en position fixed — un flex sur body creerait un conteneur de defilement neuf');
ok(!/\bbody \{[^}]*display:\s*flex/.test(css), 'body ne devient pas un conteneur flex');
/* le palier de tracking : une seule valeur negative dans toute la feuille */
const negatifs = [...css.matchAll(/letter-spacing:\s*(-[^;]+);/g)].map(x => x[1].trim());
ok(new Set(negatifs).size <= 1 && (negatifs[0] === undefined || negatifs[0] === '-0.012em'),
   `une seule valeur de tracking negatif dans la feuille (${[...new Set(negatifs)].join(', ') || 'aucune'})`);

/* 7. le fil — phase 4 */
const brut = m[1];   /* AVANT retrait des commentaires : c'est le sujet du test */
const ouvre = (brut.match(/\/\*/g) || []).length;
const ferme = (brut.match(/\*\//g) || []).length;
ok(ouvre === ferme,
   `commentaires CSS equilibres — ${ouvre} ouverts, ${ferme} fermes. Un /* non ferme avale les regles suivantes SANS erreur : node --check ne voit rien, la feuille se charge, et douze regles disparaissent.`);
const paliers = [...css.matchAll(/tr\.__i(\d+) td\.ind img \{[^}]*width:\s*(\d+)px/g)]
  .map(x => [Number(x[1]), Number(x[2])]);
ok(paliers.length === 12, `12 paliers d'indentation (trouve ${paliers.length})`);
ok(paliers.every(([d, w]) => w === d * 22),
   'chaque palier vaut exactement depth x 22 — la gouttiere porte l indentation entiere');
ok(/td\.ind \{[^}]*repeating-linear-gradient\(to right,\s*transparent 0, transparent 11px,\s*var\(--rail\) 11px, var\(--rail\) 12px/.test(css.replace(/\s+/g, ' ')),
   'T21 : un motif de 22px avec un trait a 11px — le NOMBRE de traits est la profondeur');
ok(!/td\.ind[^{]*\{[^}]*border-right/.test(css),
   'plus de trait unique en bordure : un seul trait ne distingue pas la profondeur 2 de la 6');
ok(/a\.__theme/.test(css) && /\.hn-redesign\.hn-dark/.test(css),
   'T22 : l interrupteur de theme existe et la classe forcee gagne sur la media query');
ok(/\.__apercu \{[^}]*display:\s*none/.test(css) && /tr\.coll \.__apercu/.test(css),
   "l apercu du commentaire replie est revele par la classe coll de HN, pas par du JS au moment du repli");
ok(/tr\.__actif \.comhead::before/.test(css) && /height:\s*14px/.test(css),
   'le marqueur du commentaire actif est un tiret de 14px, pas un rail pleine hauteur');
ok(/\.__barre \{[^}]*position:\s*fixed/.test(css) && !/\.__barre \{[^}]*left:\s*0/.test(css),
   'la barre de position ne se colle pas au bord de la fenetre — le JS l aligne sur la colonne');

console.log(echecs.length ? `\n${echecs.length} ECHEC(S)\n` : '\nTout tient.\n');
process.exit(echecs.length ? 1 : 0);
