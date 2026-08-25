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
/* 28px reserves en bas : la barre de position est en position fixed et
   couvrirait le dernier commentaire du fil sans cette reserve. */
.${ROOT} #hnmain { background: var(--col); padding-bottom: 28px; }

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

/* T22 — l'interrupteur de theme. Un lien de plus dans la navbar, qui affiche
   l'etat courant plutot que l'action : « auto » dit ou on en est, « passer en
   sombre » dirait ou on va et laisserait ignorer d'ou on part. */
.${ROOT} #hnmain a.__theme { color: var(--meta); }

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
   par visibility:hidden — un display:none desalignerait un titre sur sept.

   Sauf quand ils echouent TOUS. Hacker News sert
   Content-Security-Policy: img-src 'self' https://account.ycombinator.com
   et bloque donc les 30 requetes. La regle « ne jamais display:none » existe
   pour eviter un alignement IRREGULIER ; quand rien ne charge, l'alignement
   est regulier de toute facon, et reserver 22px par ligne pour du vide serait
   payer une gouttiere qui ne montre jamais rien. */
.${ROOT} #hnmain .__fav {
  width: 14px; height: 14px; border-radius: var(--radius);
  vertical-align: -2px; margin-right: 8px;
}
.${ROOT}.__sans-fav #hnmain .__fav { display: none; }
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
  background: var(--col);
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
   a choisi de respecter ce choix. On corrige les couleurs, pas la voix. */
.${ROOT} #hnmain input[type="submit"],
.${ROOT} #hnmain button {
  font-family: var(--ui);
  font-size: 13px;
  color: var(--c00);
  background: var(--col);
  /* --meta et non --rail. Le systeme n'a aucune surface : ces controles sont
     du texte dans un cadre de 1px, et ce cadre est la SEULE chose qui les rend
     reperables. Il doit donc passer le plancher — --meta donne 5,09:1 en clair
     et 4,84:1 en sombre contre le fond de colonne, la ou --rail, fait pour
     disparaitre derriere le texte, tombe sous 1,5:1. */
  border: 1px solid var(--meta);
  border-radius: var(--radius);
  padding: 4px 12px;
}
.${ROOT} #hnmain textarea,
.${ROOT} #hnmain input[type="text"] {
  color: var(--c00);
  background: var(--col);
  border: 1px solid var(--meta);
  border-radius: var(--radius);
}

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

  /* L'interrupteur va dans la cellule de droite, a cote de login. Le comptage
     des liens natifs ne bouge pas : le notre porte la classe __theme. */
  const droite = [...barre.querySelectorAll('.pagetop')].pop();
  if (droite) {
    lienTheme = document.createElement('a');
    lienTheme.className = '__theme';
    lienTheme.href = 'javascript:void(0)';
    lienTheme.textContent = litTheme();
    lienTheme.addEventListener('click', () => {
      poseTheme(THEMES[(THEMES.indexOf(litTheme()) + 1) % THEMES.length]);
    });
    insere(droite, lienTheme, droite.firstChild);
    undo.push(() => { lienTheme = null; });
  }
}

/* ------------------------------------------------------------ la liste T23 */
const scoreDe = tr => {
  const s = tr.nextElementSibling && tr.nextElementSibling.querySelector('.score');
  return s ? parseInt(s.textContent, 10) || 0 : 0;
};

/* Si les 30 requetes de favicon echouent — c'est le cas sur la vraie page,
   la CSP de HN les bloque —, la gouttiere de 22px ne montrera jamais rien. */
const compteFav = { demandes: 0, echecs: 0 };

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
      compteFav.demandes++;
      img.src = 'https://www.google.com/s2/favicons?sz=32&domain='
              + encodeURIComponent(domaine.textContent.trim());
      img.addEventListener('error', () => {
        img.style.visibility = 'hidden';
        compteFav.echecs++;
        if (compteFav.echecs === compteFav.demandes) addClass(document.documentElement, '__sans-fav');
      });
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
  navbar();
  fusionner();
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
};

})();
