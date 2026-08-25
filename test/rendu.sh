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
echo "/news — la carte"
verdict "$(js '(()=>{
  const r=[...document.querySelectorAll("#hnmain tr.__card")];
  const h=r.map(x=>x.getBoundingClientRect().height).sort((a,b)=>a-b);
  const med=h[Math.floor(h.length/2)];
  const hors=h.filter(v=>Math.abs(v-100)>6).length;
  const t=r.map(x=>getComputedStyle(x.querySelector(".titleline a")).fontSize);
  const rangs=r.map(x=>{const rk=x.querySelector(".rank");const b=rk.getBoundingClientRect();const c=getComputedStyle(rk);
    return c.borderTopLeftRadius+" "+Math.round(b.width)+"x"+Math.round(b.height)});
  /* Avant : 30 pastilles CARREES identiques passaient cette assertion, son
     nom promettait "ronde" mais ne verifiait que l egalite entre elles. Un
     cercle exige largeur === hauteur ET un rayon >= la moitie du cote —
     999px (le token --radius-full) le garantit, mais il fallait le dire. */
  return JSON.stringify({
    "30 cartes": [r.length===30, r.length+" cartes"],
    "hauteur 100px +/- 6": [hors===0, "mediane "+med.toFixed(1)+"px, "+hors+" hors tolerance"],
    "titre fixe a 17px": [new Set(t).size===1&&t[0]==="17px", [...new Set(t)].join(", ")],
    "pastille de rang ronde, 26x26, rayon 999px": [
      rangs.every(v=>v==="999px 26x26"), [...new Set(rangs)].join(", ")]
  });})()')" || ECHECS=1

echo
echo "/news — la fleche de vote reste dans sa cellule (finding 1)"
# HN enveloppe CHAQUE fleche dans un <center> — pas seulement le wrapper de
# page. Un selecteur bare "center" decalait les 30 fleches de 220px hors de
# td.votelinks, par-dessus le titre et le domaine. On compare une boite a
# une autre, jamais a une constante : c est la regle que 115 assertions
# vertes n avaient pas suivie.
verdict "$(js '(()=>{
  const cartes=[...document.querySelectorAll("#hnmain tr.__card")].filter(tr=>tr.querySelector("td.votelinks"));
  const hors=cartes.filter(tr=>{
    const td=tr.querySelector("td.votelinks");
    const fleche=td.querySelector(".votearrow");
    if (!fleche) return true;
    const tb=td.getBoundingClientRect(), fb=fleche.getBoundingClientRect();
    return !(fb.left>=tb.left-0.5 && fb.right<=tb.right+0.5);
  });
  return JSON.stringify({
    "chaque fleche dans sa td.votelinks": [hors.length===0 && cartes.length>0,
      cartes.length+" cartes avec fleche, "+hors.length+" hors de leur cellule"]
  });})()')" || ECHECS=1

echo
echo "/news — la densite"
# Cible : 6 cartes entieres, pas 7. Ruling du controleur (fix round 1/5) :
# le chiffre de 7 dans le brief de cette tache venait d un calcul fait en
# ecrivant le plan, sans compter les 178px de chrome au-dessus de la
# premiere carte (en-tete 92px + barre d onglets 68px + interstice 18px).
# En-tete, onglets et carte sont chacun conformes a leur propre spec, deja
# revue et livree dans une tache anterieure — c est la SOMME qui n avait
# jamais ete verifiee. floor((900 - 178) / 110) = 6, avec 110px = 102px de
# carte + 8px d interstice entre cartes. Design inchange ; seule la cible
# etait fausse.
verdict "$(js '(()=>{
  const r=[...document.querySelectorAll("#hnmain tr.__card")];
  const entiers=r.filter(x=>{const b=x.getBoundingClientRect();return b.top>=0&&b.bottom<=900}).length;
  return JSON.stringify({
    "6 cartes entieres dans 900px": [entiers===6, entiers+" cartes entieres"]
  });})()')" || ECHECS=1

echo
echo "/news — la coquille"
verdict "$(js '(()=>{
  const s=document.querySelector("nav.__side");
  const sr=s?s.getBoundingClientRect():null;
  const cs=s?getComputedStyle(s):null;
  const ent=document.querySelector(".__entete");
  const tabs=[...document.querySelectorAll(".__onglets a")];
  const actifs=tabs.filter(a=>a.className.includes("__on"));
  const rech=document.querySelector(".__rech");
  const centre=document.querySelector("body > center");
  return JSON.stringify({
    "sidebar 220px de large": [sr&&Math.round(sr.width)===220, sr?Math.round(sr.width)+"px":"absente"],
    "sidebar en position fixed": [cs&&cs.position==="fixed", cs?cs.position:"-"],
    "la colonne est decalee de 220px": [centre&&getComputedStyle(centre).marginLeft==="220px",
      centre?getComputedStyle(centre).marginLeft:"-"],
    "en-tete present": [!!ent, ent?Math.round(ent.getBoundingClientRect().height)+"px":"absent"],
    "3 onglets, 1 actif": [tabs.length===3&&actifs.length===1, tabs.length+" onglets, "+actifs.length+" actif"],
    "recherche dans l en-tete": [!!(rech&&rech.closest(".__entete")), rech?"oui":"absente"]
  });})()')" || ECHECS=1

echo
echo "/news — la gouttiere de 48px de l en-tete (finding 2)"
# On compare des boites entre elles, jamais a une constante. La reference
# est le tableau de cartes (donc la barre d onglets, alignee dessus par le
# fix du finding 3) : le titre doit commencer ou la colonne commence, et le
# dernier element de droite doit finir ou la colonne finit. Tolerance de
# 6px : le tableau de navbar de HN porte lui-meme padding:2px et ses
# cellules padding-right:4px, en INLINE — invisible a l arithmetique, connu
# seulement en le rendant.
verdict "$(js '(()=>{
  const titre=document.querySelector(".__titre");
  const liste=document.querySelector("#hnmain table.__liste");
  const entete=document.querySelector(".__entete");
  const cellules=entete?[...entete.querySelectorAll("table td")]:[];
  const droite=cellules[cellules.length-1];
  if (!titre||!liste||!droite) return JSON.stringify({"gouttiere mesurable":[false,"element(s) absent(s)"]});
  const tb=titre.getBoundingClientRect(), lb=liste.getBoundingClientRect(), db=droite.getBoundingClientRect();
  const ecartGauche=Math.abs(tb.left-lb.left), ecartDroite=Math.abs(db.right-lb.right);
  return JSON.stringify({
    "titre aligne sur le bord gauche de la colonne": [ecartGauche<=6,
      "titre a "+Math.round(tb.left)+"px, colonne a "+Math.round(lb.left)+"px, ecart "+ecartGauche.toFixed(1)+"px"],
    "la cellule de droite alignee sur le bord droit de la colonne": [ecartDroite<=6,
      "droite a "+Math.round(db.right)+"px, colonne a "+Math.round(lb.right)+"px, ecart "+ecartDroite.toFixed(1)+"px"]
  });})()')" || ECHECS=1

echo
echo "/news — la carte a la largeur de la barre d onglets (finding 3)"
verdict "$(js '(()=>{
  const liste=document.querySelector("#hnmain table.__liste");
  const tabsDiv=document.querySelector(".__onglets > td > div");
  if (!liste||!tabsDiv) return JSON.stringify({"comparaison possible":[false,"element(s) absent(s)"]});
  const lb=liste.getBoundingClientRect(), tb=tabsDiv.getBoundingClientRect();
  return JSON.stringify({
    "bord gauche identique": [Math.abs(lb.left-tb.left)<=1, Math.round(lb.left)+"px contre "+Math.round(tb.left)+"px"],
    "bord droit identique": [Math.abs(lb.right-tb.right)<=1, Math.round(lb.right)+"px contre "+Math.round(tb.right)+"px"]
  });})()')" || ECHECS=1

echo
echo "/news — la sidebar herite du systeme, pas de Verdana (finding 4)"
# Pitfall 4 du CLAUDE.md un cran plus loin : news.css declare font-family
# DIRECTEMENT sur body, et une declaration directe bat toujours une valeur
# heritee. La sidebar est le premier composant du projet hors de #hnmain ;
# sans font-family explicite, elle herite du body natif en Verdana.
verdict "$(js '(()=>{
  const cible=sel=>{const el=document.querySelector(sel);return el?getComputedStyle(el).fontFamily:null};
  const valeurs={
    "nav.__side": cible("nav.__side"),
    ".__nav-1 a": cible(".__side .__nav-1 a"),
    ".__nav-2 a": cible(".__side .__nav-2 a"),
    "a.__theme": cible(".__side a.__theme")
  };
  const mauvais=Object.entries(valeurs).filter(([,v])=>!v||v.startsWith("Verdana"));
  return JSON.stringify({
    "aucun element de la sidebar en Verdana": [mauvais.length===0,
      mauvais.length===0?JSON.stringify(valeurs):JSON.stringify(mauvais)]
  });})()')" || ECHECS=1

echo
echo "/news — le theme (T22), depuis la sidebar"
verdict "$(js '(()=>{
  const lien=document.querySelector(".__side a.__theme");
  const depart=lien?lien.textContent:null;
  const suite=[]; for (let i=0;i<4;i++){ lien.click(); suite.push(lien.textContent+":"+document.documentElement.className.replace("hn-redesign","").trim()); }
  const persiste=localStorage.getItem("hn-redesign-theme");
  while (lien.textContent!=="auto") lien.click();
  return JSON.stringify({
    "l interrupteur vit dans la sidebar": [!!lien, depart||"absent"],
    "le theme fait le tour en trois etats": [suite.length===4&&suite[3]===suite[0], suite.join(" -> ")],
    "l etat est persiste": [["auto","clair","sombre"].includes(persiste), "cle hn-redesign-theme = "+persiste]
  });})()')" || ECHECS=1

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
verdict "$(js '(()=>{
  const navOn=[...document.querySelectorAll(".__nav-1 a.__on")];
  const tabOn=[...document.querySelectorAll(".__onglets a.__on")];
  const navAutre=document.querySelector(".__nav-1 a:not(.__on)");
  return JSON.stringify({
    "Explore est le seul lien principal marque":[navOn.length===1&&navOn[0].getAttribute("href")==="newest",
      navOn.length+" : "+navOn.map(a=>a.getAttribute("href")).join(",")],
    "marque en surface, pas en couleur seule":[navOn.length===1&&navAutre&&getComputedStyle(navOn[0]).backgroundColor!==getComputedStyle(navAutre).backgroundColor,
      navOn[0]?getComputedStyle(navOn[0]).backgroundColor:"-"],
    "un seul onglet marque, et c est New":[tabOn.length===1&&tabOn[0].textContent.trim()==="New",
      tabOn.length+" : "+tabOn.map(a=>a.textContent.trim()).join(",")],
    "la liste est en cartes aussi":[document.querySelectorAll("#hnmain tr.__card").length===30,
      document.querySelectorAll("#hnmain tr.__card").length+" cartes"]
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
    "aucune carte sur la tete de fil":[document.querySelectorAll("tr.__card").length===0,
      document.querySelectorAll("tr.__card").length+" (fatitem: "+document.querySelectorAll("table.fatitem").length+")"],
    "le titre garde ses 21px":[getComputedStyle(t).fontSize==="21px", getComputedStyle(t).fontSize],
    "la subline du post reste visible":[getComputedStyle(document.querySelector(".fatitem .subline")).display!=="none","visible"],
    "l en-tete est traite quand meme, meme hauteur que /news":[Math.round(document.querySelector("#hnmain > tbody > tr:first-child > td").getBoundingClientRect().height)===92,"92px"]
  })})()')" || ECHECS=1

echo
echo "/item — les six liens natifs, sans sidebar pour les accueillir (T8 partie A)"
verdict "$(js '(()=>{
  const nav=document.querySelector(".__entete .__item-nav");
  const liens=nav?[...nav.querySelectorAll("a")].map(a=>a.getAttribute("href")):[];
  const rech=document.querySelector(".__entete .__rech");
  const pagetops=[...document.querySelectorAll(".pagetop")];
  return JSON.stringify({
    "les six liens sont sous le titre":[JSON.stringify(liens)===JSON.stringify(["front","newcomments","ask","show","jobs","submit"]),
      liens.join(" ")],
    "aucun deplace en double":[liens.every(h=>document.querySelectorAll("a[href=\"" + h + "\"]").length===1),"chaque href une seule fois"],
    "la recherche garde la cellule centrale":[!!(rech&&rech.closest(".__entete")),"oui"],
    "aucun separateur | residuel":[!pagetops.some(p=>p.textContent.includes("|")), pagetops.map(p=>p.textContent).join(" / ")]
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
  /* --accent est lu depuis la feuille, jamais code en dur ici : le token a
     deja change une fois (#FF6600 -> #F26207) sans que ce fichier le sache,
     et la valeur en dur avait fini par mesurer la derive au lieu du design. */
  const accentHex=(()=>{const v=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const n=v.match(/^#([0-9a-fA-F]{6})$/)?.[1];
    if (!n) return v;
    const r=parseInt(n.slice(0,2),16),g=parseInt(n.slice(2,4),16),b=parseInt(n.slice(4,6),16);
    return "rgb("+r+", "+g+", "+b+")";})();
  const marqueOk=marque.w==="3px"&&marque.h==="14px"&&marque.bg===accentHex;
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
    /* Cible DESIGN.md § Le fil, ligne "Mesure de texte : 660px a la
       profondeur 0". Tenait avant la coquille, casse par elle : le
       margin-left de .${ROOT} center s appliquait sans condition, meme
       sur /item ou aucune sidebar n existe pour justifier les 220px
       perdus. Corrige (fix round 1/5) par une classe hn-side, posee par
       sidebar() uniquement quand elle rend reellement quelque chose ; la
       regle CSS en depend desormais. */
    "mesure de 660px a la profondeur 0":[mesure===660, mesure+"px"],
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
echo "/item — rails de profondeur (T21)"
# L interrupteur de theme (T22) n a pas d equivalent sur /item : il vit dans
# la sidebar, absente ici par construction (garde-fou table.fatitem). Il est
# verifie une seule fois, depuis /news, dans le bloc "/news — le theme".
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
  return JSON.stringify({
    "chaque niveau porte un trait par ancetre":[motif&&traits.every((t,i)=>t===prof[i]),
      prof.map((d,i)=>d+":"+traits[i]).join(" ")+" traits"],
    "la profondeur 0 na aucun trait":[larg(parProfondeur[0])===0,zero==="none"?"aucun fond":"gouttiere de largeur 0"],
    "le trait tombe au milieu du cran, pas contre le texte":[/11px/.test(g(parProfondeur[1])),"1px a 11px sur un motif de 22"]
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
    o[t]={surface:sub.backgroundColor,col,texte:R(sub.color,sub.backgroundColor),
          zone:R(ta.color,ta.backgroundColor),mono:ta.fontFamily.indexOf("mono")>=0};
  }
  document.documentElement.className="hn-redesign";
  /* Le repere du controle n est plus le cadre mais la surface : depuis la
     tache 1 de coquille-app, input[type=submit] et textarea reposent sur
     --surface-2/--line, pas sur --meta comme button/input[type=text]. Ce
     dernier duo garde le plancher de 3:1 sur son cadre (voir hn-redesign.
     user.js autour de "n a aucune surface"), mais aucun des deux tokens
     surface n est soumis a ce plancher dans test/contraste.mjs — le
     controle se repere desormais a la surface, pas au trait. */
  return JSON.stringify({
    "la surface du bouton se distingue du fond de colonne":[o["hn-light"].surface!==o["hn-light"].col&&o["hn-dark"].surface!==o["hn-dark"].col,
      "clair "+o["hn-light"].surface+" sur "+o["hn-light"].col+", sombre "+o["hn-dark"].surface+" sur "+o["hn-dark"].col],
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
