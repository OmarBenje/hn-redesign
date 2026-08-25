#!/usr/bin/env node
/* Verifie chaque couleur du systeme contre son fond, dans les deux themes,
 * et la regularite de la rampe en L* (CIE).
 *
 * Cet outil existe parce que trois annotations de DESIGN.md etaient fausses
 * et qu'aucune n'etait detectable a l'oeil : deux ratios mal reportes, et
 * surtout une regularite de rampe « prouvee » avec des ecarts de RATIO DE
 * CONTRASTE presentes comme de la clarte percue. Le ratio n'est pas
 * perceptuel — il s'ecrase vers le bas de la rampe, donc sa decroissance
 * demontrait le contraire de ce qu'elle etait censee montrer.
 *
 * Usage : node test/contraste.mjs        (sort 1 si quoi que ce soit casse)
 */

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const Y = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [Y(a), Y(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const Lstar = h => { const y = Y(h); return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : y * 24389 / 27; };

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

let echecs = [];
const ligne = (n, l, d) => {
  const rl = ratio(l, FOND.clair.col), rd = ratio(d, FOND.sombre.col);
  if (rl < PLANCHER) echecs.push(`${n} clair ${rl.toFixed(2)}:1 < ${PLANCHER}`);
  if (rd < PLANCHER) echecs.push(`${n} sombre ${rd.toFixed(2)}:1 < ${PLANCHER}`);
  console.log(`  ${n.padEnd(12)} ${l} ${rl.toFixed(2).padStart(6)}:1   ${d} ${rd.toFixed(2).padStart(6)}:1`);
};

console.log(`\ncontraste contre la surface de carte — plancher ${PLANCHER}:1\n`);
console.log('  token        clair             sombre');
[...TOKENS, ...RAMPE].forEach(([n, l, d]) => ligne(n, l, d));

console.log('\nrampe de downvote — regularite en L* (CIE)\n');
for (const [theme, idx] of [['clair', 1], ['sombre', 2]]) {
  const ls = RAMPE.map(r => Lstar(r[idx]));
  const ec = ls.slice(1).map((v, i) => Math.abs(v - ls[i]));
  const moy = ec.reduce((a, b) => a + b) / ec.length;
  const derive = Math.max(...ec.map(v => Math.abs(v - moy)));
  console.log(`  ${theme.padEnd(7)} ecarts ${ec.map(v => '+' + v.toFixed(2)).join('  ')}   moyenne ${moy.toFixed(2)}, derive max ${derive.toFixed(2)}`);
  ec.forEach((v, i) => { if (v < RAMPE_MIN) echecs.push(`rampe ${theme} cran ${i + 1}->${i + 2} : ${v.toFixed(2)} L* < ${RAMPE_MIN}`); });
}

/* Le dernier cran doit basculer sur l'axe de teinte : quand la luminance est
 * epuisee, la teinte offre un second canal de discrimination gratuit. */
const teinte = h => { const n = parseInt(h.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0;
  const d = mx - mn; let t = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (t * 60 + 360) % 360; };
console.log('\nbascule de teinte sur le dernier cran\n');
for (const [theme, idx] of [['clair', 1], ['sombre', 2]]) {
  const t = RAMPE.map(r => teinte(r[idx]));
  const chauds = t.slice(0, 4), froid = t[4];
  const ecart = Math.min(...chauds.map(c => Math.abs(c - froid)));
  console.log(`  ${theme.padEnd(7)} chauds ${chauds.map(v => Math.round(v)).join('/')}°  froid ${Math.round(froid)}°  ecart ${Math.round(ecart)}°`);
  if (ecart < 90) echecs.push(`rampe ${theme} : le dernier cran ne bascule pas assez (${Math.round(ecart)}°)`);
}

console.log('\nseparation page / colonne\n');
for (const [theme, f] of Object.entries(FOND))
  console.log(`  ${theme.padEnd(7)} ${Math.abs(Lstar(f.col) - Lstar(f.page)).toFixed(2)} points de L*`);

console.log(echecs.length ? '\nECHECS :\n' + echecs.map(e => '  - ' + e).join('\n') + '\n' : '\nTout tient.\n');
process.exit(echecs.length ? 1 : 0);
