// ==UserScript==
// @name         hn-redesign
// @namespace    hn-redesign
// @version      1.0.0
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

/* Tout le script vit dans une IIFE, et ce n'est pas un tic de style.
 *
 * En userscript @grant none comme en content script Chrome world: MAIN, le
 * fichier est evalue dans la portee globale de la PAGE. Sans cette fonction,
 * une trentaine d'identifiants — ROOT, apply, collapse, navbar — atterrissent
 * sur le global de HN et peuvent en ecraser. Et si le fichier est evalue deux
 * fois dans le meme document, le second `const ROOT` jette
 * « Identifier has already been declared » et TOUT s'arrete : c'est exactement
 * ce qui est arrive au premier chargement de l'extension Chrome.
 *
 * Le garde-fou en tete rend la double injection inoffensive. */
(function () {
'use strict';

if (window.hnRedesign) return;   /* deja injecte dans ce document */

const ROOT = 'hn-redesign';
const STYLE_ID = 'hn-redesign-style';

const CSS = `
/* ------------------------------------------------------------------ tokens
   22 tokens. Clair par defaut, sombre par media query, et une classe de
   surcharge qui gagne sur les deux (T22 s'en sert).

   La palette est passee du beige chaud au neutre froid avec la coquille app.
   Les valeurs sont CALCULEES, pas choisies a l'oeil : test/contraste.mjs les
   verifie contre leur fond dans les deux themes, verifie la regularite de la
   rampe en L* et la bascule de teinte du dernier cran. Ne pas y toucher sans
   relancer ce test. */
.${ROOT} {
  --ui: -apple-system, BlinkMacSystemFont, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-full: 999px;

  --page: #F7F7F8;
  --surface-1: #FFFFFF;
  --surface-2: #F1F1F3;
  --line: #ECECEE;
  --text: #0B0B0C;
  --meta: #6B7280;
  --author: #4B5058;
  --rail: #E6E6E9;
  --accent: #F26207;
  --accent-text: #BF4300;
  --visited: #8D9195;
  /* Un noir sur fond noir ne dit rien : en sombre, le filet de bordure porte
     seul la separation, et l'ombre s'efface via ce meme token. */
  --ombre: 0 1px 2px rgba(0, 0, 0, .04);

  --c00: #0B0B0C;
  --c5A: #2B2D33;
  --c73: #4B4E56;
  --c88: #6E7179;
  --cDD: #968971;
}

@media (prefers-color-scheme: dark) {
  .${ROOT}:not(.hn-light) {
    --page: #0E0E10;
    --surface-1: #18181B;
    --surface-2: #232327;
    --line: #2A2A2F;
    --text: #F2F2F3;
    --meta: #9CA0A8;
    --author: #B8BCC3;
    --rail: #2E2E34;
    --accent-text: #F26207;
    --visited: #636669;
    --ombre: none;

    --c00: #F2F2F3;
    --c5A: #CDCFD5;
    --c73: #A8ABB3;
    --c88: #83868E;
    --cDD: #736C54;
  }
}

.${ROOT}.hn-dark {
  --page: #0E0E10;
  --surface-1: #18181B;
  --surface-2: #232327;
  --line: #2A2A2F;
  --text: #F2F2F3;
  --meta: #9CA0A8;
  --author: #B8BCC3;
  --rail: #2E2E34;
  --accent-text: #F26207;
  --visited: #636669;
  --ombre: none;

  --c00: #F2F2F3;
  --c5A: #CDCFD5;
  --c73: #A8ABB3;
  --c88: #83868E;
  --cDD: #736C54;
}

/* --------------------------------------------------------------- surfaces
   Le seul geste decoratif du systeme : la colonne est ~4 points de L* plus
   claire que la page. Hors #hnmain mais sous .${ROOT}, que le JS ne pose que
   si #hnmain existe — les formulaires restent intacts. */
.${ROOT} body { background: var(--page); }
/* 28px reserves en bas : la barre de position est en position fixed et
   couvrirait le dernier commentaire du fil sans cette reserve. */
.${ROOT} #hnmain { background: var(--surface-1); padding-bottom: 28px; }

/* Padding lateral de colonne : 48px, la valeur de DESIGN.md. La navbar l'avait
   deja dans ses propres cellules ; le contenu, non — le rang commencait a 7px
   du bord quand le logo etait a 48, et les deux bords gauches ne s'alignaient
   pas. La premiere ligne est exclue : c'est la navbar, qui gere le sien. */
.${ROOT} #hnmain > tbody > tr:not(:first-child) > td {
  padding-left: 48px;
  padding-right: 48px;
}

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

/* ----------------------------------------------------- la coquille : sidebar
   position: fixed plutot qu'un flex sur body. Le flex creerait un conteneur
   de defilement neuf ; le fixed laisse le defilement a HN, et l'annulation
   est une propriete a retirer plus un noeud a detacher.

   C'est le SEUL bloc de la feuille qui vit hors de #hnmain, avec le fond de
   page. test/regles.mjs le sait et le verifie nommement. */
.${ROOT} .__side {
  position: fixed; top: 0; left: 0; bottom: 0; width: 220px;
  box-sizing: border-box; padding: 20px 12px;
  display: flex; flex-direction: column; gap: 4px;
  background: var(--page); border-right: 1px solid var(--line);
  font-size: 14px; line-height: 20px;
}
.${ROOT} center { margin-left: 220px; }

.${ROOT} .__side .__logo {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; margin: 0 8px 20px;
  background: var(--accent); border-radius: var(--radius-md);
}
.${ROOT} .__side .__logo img { width: 22px; height: 22px; }

.${ROOT} .__side .__nav-1 { display: flex; flex-direction: column; gap: 2px; }
.${ROOT} .__side .__nav-1 a {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px; border-radius: var(--radius-md);
  color: var(--author); font-size: 14px; font-weight: 500;
}
.${ROOT} .__side .__nav-1 a svg { width: 18px; height: 18px; flex: none; }
.${ROOT} .__side .__nav-1 a.__on { background: var(--surface-2); color: var(--accent-text); }

/* Le second groupe : les six liens natifs relocalises. Plus discrets, sans
   icone — ce sont des destinations, pas des sections. */
.${ROOT} .__side .__nav-2 {
  display: flex; flex-direction: column; gap: 2px;
  margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line);
}
.${ROOT} .__side .__nav-2 a { padding: 5px 12px; color: var(--meta); font-size: 13px; }
/* Le lien natif « newest » est deja represente par Explore. Il reste dans le
   document — sinon un href disparaitrait — mais hors de la vue. */
.${ROOT} .__side .__nav-2 a.__range { position: absolute; opacity: 0; pointer-events: none; }

.${ROOT} .__side a.__theme {
  margin-top: auto; padding: 8px 12px;
  color: var(--meta); font-size: 12px;
}

/* --------------------------------------------------- la coquille : l'en-tete
   Le chemin complet, jamais td:first-child depuis #hnmain : ce selecteur-la
   vise la BARRE et non ses cellules — l'erreur qui colle le logo a gauche et
   fait flotter le reste au centre.

   box-sizing: border-box n'est pas decoratif : en content-box, la hauteur de
   contenu plus les bordures rendent quelques pixels de trop et le critere de
   hauteur echoue sur une barre pourtant juste. */
.${ROOT} #hnmain > tbody > tr:first-child > td {
  background: var(--page);
  border: 0; box-sizing: border-box;
  height: 92px; padding: 0;
}
.${ROOT} #hnmain > tbody > tr:first-child > td > table { width: 100%; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td { vertical-align: middle; padding: 0; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(1) { width: 1px; white-space: nowrap; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(2) { width: 100%; text-align: center; }
.${ROOT} #hnmain > tbody > tr:first-child > td > table td:nth-child(3) { width: 1px; white-space: nowrap; text-align: right; }

.${ROOT} #hnmain .__titre { font-size: 30px; line-height: 34px; font-weight: 700; letter-spacing: -0.012em; }
.${ROOT} #hnmain .__titre a { color: var(--text); }

.${ROOT} #hnmain .__rech {
  display: inline-flex; align-items: center; gap: 8px;
  width: 100%; max-width: 460px; height: 40px; padding: 0 16px;
  box-sizing: border-box;
  background: var(--surface-2); border-radius: var(--radius-full);
  color: var(--meta);
}
.${ROOT} #hnmain .__rech svg { width: 16px; height: 16px; flex: none; }
.${ROOT} #hnmain .__rech input {
  flex: 1; min-width: 0; border: 0; background: none; outline: 0;
  font-family: var(--ui); font-size: 14px; color: var(--text);
}

.${ROOT} #hnmain .__moi {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: var(--radius-full);
  background: var(--surface-2); color: var(--author);
  font-size: 15px; font-weight: 600;
}
.${ROOT} #hnmain .pagetop { font-size: 13px; line-height: 16px; color: var(--meta); }
.${ROOT} #hnmain .pagetop a { color: var(--meta); }

/* ---------------------------------------------------- la coquille : onglets */
.${ROOT} #hnmain tr.__onglets > td { padding: 0 0 16px; }
.${ROOT} #hnmain tr.__onglets > td > div {
  display: flex; height: 52px; box-sizing: border-box;
  background: var(--surface-1);
  border: 1px solid var(--line); border-radius: var(--radius-md);
}
.${ROOT} #hnmain tr.__onglets a {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--meta); font-size: 15px; font-weight: 500;
  border-bottom: 2px solid transparent;
}
.${ROOT} #hnmain tr.__onglets a.__on { color: var(--accent-text); border-bottom-color: var(--accent); }

/* ------------------------------------------------------ la coquille : la carte
   La tr EST la carte. Grille de deux colonnes : la gouttiere porte la pastille
   de rang en ligne 1 et la fleche de vote en ligne 2 ; le contenu occupe les
   deux lignes de la colonne 2. Les trois td de HN tombent pile dedans, donc
   aucun noeud n'est deplace pour la carte elle-meme. */
.${ROOT} #hnmain tr.__card {
  display: grid;
  grid-template-columns: 40px 1fr;
  grid-template-rows: auto 1fr;
  column-gap: 12px;
  padding: 16px 20px;
  box-sizing: border-box;
  position: relative;
  background: var(--surface-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--ombre);
}

.${ROOT} #hnmain tr.__card > td.title:first-child { grid-area: 1 / 1; padding: 0; }
.${ROOT} #hnmain tr.__card > td.votelinks { grid-area: 2 / 1; padding: 6px 0 0; }
.${ROOT} #hnmain tr.__card > td.title:last-child { grid-area: 1 / 2 / 3 / 3; padding: 0; }
.${ROOT} #hnmain tr.__card + tr { display: none; }

/* La pastille de rang. Un aplat de 26px a droit a l'orange pur : la regle qui
   l'interdit porte sur le TEXTE, pas sur les surfaces. */
.${ROOT} #hnmain tr.__card .rank {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: var(--radius-full);
  background: var(--accent); color: var(--surface-1);
  font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;
}

/* Les fleches de vote. HN les sert en <div class="votearrow"> de 10x10 avec
   triangle.svg en fond : une IMAGE, donc elles ne suivaient ni les tokens ni
   le theme. clip-path plutot qu'un triangle en bordures : la boite garde ses
   10x10, donc le rotate180 que HN applique a la fleche de downvote tourne
   autour du bon centre. Un triangle en bordures a une boite de 0x0. */
.${ROOT} #hnmain div.votearrow {
  background-image: none;
  background-color: var(--rail);
  clip-path: polygon(50% 12%, 100% 88%, 0 88%);
  margin: 0 auto;
}
.${ROOT} #hnmain .votelinks a:hover div.votearrow { background-color: var(--accent); }

.${ROOT} #hnmain tr.__card .titleline { display: block; }
.${ROOT} #hnmain tr.__card .titleline > a {
  font-size: 17px; line-height: 24px; font-weight: 600;
  letter-spacing: -0.012em; color: var(--text);
}
/* Le gris « deja lu » de HN. Cette regle DOIT battre celle du dessus : sans
   elle, tous les titres se ressemblent et on relit ce qu'on a deja lu.
   Invérifiable au rendu — les navigateurs mentent sur :visited contre le
   history sniffing — donc prouvee par specificite dans test/regles.mjs. */
.${ROOT} #hnmain tr.__card .titleline > a:visited { color: var(--visited); }

.${ROOT} #hnmain tr.__card .__site { display: block; font-size: 14px; line-height: 20px; }
.${ROOT} #hnmain tr.__card .__site a { color: var(--accent-text); }

.${ROOT} #hnmain .__m {
  display: flex; align-items: center; gap: 14px;
  margin-top: 6px; font-size: 13px; line-height: 18px; letter-spacing: .1px;
  color: var(--meta); white-space: nowrap;
}
.${ROOT} #hnmain .__m > * { display: inline-flex; align-items: center; gap: 5px; }
.${ROOT} #hnmain .__m svg { width: 12px; height: 12px; }
.${ROOT} #hnmain .__m .__pts { color: var(--accent-text); }
.${ROOT} #hnmain .__m .score { font-weight: 600; font-variant-numeric: tabular-nums; }
.${ROOT} #hnmain .__m a { color: var(--meta); }
.${ROOT} #hnmain .__m .__by { color: var(--author); }

/* hide : hors flux, donc zero impact sur la hauteur de carte, mais toujours
   atteignable au Tab. Les trois techniques ont ete mesurees : display:none
   tue le Tab, visibility:hidden aussi, opacity:0 le garde mais garde la
   place — d'ou opacity:0 PLUS position:absolute. */
.${ROOT} #hnmain .__hide {
  position: absolute; top: 16px; right: 20px;
  opacity: 0; font-size: 12px; color: var(--meta);
}
@media (any-hover: hover) {
  .${ROOT} #hnmain tr.__card:hover .__hide { opacity: 1; }
}
.${ROOT} #hnmain tr.__card:focus-within .__hide { opacity: 1; }

/* --------------------------------------------------------- le fil, phase 4
   Indentation : 22px par niveau au lieu des 40 de HN. La largeur vit dans un
   <img src=s.gif width=depth*40> en attribut de presentation, que le CSS bat.
   Plancher de mesure a la profondeur 11 : au-dela l'indentation n'augmente
   plus, sinon la mesure passe sous 420px. Le fil de reference monte a 8. */
.${ROOT} #hnmain tr.athing.comtr td.ind { padding: 0; cursor: pointer; }
.${ROOT} #hnmain tr.athing.comtr td.ind img { height: 1px; }

/* Douze regles litterales plutot que 91 styles inline. La largeur est un
   attribut de presentation (<img width=depth*40>), donc le CSS la bat — mais
   la valeur est par ligne. Une classe par palier resout ca sans ecrire une
   seule declaration inline dans le fil, et rend le plancher visible : au-dela
   de __i11 la mesure passerait sous 420px, donc __i11 est un plafond. */
.${ROOT} #hnmain tr.__i0 td.ind img { width: 0px; }
.${ROOT} #hnmain tr.__i1 td.ind img { width: 22px; }
.${ROOT} #hnmain tr.__i2 td.ind img { width: 44px; }
.${ROOT} #hnmain tr.__i3 td.ind img { width: 66px; }
.${ROOT} #hnmain tr.__i4 td.ind img { width: 88px; }
.${ROOT} #hnmain tr.__i5 td.ind img { width: 110px; }
.${ROOT} #hnmain tr.__i6 td.ind img { width: 132px; }
.${ROOT} #hnmain tr.__i7 td.ind img { width: 154px; }
.${ROOT} #hnmain tr.__i8 td.ind img { width: 176px; }
.${ROOT} #hnmain tr.__i9 td.ind img { width: 198px; }
.${ROOT} #hnmain tr.__i10 td.ind img { width: 220px; }
.${ROOT} #hnmain tr.__i11 td.ind img { width: 242px; }

/* Espacement : 16px entre freres, 12px entre parent et premier enfant. C'est
   le seul geste hierarchique du systeme et il suffit — descendre coute moins
   d'espace que passer au suivant, donc la subordination se lit avant meme que
   l'oeil ait vu le rail. Les deux valeurs sont posees par le JS, qui seul
   connait la profondeur du voisin. */
.${ROOT} #hnmain tr.athing.comtr > td { padding-top: 16px; }
.${ROOT} #hnmain tr.athing.comtr.__enfant > td { padding-top: 12px; }
.${ROOT} #hnmain tr.athing.comtr.__racine > td { padding-top: 24px; }

/* T21 — les rails expriment la PROFONDEUR, pas seulement l'imbrication.
   Un trait unique dit « ceci est imbrique » et rien de plus : a la profondeur
   6 on voit exactement ce qu'on voit a la profondeur 2. Ici la gouttiere porte
   un trait par niveau d'ancetre, donc le NOMBRE de traits EST la profondeur —
   elle se compte au lieu de se deviner.

   Un seul motif de 22px suffit : trait de 1px a 11px, c'est-a-dire au milieu
   du cran et non colle au texte, repete. La gouttiere fait indent de large,
   donc elle porte exactement indent/22 traits, et zero a la profondeur 0. */
.${ROOT} #hnmain tr.athing.comtr td.ind {
  background-image: repeating-linear-gradient(to right,
    transparent 0, transparent 11px,
    var(--rail) 11px, var(--rail) 12px,
    transparent 12px, transparent 22px);
}

/* Metadonnee -> corps : 4px. HN pose margin-bottom:-10px en style inline sur
   la div de comhead ; c'est le JS qui l'annule, reversiblement. */
.${ROOT} #hnmain .comhead { position: relative; }

/* T16.1 — le commentaire replie. Une ligne : auteur, debut du texte, et le
   compteur n que HN fournit deja ([9 more]). Tu sais ce que tu caches.
   L'apercu est insere pour TOUS les commentaires et revele par la classe
   coll que HN pose lui-meme : aucun code ne tourne au moment du repli. */
.${ROOT} #hnmain .__apercu { display: none; }
.${ROOT} #hnmain tr.coll .__apercu {
  display: inline;
  font-size: 13.5px;
  line-height: 22px;
  color: var(--meta);
}

/* T18 — le marqueur du commentaire actif : un tiret de 3x14, pas un rail.
   Une bordure pleine hauteur donne 500px d'orange sur un commentaire de sept
   paragraphes. Rendu, vu, rejete. */
.${ROOT} #hnmain tr.__actif .comhead::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 2px;
  width: 3px;
  height: 14px;
  background: var(--accent);
}
.${ROOT} #hnmain tr.athing.comtr:focus { outline: none; }

/* T16.2 — le lien Thread Spine. Un LIEN, pas un bouton : HN n'a que des
   liens, un bouton trahirait le vocabulaire du site. Etat actif en accent
   texte, jamais en orange pur — 2,81:1 en clair. */
.${ROOT} #hnmain a.__spine { color: var(--meta); }
.${ROOT} #hnmain a.__spine.__on { color: var(--accent-text); }

/* T17 — le formulaire de reponse replie derriere un lien. Sur les quatre
   captures de reference, le premier element sous le titre etait un champ vide
   de 700px, avant le moindre commentaire. Environ 250px repris en haut de
   chaque fil. Le formulaire natif reste intact, simplement replie. */
.${ROOT} #hnmain form.__replie { display: none; }

/* T16.3 + T20 — la barre de position. Alignee sur la COLONNE et non sur la
   fenetre : pleine largeur, elle se lit comme une barre d'etat de navigateur.
   Visible seulement quand la navigation clavier est active. */
.${ROOT} #hnmain .__barre {
  position: fixed;
  bottom: 0;
  height: 28px;
  line-height: 28px;
  box-sizing: border-box;
  border-top: 1px solid var(--rail);
  background: var(--surface-1);
  color: var(--meta);
  font-size: 12px;
  letter-spacing: .1px;
  padding: 0 48px;
  z-index: 9;
}

/* Les liens ajoutes parlent la langue de HN : gris meta, taille de
   metadonnee, aucun bouton invente. « nouveau » est la seule exception —
   il porte de l'information, donc il prend l'accent texte. */
.${ROOT} #hnmain a.__racine-lien,
.${ROOT} #hnmain a.__repondre { font-size: 12px; color: var(--meta); }
.${ROOT} #hnmain .__neuf {
  font-size: 12px;
  letter-spacing: .1px;
  color: var(--accent-text);
  margin-right: 6px;
}

/* T19 — les controles de formulaire. En sombre, le bouton natif add comment
   est un rectangle blanc au milieu d'une page noire. La famille de la zone de
   texte n'est PAS touchee : HN la met en monospace deliberement, et la phase 2
   a choisi de respecter ce choix. On corrige les couleurs, pas la voix.

   button et input[type=text] restent sur --meta/--surface-1/--radius-md : la
   coquille app (etape T1) ne recable que input[type=submit] et textarea, qui
   reposent desormais sur la surface secondaire — voir plus bas. */
.${ROOT} #hnmain button {
  font-family: var(--ui);
  font-size: 13px;
  color: var(--c00);
  background: var(--surface-1);
  /* --meta et non --rail. Le systeme n'a aucune surface : ces controles sont
     du texte dans un cadre de 1px, et ce cadre est la SEULE chose qui les rend
     reperables. Il doit donc passer le plancher — --meta donne 5,09:1 en clair
     et 4,84:1 en sombre contre le fond de colonne, la ou --rail, fait pour
     disparaitre derriere le texte, tombe sous 1,5:1. */
  border: 1px solid var(--meta);
  border-radius: var(--radius-md);
  padding: 4px 12px;
}
.${ROOT} #hnmain input[type="text"] {
  color: var(--c00);
  background: var(--surface-1);
  border: 1px solid var(--meta);
  border-radius: var(--radius-md);
}

/* Le champ de reponse et les boutons de HN reposent sur la surface secondaire.
   Ils y etaient deja en gris natif ; ils passent au token, donc au theme.
   textarea ne recoit PAS de font-family : elle reste en monospace natif,
   comme le reste du fichier le respecte deja (voir selecteur universel plus
   haut, qui exclut explicitement input/textarea/select). */
.${ROOT} #hnmain input[type="submit"],
.${ROOT} #hnmain textarea {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text);
}
.${ROOT} #hnmain input[type="submit"] {
  font-family: var(--ui);
  font-size: 13px;
  border-radius: var(--radius-full);
  padding: 4px 14px;
}

/* ----------------------------------------------------------------- focus
   :focus-visible et non :focus — sur un site fait de liens texte, un anneau
   a chaque clic serait du bruit permanent. outline et non border : l'anneau
   ne deplace rien au moment ou il apparait. */
.${ROOT} #hnmain :focus-visible {
  outline: 2px solid var(--accent-text);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}
`;

/* ------------------------------------------------------------------- undo
   La phase 3 touche le DOM, pas seulement la feuille. L'echec ferme (T3) ne
   peut donc plus reposer sur le seul retrait de la classe racine : chaque
   mutation s'enregistre ici et se rejoue a l'envers. C'est verifiable —
   test/reversibilite.mjs compare l'innerHTML de #hnmain avant apply() et
   apres revert(), caractere pour caractere. */
const undo = [];

/* Retirer une classe d'un element qui n'avait AUCUN attribut class y laisse
   class="" — invisible a l'ecran, mais la comparaison de reversibilite le
   voit, et elle a raison : le DOM n'est plus celui que HN a servi. */
const addClass = (el, c) => {
  if (!el || el.classList.contains(c)) return;
  const avaitAttribut = el.hasAttribute('class');
  el.classList.add(c);
  undo.push(() => {
    el.classList.remove(c);
    if (!avaitAttribut) el.removeAttribute('class');
  });
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

/* ---------------------------------------------------------- les icones
   Sept traces, construits en JS. Pas de police d'icones (une requete
   reseau, et le projet est a zero), pas de <img> (la CSP de HN sert
   img-src 'self' — c'est ce qui a tue le favicon de domaine).

   currentColor sur le stroke n'est pas un detail : c'est ce qui fait suivre
   le theme et l'etat actif sans une seule regle de couleur supplementaire. */
const TRACES = {
  home:     'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  compass:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  bookmark: 'M6.5 3.5h11v17l-5.5-4-5.5 4v-17Z',
  user:     'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1.5-3.5 4.2-5.5 7.5-5.5s6 2 7.5 5.5',
  search:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16.2 16.2 21 21',
  fleche:   'M12 19V5M6 11l6-6 6 6',
  bulle:    'M4.5 5.5h15v11h-8l-4.5 3.5v-3.5h-2.5v-11Z',
};

function icone(nom) {
  const d = TRACES[nom];
  if (!d) throw new Error(`[hn-redesign] icone inconnue : ${nom}`);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  return svg;
}

/* Le pseudo, lu dans le DOM. HN sert <a id="me"> en haut a droite quand la
   session est ouverte, et rien du tout sinon. Zero requete, zero reglage :
   c'est ce qui rend Bookmarks et Profile possibles. */
const utilisateur = () => {
  const me = document.querySelector('#me');
  return me ? me.textContent.trim() : null;
};

/* ---------------------------------------------------------- T22 le theme
   Trois etats et non deux. « auto » n'est pas un defaut paresseux : c'est le
   seul qui suit l'heure de la journee, et c'est celui qu'on veut la plupart du
   temps. Les deux autres existent pour le forcer.

   La classe est posee sur <html> et gagne sur la media query — c'est pour ca
   que le bloc sombre est ecrit deux fois dans la feuille. */
const CLE_THEME = 'hn-redesign-theme';
const THEMES = ['auto', 'clair', 'sombre'];
const CLASSE_THEME = { auto: null, clair: 'hn-light', sombre: 'hn-dark' };
let lienTheme = null;

function litTheme() {
  try {
    const v = localStorage.getItem(CLE_THEME);
    return THEMES.includes(v) ? v : 'auto';
  } catch (err) {
    return 'auto';   /* navigation privee : on ne force rien */
  }
}

function poseTheme(nom) {
  const racine = document.documentElement;
  racine.classList.remove('hn-light', 'hn-dark');
  if (CLASSE_THEME[nom]) racine.classList.add(CLASSE_THEME[nom]);
  try { localStorage.setItem(CLE_THEME, nom); } catch (err) { /* quota, prive */ }
  if (lienTheme) lienTheme.textContent = nom;
}

/* La premiere ligne de #hnmain — la barre. Le chemin complet passe par
   tbody, que les navigateurs inserent d'office pendant le parsing de
   <table> ; linkedom, qui fait tourner ce fichier sous test/harness.mjs, ne
   l'insere pas, et le selecteur ne matcherait jamais sous le harnais. D'ou
   le repli, borne au meme sous-arbre. Un seul endroit le sait : deux copies
   divergeraient en silence, et test/lint.mjs ne voit pas ce genre de derive. */
const barreDeTete = () =>
  document.querySelector('#hnmain > tbody > tr:first-child > td') ||
  document.querySelector('#hnmain > tr:first-child > td');

/* Le conteneur de lignes de #hnmain — le tbody que le navigateur insere
   d'office pendant le parsing de <table>, ou #hnmain lui-meme sous
   linkedom, qui ne le fait pas. Meme repli que barreDeTete() ci-dessus,
   pour la meme raison : onglets() doit inserer une ligne VOISINE de la
   barre, pas un noeud a l'interieur d'une cellule, donc il lui faut le
   conteneur et non le td. */
const conteneurLignes = () =>
  document.querySelector('#hnmain > tbody') ||
  document.querySelector('#hnmain');

/* ------------------------------------------------- la coquille : sidebar
   Le PREMIER noeud que ce script insere hors de #hnmain. Jusqu'ici la
   protection des formulaires etait structurelle : tout vivait sous #hnmain,
   absent de /login, /submit et /reply. Cette garantie cesse d'etre gratuite
   ici — d'ou le garde-fou explicite en tete de fonction. Ne pas le retirer. */
function sidebar() {
  if (!document.querySelector('#hnmain')) return;

  /* Le second garde-fou. #hnmain existe AUSSI sur /item : le premier ne
     suffit donc pas a en tenir la sidebar a l'ecart. Le discriminant est
     table.fatitem — 1 sur /item, 0 sur /news. Le fil est le coeur du
     projet et ne cede pas 220px de largeur. */
  if (document.querySelector('#hnmain table.fatitem')) return;

  const barre = barreDeTete();
  if (!barre) return;

  const side = document.createElement('nav');
  side.className = '__side';

  /* Le logo. Deplace depuis la navbar, pas clone : il n'y en a qu'un.
     detache AVANT insere, pour tout noeud qui existait deja dans la page.
     L'undo d'insere() est un simple remove() : juste pour un noeud neuf ou
     clone, faux pour une relocalisation — le noeud ne reviendrait jamais a
     son parent d'origine. detache() sauvegarde parent et position, et l'ordre
     LIFO defait d'abord l'insertion, puis la detache. */
  const logo = barre.querySelector('img');
  if (logo) {
    const boite = document.createElement('a');
    boite.className = '__logo';
    boite.href = 'news';
    setStyle(logo, 'border', 'none');
    detache(logo);
    insere(boite, logo, null);
    side.appendChild(boite);
  }

  const pseudo = utilisateur();
  const groupe1 = document.createElement('div');
  groupe1.className = '__nav-1';

  const ENTREES = [
    ['home',     'Home',      'news',      true],
    ['compass',  'Explore',   'newest',    true],
    ['bookmark', 'Bookmarks', pseudo && `favorites?id=${pseudo}`, !!pseudo],
    ['user',     'Profile',   pseudo && `user?id=${pseudo}`,      !!pseudo],
  ];
  const op = document.documentElement.getAttribute('op');
  for (const [ic, libelle, href, actif] of ENTREES) {
    if (!actif) continue;
    const a = document.createElement('a');
    a.href = href;
    a.appendChild(icone(ic));
    a.appendChild(document.createTextNode(libelle));
    if ((href === 'news' && op === 'news') || (href === 'newest' && op === 'newest')) a.className = '__on';
    groupe1.appendChild(a);
  }
  side.appendChild(groupe1);

  /* Les six liens natifs que la maquette ne montre pas. DEPLACES, jamais
     clones : la premisse 3 du systeme dit que le HTML fonctionnel reste
     ATTEIGNABLE, et la presentation a le droit de le relocaliser. Les cloner
     doublerait chaque href et le test de conservation le verrait. */
  const groupe2 = document.createElement('div');
  groupe2.className = '__nav-2';
  for (const href of ['front', 'newcomments', 'ask', 'show', 'jobs', 'submit']) {
    const a = barre.querySelector(`.pagetop a[href="${href}"]`);
    /* detache AVANT insere : ces liens existent deja dans .pagetop, ce n'est
       pas un noeud neuf. Voir le commentaire sur le logo ci-dessus. */
    if (a) { detache(a); insere(groupe2, a, null); }
  }
  side.appendChild(groupe2);

  /* Explore pointe vers newest, dont le lien natif vit dans .pagetop. Il est
     deplace hors ecran plutot que supprime : le supprimer perdrait un href. */
  const natifNewest = barre.querySelector('.pagetop a[href="newest"]');
  if (natifNewest) {
    addClass(natifNewest, '__range');
    detache(natifNewest);
    insere(groupe2, natifNewest, null);
  }

  /* T22 — l'interrupteur, en pied de sidebar. Il affiche l'ETAT courant et
     non l'action : « auto » dit ou on en est. */
  lienTheme = document.createElement('a');
  lienTheme.className = '__theme';
  lienTheme.href = 'javascript:void(0)';
  lienTheme.textContent = litTheme();
  lienTheme.addEventListener('click', () => {
    poseTheme(THEMES[(THEMES.indexOf(litTheme()) + 1) % THEMES.length]);
  });
  side.appendChild(lienTheme);
  undo.push(() => { lienTheme = null; });

  /* Le decalage de la colonne vit dans la feuille, pas en style inline : une
     regle sous .${ROOT} disparait avec la classe racine, donc revert() n'a
     rien a defaire. Un setStyle ici ferait le meme travail deux fois. */
  insere(document.body, side, document.body.firstChild);

  /* Les separateurs « | » de .pagetop sont des noeuds texte litteraux : aucune
     regle CSS ne les atteint, il faut les retirer du DOM. */
  barre.querySelectorAll('.pagetop').forEach(p => {
    [...p.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.includes('|'))
      .forEach(detache);
  });
}

/* -------------------------------------------------- la coquille : l'en-tete
   La premiere ligne de #hnmain — le bandeau orange natif — devient l'en-tete.
   Trois cellules, que HN sert deja : le logo (parti dans la sidebar), les
   liens (partis aussi), et login a droite. On y remet trois choses.

   Le formulaire de recherche N'EST PAS FABRIQUE : HN en sert un dans son pied
   de page, <form action="//hn.algolia.com/">. On le DEPLACE. Un formulaire
   fabrique dupliquerait une fonction existante, et le zero requete reseau
   tient parce qu'un action de formulaire n'est qu'une cible de navigation. */
function entete() {
  const barre = barreDeTete();
  if (!barre) return;
  addClass(barre, '__entete');

  const cellules = [...barre.querySelectorAll('td')];
  const [gauche, centre, droite] = cellules;
  if (!gauche || !centre || !droite) return;

  /* 1. Le titre. b.hnname vit dans .pagetop de la cellule du milieu ; on le
     deplace dans la cellule de gauche, ou il devient le titre de page.
     detache AVANT insere, pour tout noeud qui existait deja dans la page.
     L'undo d'insere() est un simple remove() : juste pour un noeud neuf ou
     clone, faux pour une relocalisation — le noeud ne reviendrait jamais a
     son parent d'origine. */
  const nom = barre.querySelector('.hnname');
  if (nom) { addClass(nom, '__titre'); detache(nom); insere(gauche, nom, null); }

  /* 2. La recherche. */
  const forme = document.querySelector('form[action*="hn.algolia.com"]');
  if (forme) {
    addClass(forme, '__rech');
    const champ = forme.querySelector('input[name="q"]');
    /* Deux mutations sur le meme champ plus loin (placeholder ajoute, size
       retire). Les defaire attribut par attribut rend chaque valeur mais
       pas leur ORDRE d'origine : setAttribute() sur un attribut absent ne
       le remet pas forcement a sa position — verifie sous linkedom, il le
       PREPEND, et la comparaison a l'octet voit l'ordre inverse. Un clone
       shallow, pris avant toute mutation, encode l'ordre exact tel que le
       moteur l'a serialise ; le restaurer par un remplacement unique bat le
       rejouer attribut par attribut, meme raisonnement que setStyle pour
       l'attribut style brut.

       Cet undo doit etre EMPILE avant celui des noeuds texte ci-dessous :
       leur propre undo reinsere chaque noeud juste avant champ, et ca ne
       marche que si champ est encore un enfant de forme a ce moment-la —
       LIFO l'exige donc en dernier, empile en premier. */
    if (champ) {
      const pristine = champ.cloneNode(false);
      undo.push(() => champ.parentNode.replaceChild(pristine, champ));
    }
    /* Le libelle « Search: » est un noeud texte litteral, hors de tout
       element : aucune regle CSS ne l'atteint. Il devient le placeholder. */
    [...forme.childNodes].filter(n => n.nodeType === 3).forEach(detache);
    if (champ) {
      champ.setAttribute('placeholder', 'Search stories, comments, or users');
      champ.removeAttribute('size');
      insere(forme, icone('search'), forme.firstChild);
    }
    /* Le formulaire lui-meme existait deja dans le pied de page : meme regle
       detache/insere que le titre ci-dessus, pas une exception. */
    detache(forme);
    insere(centre, forme, null);
  }

  /* 3. La pastille. Pas d'avatar : HN n'en sert aucun, et en inventer un
     serait la seule donnee fabriquee du projet. L'initiale du pseudo dit la
     meme chose et elle est vraie. */
  const pseudo = utilisateur();
  if (pseudo) {
    const moi = document.createElement('a');
    moi.className = '__moi';
    moi.href = `user?id=${pseudo}`;
    moi.textContent = pseudo[0].toUpperCase();
    moi.setAttribute('title', pseudo);
    insere(droite, moi, droite.firstChild);
  }
}

/* --------------------------------------------------- la coquille : onglets
   Les trois routes existent. /best n'est pas dans la navbar native de HN —
   c'est le seul lien de la coquille qui ne relocalise pas un lien existant,
   et c'est assume : la route repond.

   AU PLUS un actif. Si op ne correspond a aucune des trois, aucun ne l'est :
   un defaut sur Top mentirait sur /ask ou /show. */
const ONGLETS = [['Top', 'news'], ['New', 'newest'], ['Best', 'best']];

function onglets() {
  const corps = conteneurLignes();
  const premiere = corps && corps.firstElementChild;
  if (!premiere) return;
  /* Le discriminant de /item est table.fatitem — .athing.submission existe sur
     les deux pages. Sans ce test, un fil de commentaires gagnerait des onglets
     de liste. */
  if (document.querySelector('#hnmain table.fatitem')) return;

  const op = document.documentElement.getAttribute('op');
  const tr = document.createElement('tr');
  tr.className = '__onglets';
  const td = document.createElement('td');
  const boite = document.createElement('div');
  for (const [libelle, href] of ONGLETS) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = libelle;
    if (op === href) a.className = '__on';
    boite.appendChild(a);
  }
  td.appendChild(boite);
  tr.appendChild(td);
  insere(corps, tr, premiere.nextSibling);
}

/* ---------------------------------------------------- la coquille : la carte
   Aucune restructuration du DOM. HN sert deja trois cellules par ligne — le
   rang, la fleche de vote, le titre — et elles tombent exactement aux trois
   emplacements de la maquette une fois la tr passee en grille. Seule la ligne
   de metadonnee est clonee dans la troisieme cellule.

   CLONER et non deplacer : les scripts de HN referencent ces noeuds. Les
   clones perdent leur id — deux #score_<n> dans un meme document casseraient
   getElementById.

   Ce qui a disparu avec la phase 3 : la ponderation par score. Les titres
   allaient de 15,5 a 19px selon le score. Trois lignes empilees dans une
   carte de hauteur fixe ne le supportent pas — la carte se deforme, ou la
   metrique cesse d'etre verifiable. Titre fixe a 17px. C'est la seule
   fonctionnalite que ce chantier supprime ; voir la spec, section 4.4. */
function cartes() {
  /* .athing.submission existe sur /news ET sur /item — 30 lignes d'un cote,
     1 de l'autre. Seul /item l'enveloppe dans <table class="fatitem">. Sans
     ce filtre, cartes() reecrirait la tete d'un fil de commentaires. */
  const lignes = [...document.querySelectorAll('#hnmain tr.athing.submission')]
    .filter(tr => !tr.closest('table.fatitem'));
  if (!lignes.length) return;

  for (const tr of lignes) {
    const titleline = tr.querySelector('.titleline');
    const suivante = tr.nextElementSibling;
    /* Les posts d'emploi n'ont PAS de span.subline : leur td.subtext porte
       l'age et hide en enfants directs. Sans ce repli, un post sur trente
       reste non traite — visible immediatement, il garde sa hauteur native. */
    const subline = suivante && (suivante.querySelector('.subline') || suivante.querySelector('td.subtext'));
    if (!titleline || !subline) continue;

    addClass(tr, '__card');

    /* Le point du rang est un noeud texte litteral : « 1. ». Aucune regle CSS
       ne l'atteint, comme les separateurs « | » de la navbar. */
    const rang = tr.querySelector('.rank');
    if (rang) {
      const t = rang.firstChild;
      if (t && t.nodeType === 3) {
        const propre = document.createTextNode(t.textContent.replace('.', '').trim());
        insere(rang, propre, t);
        detache(t);
      }
    }

    /* Le domaine passe sur sa propre ligne. .sitebit contient des parentheses
       litterales autour du lien : elles sautent avec la ligne. */
    const sitebit = titleline.querySelector('.sitebit');
    if (sitebit) {
      addClass(sitebit, '__site');
      [...sitebit.childNodes].filter(n => n.nodeType === 3).forEach(detache);
    }

    /* La metadonnee. */
    const m = document.createElement('span');
    m.className = '__m';
    const score = subline.querySelector('.score');
    const auteur = subline.querySelector('a.hnuser');
    const age = subline.querySelector('.age');
    /* Le lien de commentaires est le DERNIER a[href^="item?id="] de la ligne —
       l'age en contient un aussi, et il vient avant. Sur un post d'emploi il
       n'y a QUE celui de l'age : sans ce test, l'age etait clone deux fois et
       la carte affichait « 12 hours ago  12 hours ago ». */
    const items = [...subline.querySelectorAll('a[href^="item?id="]')];
    const dernier = items[items.length - 1];
    const commentaires = dernier && !dernier.closest('.age') ? dernier : null;

    if (score) {
      const g = document.createElement('span');
      g.className = '__pts';
      g.appendChild(icone('fleche'));
      g.appendChild(cloneSansId(score));
      m.appendChild(g);
    }
    if (auteur) {
      const a = cloneSansId(auteur);
      a.classList.add('__by');
      m.appendChild(a);
    }
    if (commentaires) {
      const g = document.createElement('span');
      g.className = '__c';
      g.appendChild(icone('bulle'));
      g.appendChild(cloneSansId(commentaires));
      m.appendChild(g);
    }
    if (age) m.appendChild(cloneSansId(age));
    insere(titleline, m, null);

    const hide = subline.querySelector('a[href^="hide?"]');
    if (hide) {
      const h = cloneSansId(hide);
      h.className = '__hide';
      insere(tr.lastElementChild, h, null);
    }

    /* La tr.spacer porte style="height:5px" en inline : le CSS ne la bat pas. */
    const espaceur = suivante.nextElementSibling;
    if (espaceur && espaceur.classList.contains('spacer')) setStyle(espaceur, 'height', '8px');
  }
}


/* ==========================================================================
   Phase 4 — le fil de commentaires
   ========================================================================== */

/* ------------------------------------------------------------ T4 le modele
   Un seul parcours produit tout ce dont les autres taches ont besoin. Et un
   seul endroit dans le fichier connait la conversion largeur -> profondeur :
   refined-hacker-news la duplique dans deux modules (img.width / 40), et les
   deux copies peuvent diverger. HN sert aussi l'attribut indent, plus fiable
   que la largeur d'une image qui peut ne pas etre chargee. */
/* L'indentation elle-meme (22px par palier, HN natif : 40) vit dans la
   feuille, en douze regles litterales. Ici ne reste que le plafond. */
const PROFONDEUR_MAX = 11; /* au-dela, la mesure passerait sous 420px */

const profondeurDe = tr => {
  const ind = tr.querySelector('td.ind');
  if (!ind) return 0;
  const attr = ind.getAttribute('indent');
  if (attr !== null && attr !== '') return parseInt(attr, 10) || 0;
  const img = ind.querySelector('img');
  return img ? Math.round(img.width / 40) : 0;
};

function buildModel() {
  const rangs = [...document.querySelectorAll('#hnmain tr.athing.comtr')];
  const racine = { el: null, depth: -1, n: rangs.length, textLen: 0, parent: null, children: [] };
  const pile = [racine];
  const liste = [];

  for (const el of rangs) {
    const depth = profondeurDe(el);
    const togg = el.querySelector('a.togg');
    const texte = el.querySelector('.commtext');
    const noeud = {
      el, togg, depth,
      id: el.id,
      n: togg ? (parseInt(togg.getAttribute('n'), 10) || 0) : 0,
      textLen: texte ? texte.textContent.trim().length : 0,
      parent: null,
      children: [],
    };
    /* La pile est indexee par profondeur : pile[d] est le dernier noeud vu a
       cette profondeur. Le parent d'un noeud de profondeur d est pile[d]. */
    pile.length = depth + 1;
    const parent = pile[depth] || racine;
    noeud.parent = parent;
    parent.children.push(noeud);
    pile[depth + 1] = noeud;
    liste.push(noeud);
  }

  /* Volume de texte du sous-arbre, en remontant : chaque noeud est vu apres
     ses enfants puisque la liste est en ordre document. */
  for (let i = liste.length - 1; i >= 0; i--) {
    const noeud = liste[i];
    noeud.volume = noeud.textLen + noeud.children.reduce((s, c) => s + c.volume, 0);
    noeud.taille = 1 + noeud.children.reduce((s, c) => s + c.taille, 0);
  }
  racine.volume = racine.children.reduce((s, c) => s + c.volume, 0);
  racine.taille = racine.children.reduce((s, c) => s + c.taille, 0);

  return { racine, liste };
}

/* ----------------------------------------------------------- T5 le repli
   a.togg est une BASCULE, pas un setter. Appeler click() sans lire l'etat
   d'abord de-replie les commentaires que HN avait deja replies — la fixture
   en contient toujours quelques-uns, morts ou replies par l'auteur. */
const estReplie = noeud => !!noeud.el && noeud.el.classList.contains('coll');

function collapse(noeud, veutReplie) {
  if (!noeud.togg || estReplie(noeud) === veutReplie) return false;
  noeud.togg.click();
  return true;
}

/* ------------------------------------------------------------ T7 le spine
   Descente gloutonne depuis une racine VIRTUELLE qui regroupe tous les
   commentaires de profondeur 0. Sans ce point de depart explicite, deux
   implementations legitimes donnent deux colonnes differentes.

   Score = taille du sous-arbre, ponderee par la longueur moyenne de ses
   commentaires rapportee a la moyenne du fil. Le n brut choisit la branche la
   plus PEUPLEE, qui est souvent une querelle de mots ; le volume de texte brut
   choisit le monologue le plus long. La racine carree amortit la ponderation
   pour qu'un seul commentaire tres long ne batte pas une vraie discussion.

   Egalites departagees par l'ordre du document : sans ca le spine change d'un
   rechargement a l'autre sur la meme page. */
function scoreDeBranche(noeud, moyenneFil) {
  if (!noeud.taille) return 0;
  const moyenne = noeud.volume / noeud.taille;
  return noeud.taille * Math.sqrt(moyenne / (moyenneFil || 1));
}

function calculeSpine(modele) {
  const { racine, liste } = modele;
  if (!liste.length) return [];
  const moyenneFil = racine.volume / (racine.taille || 1);
  const chemin = [];
  let courant = racine;
  while (courant.children.length) {
    let meilleur = null, meilleurScore = -1;
    for (const enfant of courant.children) {
      const sc = scoreDeBranche(enfant, moyenneFil);
      if (sc > meilleurScore) { meilleurScore = sc; meilleur = enfant; }
    }
    chemin.push(meilleur);
    courant = meilleur;
  }
  return chemin;
}

/* --------------------------------------------------------- T6 la frontiere
   Replier les FRERES des noeuds du spine, jamais tous les non-spine. Replier
   un parent cache deja toute sa descendance ; cliquer aussi les descendants
   corrompt leur etat sans rien changer a l'ecran, et fait ~200 clics la ou 30
   suffisent. Verifiable : rouvrir une branche apres coup rend ses enfants
   dans leur etat d'origine. */
function frontiere(chemin) {
  const surLeSpine = new Set(chemin);
  const bord = [];
  for (const noeud of chemin) {
    for (const frere of noeud.parent.children) {
      if (!surLeSpine.has(frere)) bord.push(frere);
    }
  }
  return bord;
}

/* -------------------------------------------------- T12 les trois etats */
let modele = null;
let spine = [];
let spineActif = false;

/* TROIS etats, et deux instantanes pour les tenir. La distinction n'est pas
   cosmetique : sans elle, replier une branche a la main puis lancer le spine
   et le defaire ROUVRE cette branche — le retour ecrase un choix de lecture
   que personne n'a demande d'annuler.
     initial      l'etat au chargement, replis natifs de HN compris.
                  C'est la cible de revert(), l'echec ferme.
     avant-spine  l'etat juste avant que le spine ne soit applique.
                  C'est la cible de restaure(), le bouton « fil entier ».
     spine        la frontiere repliee. */
let etatInitial = null;
let etatAvantSpine = null;

const snapshot = () => new Set(modele.liste.filter(estReplie).map(n => n.id));
const repose = etat => { for (const noeud of modele.liste) collapse(noeud, etat.has(noeud.id)); };

function appliqueSpine() {
  if (spineActif) return;
  etatAvantSpine = snapshot();
  spine = calculeSpine(modele);
  for (const noeud of frontiere(spine)) collapse(noeud, true);
  spineActif = true;
  majLienSpine();
  majBarre();
}

function restaure() {
  if (!spineActif) return;
  repose(etatAvantSpine);
  spineActif = false;
  majLienSpine();
  majBarre();
}

/* ------------------------------------------------------- T9 le clavier
   Trois garde-fous, et le premier est le plus important : tant qu'un champ a
   le focus, aucune touche ne nous appartient. Sans lui, taper « jkjk » dans
   une reponse navigue dans le fil au lieu d'ecrire. */
const estSaisie = el => !!el && (
  el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
  el.tagName === 'SELECT' || el.isContentEditable
);

/* Un commentaire masque n'est pas une cible. D10 laissait deux options —
   sauter, ou deplier l'ancetre. On SAUTE : deplier annulerait le repli que
   l'utilisateur vient de demander, et c'est tout l'objet du Thread Spine. */
const estVisible = noeud => !!noeud.el && !noeud.el.classList.contains('noshow');

let actif = -1;

function vaVers(index) {
  const l = modele.liste;
  if (!l.length) return;
  const borne = Math.max(0, Math.min(index, l.length - 1));
  if (actif >= 0 && l[actif]) l[actif].el.classList.remove('__actif');
  actif = borne;
  const noeud = l[actif];
  noeud.el.classList.add('__actif');
  noeud.el.scrollIntoView({ block: 'center' });
  majBarre();
}

function bouge(sens) {
  const l = modele.liste;
  let i = actif;
  do { i += sens; } while (i >= 0 && i < l.length && !estVisible(l[i]));
  if (i < 0 || i >= l.length) return;
  vaVers(i);
}

function surTouche(e) {
  if (estSaisie(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
  const l = modele.liste;
  switch (e.key) {
    case 'j':
      if (actif < 0) { const i = l.findIndex(estVisible); if (i >= 0) vaVers(i); }
      else bouge(1);
      break;
    case 'k': bouge(-1); break;
    case 'c': if (actif >= 0) { collapse(l[actif], !estReplie(l[actif])); majBarre(); } break;
    case 's': spineActif ? restaure() : appliqueSpine(); break;
    case 'Escape':
      if (actif >= 0) { l[actif].el.classList.remove('__actif'); actif = -1; majBarre(); }
      return;
    default: return;
  }
  e.preventDefault();
}

/* ----------------------------------------- T16.3 + T20 la barre de position
   Alignee sur la colonne de contenu et non sur la fenetre. Pleine largeur,
   elle se lit comme une barre d'etat de navigateur, pas comme une partie de
   la page. Visible seulement pendant la navigation clavier. */
let barre = null;

function majBarre() {
  if (!barre) return;
  if (actif < 0) { barre.style.display = 'none'; return; }
  const noeud = modele.liste[actif];
  const visibles = modele.liste.filter(estVisible).length;
  const rang = modele.liste.slice(0, actif + 1).filter(estVisible).length;
  const r = document.querySelector('#hnmain').getBoundingClientRect();
  barre.style.display = 'block';
  barre.style.left = r.left + 'px';
  barre.style.width = r.width + 'px';
  barre.textContent = `commentaire ${rang} / ${visibles}`
    + `  ·  profondeur ${noeud.depth}`
    + (spineActif ? '  ·  fil principal' : '')
    + '  ·  j k deplacer, c replier, s fil principal, esc sortir';
}

/* --------------------------------------------------------- mise en page */
let lienSpine = null;

function majLienSpine() {
  if (!lienSpine) return;
  lienSpine.classList.toggle('__on', spineActif);
  lienSpine.textContent = spineActif ? 'fil entier' : 'fil principal';
}

function habilleFil() {
  modele = buildModel();
  if (!modele.liste.length) return;
  etatInitial = snapshot();

  modele.liste.forEach((noeud, i) => {
    const { el, depth } = noeud;

    /* Indentation a 22px, par une classe de palier — voir la feuille. */
    addClass(el, '__i' + Math.min(depth, PROFONDEUR_MAX));

    /* 16px entre freres, 12px entre parent et premier enfant, 24px entre deux
       fils racine. Seul le JS connait la profondeur du voisin precedent. */
    const precedent = modele.liste[i - 1];
    if (!precedent) addClass(el, '__racine');
    else if (depth > precedent.depth) addClass(el, '__enfant');
    else if (depth === 0) addClass(el, '__racine');

    /* HN pose margin-bottom:-10px en style inline sur la div de comhead, ce
       qui colle la metadonnee au corps. 4px, comme le dit DESIGN.md. */
    const tete = el.querySelector('td.default > div');
    if (tete && tete.style.marginBottom) setStyle(tete, 'marginBottom', '4px');

    /* T16.1 — l'apercu du commentaire replie. Insere pour tous, revele par la
       classe coll que HN pose lui-meme : rien ne tourne au moment du repli. */
    const comhead = el.querySelector('.comhead');
    const texte = el.querySelector('.commtext');
    if (comhead && texte) {
      const brut = texte.textContent.trim().replace(/\s+/g, ' ');
      const apercu = document.createElement('span');
      apercu.className = '__apercu';
      apercu.textContent = ' ' + (brut.length > 90 ? brut.slice(0, 90) + '…' : brut);
      insere(comhead, apercu, null);
    }

    /* Le tr doit pouvoir recevoir le focus pour que :focus-within fonctionne
       et que les lecteurs d'ecran suivent la navigation J/K. */
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '-1');
      undo.push(() => el.removeAttribute('tabindex'));
    }
  });

  /* T16.2 — le lien Thread Spine, dans la meta du fil. Un lien, pas un
     bouton : HN n'a que des liens. */
  const meta = document.querySelector('#hnmain .fatitem .subline');
  if (meta) {
    const sep = document.createTextNode(' | ');
    lienSpine = document.createElement('a');
    lienSpine.className = '__spine';
    lienSpine.href = 'javascript:void(0)';
    lienSpine.textContent = 'fil principal';
    lienSpine.addEventListener('click', () => { spineActif ? restaure() : appliqueSpine(); });
    insere(meta, sep, null);
    insere(meta, lienSpine, null);
  }

  /* T17 — le formulaire de reponse replie derriere un lien. */
  const form = document.querySelector('#hnmain form[action="comment"]');
  if (form) {
    const lien = document.createElement('a');
    lien.className = '__repondre';
    lien.href = 'javascript:void(0)';
    lien.textContent = 'repondre';
    lien.addEventListener('click', () => {
      form.classList.remove('__replie');
      lien.style.display = 'none';
      const zone = form.querySelector('textarea');
      if (zone) zone.focus();
    });
    addClass(form, '__replie');
    insere(form.parentNode, lien, form);
  }

  /* T16.3 — la barre de position. */
  barre = document.createElement('div');
  barre.className = '__barre';
  barre.style.display = 'none';
  insere(document.querySelector('#hnmain'), barre, null);

  document.addEventListener('keydown', surTouche, true);
  window.addEventListener('resize', majBarre);
  undo.push(() => {
    document.removeEventListener('keydown', surTouche, true);
    window.removeEventListener('resize', majBarre);
    if (actif >= 0 && modele.liste[actif]) modele.liste[actif].el.classList.remove('__actif');
    /* revert() vise l'etat INITIAL, pas l'etat d'avant-spine : l'echec ferme
       doit rendre la page telle qu'elle a ete servie, pas telle qu'elle etait
       il y a trois clics. */
    repose(etatInitial);
    spineActif = false;
    actif = -1; barre = null; lienSpine = null; modele = null; spine = []; spineActif = false;
  });

  portsRefinedHN();
}

/* ------------------------------------------------------------ T8 les ports
   Cinq modules de refined-hacker-news (Mihir Chaturvedi, MIT), reecrits pour
   lire buildModel() au lieu de refaire chacun leur propre querySelectorAll —
   c'est la duplication de img.width / 40 qui a motive T4. Attribution dans
   README.md. */
function portsRefinedHN() {
  /* 1. click-comment-indent-to-toggle — cliquer la gouttiere replie. Passe
        par collapse(), donc idempotent, ce que l'original n'etait pas. */
  for (const noeud of modele.liste) {
    const ind = noeud.el.querySelector('td.ind');
    if (!ind || !noeud.togg) continue;
    const clic = () => collapse(noeud, !estReplie(noeud));
    ind.addEventListener('click', clic);
    undo.push(() => ind.removeEventListener('click', clic));
  }

  /* 2. collapse-root-comment — replier le fil racine depuis n'importe lequel
        de ses descendants. L'original remontait le DOM ; le modele donne le
        parent directement. */
  for (const noeud of modele.liste) {
    /* Pas avant la profondeur 2 : a la profondeur 1 la racine est la ligne
       juste au-dessus, et un lien de plus dans la comhead coute plus qu'il ne
       rapporte. Le lien existe pour quand on est perdu, pas par symetrie. */
    if (noeud.depth < 2) continue;
    let racine = noeud;
    while (racine.parent && racine.parent.depth >= 0) racine = racine.parent;
    const comhead = noeud.el.querySelector('.comhead .navs') || noeud.el.querySelector('.comhead');
    if (!comhead) continue;
    const lien = document.createElement('a');
    lien.className = '__racine-lien';
    lien.href = 'javascript:void(0)';
    lien.textContent = ' [racine]';
    lien.addEventListener('click', () => {
      collapse(racine, true);
      racine.el.scrollIntoView({ block: 'start' });
    });
    insere(comhead, lien, null);
  }

  /* 3. backticks-to-monospace — les backticks deviennent du code. L'innerHTML
        d'origine est garde tel quel pour l'annulation. */
  const codeRe = /`([^`\n]+)`/g;
  for (const noeud of modele.liste) {
    const texte = noeud.el.querySelector('.commtext');
    if (!texte || !codeRe.test(texte.innerHTML)) continue;
    codeRe.lastIndex = 0;
    const avant = texte.innerHTML;
    texte.innerHTML = avant.replace(codeRe, '<code>$1</code>');
    undo.push(() => { texte.innerHTML = avant; });
  }

  /* 4. highlight-unread-comment — marquer ce qui est arrive depuis la
        derniere visite. localStorage au lieu de browser.storage.local, qui
        n'existe pas dans un userscript en @grant none. Rien n'est marque a la
        premiere visite : sans point de comparaison, tout serait neuf. */
  try {
    const CLE = 'hn-redesign-lu';
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
      const tout = JSON.parse(localStorage.getItem(CLE) || '{}');
      const maintenant = Date.now();
      for (const [k, v] of Object.entries(tout)) if (v.expire < maintenant) delete tout[k];
      const vus = new Set((tout[id] && tout[id].ids) || []);
      const ids = modele.liste.map(n => n.id);
      if (vus.size) {
        for (const noeud of modele.liste) {
          if (vus.has(noeud.id)) continue;
          const comhead = noeud.el.querySelector('.comhead');
          if (!comhead) continue;
          const marque = document.createElement('span');
          marque.className = '__neuf';
          marque.textContent = ' nouveau';
          insere(comhead, marque, comhead.firstChild);
        }
      }
      tout[id] = { expire: (tout[id] && tout[id].expire) || maintenant + 3 * 24 * 3600 * 1000,
                   ids: [...new Set([...ids, ...vus])] };
      localStorage.setItem(CLE, JSON.stringify(tout));
    }
  } catch (err) {
    /* Navigation privee, quota plein : le reste du script continue. */
  }

  /* 5. key-bindings-on-input-fields — Cmd+Entree envoie, Cmd+I met en
        italique. C'est le pendant de T9 : dans un champ, les touches
        appartiennent au champ, sauf avec un modificateur explicite. */
  const surChamp = e => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const el = e.target;
    if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return;
    if (e.key === 'Enter') { if (el.form) el.form.submit(); e.preventDefault(); }
    else if (e.key === 'i') {
      const { value, selectionStart: a, selectionEnd: b } = el;
      const sel = value.slice(a, b);
      if (value[a - 1] === '*' && value[b] === '*') {
        el.value = value.slice(0, a - 1) + sel + value.slice(b + 1);
        el.selectionStart = a - 1; el.selectionEnd = b - 1;
      } else {
        el.value = value.slice(0, a) + '*' + sel + '*' + value.slice(b);
        el.selectionStart = a + 1; el.selectionEnd = b + 1;
      }
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', surChamp, true);
  undo.push(() => document.removeEventListener('keydown', surChamp, true));
}


function apply() {
  if (!document.querySelector('#hnmain')) return false;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.classList.add(ROOT);
  poseTheme(litTheme());
  sidebar();
  entete();
  onglets();
  cartes();
  habilleFil();
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
window.hnRedesign = {
  apply, revert, ROOT, CSS,
  /* exposes pour les tests de rendu et pour la console */
  get modele() { return modele; },
  get spine() { return spine; },
  buildModel, collapse, calculeSpine, frontiere,
  appliqueSpine, restaure, estReplie, estVisible,
  icone, utilisateur, sidebar, entete, onglets, cartes,
};

})();
