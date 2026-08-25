/* T10 — le calcul pur, hors navigateur.
 *
 * Perimetre : le modele d'arbre, la descente du spine, l'idempotence du repli,
 * le calcul de la frontiere. Rien d'autre.
 *
 * NE COUVRE PAS, et ne couvrira pas : le focus, scrollIntoView, la navigation
 * J/K en vrai, le rendu, les handlers inline de HN, le comportement de Safari.
 * Une suite verte ici ne prouve pas que la navigation marche. Ce qui la prouve,
 * autant que ce depot le peut, c'est ./test/rendu.sh dans Chromium.
 */
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { charge } from './harness.mjs';

test('buildModel couvre tout le fil et chaine correctement', () => {
  const { api, document } = charge();
  const m = api.modele;
  assert.equal(m.liste.length, document.querySelectorAll('tr.athing.comtr').length);
  assert.ok(m.liste.length > 50, 'la fixture doit etre un vrai fil');

  for (const n of m.liste) {
    assert.ok(n.parent, 'tout noeud a un parent, la racine virtuelle au minimum');
    assert.equal(n.parent.depth, n.depth - 1, 'le parent est exactement un cran au-dessus');
    assert.ok(n.parent.children.includes(n), 'le chainage est bidirectionnel');
  }
  assert.equal(m.racine.depth, -1, 'la racine virtuelle vit sous la profondeur 0');
  assert.equal(m.racine.children.every(n => n.depth === 0), true);
});

test('la taille de sous-arbre calculee egale le compteur n servi par HN', () => {
  /* Verification croisee : deux calculs independants du meme nombre. HN le
     calcule cote serveur, on le recalcule depuis les seuls attributs indent.
     S'ils divergent, c'est le chainage par pile de profondeur qui est faux. */
  const { api } = charge();
  const avecTogg = api.modele.liste.filter(n => n.togg);
  assert.ok(avecTogg.length > 50);
  for (const n of avecTogg) assert.equal(n.taille, n.n, `noeud ${n.id} profondeur ${n.depth}`);
});

test('collapse est idempotent — a.togg est une bascule, pas un setter', () => {
  const { api, compteur } = charge();
  const n = api.modele.liste.find(x => x.n > 3);

  compteur.clics = 0;
  assert.equal(api.collapse(n, true), true, 'le premier appel agit');
  assert.equal(api.collapse(n, true), false, 'le second ne fait rien');
  assert.equal(api.collapse(n, true), false);
  assert.equal(compteur.clics, 1, 'un seul clic pour trois appels');
  assert.equal(api.estReplie(n), true);

  assert.equal(api.collapse(n, false), true);
  assert.equal(api.collapse(n, false), false);
  assert.equal(compteur.clics, 2);
  assert.equal(api.estReplie(n), false);
});

test('collapse ne de-replie jamais ce qui etait deja replie', () => {
  /* Le cas qui a motive la tache : une fixture contient des commentaires que
     HN a deja replies. Une boucle qui clique sans lire l'etat les OUVRE. */
  const { api, compteur } = charge();
  const n = api.modele.liste.find(x => x.n > 3);
  api.collapse(n, true);
  compteur.clics = 0;
  for (let i = 0; i < 5; i++) api.collapse(n, true);
  assert.equal(compteur.clics, 0);
  assert.equal(api.estReplie(n), true);
});

test('le spine est deterministe et forme une chaine parent-enfant', () => {
  const { api } = charge();
  const m = api.modele;
  const a = api.calculeSpine(m).map(n => n.id);
  const b = api.calculeSpine(m).map(n => n.id);
  assert.deepEqual(a, b, 'deux executions, meme chemin');
  assert.ok(a.length > 1);

  const chemin = api.calculeSpine(m);
  assert.equal(chemin[0].depth, 0, 'le spine part de la racine virtuelle');
  for (let i = 1; i < chemin.length; i++) {
    assert.equal(chemin[i].parent, chemin[i - 1], 'chaque cran descend du precedent');
    assert.equal(chemin[i].depth, chemin[i - 1].depth + 1);
  }
  assert.equal(chemin[chemin.length - 1].children.length, 0, 'la descente va jusqu au bout');
});

test('le spine choisit la branche la plus substantielle, pas la plus peuplee', () => {
  const { api } = charge();
  const m = api.modele;
  const tete = api.calculeSpine(m)[0];
  const plusPeuple = m.racine.children.slice().sort((a, b) => b.taille - a.taille)[0];
  /* Sur cette fixture les deux coincident ; ce qui est teste ici c'est que le
     score n'est PAS le seul n : un noeud de meme taille mais de commentaires
     deux fois plus longs doit gagner. */
  assert.ok(tete.taille > 1);
  const moyenne = m.racine.volume / m.racine.taille;
  const score = n => n.taille * Math.sqrt((n.volume / n.taille) / moyenne);
  const meilleur = m.racine.children.slice().sort((a, b) => score(b) - score(a))[0];
  assert.equal(tete, meilleur);
  assert.ok(score(plusPeuple) <= score(tete) + 1e-9);
});

test('la frontiere est faite de freres, jamais de noeuds du spine', () => {
  const { api } = charge();
  const m = api.modele;
  const chemin = api.calculeSpine(m);
  const bord = api.frontiere(chemin);
  const surLeSpine = new Set(chemin);

  assert.ok(bord.length > 0);
  for (const n of bord) {
    assert.equal(surLeSpine.has(n), false, 'aucun noeud du spine dans la frontiere');
    assert.ok(chemin.some(s => s.parent === n.parent), 'chaque noeud de la frontiere est frere d un noeud du spine');
  }
  assert.equal(new Set(bord).size, bord.length, 'aucun doublon');
});

test('replier la frontiere coute bien moins que replier tous les non-spine', () => {
  const { api, compteur } = charge();
  const m = api.modele;
  const chemin = api.calculeSpine(m);
  const bord = api.frontiere(chemin);
  const nonSpine = m.liste.length - chemin.length;

  compteur.clics = 0;
  api.appliqueSpine();
  assert.ok(compteur.clics <= bord.length, `${compteur.clics} clics pour ${bord.length} noeuds de frontiere`);
  assert.ok(compteur.clics * 3 < nonSpine,
    `${compteur.clics} clics au lieu de ${nonSpine} — au moins trois fois moins`);
});

test('le spine reste entierement visible et divise les lignes par au moins 3', () => {
  const { api } = charge();
  const m = api.modele;
  const visibles = () => m.liste.filter(api.estVisible).length;
  const avant = visibles();
  const chemin = api.calculeSpine(m);
  api.appliqueSpine();
  const apres = visibles();

  for (const n of chemin) assert.equal(api.estVisible(n), true, `le noeud ${n.id} du spine doit rester visible`);
  assert.ok(avant / apres >= 3, `${avant} -> ${apres}, rapport ${(avant / apres).toFixed(2)}`);
});

test('restaurer vise l etat d avant-spine, pas celui du chargement', () => {
  /* La distinction de T12. Replier a la main, lancer le spine, revenir : le
     repli manuel doit survivre. Le confondre avec l etat initial le detruit. */
  const { api } = charge();
  const m = api.modele;
  const chemin = api.calculeSpine(m);
  const cobaye = m.liste.find(n => n.depth === 0 && n.n > 3 && !chemin.includes(n));
  assert.ok(cobaye, 'la fixture doit avoir une racine hors spine');

  const visibles = () => m.liste.filter(api.estVisible).length;
  api.collapse(cobaye, true);
  const avantSpine = visibles();

  api.appliqueSpine();
  api.restaure();

  assert.equal(api.estReplie(cobaye), true, 'le repli manuel survit au retour');
  assert.equal(visibles(), avantSpine, 'le retour rend exactement l etat d avant-spine');
});

test('appliquer puis restaurer deux fois de suite ne derive pas', () => {
  const { api } = charge();
  const m = api.modele;
  const empreinte = () => m.liste.map(n => (api.estReplie(n) ? '1' : '0')).join('');
  const depart = empreinte();
  for (let i = 0; i < 3; i++) { api.appliqueSpine(); api.restaure(); }
  assert.equal(empreinte(), depart, 'trois allers-retours laissent l etat inchange');
});

test('buildModel ne connait qu un seul chemin vers la profondeur', () => {
  /* D4 : refined-hacker-news dupliquait img.width / 40 dans deux modules. La
     regression a surveiller est la reapparition d une seconde conversion. */
  /* Les commentaires partent d abord : deux d entre eux PARLENT de la
     conversion pour expliquer pourquoi elle est unique, et les compter
     ferait echouer le test sur sa propre documentation. */
  const src = readFileSyncSrc()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const conversions = [...src.matchAll(/width\s*\/\s*40/g)].length;
  assert.ok(conversions <= 1, `${conversions} conversions largeur -> profondeur, il n en faut qu une`);
  assert.ok(/getAttribute\('indent'\)/.test(src), "l attribut indent de HN est lu en priorite sur la largeur d image");
});

function readFileSyncSrc() {
  return readFileSync(new URL('../hn-redesign.user.js', import.meta.url), 'utf8');
}
