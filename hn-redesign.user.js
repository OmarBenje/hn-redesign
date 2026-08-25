// ==UserScript==
// @name         hn-redesign
// @namespace    hn-redesign
// @version      0.1.0
// @description  Redessine Hacker News. Voir DESIGN.md pour chaque valeur.
// @match        https://news.ycombinator.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* Phase 2 — les fondations. T2, T3, T13, T14, T15.
 *
 * Trois invariants tiennent tout le fichier :
 *
 *  T2  Rien ne s'applique hors de #hnmain, et rien ne s'applique du tout
 *      tant que <html> ne porte pas la classe ROOT. #hnmain est absent de
 *      /login, /submit et /reply : ces pages sont hors d'atteinte par
 *      construction, sans liste de routes a maintenir.
 *
 *  T3  Echec ferme. La classe ROOT est le seul interrupteur : toutes les
 *      regles en dependent. La retirer rend HN intact, meme si la feuille
 *      reste dans le document.
 *
 *  T14 La rampe de downvote a cinq regles distinctes. Une regle unique
 *      .commtext{color} detruirait le signal et remonterait visuellement
 *      les pires commentaires du fil.
 */

const ROOT = 'hn-redesign';
const STYLE_ID = 'hn-redesign-style';

const CSS = `
/* ------------------------------------------------------------------ tokens
   16 tokens. Clair par defaut, sombre par media query, et une classe de
   surcharge qui gagne sur les deux (T22 s'en servira). */
.${ROOT} {
  --ui: -apple-system, BlinkMacSystemFont, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --radius: 2px;

  --page: #EFEDE4;
  --col: #FBFAF6;
  --meta: #6E6B64;
  --author: #4A4741;
  --rail: #E4E0D4;
  --rail-active: #FF6600;
  --accent-text: #BF4300;
  --visited: #8D9195;

  --c00: #1F1E1A;
  --c5A: #393834;
  --c73: #545350;
  --c88: #72716F;
  --cDD: #8D9195;
}

@media (prefers-color-scheme: dark) {
  .${ROOT}:not(.hn-light) {
    --page: #121110;
    --col: #1A1917;
    --meta: #8A867C;
    --author: #B0ABA0;
    --rail: #2E2C28;
    --accent-text: #FF6600;
    --visited: #636669;

    --c00: #E8E5DE;
    --c5A: #C7C4B9;
    --c73: #A5A39D;
    --c88: #858481;
    --cDD: #636669;
  }
}

.${ROOT}.hn-dark {
  --page: #121110;
  --col: #1A1917;
  --meta: #8A867C;
  --author: #B0ABA0;
  --rail: #2E2C28;
  --accent-text: #FF6600;
  --visited: #636669;

  --c00: #E8E5DE;
  --c5A: #C7C4B9;
  --c73: #A5A39D;
  --c88: #858481;
  --cDD: #636669;
}

/* --------------------------------------------------------------- surfaces
   Le seul geste decoratif du systeme : la colonne est ~4 points de L* plus
   claire que la page. Hors #hnmain mais sous .${ROOT}, que le JS ne pose que
   si #hnmain existe — les formulaires restent intacts. */
.${ROOT} body { background: var(--page); }
.${ROOT} #hnmain { background: var(--col); }

/* ------------------------------------------------------------ typographie
   Tracking : deux paliers. 0 sous 17 px, -0.012em au-dessus. La valeur
   negative n'apparait qu'une fois dans tout le fichier.

   Le selecteur universel n'est pas de la paresse. news.css declare
   font-family sur NEUF selecteurs a l'interieur de #hnmain — body, td,
   .default, .admin, .title, .subtext td, .comhead, .comment, input. Une
   declaration directe bat toujours une valeur heritee, quelle que soit la
   specificite : styler le conteneur ne suffit pas, .comment restait en
   Verdana avec le td deja en SF. Il faut atteindre chaque element.

   Les controles de formulaire sont exclus : HN met la zone de reponse en
   monospace deliberement, et c'est du HTML fonctionnel (T19 s'en occupera). */
.${ROOT} #hnmain,
.${ROOT} #hnmain *:not(input):not(textarea):not(select) {
  font-family: var(--ui);
  letter-spacing: 0;
}

.${ROOT} #hnmain .commtext,
.${ROOT} #hnmain .toptext {
  display: block;
  font-size: 15px;
  line-height: 22px;
  max-width: 660px;
}

.${ROOT} #hnmain .commtext pre,
.${ROOT} #hnmain .commtext code {
  font-family: var(--mono);
  font-size: 13px;
  line-height: 20px;
}

.${ROOT} #hnmain .comhead,
.${ROOT} #hnmain .subline,
.${ROOT} #hnmain .age,
.${ROOT} #hnmain .score {
  font-size: 12px;
  line-height: 16px;
  /* tracking POSITIF, seule exception au palier : on ouvre un texte trop
     petit. Le palier ne regit que le crenage negatif. Voir DESIGN.md. */
  letter-spacing: .1px;
  color: var(--meta);
}

.${ROOT} #hnmain .hnuser { color: var(--author); }

/* Le titre du post sur /item : le seul element au-dessus de 17 px.

   Le selecteur passe par .fatitem, pas par .athing.submission. Les deux
   pages ont des lignes .athing.submission — sur /news il y en a 30 — mais
   seul /item les enveloppe dans <table class="fatitem"> (verifie : 1 sur
   /item, 0 sur /news). Sans ce garde-fou, les 30 titres de la liste
   passaient a 21 px et la ponderation par score de la phase 3 n'aurait
   plus rien eu a ponderer. */
.${ROOT} #hnmain .fatitem .titleline > a {
  font-size: 21px;
  line-height: 28px;
  letter-spacing: -0.012em;
}

/* --------------------------------------------------- rampe de downvote T14
   Cinq regles, jamais une seule. Plancher 3:1 dans les deux themes, et le
   dernier cran bascule sur l'axe de teinte : chaud -> froid. */
.${ROOT} #hnmain .commtext.c00 { color: var(--c00); }
.${ROOT} #hnmain .commtext.c5a,
.${ROOT} #hnmain .commtext.c5A { color: var(--c5A); }
.${ROOT} #hnmain .commtext.c73 { color: var(--c73); }
.${ROOT} #hnmain .commtext.c88 { color: var(--c88); }
.${ROOT} #hnmain .commtext.cdd,
.${ROOT} #hnmain .commtext.cDD { color: var(--cDD); }

/* Le second signal de couleur de HN : a:visited grise les titres deja lus.
   Meme froid que le dernier cran de la rampe — ce qui est froid est ce qui
   est derriere toi, rejete par la communaute ou deja lu par toi. */
.${ROOT} #hnmain .titleline > a:visited { color: var(--visited); }

/* ----------------------------------------------------------------- focus
   :focus-visible et non :focus — sur un site fait de liens texte, un anneau
   a chaque clic serait du bruit permanent. outline et non border : l'anneau
   ne deplace rien au moment ou il apparait. */
.${ROOT} #hnmain :focus-visible {
  outline: 2px solid var(--accent-text);
  outline-offset: 2px;
  border-radius: var(--radius);
}
`;

function apply() {
  if (!document.querySelector('#hnmain')) return false;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.classList.add(ROOT);
  return true;
}

function revert() {
  document.documentElement.classList.remove(ROOT, 'hn-dark', 'hn-light');
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

try {
  apply();
} catch (err) {
  revert();
  console.error('[hn-redesign] desactive apres erreur, HN est intact :', err);
}

/* Interrupteur a la volee, pour comparer avant/apres sans desinstaller. */
window.hnRedesign = { apply, revert, ROOT, CSS };
