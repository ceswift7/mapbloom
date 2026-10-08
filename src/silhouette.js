/* ======================================================================
   SILHOUETTE QUIZ: the globe is hidden, a shape is shown, the answer is typed
   ====================================================================== */
const SIL_ALIAS=[["United States","United States of America","USA","US","America"],["United Kingdom","UK","Britain","Great Britain","England"],["Ivory Coast","Cote d’Ivoire","Cote dIvoire"],["Czechia","Czech Republic"],["Myanmar","Burma"],["Eswatini","Swaziland"],["Cabo Verde","Cape Verde"],["Vatican City","Vatican","Holy See"],["DR Congo","Democratic Republic of the Congo","Congo Kinshasa","DRC"],["Republic of the Congo","Congo Brazzaville","Republic of Congo","Congo"],["Timor-Leste","East Timor"],["North Macedonia","Macedonia"],["T\u00FCrkiye","Turkey","Turkiye"],["Palestine","State of Palestine"],["Russia","Russian Federation"],["South Korea","Republic of Korea"],["North Korea","DPRK"],["Laos","Lao PDR"],["Vietnam","Viet Nam"],["Micronesia","Federated States of Micronesia"],["Bahamas","The Bahamas"],["Gambia","The Gambia"],["Brunei","Brunei Darussalam"],["Syria","Syrian Arab Republic"],["Iran","Persia"],["Tanzania","United Republic of Tanzania"],["Moldova","Republic of Moldova"],["Bolivia","Plurinational State of Bolivia"],["Venezuela","Bolivarian Republic of Venezuela"],["S\u00E3o Tom\u00E9 and Pr\u00EDncipe","Sao Tome and Principe","Sao Tome"],["Saint Kitts and Nevis","St Kitts and Nevis","St Kitts"],["Saint Lucia","St Lucia"],["Saint Vincent and the Grenadines","St Vincent and the Grenadines","St Vincent"],["United Arab Emirates","UAE","Emirates"],["Netherlands","Holland"],["Guinea-Bissau","Guinea Bissau"],["Trinidad and Tobago","Trinidad"],["Bosnia and Herzegovina","Bosnia"],["Antigua and Barbuda","Antigua"],["Papua New Guinea","PNG"],["Central African Republic","CAR"],["Marshall Islands","Marshalls"],["Solomon Islands","Solomons"]];
let silOn=false,silMiss=0,silNames=null;
const silNorm=s=>String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/\bst\.?\s/g,"saint ").replace(/[^a-z0-9]+/g," ").trim().replace(/^the /,"");
function silBuild(){
  if(silNames)return;silNames={all:new Set(),byId:{}};
  const groups=SIL_ALIAS.map(g=>g.map(silNorm));
  Object.keys(FACTS).forEach(id=>{const n=silNorm(FACTS[id].n),set=new Set([n]);groups.forEach(g=>{if(g.includes(n))g.forEach(x=>set.add(x))});silNames.byId[id]=set;set.forEach(x=>silNames.all.add(x))});
}
function lev(a,b){const m=a.length,n=b.length;let p=[...Array(n+1).keys()];for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function silCheck(id,txt){
  const t=silNorm(txt);if(!t)return false;silBuild();
  const set=silNames.byId[id];if(set.has(t))return true;
  if(silNames.all.has(t))return false;                     // a real, different country: never forgiven as a typo
  for(const n of set)if(n.length>=6&&Math.abs(n.length-t.length)<=1&&lev(t,n)<=1)return true;
  return false;
}
function silShape(id){
  const f=byId[id];if(f._sil)return f._sil;
  if(f.geometry.type!=="MultiPolygon")return (f._sil=f);
  const ps=f.geometry.coordinates.map(co=>{const g={type:"Polygon",coordinates:co};return {co,a:d3.geoArea(g),c:d3.geoCentroid(g)}}).sort((a,b)=>b.a-a.a),m=ps[0];
  const keep=ps.filter(p=>p===m||d3.geoDistance(p.c,m.c)<.5);   // the mainland and its neighbours, not far-flung territories
  return (f._sil={type:"Feature",geometry:{type:"MultiPolygon",coordinates:keep.map(p=>p.co)}});
}
function silDraw(id){
  const feat=silShape(id),w=360,h=230,c=d3.geoCentroid(feat);
  const proj=d3.geoAzimuthalEqualArea().rotate([-c[0],-c[1]]).fitExtent([[18,14],[w-18,h-14]],feat);
  const sv=d3.select("#silSvg");sv.selectAll("*").remove();
  sv.append("path").attr("d",d3.geoPath(proj)(feat));
}
let silHideT=null;const silKeep=()=>{clearTimeout(silHideT);silHideT=null};   // a pending fade-out must never hide the next question box
function silResetCard(){$("silQ").textContent="Which country is this?";$("silShow").textContent="Reveal";$("silSkip").textContent="Skip";$("silSkip").hidden=false;$("silHint").classList.remove("bord");$("sil").classList.remove("hotdone")}
function silHide(){silKeep();silResetCard();HOT.on=false;$("silForm").hidden=false;$("hotList").innerHTML="";$("sil").classList.remove("hot");if(typeof US!=="undefined")US.hl=null,usHl();silOn=false;nmOn=false;hlSet(null);$("app").classList.remove("nameit");const e=$("sil");if(e){e.hidden=true;e.classList.remove("out","nameit")}$("silSvg").style.display="";$("app").classList.remove("silmode")}
/* ---- NAME IT: the country glows on the visible globe and you type its name (Quiz and Race) ---- */
function nameFly(id){const a=FACTS[id].a,k=a<2500?7:a<9000?5.5:a<30000?4:a<150000?2.8:a<600000?1.9:a<3e6?1.35:1;stopDrift();flyTo(LL(id),1100,Math.max(k,Math.min(zoomK,2.2)))}
function nameBegin(id,race){
  silKeep();silOn=false;nmOn=true;nmMiss=0;hideCard();$("app").classList.add("nameit");
  const box=$("sil");box.hidden=false;box.classList.remove("out");box.classList.add("nameit");$("silSvg").style.display="none";
  $("silQ").textContent="Which country is glowing?";$("silIn").value="";$("silSug").innerHTML="";
  $("silHint").textContent=race?"":(D.active?`Daily ${D.idx+1} of ${D.ids.length}`:"");
  $("silShow").textContent=race?"Skip \u00B7 +10s":"Reveal";$("silSkip").hidden=!!race;
  hlSet(id);nameFly(id);
  setTimeout(()=>{try{$("silIn").focus({preventScroll:true})}catch(e){}},80);
}
function nameFinish(shown){
  if(!nmOn)return;nmOn=false;hlSet(null);$("app").classList.remove("nameit");
  const e=$("sil");e.classList.add("out");silKeep();silHideT=setTimeout(()=>{e.hidden=true;e.classList.remove("out","nameit");$("silSvg").style.display=""},420);
  success(shown);
}
function nameGuess(){
  const txt=$("silIn").value;if(!txt.trim())return;
  const race=S.mode==="speed",T=race?R.cur:S.target;if(!T)return;
  if(silCheck(T,txt)){
    if(race){$("silIn").value="";$("silSug").innerHTML="";hlSet(null);raceHit(T,LL(T))}else nameFinish(false);
    return;
  }
  const fm=$("silForm");fm.classList.remove("shake");void fm.offsetWidth;fm.classList.add("shake");
  if(race){racePen(`Not \u201C${txt.trim()}\u201D. +2s`);$("silIn").select();return}
  nmMiss++;S.tries++;S.streak=0;S.weak[T]=Math.min(10,(S.weak[T]||0)+2);save();sndMiss();
  const f=FACTS[T],hints=[`Not quite. It is in ${regName(f)}.`,`It starts with ${f.n[0].toUpperCase()}.`,`Its name has ${f.n.replace(/[^\p{L}]/gu,"").length} letters.`];
  $("silHint").textContent=S.hints?hints.slice(0,Math.min(3,nmMiss)).join(" ")+(nmMiss>=3?" You can also ask to be shown.":""):"Not quite.";
  $("silIn").select();
}
function silBegin(){
  silKeep();silResetCard();const id=S.target;silOn=true;silMiss=0;
  hideCard();
  $("app").classList.add("silmode");$("sil").hidden=false;$("sil").classList.remove("out");
  silDraw(id);
  $("silIn").value="";$("silSug").innerHTML="";$("silHint").textContent=D.active?`Daily ${D.idx+1} of ${D.ids.length}`:"";
  setTimeout(()=>{try{$("silIn").focus({preventScroll:true})}catch(e){}},80);
}
function silFinish(shown){
  if(!silOn)return;silOn=false;
  $("sil").classList.add("out");$("app").classList.remove("silmode");
  silKeep();silHideT=setTimeout(()=>{$("sil").hidden=true;$("sil").classList.remove("out")},520);
  success(shown);
}
function silGuess(){
  if(!silOn)return;
  const txt=$("silIn").value;if(!txt.trim())return;
  const T=S.target,f=FACTS[T];
  if(silCheck(T,txt))return silFinish(false);
  silMiss++;S.tries++;S.streak=0;S.weak[T]=Math.min(10,(S.weak[T]||0)+2);save();sndMiss();
  const fm=$("silForm");fm.classList.remove("shake");void fm.offsetWidth;fm.classList.add("shake");
  const hints=[`Not quite. It is in ${regName(f)}.`,`It starts with ${f.n[0].toUpperCase()}.`,`Its name has ${f.n.replace(/[^\p{L}]/gu,"").length} letters.`];
  $("silHint").textContent=S.hints?hints.slice(0,Math.min(3,silMiss)).join(" ")+(silMiss>=3?" You can also ask to be shown.":""):"Not quite.";
  $("silIn").select();
}
$("silForm").onsubmit=e=>{e.preventDefault();if(S.mode==="find"&&S.done&&!S.qIdle&&!modal.classList.contains("on")){nextRound();return}   // Enter again while the answer is settling goes straight to the next question
  if(HOT.on)hotGuess();else if(US.on)usNameGuess();else if(nmOn)nameGuess();else silGuess()};
$("silShow").onclick=()=>{if(HOT.on){if(HOT.done)hotStart();else hotGiveUp();return}if(US.on){if(S.mode==="speed")speedSkip();else if(!S.done)usSuccess(true);return}if(nmOn){if(S.mode==="speed")speedSkip();else nameFinish(true)}else silFinish(true)};
$("silSkip").onclick=()=>{if(HOT.on){sndTick();hotEnter();return}if(US.on&&S.mode!=="speed"){sndTick();usNext();return}if(nmOn&&S.mode!=="speed"){sndTick();nextRound();return}if(!silOn)return;sndTick();nextRound()};
/* Tab completes the typed text to the best match (press again to cycle through the others) */
let tabSeed=null,tabList=[],tabI=0;
function tabCands(t){
  if(US.on)return US.names.filter(n=>usNorm(n).includes(t)).sort((a,b)=>(usNorm(b).startsWith(t)?1:0)-(usNorm(a).startsWith(t)?1:0));
  return Object.keys(FACTS).filter(id=>silNorm(FACTS[id].n).includes(t)).sort((a,b)=>(silNorm(FACTS[b].n).startsWith(t)?1:0)-(silNorm(FACTS[a].n).startsWith(t)?1:0)).map(id=>FACTS[id].n);
}
$("silIn").addEventListener("keydown",e=>{
  if(e.key!=="Tab"||e.shiftKey||e.altKey||e.ctrlKey||e.metaKey)return;
  const inp=$("silIn"),v=inp.value;if(!v.trim())return;
  const cur=tabList[tabI];
  if(tabSeed===null||v!==cur){tabSeed=silNorm(v);tabList=tabCands(tabSeed);tabI=-1}
  if(!tabList.length)return;
  e.preventDefault();
  tabI=(tabI+1)%tabList.length;inp.value=tabList[tabI];
  inp.setSelectionRange(inp.value.length,inp.value.length);sndAccept();
  $("silSug").innerHTML="";
});
$("silIn").addEventListener("input",()=>{sndKey();
  const t=silNorm($("silIn").value),ul=$("silSug");ul.innerHTML="";
  if(t.length<2)return;
  const m=Object.keys(FACTS).filter(id=>silNorm(FACTS[id].n).includes(t)).sort((a,b)=>silNorm(FACTS[a].n).startsWith(t)===silNorm(FACTS[b].n).startsWith(t)?0:silNorm(FACTS[a].n).startsWith(t)?-1:1).slice(0,5);
  m.forEach(id=>ul.append(el("li",{},el("button",{type:"button",onclick:()=>{$("silIn").value=FACTS[id].n;ul.innerHTML="";$("silIn").focus()}},FACTS[id].n))));
});

