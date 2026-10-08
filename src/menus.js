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
  EXPS.forEach(e=>{const ids=expIds(e);if(ids.length&&ids.every(id=>S.found.has(id))&&!S.expDone[e.id]){S.expDone[e.id]=Date.now();save();if(!silent)toast("\u{1F9ED}","Expedition complete: "+e.name,"Every place on this expedition is painted in.",5200,()=>{sndTick();expSel=e.id;renderBook("exp",Math.floor((1+EXPS.indexOf(e))/2))})}});
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
function closeBtn(){return el("button",{class:"icon-btn x closebtn","aria-label":"Close this window",title:"Close this window",onclick:closeModal},el("span",{html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'}),el("span",{},"Close"))}
function bkFit(){const sh=$("sheet");if(!sh.classList.contains("book"))return;sh.style.zoom="";if(innerWidth<720)return;const w=sh.offsetWidth,h=sh.offsetHeight+34+44,z=Math.min(1,(innerWidth-24)/w,(innerHeight-8)/h);sh.style.zoom=z<1?z.toFixed(3):""}   // the book keeps one size; a small window just shrinks all of it
window.addEventListener("resize",()=>{if(modal.classList.contains("on"))bkFit()});
let modalOpener=null;
function openModal(book){modalOpener=document.activeElement&&document.activeElement!==document.body?document.activeElement:modalOpener;modal.inert=false;try{const a=$("app");if(a&&!a.contains(modal))a.inert=true}catch(e){}$("sheet").style.zoom="";$("sheet").onclick=null;$("sheet").classList.toggle("book",book==="book");$("sheet").classList.toggle("compact",book==="compact");modal.classList.toggle("compact",book==="compact");modal.classList.add("on");modal.setAttribute("aria-hidden","false");stopDrift()}
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

$("settingsBtn").onclick=()=>{if(guardRace())return;sndTick();renderMenu()};
$("homeBtn").onclick=()=>{sndTick();goHome()};
$("exitBtn").onclick=()=>{sndTick();goHome()};
function goHome(){
  if(guardRace())return;
  if(S.mode!=="wander"){if(!leaveDailyOk())return;setMode("wander")}
  closeModal();stopDrift();const v=REGION_VIEW.World;flyTo(v,1100,1);
}
function renderMenu(){
  const sh=$("sheet");sh.innerHTML="";
  const row=(ic,title,sub,fn)=>el("button",{type:"button",class:"mrow",onclick:()=>{sndTick();fn()}},crIcon(ic),el("span",{class:"mt"},el("b",{},title),el("small",{},sub)),el("span",{class:"mgo","aria-hidden":"true"},"›"));
  sh.append(closeBtn(),el("h2",{},"Menu"),el("p",{},"Where would you like to go?"),
    el("div",{class:"qcard mrows"},
      row("home","Home","Back to Explore with the whole globe in view.",goHome),
      row("book","Journal","Atlas, stamps, expeditions and mastery.",()=>{closeModal();renderAtlas()}),
      row("gear","Settings","Sound, theme, units, vibration and your save.",renderSettings),
      row("info","About","Where the facts, flags and maps come from.",renderAbout)));
  openModal();
}
function renderAbout(){
  const sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("h2",{},"About Mapbloom"),el("p",{},"A quiet way to learn the world: find a place, read about it, and watch it bloom on the map."),
    el("div",{class:"qcard"},el("h3",{},"Credits"),
      el("p",{},"Country texts are adapted from Wikipedia (CC BY-SA 4.0). Facts such as population come from Wikidata (CC0)."),
      el("p",{},"Flags come from flagcdn.com. Country borders come from Natural Earth through the world-atlas data set, and the US states from us-atlas."),
      el("p",{},"Everything you do is saved on this device only.")),
    el("div",{class:"sheetfoot"},el("button",{class:"btn",onclick:renderMenu},"‹ Back to the menu")));
  openModal();
}function isDark(){return S.theme==="dark"||(S.theme==="auto"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)}
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
}function themeSeg(){return seg([["auto","Auto","themeauto"],["light","Light","sun"],["dark","Dark","moon"]],S.theme,(k,e)=>{sndTick();themeAnimate(k,e.currentTarget,renderSettings)})}
function unitSeg(){return seg([["mi","Miles","ruler"],["km","Kilometres","ruler"]],S.unit,u=>{setUnit(u);renderSettings()})}

function setUnit(u){S.unit=u;save();if($("card").classList.contains("on"))showCard(cardId,true)}
$("themeBtn").onclick=()=>{sndTick();themeAnimate(isDark()?"light":"dark",$("themeBtn"))};
if(window.matchMedia)matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(S.theme==="auto"){syncThemeBtn();cvColors();if(CANVAS)requestRender()}});
applyTheme();

function step(n,title,sub,ctl){return el("div",{class:"step"},el("i",{},String(n)),el("b",{},title),sub?el("small",{},sub):"",el("div",{class:"ctl"},ctl))}
function fold(title,content,open){const d=el("details",{class:"fold"},el("summary",{},title));if(open)d.open=true;d.append(content);return d}
function opt(title,sub,control){return el("div",{class:"opt"},el("div",{},el("b",{},title),sub?el("small",{},sub):""),control)}
function toggle(checked,fn,label){const i=el("input",{type:"checkbox","aria-label":label});i.checked=checked;i.onchange=()=>fn(i.checked);return el("label",{class:"sw"},i,el("i"))}
function sheetHead(title){const sh=$("sheet");sh.innerHTML="";sh.append(closeBtn(),el("h2",{},title));return sh}
/* ---- modular option tiles: one icon (or a map), a label and a small sub-line; the same card for every choice in every menu ---- */
const ICONS={
  locate:'<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4.5h12l-2.2 4 2.2 4H5"/>',
  capital:'<path d="M3 20h18M5 20V11M9.5 20V11M14.5 20V11M19 20V11M3 11l9-6 9 6"/>',
  nameit:'<path d="M3 18l4-11 4 11M4.6 14h4.8"/><circle cx="17" cy="14.5" r="3"/><path d="M20 11.5V18"/>',
  sil:'<path d="M5.5 9c1.6-3.2 5-3.8 7-1.8 1.6 1.6 3.8.6 5 2.4 1.2 1.8-.2 3.4-1.4 4.6-1.2 1.2-.6 3.2-3.2 3.8-2.4.5-3.4-1.4-5.2-2.4C5.2 14.5 4.4 11.3 5.5 9z"/>',
  hot:'<path d="M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z"/><path d="M12 9v7"/>',
  r10:'<rect x="8" y="8" width="8" height="8" rx="2"/>',
  r20:'<rect x="4.5" y="4.5" width="9" height="9" rx="2"/><rect x="10.5" y="10.5" width="9" height="9" rx="2"/>',
  rall:'<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3.2 3.2 3.2 12.8 0 16M12 4c-3.2 3.2-3.2 12.8 0 16"/>',
  daily:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  chain:'<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4"/>',
  practice:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  mystery:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2M12 16.8v.2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  themeauto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 010 16z" fill="currentColor"/>',
  ruler:'<path d="M3.5 15.5l12-12 5 5-12 12z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
  bolt:'<path d="M13 3L5.5 13.5H11L10 21l8-10.5h-5.5z"/>',
  grid:'<rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M4.5 12h15M12 4.5v15"/>',
  pen:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  off:'<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  fast:'<path d="M5 6l7 6-7 6zM13 6l7 6-7 6z"/>',
  play:'<path d="M8 5l11 7-11 7z"/>',
  slow:'<path d="M7 4h10M7 20h10M8 4c0 5 8 5 8 8s-8 3-8 8"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  feather:'<path d="M20 4c-8 0-13 4-13 11v3"/><path d="M20 4c0 8-4 12-11 12M7 18l-3 3"/>',
  autom:'<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>',
  home:'<path d="M4 11l8-7 8 7M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  book:'<path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'
};
const svgIcon=k=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[k]||"")+'</svg>';
const crIcon=k=>el("span",{class:"ci",html:svgIcon(k)});
function tile({icon,map,label,sub,pressed,onclick,title}){
  return el("button",{type:"button",class:"tile"+(map?" map":""),"aria-pressed":String(!!pressed),title:title||label,onclick},
    el("span",{class:"ti",html:map||svgIcon(icon)}),el("b",{},label),sub?el("small",{},sub):null);
}
const tiles=(items,cols,cls)=>el("div",{class:"tiles"+(cls?" "+cls:""),style:"--cols:"+cols},...items);
function seg(items,cur,pick){return tiles(items.map(([k,l,ic])=>tile({icon:ic,label:l,pressed:cur===k,onclick:e=>pick(k,e)})),items.length,"seg")}
const QUIZ_STYLES=[["country","Locate","locate"],["flag","Flag","flag"],["capital","Capital","capital"],["name","Name it","nameit"],["silhouette","Silhouette","sil"]];
const RACE_STYLES=[["country","Locate","locate"],["flag","Flag","flag"],["capital","Capital","capital"],["name","Name it","nameit"],["sil","Silhouette","sil"]];
const regionCount=r=>r==="World"?playable.length:r==="United States"?50:playable.filter(f=>inReg(f.id,r)).length;
const regionLabel=r=>r==="World"?"Earth":r==="Americas"?"The Americas":r;
/* a small map of each region, built once: all land faint, the region itself in its own colour */
const thumbCache={};
function regionThumb(r){
  if(thumbCache[r])return thumbCache[r];
  const W=96,H=56,isl=r==="Pacific Islands"||r==="Antilles",geo=f=>f._lo||f;
  const col=REGIONS.includes(r)?"var(--c-"+r+")":r==="Antilles"||r==="United States"?"var(--c-Americas)":r==="Pacific Islands"?"var(--c-Oceania)":"var(--ink)";
  let proj,hi=[],dots=[];
  if(r==="World"){proj=d3.geoEqualEarth().fitExtent([[2,2],[W-2,H-2]],{type:"Sphere"});hi=playable}
  else if(r==="United States"&&byId["840"]){proj=d3.geoAlbersUsa().fitExtent([[4,4],[W-4,H-4]],byId["840"]);hi=[byId["840"]]}
  else{
    const ids=isl?[...AREA_SET[r]]:playable.filter(f=>inReg(f.id,r)).map(f=>f.id);
    hi=ids.map(id=>byId[id]).filter(Boolean);
    const fit=isl?{type:"MultiPoint",coordinates:hi.map(f=>LL(f.id))}:{type:"FeatureCollection",features:hi.filter(f=>f.id!=="643")},v=REGION_VIEW[r]||[0,0];
    proj=d3.geoAzimuthalEqualArea().rotate([-v[0],-v[1]]).fitExtent(isl?[[12,12],[W-12,H-12]]:[[3,3],[W-3,H-3]],fit);
    if(isl)dots=hi.map(f=>proj(LL(f.id))).filter(Boolean);
  }
  const path=d3.geoPath(proj).digits(1),base=playable.map(f=>path(geo(f))||"").join(""),hd=hi.map(f=>path(geo(f))||"").join("");
  return thumbCache[r]='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="'+W+'" height="'+H+'" rx="8" fill="var(--sea-mid)" opacity=".22"/><path d="'+base+'" fill="var(--ink)" opacity=".15"/><path d="'+hd+'" fill="'+col+'" fill-opacity="'+(r==="World"?".38":".85")+'" stroke="'+col+'" stroke-width="'+(isl?1.6:.5)+'" stroke-linejoin="round"/>'+dots.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2" fill="'+col+'"/>').join("")+'</svg>';
}
setTimeout(()=>{let i=0;const step=()=>{if(i<ALLR.length){try{regionThumb(ALLR[i++])}catch(e){}(window.requestIdleCallback?window.requestIdleCallback(step,{timeout:600}):setTimeout(step,120))}};step()},3500);
/* Quiz, Race and Hot & cold open as a small card in the middle of the screen; tap Options (or the card) to open the full menu */
function expandFrom(fn){fn();const sh=$("sheet");sh.classList.remove("grow");void sh.offsetWidth;sh.classList.add("grow")}
function modeCompact(o){
  const sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("h2",{},o.title),el("p",{class:"modesub"},o.desc),
    el("div",{class:"csum"},...o.chips.map(([ic,t])=>el("span",{class:"cs"},el("span",{class:"csi",html:svgIcon(ic)}),t))),
    el("div",{class:"sheetfoot cfoot"},el("button",{class:"tbtn",type:"button",onclick:o.expand},"Options ▾"),el("span",{class:"grow"}),el("button",{class:"btn primary",id:"cStart",type:"button",onclick:o.start},o.startLabel)));
  openModal("compact");
  sh.onclick=e=>{if(e.target.closest("button"))return;o.expand()};
  setTimeout(()=>{const b=$("cStart");if(b)b.focus({preventScroll:true})},60);
}
function regionTiles(cur,pick,subFn,list){
  return tiles((list||ALLR).map(r=>tile({map:regionThumb(r),label:regionLabel(r),sub:subFn?subFn(r):"",pressed:r===cur,onclick:()=>pick(r)})),3,"regions");
}
/* choosing a region anywhere: remember it, update the footer chips and fly the globe there */
function pickRegion(r){S.region=r;syncChips();updateProgress();sndTick();stopDrift();flyTo(REGION_VIEW[r],1300,REGION_ZOOM[r]);if(r==="United States")usLoad().catch(()=>{})}
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
