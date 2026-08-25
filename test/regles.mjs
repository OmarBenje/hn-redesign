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

/* 1. le lien visite doit battre la regle de lien generique */
const visited = regles.find(r => r.sel.includes(':visited'));
const lienGenerique = regles.find(r => /#hnmain a$/.test(r.sel.trim()));
ok(!!visited, 'la regle a:visited existe');
ok(!!lienGenerique, 'la regle de lien generique existe');
if (visited && lienGenerique) {
  const sv = Math.max(...visited.sel.split(',').map(spec));
  const sg = Math.max(...lienGenerique.sel.split(',').map(spec));
  ok(sv > sg, `a:visited (${sv}) bat le lien generique (${sg}) — les titres deja lus restent gris`);
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
ok(clair.length === 16, `16 tokens en clair (trouve ${clair.length})`);
ok(media.length === forced.length && media.every((t, i) => t === forced[i]),
   `la media query et .hn-dark redefinissent exactement les memes ${media.length} tokens`);
const jamaisRedefinis = clair.filter(t => !media.includes(t));
ok(jamaisRedefinis.every(t => ['--ui', '--mono', '--radius', '--accent'].includes(t)),
   `seuls les tokens sans variante de theme ne sont pas redefinis (${jamaisRedefinis.join(' ')})`);

/* 4. budget de coherence — T25 */
const radius = new Set([...css.matchAll(/border-radius:\s*([^;]+);/g)].map(x => x[1].trim()));
ok(radius.size <= 1, `<= 1 valeur de border-radius (${[...radius].join(', ') || 'aucune'})`);
ok(!/transition|animation/.test(css), '0 transition, 0 animation');
ok(!/box-shadow/.test(css), '0 ombre');

/* 5. T2 — rien hors de #hnmain sauf le fond de page, qui est sous .hn-redesign */
const horsScope = regles.filter(r => !r.sel.includes('#hnmain') && !r.sel.startsWith('.hn-redesign'));
ok(horsScope.length === 0, `aucune regle hors de .hn-redesign (${horsScope.map(r => r.sel).join(', ') || 'ok'})`);
const horsHnmain = regles.filter(r => !r.sel.includes('#hnmain') && !/^\.hn-redesign(\.[\w-]+)?(:not\([^)]*\))? \{?$|^\.hn-redesign(\.[\w-]+)?$/.test(r.sel.trim()));
ok(horsHnmain.every(r => /body/.test(r.sel)), `hors #hnmain, seul le fond de page (${horsHnmain.map(r => r.sel).join(', ') || 'aucun'})`);

/* 6. la ligne fusionnee et la navbar — T23 / T24 */
const aRegle = re => regles.some(r => re.test(r.sel));
ok(aRegle(/tr\.__row \+ tr$/) && /tr\.__row \+ tr\s*\{[^}]*display:\s*none/.test(css),
   'la ligne de metadonnee native est masquee, pas supprimee');
ok(/tr\.__row\s*\{[^}]*position:\s*relative/.test(css),
   'la ligne fusionnee est le repere de positionnement de hide');
ok(/\.__hide\s*\{[^}]*position:\s*absolute[^}]*opacity:\s*0/.test(css),
   'hide est hors flux ET opacity 0 — ni display:none ni visibility, qui tuent le Tab');
ok(/@media \(any-hover: hover\)/.test(css),
   'la revelation au survol est enveloppee dans @media (any-hover: hover)');
ok(/tr\.__row:focus-within .__hide/.test(css),
   'hide est aussi revele au focus clavier, pas seulement au survol');
const navbar = regles.filter(r => /tr:first-child > td/.test(r.sel));
ok(navbar.length > 0 && navbar.every(r => /#hnmain > tbody > tr:first-child > td/.test(r.sel)),
   `la navbar passe par le chemin complet, jamais par td:first-child (${navbar.length} regles)`);
ok(/tr:first-child > td \{[^}]*box-sizing:\s*border-box/.test(css),
   'box-sizing: border-box sur la barre — sans lui 46px de contenu rendent 51px');
/* le palier de tracking : une seule valeur negative dans toute la feuille */
const negatifs = [...css.matchAll(/letter-spacing:\s*(-[^;]+);/g)].map(x => x[1].trim());
ok(new Set(negatifs).size <= 1 && (negatifs[0] === undefined || negatifs[0] === '-0.012em'),
   `une seule valeur de tracking negatif dans la feuille (${[...new Set(negatifs)].join(', ') || 'aucune'})`);

console.log(echecs.length ? `\n${echecs.length} ECHEC(S)\n` : '\nTout tient.\n');
process.exit(echecs.length ? 1 : 0);
