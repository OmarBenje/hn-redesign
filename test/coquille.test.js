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

/* Rend la fixture « connectee ».
 *
 * CE HELPER ETAIT UNE APPROXIMATION, ET C'EST CE QUI A LAISSE PASSER UN BUG
 * VISIBLE A L'ECRAN. Il posait un #me et un logout, sans karma et sans les
 * liens que HN n'ajoute qu'a une session ouverte. Or une session ouverte
 * change la navbar sur trois points, et les trois comptent :
 *
 *   1. la cellule centrale gagne « welcome » et « threads » ;
 *   2. la cellule de droite porte le karma entre parentheses ;
 *   3. logout remplace login, avec un jeton dans son href.
 *
 * La premiere version de sidebar() relocalisait six href ENUMERES. welcome et
 * threads n'y etaient pas, donc ils restaient dans la cellule centrale — et
 * comme les separateurs « | » sont retires, ils s'affichaient colles :
 * « welcomethreads », a cote du champ de recherche. Aucun test ne pouvait le
 * voir, parce que ce helper-ci ne les servait pas.
 *
 * Regle a retenir : une fixture qui simplifie la realite ne teste que la
 * simplification. */
export const connecte = (pseudo = 'omarbenje', karma = 137) => html => html
  .replace(/<a href="login\?goto=news">login<\/a>/,
    `<a id="me" href="user?id=${pseudo}">${pseudo}</a> (${karma}) | ` +
    `<a id="logout" href="logout?auth=0f2e&amp;goto=news">logout</a>`)
  .replace('<a href="newest">new</a>',
    `<a href="newest">new</a> | <a href="welcome">welcome</a> | ` +
    `<a href="threads?id=${pseudo}">threads</a>`);

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

test('le formulaire de recherche est celui de HN, deplace et non recree', () => {
  const { document } = charge('news.html', NEWS);
  const formes = [...document.querySelectorAll('form[action*="hn.algolia.com"]')];
  assert.equal(formes.length, 1, 'un seul formulaire de recherche dans le document');
  assert.ok(formes[0].closest('.__entete'), 'il vit desormais dans l en-tete');
  assert.equal(formes[0].querySelector('input[name="q"]').getAttribute('placeholder'),
    'Search stories, comments, or users');
  assert.ok(formes[0].querySelector('svg'), 'la loupe est posee dans le formulaire');
});

test('le titre de page est le nom du site, relocalise', () => {
  const { document } = charge('news.html', NEWS);
  const titre = document.querySelector('.__entete .__titre');
  assert.ok(titre, 'l en-tete porte un titre');
  assert.equal(titre.textContent.trim(), 'Hacker News');
});

test('la pastille porte l initiale du pseudo et mene au profil', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbenje'));
  const pastille = document.querySelector('.__entete .__moi');
  assert.ok(pastille, 'la pastille existe pour une session ouverte');
  assert.equal(pastille.textContent.trim(), 'O');
  assert.equal(pastille.getAttribute('href'), 'user?id=omarbenje');
});

test('sans session, la pastille cede la place au lien login natif', () => {
  const { document } = charge('news.html', NEWS);
  assert.equal(document.querySelector('.__entete .__moi'), null);
  const login = document.querySelector('.__entete a[href^="login"]');
  assert.ok(login, 'le lien login natif reste dans l en-tete');
  assert.equal(login.textContent.trim(), 'login');
});

test('trois onglets, un seul actif sur /news', () => {
  const { document } = charge('news.html', NEWS);
  const tabs = [...document.querySelectorAll('.__onglets a')];
  assert.deepEqual(tabs.map(a => a.textContent.trim()), ['Top', 'New', 'Best']);
  assert.deepEqual(tabs.map(a => a.getAttribute('href')), ['news', 'newest', 'best']);
  const actifs = tabs.filter(a => a.className.includes('__on'));
  assert.equal(actifs.length, 1);
  assert.equal(actifs[0].textContent.trim(), 'Top');
});

test('sur /newest c est New qui est actif', () => {
  const { document } = charge('newest.html', 'https://news.ycombinator.com/newest');
  const actifs = [...document.querySelectorAll('.__onglets a')].filter(a => a.className.includes('__on'));
  assert.equal(actifs.length, 1);
  assert.equal(actifs[0].textContent.trim(), 'New');
});

test('sur une route etrangere aux trois, aucun onglet n est actif', () => {
  /* Zero actif plutot qu'un defaut sur Top : souligner Top sur /ask mentirait
     sur ou l'on se trouve. */
  const { document } = charge('news.html', 'https://news.ycombinator.com/ask',
    h => h.replace('op="news"', 'op="ask"'));
  const actifs = [...document.querySelectorAll('.__onglets a')].filter(a => a.className.includes('__on'));
  assert.equal(actifs.length, 0);
});

test('pas d onglets sur /item', () => {
  const { document } = charge();
  assert.equal(document.querySelector('.__onglets'), null);
});

test('les 30 lignes de /news deviennent des cartes', () => {
  const { document } = charge('news.html', NEWS);
  const cartes = [...document.querySelectorAll('#hnmain tr.__card')];
  assert.equal(cartes.length, 30);
  for (const c of cartes) {
    assert.ok(c.querySelector('.__m'), 'chaque carte porte sa ligne de metadonnee');
    assert.ok(c.querySelector('.titleline a'), 'chaque carte porte son titre');
  }
});

test('le point du rang est retire, le rang reste lisible', () => {
  const { document } = charge('news.html', NEWS);
  const rangs = [...document.querySelectorAll('#hnmain tr.__card .rank')].map(r => r.textContent.trim());
  assert.equal(rangs[0], '1');
  assert.equal(rangs[29], '30');
  assert.ok(rangs.every(r => !r.includes('.')), 'aucun point residuel');
});

test('les posts d emploi n ont pas de subline et sont traites quand meme', () => {
  /* Leur td.subtext porte l age et hide en enfants DIRECTS. Sans repli, un
     post sur trente restait non traite, avec sa ligne native visible. */
  const { document } = charge('news.html', NEWS);
  const sansSubline = [...document.querySelectorAll('#hnmain tr.__card')]
    .filter(tr => tr.nextElementSibling && !tr.nextElementSibling.querySelector('.subline'));
  for (const tr of sansSubline) assert.ok(tr.querySelector('.__m'), 'traite malgre l absence de subline');
});

test('l age n est jamais affiche deux fois', () => {
  /* Sur un post d emploi le SEUL a[href^="item?id="] est celui de l age. Le
     prendre pour un lien de commentaires l affichait deux fois. */
  const { document } = charge('news.html', NEWS);
  for (const m of document.querySelectorAll('#hnmain tr.__card .__m')) {
    assert.ok(m.querySelectorAll('.age').length <= 1, 'au plus un age par carte');
  }
});

test('la ligne de metadonnee native est masquee, pas supprimee', () => {
  const { document } = charge('news.html', NEWS);
  const premiere = document.querySelector('#hnmain tr.__card');
  assert.ok(premiere.nextElementSibling.querySelector('td.subtext'), 'la tr native existe encore');
});

test('les icones de metadonnee sont posees', () => {
  const { document } = charge('news.html', NEWS);
  const m = document.querySelector('#hnmain tr.__card .__m');
  assert.ok(m.querySelector('svg'), 'la fleche des points est un SVG inline');
});

test('aucune carte sur /item — .athing.submission y existe aussi', () => {
  const { document } = charge();
  assert.equal(document.querySelectorAll('tr.__card').length, 0);
  assert.ok(document.querySelector('table.fatitem'), 'la fixture item porte bien une fatitem');
});

test('revert rend #hnmain identique a l octet sur /news', () => {
  const { api, document } = charge('news.html', NEWS, connecte('omarbenje'));
  api.revert();
  const apres = document.querySelector('#hnmain').innerHTML;
  assert.equal(apres, temoinBrut('news.html', connecte('omarbenje')).querySelector('#hnmain').innerHTML);
});

/* La ruling du controleur, tache 8 partie A : sidebar() ne tourne pas sur
   /item, mais entete() si — les six liens natifs restaient coinces dans
   .pagetop, dans la meme cellule que la pastille de recherche a 100% de
   largeur. Ils sont desormais releves sous le titre, cellule de gauche. */
test('sur /item, tous les liens natifs sont releves sous le titre', () => {
  /* SEPT et non six : « newest » en fait partie ici. Sur /news il est range
     hors de la vue parce qu'Explore le represente deja dans la sidebar ; sur
     /item il n'y a pas de sidebar, donc pas d'Explore, et le cacher perdrait
     une destination. La liste n'est plus enumeree dans le code — on prend tout
     ce qui reste dans .pagetop — donc ce test vaut aussi pour welcome et
     threads, que HN ne sert qu'a une session ouverte. */
  const { document } = charge();
  const secondaire = document.querySelector('.__entete .__item-nav');
  assert.ok(secondaire, 'la rangee secondaire existe dans l en-tete');
  const liens = [...secondaire.querySelectorAll('a')].map(a => a.getAttribute('href'));
  assert.deepEqual(liens, ['newest', 'front', 'newcomments', 'ask', 'show', 'jobs', 'submit']);
  for (const href of liens)
    assert.equal(document.querySelectorAll(`a[href="${href}"]`).length, 1,
      `${href} existe une seule fois — deplace, pas clone`);
});

test('sur /item, aucun separateur | litteral ne reste dans .pagetop', () => {
  const { document } = charge();
  const pagetops = [...document.querySelectorAll('.pagetop')];
  assert.ok(pagetops.length > 0, 'la fixture porte au moins un .pagetop');
  assert.ok(pagetops.every(p => !p.textContent.includes('|')), 'aucun | residuel');
});

test('sur /item, la pastille de recherche reste dans la cellule centrale', () => {
  const { document } = charge();
  const rech = document.querySelector('.__entete .__rech');
  assert.ok(rech, 'le formulaire de recherche existe dans l en-tete de /item aussi');
});

test('sur /news, entete() ne pose pas de rangee .__item-nav', () => {
  const { document } = charge('news.html', NEWS);
  assert.equal(document.querySelector('.__item-nav'), null,
    'la rangee secondaire est une bascule pour /item, pas un ajout permanent');
});

test('revert restaure #hnmain a l octet sur /item — les six liens y reviennent', () => {
  /* Meme piege que pour la sidebar sur /news (voir plus haut) : ces six
     liens EXISTAIENT deja dans la page, ils sont deplaces, pas crees. Sans
     detache() prealable, l'undo de insere() (un simple remove()) les
     laisserait perdus hors de #hnmain apres revert(). */
  const temoin = temoinBrut('item.html');
  const { api, document } = charge();
  api.revert();
  assert.equal(document.querySelector('#hnmain').innerHTML, temoin.querySelector('#hnmain').innerHTML);
});


/* ---------------------------------------------------------------------------
   La session ouverte. Ces tests existent parce que trois defauts visibles a
   l'ecran ont survecu a 45 tests et 76 assertions de rendu : les fixtures du
   depot sont DECONNECTEES, et la navbar d'une session ouverte n'a pas la meme
   forme. Voir le commentaire sur connecte() en tete de fichier.
   --------------------------------------------------------------------------- */

test('connecte : aucun lien natif ne reste dans l en-tete', () => {
  /* LE test de non-regression de « welcomethreads ». Il echouerait avec la
     liste d'href enumeree, puisque welcome et threads n'y figuraient pas. */
  const { document } = charge('news.html', NEWS, connecte('omarbnjl'));
  const restes = [...document.querySelectorAll('.__entete .pagetop a')]
    .filter(a => !a.closest('.hnname'))
    .map(a => a.getAttribute('href'));
  assert.deepEqual(restes, [], 'la navbar native est entierement relocalisee');
});

test('connecte : welcome et threads atterrissent dans la sidebar', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbnjl'));
  const hrefs = [...document.querySelectorAll('.__nav-2 a')].map(a => a.getAttribute('href'));
  assert.ok(hrefs.includes('welcome'), 'welcome est relocalise');
  assert.ok(hrefs.includes('threads?id=omarbnjl'), 'threads est relocalise');
});

test('connecte : le bloc de compte porte pseudo, karma et logout', () => {
  const { document } = charge('news.html', NEWS, connecte('omarbnjl', 137));
  const bloc = document.querySelector('.__side .__compte');
  assert.ok(bloc, 'le bloc de compte existe en pied de sidebar');
  assert.equal(bloc.querySelector('#me').textContent, 'omarbnjl');
  assert.equal(bloc.querySelector('.__karma').textContent, '137 karma',
    'le karma est une donnee reelle : relu et re-affiche, jamais jete');
  assert.ok(bloc.querySelector('a[href^="logout"]'), 'logout descend ici aussi');
});

test('connecte : la cellule de droite ne garde que la pastille', () => {
  /* Ce qui debordait de l'ecran : la pastille cotoyait « omarbnjl (1 » et
     « logout », tronques au bord de la fenetre. */
  const { document } = charge('news.html', NEWS, connecte('omarbnjl'));
  const cellules = [...document.querySelectorAll('.__entete td')];
  const droite = cellules[cellules.length - 1];
  assert.ok(droite.querySelector('.__moi'), 'la pastille est la');
  assert.equal(droite.querySelector('#me'), null, 'le pseudo natif est parti');
  assert.equal(droite.querySelector('a[href^="logout"]'), null, 'logout est parti');
  assert.equal(droite.textContent.replace(/\s/g, ''), 'O',
    'il ne reste que l initiale — aucun texte residuel');
});

test('connecte : aucun href natif ne disparait', () => {
  const avant = new Set();
  for (const a of temoinBrut('news.html', connecte('omarbnjl')).querySelectorAll('.pagetop a'))
    avant.add(a.getAttribute('href'));
  const { document } = charge('news.html', NEWS, connecte('omarbnjl'));
  const apres = new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  assert.deepEqual([...avant].filter(h => !apres.has(h)), []);
});

test('connecte : revert restaure #hnmain a l octet', () => {
  const { api, document } = charge('news.html', NEWS, connecte('omarbnjl'));
  api.revert();
  assert.equal(document.querySelector('#hnmain').innerHTML,
    temoinBrut('news.html', connecte('omarbnjl')).querySelector('#hnmain').innerHTML);
});
