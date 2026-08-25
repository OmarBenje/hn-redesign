/* La coquille app — sidebar, en-tete, onglets, cartes.
 *
 * Perimetre : la STRUCTURE produite dans le DOM. Ce fichier tourne sous
 * linkedom, qui n'a pas de mise en page : aucune hauteur, aucune largeur,
 * aucune couleur calculee n'est verifiable ici. La geometrie est dans
 * test/rendu.sh, dans Chromium.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { charge } from './harness.mjs';

const NEWS = 'https://news.ycombinator.com/news';

/* Le temoin : la fixture telle quelle, sans que le script tourne. C'est la
   seule facon de comparer un avant et un apres — recharger en neutralisant
   window.hnRedesign ferait sortir charge() sur « le script n a rien expose ». */
const temoinBrut = (fichier, transforme = h => h) =>
  parseHTML(transforme(readFileSync(new URL('../design-refs/fixtures/' + fichier, import.meta.url), 'utf8'))).document;

/* Rend la fixture « connectee » : HN sert <a id="me"> dans la cellule de
   droite quand la session est ouverte, a la place du lien login. */
export const connecte = (pseudo = 'omarbenje') => html =>
  html.replace(/<a href="login\?goto=news">login<\/a>/,
    `<a id="me" href="user?id=${pseudo}">${pseudo}</a> (<a href="logout">logout</a>)`);

test('le harnais applique la transformation de fixture avant analyse', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbenje'));
  const me = document.querySelector('#me');
  assert.ok(me, 'la fixture transformee doit porter #me');
  assert.equal(me.textContent, 'omarbenje');
  assert.equal(me.getAttribute('href'), 'user?id=omarbenje');
});

test('sans transformation la fixture reste deconnectee', () => {
  const { document } = charge('news.html', NEWS);
  assert.equal(document.querySelector('#me'), null);
  assert.ok(document.querySelector('a[href^="login"]'), 'le lien login est la');
});

test('icone rend un SVG inline, jamais une requete', () => {
  const { api } = charge('news.html', NEWS);
  for (const nom of ['home', 'compass', 'bookmark', 'user', 'search', 'fleche', 'bulle']) {
    const svg = api.icone(nom);
    assert.equal(svg.tagName.toLowerCase(), 'svg', `${nom} rend un <svg>`);
    assert.equal(svg.getAttribute('stroke'), 'currentColor', `${nom} suit la couleur du texte`);
    assert.ok(svg.children.length > 0, `${nom} a un trace`);
  }
  assert.throws(() => api.icone('licorne'), /licorne/);
});

test('utilisateur lit #me, et rend null sans session', () => {
  assert.equal(charge('news.html', NEWS, connecte('omarbenje')).api.utilisateur(), 'omarbenje');
  assert.equal(charge('news.html', NEWS).api.utilisateur(), null);
});

test('la sidebar existe sur /news et porte quatre entrees principales', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbenje'));
  const side = document.querySelector('body > nav.__side');
  assert.ok(side, 'nav.__side est le premier enfant de body');
  const principales = [...side.querySelectorAll('.__nav-1 a')];
  assert.deepEqual(principales.map(a => a.textContent.trim()),
    ['Home', 'Explore', 'Bookmarks', 'Profile']);
  assert.deepEqual(principales.map(a => a.getAttribute('href')),
    ['news', 'newest', 'favorites?id=omarbenje', 'user?id=omarbenje']);
  assert.ok(principales.every(a => a.querySelector('svg')), 'chaque entree porte son icone');
});

test('sans session, Bookmarks et Profile sont absents plutot que morts', () => {
  const { document } = charge('news.html', NEWS);
  const principales = [...document.querySelectorAll('.__nav-1 a')];
  assert.deepEqual(principales.map(a => a.textContent.trim()), ['Home', 'Explore']);
});

test('aucun lien de navigation natif n est perdu', () => {
  /* Le critere qui remplace l'ancien comptage sur .pagetop : les liens sont
     DEPLACES dans la sidebar, donc les compter la ou ils etaient ne veut plus
     rien dire. Ce qui doit tenir, c'est qu'aucun ne disparaisse. */
  const avant = new Set();
  for (const a of temoinBrut('news.html').querySelectorAll('.pagetop a')) avant.add(a.getAttribute('href'));

  const { document } = charge('news.html', NEWS);
  const apres = new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  const perdus = [...avant].filter(h => !apres.has(h));
  assert.deepEqual(perdus, [], 'aucun href natif ne disparait');
});

test('les six liens secondaires sont deplaces, pas clones', () => {
  const { document } = charge('news.html', NEWS);
  /* :not(.__range) — le lien natif « newest » est range dans ce groupe lui
     aussi, hors de la vue, parce qu'Explore le represente deja. Le compter
     ici ferait attendre sept liens la ou la maquette en montre six. */
  const secondaires = [...document.querySelectorAll('.__nav-2 a:not(.__range)')].map(a => a.getAttribute('href'));
  assert.deepEqual(secondaires, ['front', 'newcomments', 'ask', 'show', 'jobs', 'submit']);
  for (const href of secondaires)
    assert.equal(document.querySelectorAll(`a[href="${href}"]`).length, 1,
      `${href} existe une seule fois — deplace, pas clone`);
});

test('la sidebar est absente de /item', () => {
  /* #hnmain existe AUSSI sur /item : le premier garde-fou de sidebar() ne
     suffit pas a lui seul. L'assertion sur fatitem prouve que ce test
     exerce bien le second garde-fou (table.fatitem), pas une condition
     sans rapport — c'etait la faiblesse de la version precedente. */
  const { document } = charge();
  assert.equal(document.querySelector('nav.__side'), null);
  assert.ok(document.querySelector('table.fatitem'), 'la fixture item porte bien une fatitem');
});

test('aucune sidebar sur une page sans #hnmain — /login reste intacte', () => {
  /* Le PREMIER garde-fou de sidebar(), distinct de celui de /item : aucun
     #hnmain du tout. login.html est la seule fixture du depot qui en
     manque (verifie : zero occurrence de "hnmain"). */
  const { document } = charge('login.html', 'https://news.ycombinator.com/login');
  assert.equal(document.querySelector('#hnmain'), null, 'la fixture n a pas de #hnmain');
  assert.equal(document.querySelector('nav.__side'), null);
});

test('revert retire la sidebar et rend body intact', () => {
  const { api, document } = charge('news.html', NEWS, connecte('omarbenje'));
  assert.ok(document.querySelector('nav.__side'));
  api.revert();
  assert.equal(document.querySelector('nav.__side'), null);
  assert.equal(document.querySelector('center').getAttribute('style'), null);
});

test('revert restaure #hnmain a l octet — logo et six liens natifs y reviennent', () => {
  /* sidebar() deplace des noeuds qui EXISTAIENT DEJA dans la page (le logo,
     les six liens secondaires, le lien newest cache) — pas des noeuds neufs.
     insere() seul ne les rend pas : son undo est remove(), qui les detache
     juste de leur nouvel emplacement sans jamais les rendre a #hnmain. Un
     detache() prealable est necessaire pour que revert() les y ramene. Le
     test precedent ne voyait pas ce trou : il ne verifiait que l absence de
     la sidebar, jamais le retour du contenu deplace. Comparaison a l octet
     contre le temoin, la forme la plus forte disponible dans ce depot. */
  const temoin = temoinBrut('news.html', connecte('omarbenje'));
  const { api, document } = charge('news.html', NEWS, connecte('omarbenje'));
  api.revert();
  assert.equal(document.querySelector('#hnmain').innerHTML, temoin.querySelector('#hnmain').innerHTML);
});
