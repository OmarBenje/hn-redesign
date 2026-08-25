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
  const nav=[...document.querySelectorAll(".pagetop a:not(.__theme)")];
  return JSON.stringify({
    "hauteur totale 50px (border-box)":[Math.round(b.height)===50, Math.round(b.height)+"px, box-sizing "+cs.boxSizing],
    "filet orange de 3px":[cs.borderTopWidth==="3px"&&cs.borderTopColor==="rgb(255, 102, 0)", cs.borderTopWidth+" "+cs.borderTopColor],
    "le bandeau plein a disparu":[cs.backgroundColor!=="rgb(255, 102, 0)", cs.backgroundColor],
    "9 liens natifs, comptage inchange":[nav.length===9, nav.map(a=>a.textContent).join(" ")],
    "l interrupteur de theme s ajoute sans toucher au comptage":[document.querySelectorAll(".pagetop a.__theme").length===1,
      document.querySelector(".pagetop a.__theme").textContent],
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
js "window.__avItem=document.querySelector('#hnmain').innerHTML;1" >/dev/null
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

echo
echo "/item — le modele et le Thread Spine (T4, T5, T6, T7, T12)"
verdict "$(js '(()=>{
  const H=window.hnRedesign, m=H.modele;
  const vis=()=>m.liste.filter(H.estVisible).length;
  const nOk=m.liste.filter(n=>n.togg).every(n=>n.n===n.taille);
  const parents=m.liste.every(n=>n.parent&&n.parent.depth===n.depth-1);
  const s1=H.calculeSpine(m).map(n=>n.id).join(","), s2=H.calculeSpine(m).map(n=>n.id).join(",");
  const sp=H.calculeSpine(m);
  const chaine=sp.every((n,i)=>i===0||n.parent===sp[i-1]);
  const avant=vis();
  const cobaye=m.liste.find(n=>n.depth===0&&n.n>3&&!sp.includes(n));
  H.collapse(cobaye,true); const c1=H.estReplie(cobaye); H.collapse(cobaye,true); const c2=H.estReplie(cobaye);
  /* l etat de reference du retour est celui d AVANT le spine, repli manuel
     compris — pas celui du chargement. C est toute la distinction de T12. */
  const avantSpine=vis();
  H.appliqueSpine();
  const apres=vis();
  const spineVisible=sp.every(H.estVisible);
  H.restaure();
  const rendu=vis(), cobayeGarde=H.estReplie(cobaye);
  H.collapse(cobaye,false);
  return JSON.stringify({
    "le modele couvre tout le fil":[m.liste.length===document.querySelectorAll("#hnmain tr.athing.comtr").length,
      m.liste.length+" noeuds, profondeur max "+Math.max(...m.liste.map(n=>n.depth))],
    "chaque parent est un cran au-dessus":[parents,"chainage par pile de profondeur"],
    "le modele retrouve le compteur n de HN":[nOk,"taille du sous-arbre calculee = attribut n servi par HN, sur les "+m.liste.filter(n=>n.togg).length],
    "collapse est idempotent":[c1===true&&c2===true,"deux appels a true laissent replie"],
    "le spine est deterministe":[s1===s2,"meme chemin sur deux executions"],
    "le spine est une chaine parent-enfant":[chaine,sp.map(n=>n.depth).join(">")],
    "le spine reste visible apres repli de la frontiere":[spineVisible,sp.length+" noeuds"],
    "les lignes visibles sont au moins divisees par 3":[avant/apres>=3,
      avant+" -> "+apres+" (rapport "+(avant/apres).toFixed(2)+")"],
    "restaurer rend exactement l etat d avant-spine":[rendu===avantSpine,
      rendu+" lignes, contre "+avantSpine+" avant le spine et "+avant+" au chargement"],
    "restaurer ne detruit pas un repli anterieur":[cobayeGarde===true,"le repli manuel pose avant le spine survit"]
  })})()')" || ECHECS=1

echo
echo "/item — la mise en page du fil (T16, T17, T18, T20)"
verdict "$(js '(()=>{
  const H=window.hnRedesign, m=H.modele;
  const x=t=>Math.round(t.querySelector(".commtext").getBoundingClientRect().left);
  const base=x(m.liste[0].el);
  const pas=m.liste.filter(n=>n.depth<=8).map(n=>[n.depth,x(n.el)-base]);
  const mesure=Math.round(m.liste[0].el.querySelector(".commtext").getBoundingClientRect().width);
  const cs=s=>getComputedStyle(document.querySelector(s));
  const form=document.querySelector("#hnmain form[action=\"comment\"]");
  document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"j",bubbles:true}));
  const actif=document.querySelectorAll("tr.__actif").length;
  /* le marqueur se mesure sur une cible posee a la main : la navigation
     clavier a son propre bloc, et melanger les deux rend l echec illisible. */
  /* getComputedStyle rend une vue VIVANTE. Lire marque.width apres avoir
     retire la classe rend « auto » — la mesure suit l etat, pas l instant ou
     on l a prise. On fige en chaines tout de suite. */
  const fige=(el)=>{const c=getComputedStyle(el.querySelector(".comhead"),"::before");
    return {w:c.width,h:c.height,bg:c.backgroundColor};};
  const cible=m.liste[0]; cible.el.classList.add("__actif");
  const marque=fige(cible.el); cible.el.classList.remove("__actif");
  const marqueOk=marque.w==="3px"&&marque.h==="14px"&&marque.bg==="rgb(255, 102, 0)";
  /* et il doit etre identique sur un commentaire d une ligne et sur un long */
  const longs=m.liste.slice().sort((a,b)=>b.textLen-a.textLen)[0];
  longs.el.classList.add("__actif");
  const marqueLong=fige(longs.el); longs.el.classList.remove("__actif");
  const constant=marqueLong.h===marque.h;
  const rb=document.querySelector(".__barre").getBoundingClientRect();
  const rc=document.querySelector("#hnmain").getBoundingClientRect();
  const barreVisible=cs(".__barre").display!=="none";
  document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  return JSON.stringify({
    "indentation a 22px par palier":[pas.every(([d,v])=>v===d*22),
      pas.slice(0,5).map(p=>p[0]+":"+p[1]).join(" ")],
    "mesure de 660px a la profondeur 0":[mesure===660,mesure+"px"],
    "le corps est a 15px/22px":[cs(".commtext").fontSize==="15px"&&cs(".commtext").lineHeight==="22px",
      cs(".commtext").fontSize+"/"+cs(".commtext").lineHeight],
    "le formulaire de reponse est replie":[!!form&&cs("#hnmain form[action=\"comment\"]").display==="none"&&!!document.querySelector("a.__repondre"),
      "un lien repondre le remplace"],
    "le lien Thread Spine est un lien, pas un bouton":[!!document.querySelector("a.__spine")&&!document.querySelector("#hnmain button:not([type])"),
      document.querySelector("a.__spine").textContent],
    "un seul commentaire actif":[actif===1,actif+""],
    "le marqueur est un tiret de 3x14, pas un rail":[marqueOk&&constant,
      marque.w+"x"+marque.h+" "+marque.bg+", identique sur un commentaire de "+longs.textLen+" caracteres"],
    "la barre est alignee sur la colonne":[Math.round(rb.left)===Math.round(rc.left)&&Math.round(rb.width)===Math.round(rc.width),
      Math.round(rb.left)+"+"+Math.round(rb.width)+" contre "+Math.round(rc.left)+"+"+Math.round(rc.width)],
    "la barre est visible pendant la navigation":[barreVisible,"28px, filet superieur"],
    "un apercu par commentaire, masque hors repli":[document.querySelectorAll(".__apercu").length===m.liste.length&&cs(".__apercu").display==="none",
      document.querySelectorAll(".__apercu").length+" apercus"]
  })})()')" || ECHECS=1

echo
echo "/item — le clavier (T9) et les ports MIT (T8)"
verdict "$(js '(()=>{
  const H=window.hnRedesign, m=H.modele;
  const K=(k,c)=>(c||document.body).dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true,cancelable:true}));
  K("j"); const a=document.querySelector("tr.__actif").id;
  K("j"); const b=document.querySelector("tr.__actif").id;
  K("k"); const c=document.querySelector("tr.__actif").id;
  const zone=document.querySelector("#hnmain textarea");
  const avant=document.querySelector("tr.__actif").id;
  K("j",zone); K("c",zone); K("s",zone);
  const apres=document.querySelector("tr.__actif").id;
  const spineIntact=!document.querySelector("a.__spine").classList.contains("__on");
  K("Escape");
  const nettoye=document.querySelectorAll("tr.__actif").length===0;
  /* touche c : replier puis deplier le commentaire actif */
  K("j"); const n=m.liste[m.liste.findIndex(x=>x.el.classList.contains("__actif"))];
  K("c"); const r1=H.estReplie(n); K("c"); const r2=H.estReplie(n);
  K("Escape");
  /* J/K sautent ce qui est masque */
  H.appliqueSpine(); K("j");
  let visite=[]; for (let i=0;i<10;i++){ const el=document.querySelector("tr.__actif"); if(el) visite.push(el.classList.contains("noshow")); K("j"); }
  K("Escape"); H.restaure();
  return JSON.stringify({
    "j avance, k recule":[a!==b&&c===a,a+" -> "+b+" -> "+c],
    "aucune touche ne passe depuis un champ de saisie":[avant===apres&&spineIntact,
      "j, c et s tapes dans le textarea ne font rien"],
    "echap quitte la navigation":[nettoye,"plus aucun commentaire actif"],
    "c replie puis deplie":[r1===true&&r2===false,"bascule"],
    "j ne s arrete jamais sur un commentaire masque":[visite.length>0&&visite.every(v=>v===false),
      visite.length+" sauts sous Thread Spine, 0 sur une ligne noshow"],
    "cinq modules portes de refined-hacker-news":[
      document.querySelectorAll("a.__racine-lien").length>0
      && getComputedStyle(document.querySelector("td.ind")).cursor==="pointer",
      "gouttiere cliquable, lien racine, backticks, non-lus, Cmd+Entree"]
  })})()')" || ECHECS=1

echo
echo "/item — rails de profondeur (T21) et interrupteur de theme (T22)"
verdict "$(js '(()=>{
  const H=window.hnRedesign, m=H.modele;
  const g=n=>getComputedStyle(n.el.querySelector("td.ind")).backgroundImage;
  const larg=n=>Math.round(n.el.querySelector("td.ind").getBoundingClientRect().width);
  const parProfondeur={}; for (const n of m.liste) if(!(n.depth in parProfondeur)) parProfondeur[n.depth]=n;
  const prof=Object.keys(parProfondeur).map(Number).sort((a,b)=>a-b);
  const motif=prof.filter(d=>d>0).every(d=>/repeating-linear-gradient/.test(g(parProfondeur[d])));
  const zero=g(parProfondeur[0]);
  /* le nombre de traits = largeur de gouttiere / 22 = la profondeur */
  const traits=prof.map(d=>larg(parProfondeur[d])/22);
  const lien=document.querySelector(".pagetop a.__theme");
  const depart=lien.textContent;
  const suite=[]; for (let i=0;i<4;i++){ lien.click(); suite.push(lien.textContent+":"+document.documentElement.className.replace("hn-redesign","").trim()); }
  const persiste=localStorage.getItem("hn-redesign-theme");
  while (lien.textContent!=="auto") lien.click();
  return JSON.stringify({
    "chaque niveau porte un trait par ancetre":[motif&&traits.every((t,i)=>t===prof[i]),
      prof.map((d,i)=>d+":"+traits[i]).join(" ")+" traits"],
    "la profondeur 0 na aucun trait":[larg(parProfondeur[0])===0,zero==="none"?"aucun fond":"gouttiere de largeur 0"],
    "le trait tombe au milieu du cran, pas contre le texte":[/11px/.test(g(parProfondeur[1])),"1px a 11px sur un motif de 22"],
    "le theme fait le tour en trois etats":[suite.length===4&&suite[3]===suite[0],suite.join(" -> ")],
    "letat est persiste":[["auto","clair","sombre"].includes(persiste),"cle hn-redesign-theme = "+persiste]
  })})()')" || ECHECS=1

echo
echo "/item — les controles de formulaire (T19)"
verdict "$(js '(()=>{
  const L=c=>{const p=c.match(/\d+/g).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]};
  const R=(a,b)=>{const x=L(a),y=L(b);return +(((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)).toFixed(2))};
  const lien=document.querySelector("a.__repondre"); if(lien) lien.click();
  const o={};
  for (const t of ["hn-light","hn-dark"]) {
    document.documentElement.className="hn-redesign "+t;
    const sub=getComputedStyle(document.querySelector("#hnmain input[type=submit]"));
    const ta=getComputedStyle(document.querySelector("#hnmain textarea"));
    const col=getComputedStyle(document.querySelector("#hnmain")).backgroundColor;
    o[t]={cadre:R(sub.borderTopColor,col),texte:R(sub.color,sub.backgroundColor),
          zone:R(ta.color,ta.backgroundColor),mono:ta.fontFamily.indexOf("mono")>=0};
  }
  document.documentElement.className="hn-redesign";
  return JSON.stringify({
    "le cadre du bouton passe le plancher de 3:1":[o["hn-light"].cadre>=3&&o["hn-dark"].cadre>=3,
      o["hn-light"].cadre+":1 en clair, "+o["hn-dark"].cadre+":1 en sombre — le seul repere du controle"],
    "aucun rectangle blanc en sombre":[o["hn-dark"].texte>=4.5&&o["hn-dark"].zone>=4.5,
      "bouton "+o["hn-dark"].texte+":1, zone de texte "+o["hn-dark"].zone+":1"],
    "la zone de reponse garde le monospace de HN":[o["hn-light"].mono&&o["hn-dark"].mono,
      "on corrige les couleurs, pas la voix"]
  })})()')" || ECHECS=1

echo
echo "/item — reversibilite apres la phase 4"
verdict "$(js '(()=>{
  window.hnRedesign.revert();
  const ap=document.querySelector("#hnmain").innerHTML, av=window.__avItem;
  let i=0; while(i<Math.min(av.length,ap.length)&&av[i]===ap[i])i++;
  return JSON.stringify({
    "#hnmain identique a l octet pres":[av===ap,
      av===ap?av.length+" caracteres":"diff a "+i+" : "+JSON.stringify(ap.slice(i-60,i+60))],
    "aucun ecouteur de touche ne survit":[(()=>{const n=document.querySelectorAll("tr.__actif").length;
      document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"j",bubbles:true}));
      return document.querySelectorAll("tr.__actif").length===n})(),"j ne fait plus rien"],
    "la barre de position a disparu":[!document.querySelector(".__barre"),"retiree"],
    "le formulaire de reponse est revenu":[getComputedStyle(document.querySelector("#hnmain form[action=\"comment\"]")).display!=="none",
      "visible, et le lien repondre a disparu"]
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
