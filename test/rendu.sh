#!/usr/bin/env bash
# Verifie au RENDU ce que node ne peut pas voir : hauteurs, densite, couleurs
# calculees, et la reversibilite octet par octet du DOM.
#
#   ./test/rendu.sh
#
# Prerequis : les fixtures. ./design-refs/capture.sh ./design-refs/fixtures
# Moteur : Chromium headless via le binaire `browse` de gstack. Ce n'est PAS
# Safari — aucun test de ce depot ne l'est. Voir ROADMAP, phase 0.
set -uo pipefail
cd "$(dirname "$0")/.."

BROWSE=$(~/.claude/skills/browse/bin/find-browse 2>/dev/null)
[ -x "$BROWSE" ] || { echo "browse introuvable"; exit 1; }

FIX=design-refs/fixtures
[ -f "$FIX/news.html" ] || { echo "fixtures absentes — lancer ./design-refs/capture.sh $FIX"; exit 1; }

# browse refuse goto/screenshot hors de /private/tmp et du depot courant.
TMP=/private/tmp/hn-rendu
mkdir -p "$TMP"
cp "$FIX"/*.html "$TMP"/
cp hn-redesign.user.js "$TMP/us.js"

ECHECS=0
verdict() { # <json de {nom: [bool, detail]}>
  python3 - "$1" <<'PY'
import json,sys
try: d=json.loads(sys.argv[1])
except Exception: print("  ECHEC sortie illisible:", sys.argv[1][:400]); sys.exit(1)
bad=0
for nom,(ok,detail) in d.items():
    print(f"  {'ok  ' if ok else 'ECHEC'} {nom} — {detail}")
    bad += not ok
sys.exit(1 if bad else 0)
PY
}

page() { $BROWSE goto "file://$TMP/$1" >/dev/null 2>&1; }
js()   { $BROWSE js "$1" 2>/dev/null | tail -1; }

echo
echo "rendu — Chromium headless, 1400x1500"
echo

$BROWSE viewport 1400x1500 >/dev/null 2>&1

# ------------------------------------------------------------------ /news
page news.html
js "window.__av={html:document.querySelector('#hnmain').innerHTML,vote:document.querySelectorAll('a[href^=\"vote?\"]').length};1" >/dev/null
$BROWSE eval "$TMP/us.js" >/dev/null 2>&1
echo "/news — la ligne fusionnee (T23)"
verdict "$(js '(()=>{
  const r=[...document.querySelectorAll("#hnmain tr.athing.submission")];
  const t=r.map(x=>x.getBoundingClientRect().height).sort((a,b)=>a-b);
  const med=t[Math.floor(t.length/2)];
  const bas=r[r.length-1].getBoundingClientRect().bottom;
  const ls=r.map(x=>{const a=x.querySelector(".titleline a");const c=getComputedStyle(a);
    return {px:parseFloat(c.fontSize),ls:c.letterSpacing}});
  const viol=ls.filter(o=>(o.px<17&&!(o.ls==="normal"||parseFloat(o.ls)===0))||(o.px>=17&&parseFloat(o.ls)>=0));
  const px=ls.map(o=>o.px);
  const h=document.querySelector(".__hide"), hs=getComputedStyle(h);
  const m=document.querySelector(".__m");
  const C=s=>getComputedStyle(document.querySelector(s)).color;
  return JSON.stringify({
    "toutes les lignes fusionnees":[document.querySelectorAll("tr.__row").length===r.length,
      document.querySelectorAll("tr.__row").length+"/"+r.length],
    "hauteur mediane 32px +/- 2":[Math.abs(med-32)<=2, med+"px (min "+t[0]+", max "+t[t.length-1]+")"],
    ">= 30 posts entiers dans 1500px":[bas<=1500&&r.length>=30, r.length+" posts, bas a "+Math.round(bas)+"px"],
    "liens de vote intacts":[document.querySelectorAll("a[href^=\"vote?\"]").length===window.__av.vote,
      document.querySelectorAll("a[href^=\"vote?\"]").length+" avant et apres"],
    "ligne de metadonnee masquee":[getComputedStyle(document.querySelector("tr.__row + tr")).display==="none","display:none"],
    "taille ponderee, plancher 15,5px":[Math.min(...px)>=15.5&&Math.max(...px)<=19,
      Math.min(...px)+" a "+Math.max(...px)+"px"],
    "palier de tracking respecte":[viol.length===0, viol.length+" violation(s) sur "+ls.length],
    "hide hors flux et atteignable au Tab":[hs.position==="absolute"&&hs.opacity==="0"&&h.hasAttribute("href"),
      hs.position+", opacity "+hs.opacity+", href "+h.hasAttribute("href")],
    "le nombre de commentaires est le seul en accent":[(()=>{const acc=getComputedStyle(document.documentElement).getPropertyValue("--accent-text").trim();
      const hex=c=>"#"+c.match(/\d+/g).slice(0,3).map(n=>(+n).toString(16).padStart(2,"0")).join("").toUpperCase();
      return hex(C(".__m a.__c"))===acc.toUpperCase()&&hex(C(".__m .age a"))!==acc.toUpperCase()&&hex(C(".__m .score"))!==acc.toUpperCase()})(),
      "comm "+C(".__m a.__c")+", age "+C(".__m .age a")+", score "+C(".__m .score")],
    "aucune metadonnee dupliquee dans une ligne":[(()=>[...document.querySelectorAll(".__m")].every(m=>{
      const h=[...m.querySelectorAll("a")].map(a=>a.getAttribute("href")+"|"+a.textContent.trim());return new Set(h).size===h.length}))(),
      "l age et le lien commentaires partagent le meme href — c est le TEXTE qui les separe"],
    "aucun id duplique par les clones":[(()=>{const a=[...document.querySelectorAll("[id]")].map(e=>e.id);
      return new Set(a).size===a.length})(), [...document.querySelectorAll("[id]")].length+" id"]
  })})()')" || ECHECS=1

echo
echo "/news — la navbar (T24)"
verdict "$(js '(()=>{
  const td=document.querySelector("#hnmain > tbody > tr:first-child > td");
  const cs=getComputedStyle(td), b=td.getBoundingClientRect();
  const nav=[...document.querySelectorAll(".pagetop a")];
  return JSON.stringify({
    "hauteur totale 50px (border-box)":[Math.round(b.height)===50, Math.round(b.height)+"px, box-sizing "+cs.boxSizing],
    "filet orange de 3px":[cs.borderTopWidth==="3px"&&cs.borderTopColor==="rgb(255, 102, 0)", cs.borderTopWidth+" "+cs.borderTopColor],
    "le bandeau plein a disparu":[cs.backgroundColor!=="rgb(255, 102, 0)", cs.backgroundColor],
    "9 liens de navigation":[nav.length===9, nav.map(a=>a.textContent).join(" ")],
    "aucun separateur | litteral":[![...document.querySelectorAll(".pagetop")].some(p=>p.textContent.includes("|")),"0"],
    "aucun lien marque sur /news":[document.querySelectorAll(".pagetop a.__on").length===0,
      "op="+document.documentElement.getAttribute("op")]
  })})()')" || ECHECS=1

echo
echo "/news — reversibilite (T3)"
verdict "$(js '(()=>{window.hnRedesign.revert();
  const ap=document.querySelector("#hnmain").innerHTML, av=window.__av.html;
  let i=0; while(i<Math.min(av.length,ap.length)&&av[i]===ap[i])i++;
  return JSON.stringify({
    "#hnmain identique a l octet pres":[av===ap, av===ap?av.length+" caracteres":"diff a "+i+" : "+JSON.stringify(ap.slice(i-60,i+60))],
    "classe racine retiree":[document.documentElement.className==="", JSON.stringify(document.documentElement.className)],
    "feuille retiree":[!document.getElementById("hn-redesign-style"),"ok"],
    "HN au pixel":[getComputedStyle(document.querySelector(".titleline a")).fontFamily.startsWith("Verdana"),
      getComputedStyle(document.querySelector(".titleline a")).fontSize+" "+getComputedStyle(document.querySelector(".titleline a")).fontFamily]
  })})()')" || ECHECS=1

# --------------------------------------------------------------- /newest
echo
echo "/newest — la page active"
page newest.html
$BROWSE eval "$TMP/us.js" >/dev/null 2>&1
verdict "$(js '(()=>{const on=[...document.querySelectorAll(".pagetop a.__on")];
  return JSON.stringify({
    "un seul lien marque":[on.length===1, on.length+" : "+on.map(a=>a.getAttribute("href")).join(",")],
    "c est bien newest":[on.length===1&&on[0].getAttribute("href")==="newest", on[0]?on[0].getAttribute("href"):"aucun"],
    "marque en accent texte":[on.length===1&&getComputedStyle(on[0]).color!==getComputedStyle(document.querySelector(".pagetop a:not(.__on)")).color,
      on[0]?getComputedStyle(on[0]).color:"-"],
    "la liste est fusionnee aussi":[document.querySelectorAll("tr.__row").length>0,
      document.querySelectorAll("tr.__row").length+" lignes"]
  })})()')" || ECHECS=1

# ----------------------------------------------------------------- /item
echo
echo "/item — la tete de fil n est PAS fusionnee (garde-fou .fatitem)"
page item.html
$BROWSE eval "$TMP/us.js" >/dev/null 2>&1
verdict "$(js '(()=>{
  const t=document.querySelector(".fatitem .titleline > a");
  return JSON.stringify({
    "aucune ligne fusionnee":[document.querySelectorAll("tr.__row").length===0,
      document.querySelectorAll("tr.__row").length+" (fatitem: "+document.querySelectorAll("table.fatitem").length+")"],
    "le titre garde ses 21px":[getComputedStyle(t).fontSize==="21px", getComputedStyle(t).fontSize],
    "la subline du post reste visible":[getComputedStyle(document.querySelector(".fatitem .subline")).display!=="none","visible"],
    "la navbar est traitee quand meme":[Math.round(document.querySelector("#hnmain > tbody > tr:first-child > td").getBoundingClientRect().height)===50,"50px"]
  })})()')" || ECHECS=1

# ---------------------------------------------------------------- /login
echo
echo "/login — hors d atteinte par construction (T2)"
page login.html
js "window.__f=[...document.querySelectorAll('input')].map(e=>{const b=e.getBoundingClientRect();return [b.x,b.y,b.width,b.height,getComputedStyle(e).fontSize].join(',')});1" >/dev/null
$BROWSE eval "$TMP/us.js" >/dev/null 2>&1
verdict "$(js '(()=>{const ap=[...document.querySelectorAll("input")].map(e=>{const b=e.getBoundingClientRect();
    return [b.x,b.y,b.width,b.height,getComputedStyle(e).fontSize].join(",")});
  const bouges=ap.filter((v,i)=>v!==window.__f[i]);
  return JSON.stringify({
    "pas de #hnmain":[!document.querySelector("#hnmain"),"absent"],
    "classe racine non posee":[!document.documentElement.classList.contains("hn-redesign"),JSON.stringify(document.documentElement.className)],
    "feuille non injectee":[!document.getElementById("hn-redesign-style"),"aucune"],
    "les 7 input nont pas bouge dun pixel":[bouges.length===0&&ap.length===7, ap.length+" input, "+bouges.length+" deplace(s)"]
  })})()')" || ECHECS=1

echo
[ $ECHECS -eq 0 ] && echo "Tout tient." || echo "DES ECHECS."
exit $ECHECS
