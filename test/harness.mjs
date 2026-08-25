/* Charge le userscript hors navigateur, sur un DOM linkedom.
 *
 * Le script est un seul fichier sans systeme de modules — c'est une
 * contrainte du runtime, pas un choix : Userscripts lit un dossier, sans
 * recursion. On ne peut donc pas l'importer. On le lit, on l'execute dans une
 * fonction dont les parametres sont les globales du navigateur, et on
 * recupere window.hnRedesign, que le script expose deja.
 *
 * CE QUE CE HARNESS N'EST PAS : un navigateur. Il n'y a ni mise en page, ni
 * feuille de style appliquee, ni hn.js. Le simulateur de togg ci-dessous
 * REPRODUIT le comportement de HN ; il ne le prouve pas. La preuve que le vrai
 * a.togg se comporte comme ca est dans test/rendu.sh, qui tourne dans
 * Chromium sur la vraie page avec le vrai hn.js.
 */
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';

const SRC = readFileSync(new URL('../hn-redesign.user.js', import.meta.url), 'utf8');

/* Le simulateur de repli. Il calcule son propre arbre a partir des attributs
   indent, sans passer par buildModel() : un simulateur qui utiliserait le code
   teste ne testerait plus rien. */
function simuleTogg(document, compteur) {
  const rangs = [...document.querySelectorAll('tr.athing.comtr')];
  const prof = tr => {
    const ind = tr.querySelector('td.ind');
    return ind ? (parseInt(ind.getAttribute('indent'), 10) || 0) : 0;
  };
  const descendants = tr => {
    const i = rangs.indexOf(tr), d = prof(tr), out = [];
    for (let j = i + 1; j < rangs.length && prof(rangs[j]) > d; j++) out.push(rangs[j]);
    return out;
  };
  const ancetres = tr => {
    const i = rangs.indexOf(tr), out = [];
    let d = prof(tr);
    for (let j = i - 1; j >= 0 && d > 0; j--) {
      if (prof(rangs[j]) < d) { out.push(rangs[j]); d = prof(rangs[j]); }
    }
    return out;
  };

  for (const tr of rangs) {
    const togg = tr.querySelector('a.togg');
    if (!togg) continue;
    togg.click = () => {
      compteur.clics++;
      if (tr.classList.contains('coll')) {
        tr.classList.remove('coll');
        /* HN ne re-montre pas ce qui est sous un descendant encore replie. */
        for (const d of descendants(tr)) {
          const masquePar = ancetres(d).some(a => a !== tr && a.classList.contains('coll')
            && rangs.indexOf(a) > rangs.indexOf(tr));
          if (!masquePar) d.classList.remove('noshow');
        }
      } else {
        tr.classList.add('coll');
        for (const d of descendants(tr)) d.classList.add('noshow');
      }
    };
  }
}

/* Le hook de transformation. Les fixtures ne sont pas versionnees — ce sont
   les ecrits d'autres personnes — donc on ne peut pas en ajouter une variante
   « connectee » au depot. On transforme le HTML brut a la volee : c'est la
   seule difference entre la page qu'un visiteur voit et celle qu'Omar voit,
   et la sidebar en depend entierement. */
export function charge(fichier = 'item.html', url = 'https://news.ycombinator.com/item?id=49426564', transforme = h => h) {
  const html = transforme(readFileSync(new URL('../design-refs/fixtures/' + fichier, import.meta.url), 'utf8'));
  const { document, window } = parseHTML(html);

  const compteur = { clics: 0 };
  simuleTogg(document, compteur);

  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  const location = new URL(url);

  /* linkedom n'a pas de mise en page : scrollIntoView n'existe pas. On le
     neutralise plutot que de le laisser jeter — la navigation clavier est
     testee au rendu, pas ici. */
  Object.defineProperty(document.defaultView || window, 'scrollTo', { value: () => {}, writable: true });
  for (const el of document.querySelectorAll('tr')) el.scrollIntoView = () => {};

  const fenetre = window;
  fenetre.addEventListener = fenetre.addEventListener || (() => {});
  fenetre.removeEventListener = fenetre.removeEventListener || (() => {});

  /* Le window de linkedom delegue les proprietes inconnues au globalThis de
     Node. window.hnRedesign pose par un test precedent y survit donc, et le
     garde-fou anti-double-injection du script — legitime dans un navigateur —
     ferait sortir immediatement en rendant l'API du test PRECEDENT, liee a un
     autre document. Deux tests sur trois echouaient sur cet etat fantome. */
  delete fenetre.hnRedesign;
  delete globalThis.hnRedesign;

  const fn = new Function('window', 'document', 'location', 'localStorage', 'console', 'URLSearchParams',
    SRC + '\n;return window.hnRedesign;');
  const api = fn(fenetre, document, location, localStorage, console, URLSearchParams);
  if (!api) throw new Error('le script n a rien expose — garde-fou declenche ?');
  if (api.modele && api.modele.liste.length &&
      !document.contains(api.modele.liste[0].el)) {
    throw new Error('l API renvoyee est liee a un autre document');
  }

  return { api, document, window: fenetre, compteur, localStorage };
}
