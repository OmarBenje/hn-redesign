// ==UserScript==
// @name         T1 — spike Userscripts
// @namespace    hn-redesign
// @version      1
// @match        https://news.ycombinator.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

// Jetable. Repond a trois questions, et rien d'autre.
// Q1 charger    : le bandeau devient vert.
// Q2 recharger  : passer VERSION a 2, sauvegarder, recharger HN — le badge doit afficher 2.
// Q3 survivre   : quitter Safari (Cmd+Q), rouvrir, aller sur HN — le vert et le badge doivent etre la.

const VERSION = 1;

const bar = document.querySelector('#hnmain > tbody > tr:first-child > td');
if (bar) bar.style.background = '#12A150';

const badge = document.createElement('div');
badge.textContent = 'T1 v' + VERSION;
badge.style.cssText =
  'position:fixed;top:8px;right:8px;z-index:99999;background:#12A150;color:#fff;' +
  'font:600 13px/1 -apple-system,sans-serif;padding:6px 10px;border-radius:2px';
document.body.appendChild(badge);
