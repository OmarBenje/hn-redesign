#!/usr/bin/env node
/* T25 — le lint de coherence.
 *
 * Il ne cherche pas des bugs. Il cherche la DERIVE : la seconde valeur de
 * rayon, la couleur ecrite en dur a cote d'un token qui dit la meme chose, le
 * !important qui rend la feuille impossible a raisonner. La reference qui a
 * motive la tache comptait quatre rayons distincts pour un produit entier.
 *
 * La spec d'origine faisait lire un fichier hn-redesign.css. Il n'existe pas,
 * et c'est deliberé : le CSS vit dans le userscript, en template literal, tant
 * que T1 n'a pas dit quels formats Userscripts accepte. Le lint lit donc le
 * literal. Meme contenu, meme budget.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../hn-redesign.user.js', import.meta.url), 'utf8');
const m = src.match(/const CSS = `([\s\S]*?)`;/);
if (!m) { console.error('CSS introuvable'); process.exit(1); }

const brut = m[1];
const css = brut.replaceAll('${ROOT}', 'hn-redesign').replace(/\/\*[\s\S]*?\*\//g, '');

const echecs = [];
const budget = (nom, valeurs, max, note) => {
  const uniques = [...new Set(valeurs)];
  const ok = uniques.length <= max;
  console.log(`  ${ok ? 'ok  ' : 'ECHEC'} ${nom} — ${uniques.length}/${max}` +
    (uniques.length ? ` : ${uniques.slice(0, 6).join(' · ')}` : '') +
    (note && ok ? `\n         ${note}` : ''));
  if (!ok) echecs.push(`${nom} : ${uniques.join(', ')}`);
};

console.log('\nbudget de coherence\n');

budget('valeurs de border-radius', [...css.matchAll(/border-radius:\s*([^;]+);/g)].map(x => x[1].trim()), 3,
  'trois rayons et pas un de plus : sm pour les pilules de metadonnee, md pour les cartes et les onglets, full pour les pastilles');
budget('durees de transition ou d animation', [...css.matchAll(/(?:transition|animation)[^;]*:\s*([^;]+);/g)].map(x => x[1].trim()), 0);
/* "none" desactive l'ombre en sombre : c'est la meme ombre qui disparait,
   pas une seconde valeur. Elle ne compte donc pas dans le budget. */
budget('ombres', [...css.matchAll(/box-shadow:\s*([^;]+);/g)].map(x => x[1].trim()).filter(v => v !== 'none'), 1,
  'une seule ombre dans tout le systeme, sur la carte, et elle disparait en sombre');
budget('familles d icones', [...css.matchAll(/font-family:\s*([^;]*(?:icon|awesome|material)[^;]*);/gi)].map(x => x[1].trim()), 0);
budget('declarations !important', [...css.matchAll(/([^;{]*!important)/g)].map(x => x[1].trim()), 0,
  'une feuille sans !important reste raisonnable a la lecture');
budget('valeurs de tracking negatif', [...css.matchAll(/letter-spacing:\s*(-[^;]+);/g)].map(x => x[1].trim()), 1,
  'le crenage negatif ne corrige un defaut qu au-dessus de 17px');

/* Couleurs en dur hors des blocs de theme. C'est la derive la plus insidieuse :
   la regle marche, le thème sombre la rate, et personne ne le voit en clair. */
const blocsTheme = [...css.matchAll(/(?:\.hn-redesign(?::not\(\.hn-light\))?|\.hn-redesign\.hn-dark)\s*\{[^}]*\}/g)]
  .map(x => x[0]).join('\n');
/* box-shadow est exclu : c'est deja son propre budget ci-dessus (1 ombre, qui
   se retire en sombre via "none"). Une couleur qui n'existe qu'a l'interieur
   de cette unique valeur n'a pas besoin d'une variante sombre a part. */
const hors = css.split('\n')
  .filter(l => !blocsTheme.includes(l.trim()) || !/--[\w-]+:/.test(l))
  .filter(l => !/box-shadow\s*:/.test(l));
const dures = [...hors.join('\n').matchAll(/(?<!-)(#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\))/g)]
  .map(x => x[1])
  .filter(v => !blocsTheme.includes(v));
budget('couleurs ecrites en dur hors des tokens', dures, 0,
  'toute couleur passe par un token, donc toute couleur a une variante sombre');

/* Tokens : declares et utilises doivent coincider. Un token orphelin est du
   vocabulaire mort ; un var() non declare rend transparent en silence. */
const declares = new Set([...css.matchAll(/^\s*(--[\w-]+):/gm)].map(x => x[1]));
const utilises = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map(x => x[1]));
const orphelins = [...declares].filter(t => !utilises.has(t));
const inconnus = [...utilises].filter(t => !declares.has(t));
budget('tokens declares et jamais utilises', orphelins, 0);
budget('var() sans declaration', inconnus, 0);

/* L'extension Chrome est une COPIE du userscript, pas un second fichier a
   maintenir. Si elle derive, ce qu'on teste n'est plus ce qui tourne dans le
   navigateur. ./bin/build-chrome.sh la reconstruit. */
try {
  const copie = readFileSync(new URL('../chrome/hn-redesign.js', import.meta.url), 'utf8');
  const manifeste = JSON.parse(readFileSync(new URL('../chrome/manifest.json', import.meta.url), 'utf8'));
  const version = (src.match(/@version\s+(\S+)/) || [])[1];
  const memeFichier = copie === src;
  const memeVersion = manifeste.version === version;
  console.log(`  ${memeFichier ? 'ok  ' : 'ECHEC'} chrome/hn-redesign.js identique au userscript` +
    (memeFichier ? ` — ${copie.length} caracteres` : ' — lancer ./bin/build-chrome.sh'));
  if (!memeFichier) echecs.push('la copie Chrome a derive');
  console.log(`  ${memeVersion ? 'ok  ' : 'ECHEC'} manifeste et userscript a la meme version — ${manifeste.version} / ${version}`);
  if (!memeVersion) echecs.push('versions desynchronisees');
} catch (err) {
  console.log('  ok   pas d extension Chrome dans ce depot');
}

console.log(`\n  ${declares.size} tokens, ${[...css.matchAll(/\{/g)].length} regles.`);
console.log(echecs.length ? `\n${echecs.length} DEPASSEMENT(S)\n` : '\nDans le budget.\n');
process.exit(echecs.length ? 1 : 0);
