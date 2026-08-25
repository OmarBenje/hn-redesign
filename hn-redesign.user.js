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
  --accent: #FF6600;
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

/* L'auteur ressort du gris meta : c'est la seule information de la ligne
   qu'on relit. Le selecteur porte a.hnuser et pas .hnuser seul, sinon la
   regle des liens de metadonnee ci-dessous le rattrape d'un element de
   specificite et le renvoie en gris. Mesure : 8,86:1 au lieu de 5,09:1. */
.${ROOT} #hnmain a.hnuser,
.${ROOT} #hnmain .comhead a.hnuser,
.${ROOT} #hnmain .subline a.hnuser { color: var(--author); }

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

/* ----------------------------------------------------------- liens T13/T15
   Un lien prend le haut de la rampe, pas un token a lui. C'est la grammaire
   de HN elle-meme : news.css:11 met a:link a #000000 et news.css:32 met .c00
   a #000000 — la meme valeur. Un lien est du texte de corps qui mene ailleurs.

   Sans cette regle, le theme sombre est casse : HN laisse a:link a #000000,
   ce qui donne 1,06:1 sur le fond de colonne sombre. Le titre du post et le
   lien reply etaient invisibles. Non detectable en clair, ou le noir marche. */
.${ROOT} #hnmain a { color: var(--c00); }

/* Les liens de metadonnee restent en gris meta. news.css:49 les declare
   directement (.comhead a:link), donc les styler par heritage ne suffit pas
   — encore le piege n.4. Specificite superieure a la regle ci-dessus. */
.${ROOT} #hnmain .comhead a,
.${ROOT} #hnmain .subline a,
.${ROOT} #hnmain .subtext a,
.${ROOT} #hnmain .age a { color: var(--meta); }

/* --------------------------------------------------- rampe de downvote T14
   Cinq regles, jamais une seule. Plancher 3:1 dans les deux themes, et le
   dernier cran bascule sur l'axe de teinte : chaud -> froid.

   Chaque cran couvre aussi les LIENS qu'il contient, exactement comme HN
   (news.css:32-38 : .c73, .c73 a:link, .c73 a:visited). Un lien dans un
   commentaire enterre doit descendre avec lui, sinon il remonte tout seul
   au premier plan du fil. */
.${ROOT} #hnmain .commtext.c00,
.${ROOT} #hnmain .commtext.c00 a { color: var(--c00); }
.${ROOT} #hnmain .commtext.c5a,
.${ROOT} #hnmain .commtext.c5A,
.${ROOT} #hnmain .commtext.c5a a,
.${ROOT} #hnmain .commtext.c5A a { color: var(--c5A); }
.${ROOT} #hnmain .commtext.c73,
.${ROOT} #hnmain .commtext.c73 a { color: var(--c73); }
.${ROOT} #hnmain .commtext.c88,
.${ROOT} #hnmain .commtext.c88 a { color: var(--c88); }
.${ROOT} #hnmain .commtext.cdd,
.${ROOT} #hnmain .commtext.cDD,
.${ROOT} #hnmain .commtext.cdd a,
.${ROOT} #hnmain .commtext.cDD a { color: var(--cDD); }

/* Le second signal de couleur de HN : a:visited grise les titres deja lus.
   Meme froid que le dernier cran de la rampe — ce qui est froid est ce qui
   est derriere toi, rejete par la communaute ou deja lu par toi. */
.${ROOT} #hnmain .titleline > a:visited { color: var(--visited); }

/* ------------------------------------------------------------- navbar T24
   Le bandeau natif est un <td bgcolor="#ff6600"> qui contient une table
   imbriquee de trois cellules. Viser td:first-child depuis #hnmain touche la
   BARRE, pas ses cellules — c'est l'erreur qui colle le logo a gauche et fait
   flotter la navigation au centre. D'ou le chemin complet.

   box-sizing: border-box n'est pas decoratif : en content-box, 46px de
   contenu plus 4px de bordures rendent 51px, et le critere de hauteur echoue
   sur une barre pourtant juste. */
.${ROOT} #hnmain > tbody > tr:first-child > td {
  background: var(--col);
  border-top: 3px solid var(--accent);
  border-bottom: 1px solid var(--rail);
  box-sizing: border-box;
  height: 50px;
  padding: 0;
}
.${ROOT} #hnmain > tbody > tr:first-child > td > table { width: 100%; height: 46px; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td { vertical-align: middle; padding: 0; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(1) {
  width: 1px; white-space: nowrap; padding-left: 48px; padding-right: 14px;
}
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(2) { width: 100%; text-align: left; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(3) {
  width: 1px; white-space: nowrap; padding-right: 48px; text-align: right;
}
/* Les width/height=18 du logo sont des attributs de presentation : le CSS les
   bat. Le border:1px white solid, lui, est en style inline — c'est le JS qui
   l'annule (setStyle, donc reversible). */
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(1) img {
  width: 20px; height: 20px; border-radius: var(--radius);
}
/* Pas de letter-spacing negatif ici : 13px est sous le palier de 17px.
   L'issue #1 § C ecrivait -.002em, anterieur a l'amendement A1. */
.${ROOT} #hnmain .pagetop {
  display: flex; align-items: baseline; gap: 20px;
  font-size: 13px; line-height: 16px; letter-spacing: 0; color: var(--meta);
}
.${ROOT} #hnmain .pagetop a { color: var(--meta); }
.${ROOT} #hnmain .pagetop .hnname { font-size: 14px; font-weight: 600; }
.${ROOT} #hnmain .pagetop .hnname a { color: var(--c00); }
/* La page active. Jamais sur /news : il n'y a la aucun item a marquer, et
   pointer a[href="news"] reviendrait a souligner le nom du site. */
.${ROOT} #hnmain .pagetop a.__on { color: var(--accent-text); }

/* ------------------------------------------------------------ la liste T23
   Ligne fusionnee. La .subline n'est pas reecrite : ses noeuds utiles sont
   CLONES dans la .titleline et la seconde <tr> passe en display:none. Cloner
   et non deplacer — les scripts de HN referencent ces noeuds. Les clones
   perdent leur id : deux #score_<n> dans le meme document casseraient
   getElementById. */
.${ROOT} #hnmain tr.__row { position: relative; }
.${ROOT} #hnmain tr.__row > td { padding: 6px 0; vertical-align: middle; }
.${ROOT} #hnmain tr.__row + tr { display: none; }
.${ROOT} #hnmain tr.__row .rank {
  color: var(--meta); font-size: 12px; font-variant-numeric: tabular-nums;
}
.${ROOT} #hnmain tr.__row .titleline { display: block; line-height: 20px; }
/* vertical-align: middle sur TOUS les enfants, et pas seulement le favicon.
   Alignes sur la ligne de base, le titre a 16,5px et le strut a 13,3px ne
   partagent pas la meme, et le descendant du strut ajoutait 2px : la ligne
   mesurait 34px au lieu de 32. Centres sur le strut, la boite retombe a 20px
   exactement, pour les 30 lignes. Mesure, pas intuition. */
.${ROOT} #hnmain tr.__row .titleline > * { vertical-align: middle; }
/* 4 domaines sur 30 n'ont pas de favicon chez Google. L'espace reste reserve
   par visibility:hidden — un display:none desalignerait un titre sur sept. */
.${ROOT} #hnmain .__fav {
  width: 14px; height: 14px; border-radius: var(--radius);
  vertical-align: -2px; margin-right: 8px;
}
.${ROOT} #hnmain .__m {
  margin-left: 12px; font-size: 12px; letter-spacing: .1px;
  color: var(--meta); white-space: nowrap;
}
.${ROOT} #hnmain .__m > * { margin-right: 8px; }
/* Le nombre de commentaires est la SEULE chose coloree de la ligne : c'est la
   qu'on clique. Le score est en c73 et gras, en chiffres tabulaires. */
.${ROOT} #hnmain .__m .score { color: var(--c73); font-weight: 600; font-variant-numeric: tabular-nums; }
.${ROOT} #hnmain .__m a { color: var(--meta); }
.${ROOT} #hnmain .__m a.__c { color: var(--accent-text); }
/* hide : hors flux, donc zero impact sur les 32px, mais toujours atteignable
   au Tab. Les trois techniques de masquage ont ete mesurees : display:none
   tue le Tab, visibility:hidden aussi, opacity:0 le garde mais garde la
   place — d'ou opacity:0 PLUS position:absolute. */
.${ROOT} #hnmain .__hide { position: absolute; right: 0; opacity: 0; font-size: 12px; color: var(--meta); }
@media (any-hover: hover) {
  .${ROOT} #hnmain tr.__row:hover .__hide { opacity: 1; }
}
.${ROOT} #hnmain tr.__row:focus-within .__hide { opacity: 1; }

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

/* ------------------------------------------------------------------- undo
   La phase 3 touche le DOM, pas seulement la feuille. L'echec ferme (T3) ne
   peut donc plus reposer sur le seul retrait de la classe racine : chaque
   mutation s'enregistre ici et se rejoue a l'envers. C'est verifiable —
   test/reversibilite.mjs compare l'innerHTML de #hnmain avant apply() et
   apres revert(), caractere pour caractere. */
const undo = [];

const addClass = (el, c) => {
  if (!el || el.classList.contains(c)) return;
  el.classList.add(c);
  undo.push(() => el.classList.remove(c));
};

/* On sauvegarde l'ATTRIBUT style brut, pas la propriete. Repasser par
   el.style[prop] rend bien la meme valeur, mais le CSSOM la re-serialise :
   `border:1px white solid` revient en `border: 1px solid white;`. Le rendu
   est identique, le texte non — et la comparaison de reversibilite echoue
   sur 61 caracteres d'espaces. L'attribut brut se restaure a l'octet. */
const setStyle = (el, prop, val) => {
  if (!el) return;
  const attr = el.getAttribute('style');
  el.style[prop] = val;
  undo.push(() => {
    if (attr === null) el.removeAttribute('style');
    else el.setAttribute('style', attr);
  });
};

const insere = (parent, node, avant) => {
  parent.insertBefore(node, avant || null);
  undo.push(() => node.remove());
};

const detache = node => {
  const parent = node.parentNode;
  const suivant = node.nextSibling;
  parent.removeChild(node);
  undo.push(() => parent.insertBefore(node, suivant));
};

/* Un clone garde les id de l'original. Deux #score_49426564 dans le document
   et getElementById renvoie le clone : HN mettrait a jour le noeud cache. */
const cloneSansId = el => {
  const c = el.cloneNode(true);
  c.removeAttribute('id');
  c.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
  return c;
};

/* ------------------------------------------------------------- navbar T24 */
function navbar() {
  const barre = document.querySelector('#hnmain > tbody > tr:first-child > td');
  if (!barre) return;

  const logo = barre.querySelector('img');
  if (logo) setStyle(logo, 'border', 'none');

  /* Les separateurs sont des noeuds texte litteraux « | ». Aucune regle CSS
     ne les atteint : il faut les retirer du DOM. Le flex gap les remplace. */
  barre.querySelectorAll('.pagetop').forEach(p => {
    [...p.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.includes('|'))
      .forEach(detache);
  });

  const op = document.documentElement.getAttribute('op');
  if (['newest', 'ask', 'show', 'jobs'].includes(op)) {
    addClass(barre.querySelector(`.pagetop a[href="${op}"]`), '__on');
  }
}

/* ------------------------------------------------------------ la liste T23 */
const scoreDe = tr => {
  const s = tr.nextElementSibling && tr.nextElementSibling.querySelector('.score');
  return s ? parseInt(s.textContent, 10) || 0 : 0;
};

function fusionner() {
  /* Le garde-fou .fatitem. tr.athing.submission existe sur /news ET sur
     /item — 30 lignes d'un cote, 1 de l'autre. Seul /item l'enveloppe dans
     <table class="fatitem">. Sans ce filtre, fusionner() reecrirait la tete
     d'un fil de commentaires. */
  const lignes = [...document.querySelectorAll('#hnmain tr.athing.submission')]
    .filter(tr => !tr.closest('table.fatitem'));
  if (!lignes.length) return;

  const scores = lignes.map(scoreDe);
  const max = Math.max(...scores, 1);

  lignes.forEach((tr, i) => {
    const titleline = tr.querySelector('.titleline');
    const suivante = tr.nextElementSibling;
    /* Les posts d'emploi n'ont PAS de span.subline : leur td.subtext contient
       l'age et hide en enfants directs. Sans ce repli, un post sur trente
       restait non fusionne, a 17px, avec sa ligne de metadonnee visible. */
    const subline = suivante && (suivante.querySelector('.subline') || suivante.querySelector('td.subtext'));
    if (!titleline || !subline) return;

    addClass(tr, '__row');

    /* favicon — le domaine est deja dans le DOM sous .sitestr */
    const domaine = titleline.querySelector('.sitestr');
    const img = document.createElement('img');
    img.className = '__fav';
    img.alt = '';
    if (domaine) {
      img.src = 'https://www.google.com/s2/favicons?sz=32&domain='
              + encodeURIComponent(domaine.textContent.trim());
      img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
    } else {
      img.style.visibility = 'hidden';
    }
    insere(titleline, img, titleline.firstChild);

    /* Ponderation par score. L'exposant 0,45 ecrase le haut de la gamme et
       etale le bas : sans lui un post a 1186 points ecraserait tout le reste.
       Le plancher a 15,5px est une contrainte — aucun titre ne descend sous
       la taille de lecture. Le tracking suit le palier de 17px. */
    const lien = titleline.querySelector('a');
    if (lien) {
      const px = Math.round((15.5 + Math.pow(scores[i] / max, 0.45) * 3.5) * 10) / 10;
      setStyle(lien, 'fontSize', px + 'px');
      setStyle(lien, 'letterSpacing', px >= 17 ? '-0.012em' : '0');
    }

    /* Le groupe de metadonnee. Clone, jamais deplacement. L'auteur n'y est
       pas : abandon assume, c'est de la commodite, pas de la fonction. */
    const m = document.createElement('span');
    m.className = '__m';
    const score = subline.querySelector('.score');
    const age = subline.querySelector('.age');
    /* Le lien de commentaires est le DERNIER a[href^="item?id="] de la ligne —
       l'age en contient un aussi, et il vient avant. Sur un post d'emploi il
       n'y a que celui de l'age : sans ce test, l'age etait clone deux fois et
       la ligne affichait « 12 hours ago  12 hours ago ». */
    const items = [...subline.querySelectorAll('a[href^="item?id="]')];
    const dernier = items[items.length - 1];
    const commentaires = dernier && !dernier.closest('.age') ? dernier : null;
    if (score) m.appendChild(cloneSansId(score));
    if (age) m.appendChild(cloneSansId(age));
    if (commentaires) {
      const c = cloneSansId(commentaires);
      c.classList.add('__c');
      m.appendChild(c);
    }
    insere(titleline, m, null);

    const hide = subline.querySelector('a[href^="hide?"]');
    if (hide) {
      const h = cloneSansId(hide);
      h.className = '__hide';
      insere(tr.lastElementChild, h, null);
    }

    /* La tr.spacer porte style="height:5px" en inline : le CSS ne la bat pas.
       12px, cran de l'echelle — DESIGN.md dit 15px, hors echelle, signale. */
    const espaceur = suivante.nextElementSibling;
    if (espaceur && espaceur.classList.contains('spacer')) setStyle(espaceur, 'height', '12px');
  });
}

function apply() {
  if (!document.querySelector('#hnmain')) return false;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.classList.add(ROOT);
  navbar();
  fusionner();
  return true;
}

function revert() {
  while (undo.length) undo.pop()();
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
