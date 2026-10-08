/* ======================================================================
   ACHIEVEMENTS + TOASTS
   ====================================================================== */
const regDone=r=>playable.filter(f=>inReg(f.id,r)).every(f=>S.found.has(f.id));
const anyRuns=()=>Object.values(REC).some(x=>x&&x.runs&&x.runs.length);
const ACH=[
  {id:"first",n:"First Wash",i:"💧",d:"Paint your first country",t:()=>S.found.size>=1},
  {id:"ten",n:"Ten Strokes",i:"🖌️",d:"Paint 10 countries",t:()=>S.found.size>=10},
  {id:"half",n:"Halfway Round",i:"🧭",d:"Paint half the world",t:()=>S.found.size>=playable.length/2},
  {id:"all",n:"Cartographer",i:"🗺️",d:"Paint every country",t:()=>S.found.size>=playable.length},
  ...REGIONS.map(r=>({id:"reg"+r,n:(r==="Americas"?"All the Americas":"All of "+r),i:{Africa:"🦒",Americas:"🌎",Asia:"🏯",Europe:"🏰",Oceania:"🌊"}[r],d:"Paint every country in "+(r==="Americas"?"the Americas":r),t:()=>regDone(r)})),
  {id:"streak10",n:"Steady Hand",i:"🎯",d:"10 first-try finds in a row",t:()=>S.bestStreak>=10},
  {id:"read10",n:"Bookworm",i:"📖",d:"Read 10 country pages",t:()=>S.learned.size>=10},
  {id:"read50",n:"Scholar",i:"🎓",d:"Read 50 country pages",t:()=>S.learned.size>=50},
  {id:"readall",n:"Complete Library",i:"\u{1F4DA}",d:"Read every country page",t:()=>S.learned.size>=playable.length},
  {id:"flags",n:"Flag Fan",i:"🚩",d:"Name 20 countries from their flags",t:()=>S.counts.flag>=20},
  {id:"caps",n:"Capital Idea",i:"🏛️",d:"Name 20 countries from their capitals",t:()=>S.counts.capital>=20},
  {id:"race1",n:"First Race",i:"⏱️",d:"Finish a race",t:()=>anyRuns()},
  {id:"eu5",n:"Quick Europe",i:"⚡",d:"Race all of Europe in under 5 minutes",t:()=>bestOf("Europe")<300000},
  {id:"daily1",n:"Daily Habit",i:"📅",d:"Finish a daily challenge",t:()=>!!S.daily.last},
  {id:"daily3",n:"Three in a Row",i:"🔥",d:"A 3-day daily streak",t:()=>S.daily.streak>=3},
  {id:"sixty",n:"Sixty Seconds",i:"\u{23F1}",d:"Finish a daily in under a minute",t:()=>Object.values(S.daily.results).some(r=>r&&r.time&&r.time<60000)},
  {id:"shape",n:"Shape Shifter",i:"\u{1F537}",d:"Name 20 countries from their silhouettes",t:()=>(S.counts.sil||0)>=20},
  {id:"raceflag",n:"Flag Sprinter",i:"\u{1F3C1}",d:"Race all of Europe from flags",t:()=>!!(REC["Europe|flag"]&&REC["Europe|flag"].runs.length)},
  {id:"racecap",n:"Capital Sprinter",i:"\u{1F3D9}",d:"Race all of Europe from capitals",t:()=>!!(REC["Europe|capital"]&&REC["Europe|capital"].runs.length)},
  {id:"chain1",n:"Link by Link",i:"\u{1F517}",d:"Finish a neighbour chain",t:()=>(S.counts.chain||0)>=1},
  {id:"hot5",n:"Warm Hands",i:"\u{1F525}",d:"Find the hidden country in 5 guesses or fewer",t:()=>Object.values(S.counts.hotBest||{}).some(n=>n<=5)}
];
function checkExp(silent){
  EXPS.forEach(e=>{const ids=expIds(e);if(ids.length&&ids.every(id=>S.found.has(id))&&!S.expDone[e.id]){S.expDone[e.id]=Date.now();save();if(!silent)toast("\u{1F9ED}","Expedition complete: "+e.name,"Every place on this journey is painted in.",5200,()=>{sndTick();expSel=e.id;renderBook("exp",Math.floor((1+EXPS.indexOf(e))/2))})}});
}
function checkAch(){
  checkExp();
  ACH.forEach(a=>{if(!S.ach[a.id]&&a.t()){S.ach[a.id]=Date.now();toast(a.i,"Stamp earned: "+a.n,a.d,4600,()=>{if(S.mode==="speed"&&(R.phase==="run"||R.phase==="count")){toast("⏱️","Race in progress","Check your stamps when the race is over.");return}sndTick();renderStamps()});sndBadge();save()}});
}
let toastTm=null;
function toast(ic,title,text,ms=3800,onClick){
  const t=$("toast");t.innerHTML="";t.append(el("span",{class:"ic"},ic),el("div",{},el("b",{},title),el("div",{style:"font-size:13px;color:var(--ink-soft)"},text||"")));
  t.classList.toggle("click",!!onClick);t.tabIndex=onClick?0:-1;
  t.onclick=onClick?()=>{t.classList.remove("on");onClick()}:null;
  t.onkeydown=onClick?e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();t.classList.remove("on");onClick()}}:null;
  t.classList.add("on");clearTimeout(toastTm);toastTm=setTimeout(()=>t.classList.remove("on"),ms);
}

/* ======================================================================
   MODAL + MENU (play, records, stamps, sound)
   ====================================================================== */
const modal=$("modal");modal.inert=true;
function closeBtn(){return el("button",{class:"icon-btn x","aria-label":"Close",onclick:closeModal},"✕")}
function bkFit(){const sh=$("sheet");if(!sh.classList.contains("book"))return;sh.style.zoom="";if(innerWidth<720)return;const w=sh.offsetWidth,h=sh.offsetHeight+34+44,z=Math.min(1,(innerWidth-24)/w,(innerHeight-8)/h);sh.style.zoom=z<1?z.toFixed(3):""}   // the book keeps one size; a small window just shrinks all of it
window.addEventListener("resize",()=>{if(modal.classList.contains("on"))bkFit()});
let modalOpener=null;
function openModal(book){modalOpener=document.activeElement&&document.activeElement!==document.body?document.activeElement:modalOpener;modal.inert=false;try{const a=$("app");if(a&&!a.contains(modal))a.inert=true}catch(e){}$("sheet").style.zoom="";$("sheet").classList.toggle("book",book==="book");modal.classList.add("on");modal.setAttribute("aria-hidden","false");stopDrift()}
/* ---- the reading window: the country's pages beside the mastery path, closed whenever a quiz or exam starts so answers stay from memory ---- */
let rdWin=null;
function closeReader(){modal.classList.remove("rd");if(rdWin){rdWin.remove();rdWin=null;jrReset()}}
function openReader(id){
  closeReader();
  const f=FACTS[id],body=el("div",{class:"learn rdbody"}),win=el("aside",{class:"rdwin",role:"dialog","aria-label":"Read about "+f.n},
    el("div",{class:"rdhead"},FLAGS[id]?el("img",{src:FLAGS[id],alt:""}):"",el("b",{},f.n),el("button",{class:"icon-btn rdx","aria-label":"Close the pages",onclick:()=>{sndTick();closeReader()}},"✕")),body);
  document.body.append(win);rdWin=win;modal.classList.add("rd");   // wide screens: the sheet slides left to make room beside the window
  renderLearn(id,body,nid=>{openReader(nid)});
  win.animate([{opacity:0,transform:"translateY(10px) scale(.98)"},{opacity:1,transform:"none"}],{duration:reduced?1:260,easing:"ease-out"});
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&rdWin){e.stopPropagation();closeReader()}},true);
function closeModal(){if(typeof raceResume==="function")raceResume();closeReader();try{for(const k in BKpos)delete BKpos[k];for(const k in cbPos)delete cbPos[k]}catch(e){}   // leaving the book completely forgets every page: the next visit starts at page 1
  try{cbTimers.forEach(clearTimeout)}catch(e){}
  modal.classList.remove("on");modal.setAttribute("aria-hidden","true");modal.inert=true;try{$("app").inert=false}catch(e){}
  if(modalOpener&&modalOpener.isConnected){try{modalOpener.focus({preventScroll:true})}catch(e){}}modalOpener=null;scheduleDrift()}
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(modal.classList.contains("on"))closeModal()}});
const raceBusy=()=>S.mode==="speed"&&(R.phase==="run"||R.phase==="count");
function guardRace(){if(raceBusy()){toast("⏱️","Race in progress","The clock does not pause. Finish, or leave via Explore.");return true}return false}
$("stampBtn").onclick=()=>{if(guardRace())return;sndTick();renderAtlas()};

$("settingsBtn").onclick=()=>{if(guardRace())return;sndTick();renderSettings()};function isDark(){return S.theme==="dark"||(S.theme==="auto"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)}
let themeSwapping=false;
function syncThemeBtn(force){if(themeSwapping&&!force)return;const b=$("themeBtn");if(!b)return;const d=isDark();b.setAttribute("aria-label",d?"Switch to light mode":"Switch to dark mode");b.querySelector(".sun").style.display=d?"":"none";b.querySelector(".moon").style.display=d?"none":""}
function applyTheme(){const r=document.documentElement;if(S.theme==="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",S.theme);syncThemeBtn();cvColors();if(CANVAS&&W)requestRender()}
/* ---- the day/night switch: a wash of the new theme spreads out from the button, the theme changes underneath it while it covers the screen,
   and it lifts once the new globe, paper and background are all ready, so the switch never shows half-redrawn layers ---- */
function themeWillBeDark(k){return k==="dark"||(k==="auto"&&!!window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)}
let themeBusy=false;
function themeAnimate(k,srcEl,after){
  const dark=themeWillBeDark(k),apply=()=>{S.theme=k;save();applyTheme();clearTimeout(benchTm);benchTm=0;benchDraw();if(after)after()};
  if(reduced||themeBusy||dark===isDark()){apply();return}
  themeBusy=true;
  if(!document.startViewTransition){apply();themeBusy=false;return}
  // a plain cross fade: the browser keeps a picture of the old screen and fades it into the live new one.
  // The theme button plays along for the same length: it spins, the sun and moon swap at the halfway point, and a ring pulses out.
  const tb=$("themeBtn"),TD=640;themeSwapping=true;sndTheme(dark);tb.classList.remove("tswap");void tb.offsetWidth;tb.classList.add("tswap");
  setTimeout(()=>syncThemeBtn(true),TD/2);
  setTimeout(()=>{themeSwapping=false;tb.classList.remove("tswap");syncThemeBtn(true)},TD+40);
  const vt=document.startViewTransition(async()=>{
    apply();
    await new Promise(res=>setTimeout(res,100));   // the new screen is captured live, so the globe can finish recolouring during the fade
  });

  vt.finished.finally(()=>{themeBusy=false});
}function themeSeg(){const w=el("div",{class:"seg2"});[["auto","Auto"],["light","Light"],["dark","Dark"]].forEach(([k,l])=>w.append(el("button",{"aria-pressed":String(S.theme===k),onclick:e=>{sndTick();themeAnimate(k,e.currentTarget,renderSettings)}},l)));return w}
function unitSeg(){const w=el("div",{class:"seg2"});["mi","km"].forEach(u=>w.append(el("button",{"aria-pressed":String(S.unit===u),onclick:()=>{setUnit(u);renderSettings()}},u==="mi"?"Miles":"Kilometres")));return w}

function setUnit(u){S.unit=u;save();if($("card").classList.contains("on"))showCard(cardId,true)}
$("themeBtn").onclick=()=>{sndTick();themeAnimate(isDark()?"light":"dark",$("themeBtn"))};
if(window.matchMedia)matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(S.theme==="auto"){syncThemeBtn();cvColors();if(CANVAS)requestRender()}});
applyTheme();

function step(n,title,sub,ctl){return el("div",{class:"step"},el("i",{},String(n)),el("b",{},title),sub?el("small",{},sub):"",el("div",{class:"ctl"},ctl))}
function fold(title,content,open){const d=el("details",{class:"fold"},el("summary",{},title));if(open)d.open=true;d.append(content);return d}
function opt(title,sub,control){return el("div",{class:"opt"},el("div",{},el("b",{},title),sub?el("small",{},sub):""),control)}
function toggle(checked,fn,label){const i=el("input",{type:"checkbox","aria-label":label});i.checked=checked;i.onchange=()=>fn(i.checked);return el("label",{class:"sw"},i,el("i"))}
function sheetHead(title){const sh=$("sheet");sh.innerHTML="";sh.append(closeBtn(),el("h2",{},title));return sh}
function renderStamps(){renderBook("stamps")}
function renderAtlas(){renderBook("atlas")}
/* ---- the Atlas book: three bookmark tabs, two pages ---- */
const EXPS=[
  {id:"grand",name:"The Grand Expedition",blurb:"Every country in the game. The whole world, painted in.",all:true},
  {id:"silk",name:"The Silk Road",blurb:"Caravans, oases and mountain passes: the old trade routes that joined China to the Mediterranean.",names:["China","Mongolia","Kyrgyzstan","Kazakhstan","Uzbekistan","Tajikistan","Turkmenistan","Afghanistan","Pakistan","India","Iran","Iraq","Syria","Turkey","Azerbaijan","Georgia","Armenia","Italy"]},
  {id:"fire",name:"Ring of Fire",blurb:"The great horseshoe of volcanoes and earthquakes around the Pacific.",names:["Chile","Peru","Ecuador","Colombia","Guatemala","El Salvador","Nicaragua","Costa Rica","Mexico","United States","Canada","Russia","Japan","Philippines","Indonesia","Papua New Guinea","Solomon Islands","Vanuatu","Tonga","New Zealand"]},
  {id:"roof",name:"Roof of the World",blurb:"High plateaus and mountain kingdoms, from the Himalaya to the Andes.",names:["Nepal","Bhutan","China","India","Pakistan","Afghanistan","Tajikistan","Kyrgyzstan","Mongolia","Kazakhstan","Georgia","Armenia","Switzerland","Austria","Andorra","Ethiopia","Lesotho","Bolivia","Peru","Ecuador","Colombia"]},
  {id:"island",name:"Island Hopper",blurb:"Countries that are entirely islands, scattered across every ocean.",names:["Japan","Philippines","Indonesia","Sri Lanka","Maldives","Madagascar","Mauritius","Seychelles","Comoros","Cabo Verde","Iceland","Ireland","Malta","Cyprus","Cuba","Jamaica","Haiti","Dominican Republic","Bahamas","Barbados","Trinidad and Tobago","Fiji","Samoa","Tonga","Vanuatu","Solomon Islands","New Zealand","Palau","Kiribati","Tuvalu","Nauru","Marshall Islands","Singapore","Bahrain"]},
  {id:"pacific",name:"Across the Pacific",blurb:"Australia, New Zealand and the island nations of the great ocean.",region:"Oceania"}
];
let expSel="grand";
function expIds(e){
  if(e.all)return playable.map(f=>f.id);
  if(e.region)return playable.filter(f=>inReg(f.id,e.region)).map(f=>f.id);
  return [...new Set(e.names.map(n=>nameId[n]).filter(Boolean))];
}
