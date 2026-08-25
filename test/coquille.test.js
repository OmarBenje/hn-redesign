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
