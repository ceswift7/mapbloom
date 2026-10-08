/* ======================================================================
   SPEED MODE: find every country in the region, against the clock
   ====================================================================== */
const REGION_VIEW={World:[15,20],Africa:[18,3],Americas:[-75,8],Asia:[95,30],Europe:[14,50],Oceania:[150,-22]};
const REGION_ZOOM={World:1,Africa:1.35,Americas:1.1,Asia:1.2,Europe:2.4,Oceania:1.5,"Pacific Islands":1.7,"Antilles":3.4,"United States":2.5};
REGION_VIEW["Pacific Islands"]=CL_DEF[0].c;REGION_VIEW["Antilles"]=d3.geoCentroid({type:"MultiPoint",coordinates:[...AREA_SET["Antilles"]].map(id=>[FACTS[id].ll[1],FACTS[id].ll[0]])});REGION_VIEW["United States"]=[-97,38];
function syncSpeedUI(){
  const b=$("skipBtn"),ph=R.phase;
  b.className=ph==="run"?"tbtn":"btn"+(ph!=="count"?" primary":"");
  {const lab=$("spLab");if(lab)lab.textContent="RACE"+(ph==="idle"||!R.region?"":" · "+(R.region==="World"?"EARTH":R.region.toUpperCase()))}
  $("restartBtn").hidden=!(ph==="run"||ph==="count"||ph==="done");
  b.textContent=ph==="run"?"Skip · +10s":ph==="done"?"Race again":ph==="count"?"Get ready…":"Start race";
  b.disabled=ph==="count";
  $("endBtn").hidden=ph!=="run";
  $("sCount").textContent=ph==="run"||ph==="done"?`${R.found.size} / ${R.total}`:"";
  if(ph==="idle"){$("sFlag").hidden=true;$("sAsk").textContent="";$("sTarget").classList.remove("small");$("sTarget").textContent="Ready?";$("sTime").textContent="0:00.0";$("sPen").textContent="";$("sHint").textContent="No hints, no continent. Every wrong country costs 2 seconds."}
}
function speedEnter(compact){
  usStop();
  R.phase="idle";R.found=new Set();R.pen=0;
  S.done=false;hideCard();clearMissed();
  paint();updateProgress();syncSpeedUI();
  if(compact)showRaceCompact();else showStartSheet();
}
function showRaceCompact(){
  const st=RACE_STYLES.find(x=>x[0]===S.rv)||RACE_STYLES[0],bb=bestOf(rkey(S.region)),us=S.region==="United States",n=us?50:regionCount(S.region);
  modeCompact({title:"Race",desc:MODE_DESC.speed,chips:[[st[2],st[1]],["rall",regionLabel(S.region)],["r20",n+(us?" states":" countries")+(isFinite(bb)?" · best "+fmtT(bb,0):"")]],
    startLabel:"Start race",start:()=>startRace(),expand:()=>expandFrom(showStartSheet)});
}
function abortRace(){
  silHide();R.ret=null;R.phase="idle";R.found=new Set();R.cur=null;R.queue=[];R.pen=0;stopMusic();
  $("count").classList.remove("beat");
  paint();updateProgress();syncSpeedUI();
}
function showStartSheet(){
  const sh=$("sheet");sh.innerHTML="";
  const ids=regionPool().filter(id=>S.rv!=="capital"||FACTS[id].cap),b=bestOf(rkey(S.region));
  const where=S.region==="World"?"the whole world":S.region==="Americas"?"the Americas":S.region==="Antilles"?"the Antilles":S.region==="United States"?"the United States":S.region;
  sh.append(closeBtn(),el("h2",{},"Race"),el("p",{class:"modesub"},MODE_DESC.speed),el("p",{},`Find all ${S.region==="United States"?50:ids.length} ${S.region==="United States"?"states":"countries"} in ${where} against the clock. Wrong +2s, skip +10s.`));
  const vchips=tiles(RACE_STYLES.map(([k,l,ic])=>tile({icon:ic,label:l,pressed:S.rv===k,onclick:()=>{sndTick();S.rv=k;save();showStartSheet()}})),5);
  const chips=regionTiles(S.region,r=>{pickRegion(r);showStartSheet()},r=>{const bb=bestOf(rkey(r));return isFinite(bb)?"Best "+fmtT(bb,0):regionCount(r)+(r==="United States"?" states":" countries")});const how=S.region==="United States"&&["flag","sil"].includes(S.rv)?"Not available for states. Locate is used.":{country:"Tap the named country.",flag:"Tap the country whose flag you see.",capital:"Tap the country with this capital.",name:"A country glows. Type its name.",sil:"A shape appears. Type its name."}[S.rv];
  sh.append(el("div",{class:"qcard"},
    step(1,"What to find",how,vchips),
    step(2,"Where","Each tile shows your best time, or the country count.",chips),
    step(3,"Options",null,opt("Borderless","Hide borders. Coastlines stay.",toggle(S.nb,v=>{S.nb=v;save();applyNb();sndTick();showStartSheet()},"Borderless")))));
  sh.append(el("p",{class:"bestline"},isFinite(b)?`Your best here: ${fmtT(b)}`:"No time here yet."));
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",onclick:()=>{setMode("wander")}},"Back to Explore"),el("span",{class:"grow"}),el("button",{class:"btn primary bigstart",style:"width:auto;min-width:140px",id:"startRace",onclick:startRace},"Start race")));
  sh.append(fold("Your records",raceRecordsBlock(S.region,S.rv)));
  openModal(true);setTimeout(()=>{const s=$("startRace");if(s)s.focus({preventScroll:true})},60);
}function startRace(){
  if(S.region==="United States"&&!US.data){closeModal();usLoad().then(()=>startRace()).catch(()=>{});return}
  if(S.region!=="United States")usStop();
  closeModal();stopDrift();flyTo(REGION_VIEW[S.region],1300,REGION_ZOOM[S.region]);   // the camera settles on the region while the countdown runs
  R.region=S.region;R.found=new Set();R.pen=0;R.skips=0;R.wrong=0;R.times={};R.streak=0;R.riser=false;
  R.ret=null;R.nb=S.nb;R.variant=S.rv;R.pausedAt=null;R.ended=false;R.queue=shuffle(regionPool().filter(id=>S.rv!=="capital"||FACTS[id].cap));R.total=R.queue.length;R.cur=null;R.phase="count";
  if(S.region==="United States"){R.variant=["country","capital","name"].includes(S.rv)?S.rv:"country";R.queue=shuffle(US.names.map(n=>"us:"+n));R.total=R.queue.length;usEnter(false)}
  paint();updateProgress();syncSpeedUI();
  $("sTarget").textContent="";$("sHint").textContent="";$("sTime").textContent="0:00.0";$("sPen").textContent="";
  const cn=$("count");let n=3;const ck=R.cdTok={};
  const beat=()=>{
    if(R.phase!=="count"||R.cdTok!==ck)return;
    cn.textContent=n>0?n:"GO";cn.classList.remove("beat");void cn.offsetWidth;cn.classList.add("beat");
    sndCount(n===0);
    if(n===0){goRace();return}
    n--;setTimeout(beat,820);
  };
  setTimeout(beat,350);
}
function goRace(){
  R.phase="run";R.t0=performance.now();
  startMusic();speedNext();syncSpeedUI();
}
function speedNext(){
  if(R.phase!=="run")return;
  if(R.region==="United States"){usRaceNext();return}
  R.cur=R.queue[0];R.tTarget=performance.now();R.queue.slice(0,3).forEach(warmArt);

  {const v=R.variant||"country",ff=FACTS[R.cur];
    $("sFlag").hidden=v!=="flag";$("sTarget").classList.toggle("small",v!=="country");
    if(v==="flag"){$("sFlag").src=FLAGS[R.cur]||"";$("sAsk").textContent="Find the country with this flag";swell($("sTarget"),"Whose flag is this?")}
    else if(v==="capital"){$("sAsk").textContent="Find the country whose capital is";swell($("sTarget"),ff.cap)}
    else if(v==="name"){$("sAsk").textContent="Name the glowing country";swell($("sTarget"),"?");nameBegin(R.cur,true)}
    else if(v==="sil"){$("sAsk").textContent="Name this shape";swell($("sTarget"),"?");silRaceBegin(R.cur)}
    else{$("sAsk").textContent="";swell($("sTarget"),ff.n)}}
  
  $("sCount").textContent=`${R.found.size} / ${R.total}`;
}
function updatePen(pop){const e=$("sPen");e.textContent=R.pen?"+"+(R.pen/1000)+"s":"";if(pop&&!reduced){e.classList.remove("pop");void e.offsetWidth;e.classList.add("pop")}}
function speedGuess(id,ll,other){
  if(R.phase!=="run"||!R.cur)return;
  if(other){swell($("sHint"),typeof other==="string"?`${other}: outside the game. No penalty.`:"Outside the game. No penalty.");sndOcean();return}
  if(R.variant==="name"||R.variant==="sil")return;
  const T=R.cur,f=FACTS[T];
  if(hitTest(id,ll,T)){raceHit(T,ll);return}
  if(id&&FACTS[id]){racePen(`Not ${article(FACTS[id].n)}. +2s`);
    floatLabel(FACTS[id].n,ll,900,MV);
    const sel=d3.selectAll(`[data-id="${id}"]`);if(!R.found.has(id)){sel.classed("missed",true);cvMiss(id,true);setTimeout(()=>{sel.classed("missed",false);cvMiss(id,false)},520)}
  }else{
    swell($("sHint"),"Open water. No penalty.");sndOcean();
  }
}
function racePen(msg){
  const T=R.cur;R.pen+=2000;R.wrong++;R.streak=0;S.weak[T]=Math.min(10,(S.weak[T]||0)+1);
  updatePen(true);swell($("sHint"),msg);
  $("app").classList.remove("flash");void $("app").offsetWidth;$("app").classList.add("flash");
  sndPenalty();
}
function raceHit(T,ll){
  const f=FACTS[T];
  {
    R.times[T]=performance.now()-R.tTarget;R.found.add(T);R.queue.shift();R.streak++;R.cur=null;
    if(FACTS[T]){const cs=csOf(T);if(cs.bt==null||R.times[T]<cs.bt)cs.bt=Math.round(R.times[T]);cs.ls=todayStr()}
    if(S.weak[T]&&R.times[T]<4000)S.weak[T]=Math.max(0,S.weak[T]-1);
    if(R.variant==="flag")jrMark(T,"f");else if(R.variant==="capital")jrMark(T,"c");
    sndSpeedHit();musUpdate();updateProgress();
    swell($("sHint"),"");$("sCount").textContent=`${R.found.size} / ${R.total}`;
    const vw=MV;   // Race never moves the camera: only the player's own dragging does
    startReveal(T,ll||LL(T),false,()=>paint(),true,vw);
    floatLabel(f.n,ll||LL(T),1100,vw);
    if(R.ret){const rt=R.ret;R.ret=null;setTimeout(()=>{if(R.phase==="run")flyTo(rt.ll,1000,rt.k)},900)}
    if(R.found.size>=R.total)finishRace();else setTimeout(speedNext,320);
  }
}
function speedSkip(){
  if(R.phase!=="run"||!R.cur)return;if(R.variant==="name")hlSet(null);
  const T=R.cur;R.pen+=10000;R.skips++;R.streak=0;S.weak[T]=Math.min(10,(S.weak[T]||0)+2);
  R.queue.push(R.queue.shift());R.cur=null;
  updatePen(true);swell($("sHint"),"Skipped. +10s. It’ll come back round.");sndPenalty();
  setTimeout(speedNext,200);
}
function finishRace(){
  silHide();R.phase="done";R.cur=null;
  const elapsed=performance.now()-R.t0,tot=Math.round(elapsed+R.pen);
  $("sTime").textContent=fmtT(tot);
  stopMusic(true);syncSpeedUI();
  const reg=rkey(R.region,R.variant,R.nb),prev=bestOf(reg),isBest=tot<prev;
  const rec=REC[reg]||(REC[reg]={best:null,runs:[]});
  rec.runs.push({t:tot,date:todayStr(),pen:R.pen,skips:R.skips,wrong:R.wrong,n:R.total});
  rec.runs=rec.runs.slice(-20);if(isBest)rec.best=tot;saveRec();save();
  setTimeout(()=>{if(R.phase==="done"&&S.mode==="speed")showResults(tot,isBest,prev)},1400);
  setTimeout(checkAch,2200);
}
/* ---- ending a race you cannot finish: every country left costs the same +10s as skipping it, and the run is kept apart from finished times ---- */
const RACE_LEFT_PEN=10000;
function raceTotals(){const left=Math.max(0,R.total-R.found.size),elapsed=(R.pausedAt||performance.now())-R.t0;return {left,elapsed,adj:Math.round(elapsed+R.pen+left*RACE_LEFT_PEN)}}
function raceResume(){if(!R.pausedAt)return;const d=performance.now()-R.pausedAt;R.t0+=d;R.tTarget+=d;R.pausedAt=null}   // the clock stands still while the End race sheet is open
function showEndRace(){
  if(R.phase!=="run"||R.pausedAt)return;
  R.pausedAt=performance.now();sndTick();
  const t=raceTotals(),sh=$("sheet");sh.innerHTML="";
  const stat=(k,v)=>el("div",{class:"stat"},el("b",{},v),el("small",{},k));
  sh.append(closeBtn(),el("h2",{},"End this race?"),
    el("p",{},"You found "+R.found.size+" of "+R.total+". Each country left adds +"+(RACE_LEFT_PEN/1000)+"s, the same as skipping it, so the time stays fair. The clock is paused while you decide."),
    el("div",{class:"stats"},stat("Found",R.found.size+" / "+R.total),stat("Time so far",fmtT(t.elapsed+R.pen)),stat("Left over","+"+(t.left*RACE_LEFT_PEN/1000)+"s"),stat("Adjusted time",fmtT(t.adj))),
    el("p",{class:"bestline"},"Ended races are saved separately. They do not count as best times or stamps."),
    el("div",{class:"sheetfoot"},el("button",{class:"btn",id:"keepRace",onclick:closeModal},"Keep racing"),el("span",{class:"grow"}),el("button",{class:"btn danger",onclick:endRace},"End race")));
  openModal();setTimeout(()=>{const k=$("keepRace");if(k)k.focus({preventScroll:true})},60);
}
function endRace(){
  if(R.phase!=="run")return;
  const t=raceTotals();R.pausedAt=null;closeModal();
  silHide();hlSet(null);R.phase="done";R.cur=null;R.ended=true;
  stopMusic(true);syncSpeedUI();$("sTime").textContent=fmtT(t.adj);
  const reg=rkey(R.region,R.variant,R.nb),rec=REC[reg]||(REC[reg]={best:null,runs:[]});
  rec.ended=(Array.isArray(rec.ended)?rec.ended:[]).concat({t:t.adj,date:todayStr(),pen:R.pen,skips:R.skips,wrong:R.wrong,n:R.total,found:R.found.size}).slice(-20);
  saveRec();save();
  showResults(t.adj,false,bestOf(reg),t);
}
$("endBtn").onclick=showEndRace;
function showEndedResults(tot,t,where,what){
  const sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("div",{class:"hero"},
    el("p",{class:"sub"},"Race ended · "+R.found.size+" of "+R.total+" found · "+where+what+(R.nb?" · borderless":"")),
    el("div",{class:"bignum"},fmtT(tot)),
    el("span",{class:"delta"},"Adjusted time: +"+(t.left*RACE_LEFT_PEN/1000)+"s for "+t.left+" left")));
  const stat=(k,v)=>el("div",{class:"stat"},el("b",{},v),el("small",{},k));
  sh.append(el("div",{class:"stats"},stat("Found",R.found.size+" / "+R.total),stat("Raw time",fmtT(t.elapsed)),stat("Penalties","+"+((R.pen+t.left*RACE_LEFT_PEN)/1000)+"s"),stat("Wrong",String(R.wrong))));
  sh.append(el("p",{class:"bestline"},"Saved apart from finished races. It does not count as a best time."));
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",onclick:()=>setMode("wander")},"Back to Explore"),el("button",{class:"btn",onclick:()=>{sndTick();speedEnter()}},"Change settings"),el("span",{class:"grow"}),el("button",{class:"btn primary",onclick:()=>{sndTick();abortRace();startRace()}},"Race again")));
  const left=R.queue.filter(id=>FACTS[id]).slice(0,16);
  if(left.length)sh.append(fold("Still to find, worth a look",el("div",{class:"nchips",style:"padding-bottom:12px"},left.map(id=>el("button",{onclick:()=>{closeModal();setMode("wander");openCountry(id)}},FACTS[id].n)))));
  sh.append(fold("Your records",raceRecordsBlock(R.region,R.variant)));
  openModal();
}
function showResults(tot,isBest,prev,ended){
  const sh=$("sheet");sh.innerHTML="";
  const byR={};Object.keys(R.times).forEach(id=>{if(!FACTS[id])return;const r=FACTS[id].r;(byR[r]=byR[r]||[]).push(R.times[id])});
  const slow=Object.keys(R.times).sort((a,b)=>R.times[b]-R.times[a]).slice(0,5);
  const where=R.region==="World"?"Earth":R.region==="Americas"?"the Americas":R.region,what=R.variant==="flag"?" \xB7 flags":R.variant==="capital"?" \xB7 capitals":R.variant==="name"?" \xB7 name it":R.variant==="sil"?" \xB7 silhouettes":"";
  const diff=isFinite(prev)?tot-prev:null;
  if(ended)return showEndedResults(tot,ended,where,what);
  sh.append(closeBtn(),el("div",{class:"hero"},
    el("p",{class:"sub"},`${R.total} countries \xB7 ${where}${what}${R.nb?" \xB7 borderless":""}`),
    el("div",{class:"bignum"},fmtT(tot)),
    el("span",{class:"delta"+(isBest?" up":"")},isBest?(isFinite(prev)?"New best! "+fmtT(-diff).replace(/^/,"")+" faster":"New best! Your first time here"):(isFinite(prev)?`${fmtT(diff)} slower than your best (${fmtT(prev)})`:"First time here"))));
  const stat=(k,v)=>el("div",{class:"stat"},el("b",{},v),el("small",{},k));
  sh.append(el("div",{class:"stats"},stat("Raw time",fmtT(tot-R.pen)),stat("Penalties",R.pen?"+"+R.pen/1000+"s":"none"),stat("Wrong",String(R.wrong)),stat("Skipped",String(R.skips))));
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",onclick:()=>setMode("wander")},"Back to Explore"),el("button",{class:"btn",onclick:()=>{sndTick();speedEnter()}},"Change settings"),el("span",{class:"grow"}),el("button",{class:"btn primary",onclick:()=>{sndTick();abortRace();startRace()}},"Race again")));
  const rv=el("div",{});
  if(R.region==="World"){
    const tb=el("table",{class:"tbl"},el("tr",{},el("th",{},"Where the time went"),el("th",{class:"t"},"Avg per country")));
    REGIONS.forEach(r=>{if(byR[r])tb.append(el("tr",{},el("td",{},el("span",{class:"swatch",style:`background:var(--c-${r});margin-right:8px`}),r),el("td",{class:"t"},(d3.mean(byR[r])/1000).toFixed(1)+"s")))});
    rv.append(tb);
  }
  rv.append(el("h3",{},"Slowest five, worth a second look"),el("div",{class:"nchips",style:"padding-bottom:12px"},slow.map(id=>FACTS[id]?el("button",{onclick:()=>{closeModal();setMode("wander");openCountry(id)}},FACTS[id].n+" \xB7 "+(R.times[id]/1000).toFixed(1)+"s"):el("span",{},String(id).replace("us:","")+" \xB7 "+(R.times[id]/1000).toFixed(1)+"s"))));
  sh.append(fold("Review this run",rv),fold("Your records",raceRecordsBlock(R.region,R.variant)));
  openModal();
}/* ======================================================================
   CARD + LEARN PAGE
   ====================================================================== */
let cardId=null;
const restart=e=>{e.style.animation="none";void e.offsetWidth;e.style.animation=""};
/* the card's picture: the country's outline, filled with its own painting once you have found it */
function paintInto(cv,id,w,h,pad){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
  const c=cv.getContext("2d");c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  try{
    const feat=silShape(id),ctr=d3.geoCentroid(feat),proj=d3.geoAzimuthalEqualArea().rotate([-ctr[0],-ctr[1]]).fitExtent([[pad[0],pad[1]],[w-pad[0],h-pad[1]]],feat),path=d3.geoPath(proj,c);
    const f=FACTS[id],cs=getComputedStyle(document.documentElement),dark=cs.getPropertyValue("--c-"+f.r+"-d").trim()||"#555",mid=cs.getPropertyValue("--c-"+f.r).trim()||"#999",found=S.found.has(id)||S.shown.has(id);
    let fill=null;if(found&&FX.tiles){try{const key=ensureArt(id),tile=artCv[key];if(tile)fill=c.createPattern(tile,"repeat")}catch(e){}}
    c.beginPath();path(feat);
    if(found){c.globalAlpha=.95;c.fillStyle=fill||mid;c.fill();c.globalAlpha=1;c.lineWidth=1.1;c.strokeStyle=dark;c.stroke()}
    else{c.globalAlpha=.14;c.fillStyle=cs.getPropertyValue("--ink").trim()||"#333";c.fill();c.globalAlpha=1;c.lineWidth=1.2;c.setLineDash([4,3]);c.strokeStyle=cs.getPropertyValue("--ink-soft").trim()||"#555";c.stroke();c.setLineDash([])}
  }catch(e){}
}
function cardPaint(id){const cv=$("cPaint");if(cv)paintInto(cv,id,440,92,[90,8])}
function paintThumb(id,onclick){const cv=document.createElement("canvas");paintInto(cv,id,64,48,[4,4]);return el("button",{type:"button",class:"gthumb",title:FACTS[id].n,"aria-label":FACTS[id].n,onclick},cv)}function showCard(id,keepOpen){
  const f=FACTS[id],card=$("card"),wasOn=card.classList.contains("on");
  cardId=id;
  const img=$("cFlagImg"),src=typeof FLAGS!=="undefined"&&FLAGS[id];
  if(src){img.src=src;img.alt=`Flag of ${f.n}`;img.hidden=false;$("cFlag").hidden=true}
  else{img.hidden=true;img.removeAttribute("src");$("cFlag").hidden=false;$("cFlag").textContent=f.f}
  $("cName").textContent=f.n;jrRow(id);
  {const hero=document.querySelector("#card .chero");if(hero)hero.style.setProperty("--cp","var(--c-"+f.r+")")}cardPaint(id);
  $("cSub").textContent=[f.cap,f.s||f.r].filter(Boolean).join(" \u00B7 ");
  $("cSwatch").style.background=`var(--c-${f.r})`;
  $("cWhere").textContent=f.s||f.r;
  $("cLearned").hidden=!S.learned.has(id);
  const rows=[];
  if(f.cap)rows.push(["Capital",f.cap]);
  if(f.l.length)rows.push([f.l.length>1?"Languages":"Language",f.l.join(", ")]);
  if(f.cur)rows.push(["Currency",f.cur]);
  rows.push(["Area",areaTxt(f.a)]);
  $("cList").innerHTML="";
  rows.forEach(([k,v])=>{const dt=document.createElement("dt");dt.textContent=k;const dd=document.createElement("dd");dd.textContent=v;$("cList").append(dt,dd)});
  let note="";
  const b=f.b;
  if(f.ld) note=`Landlocked, with no coastline at all. Its neighbours are ${list(b)}.`;
  else if(!b.length) note=`It shares no land border with any other country; the sea surrounds it.`;
  else if(b.length===1) note=`It shares a land border with only one country: ${article(b[0])}.`;
  else if(b.length>=8) note=`It touches ${b.length} countries, including ${list(b.slice(0,4))}.`;
  else note=`It borders ${list(b)}.`;
  $("cNote").textContent=note;
  if(wasOn){restart(img);restart($("cNote"))}
  else sndCard(true);
  $("learnBtn").hidden=S.mode!=="wander";
  const open=S.mode==="wander"&&!!(keepOpen&&card.classList.contains("big"));
  setExplore(open,id);
  $("cBody").scrollTop=0;
  card.classList.toggle("peek",!mobCard()?false:(keepOpen&&wasOn)?card.classList.contains("peek"):!open);
  syncMore();
  card.classList.add("on");relayout();
}
const mobCard=()=>innerWidth<720;
function syncMore(){const p=$("card").classList.contains("peek"),b=$("cardMore");b.setAttribute("aria-expanded",String(!p));b.setAttribute("aria-label",p?"Show details":"Collapse details")}
function setPeek(on){$("card").classList.toggle("peek",on);syncMore();if(!on)$("cBody").scrollTop=0;relayout()}
function list(a){a=a.map(article);return a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1]}
function hideCard(){capMarkSet(null);const c=$("card");if(!c.classList.contains("on"))return;c.classList.remove("on");setExplore(false);sndCard(false);relayout()}
$("cardMore").onclick=e=>{e.stopPropagation();setPeek(!$("card").classList.contains("peek"))};
$("cardClose").onclick=e=>{e.stopPropagation();if(mobCard()&&!$("card").classList.contains("peek"))setPeek(true);else hideCard()};
$("card").addEventListener("click",e=>{if($("card").classList.contains("peek")&&!e.target.closest("button"))setPeek(false)});
{let y0=null;
  $("card").addEventListener("touchstart",e=>{y0=e.touches.length===1?e.touches[0].clientY:null},{passive:true});
  $("card").addEventListener("touchend",e=>{
    if(y0==null||!mobCard())return;const dy=e.changedTouches[0].clientY-y0;y0=null;
    const pk=$("card").classList.contains("peek");
    if(pk&&dy<-24)setPeek(false);else if(pk&&dy>24)hideCard();else if(!pk&&dy>60&&$("cBody").scrollTop<=0)setPeek(true);
  },{passive:true});
}
function openCountry(id){showCard(id);flyTo(LL(id),1100,Math.max(zoomK,FACTS[id].a<30000?2.4:1.4))}

function setExplore(open,id){
  const card=$("card"),btn=$("learnBtn");
  card.classList.toggle("big",open);btn.setAttribute("aria-expanded",String(open));
  $("learn").hidden=!open;
  btn.firstElementChild.textContent=open?"Close the page":"Explore this country";
  if(open){renderLearn(id||cardId);S.learned.add(id||cardId);$("cLearned").hidden=false;save();setTimeout(checkAch,600)}
}
/* "Explore this country": the globe turns and zooms so the whole country fills the part of the screen the reading card leaves free, centred in it */
function exploreFit(id,ms){
  const feat=byId[id];if(!feat||W<720)return;
  const shape=silShape(id),[L,B]=d3.geoCentroid(shape),c0=[L,B],cw=Math.min(460,W-24),visW=Math.max(W*.5,W-cw-24);
  const top=promptBottom+6,bot=H-58,tx=visW/2,ty=(top+bot)/2,availW=visW*.84,availH=(bot-top)*.84,gx=W/2,gy=cy();
  let R=baseScale*zoomK;const rot=projection.rotate().slice(),pr=d3.geoOrthographic().clipAngle(90).translate([gx,gy]),path=d3.geoPath(pr);
  rot[0]=-L;rot[1]=-B;
  const D2R=Math.PI/180,clampLat=v=>Math.max(-78,Math.min(78,v));
  let fin=null;
  for(let it=0;it<40;it++){
    pr.scale(R).rotate([rot[0],rot[1],0]);
    // centre the middle of the country's outline as drawn (not its centroid, which sits off-centre for sprawling countries like Russia, Canada and the US)
    const b=path.bounds(shape),w=b[1][0]-b[0][0],h=b[1][1]-b[0][1];
    let bx=(b[0][0]+b[1][0])/2,by=(b[0][1]+b[1][1])/2;
    if(!isFinite(bx)||!isFinite(by)||!(w>1)||!(h>1)){const p=pr(c0);if(!p)break;bx=p[0];by=p[1]}
    const q=pr.invert([bx,by]),qlat=q?q[1]:B;
    rot[0]+=Math.max(-25,Math.min(25,.8*((tx-bx)/(R*Math.max(.35,Math.cos(qlat*D2R))))/D2R));   // damped and capped: near the poles a pixel is many degrees of longitude
    rot[1]=clampLat(rot[1]-Math.max(-20,Math.min(20,.8*((ty-by)/R)/D2R)));
    rot[0]=Math.max(-L-55,Math.min(-L+55,rot[0]));rot[1]=Math.max(-B-35,Math.min(-B+35,rot[1]));   // never wander far from the country itself: one wider than the visible half-globe (Russia) cannot be centred exactly, so it stays centred on its middle
    pr.rotate([rot[0],rot[1],0]);
    const b2=path.bounds(shape),w2=b2[1][0]-b2[0][0],h2=b2[1][1]-b2[0][1];
    if(isFinite(w2)&&isFinite(h2)&&w2>1&&h2>1){R=Math.max(baseScale,Math.min(baseScale*8,R*Math.pow(Math.min(availW/w2,availH/h2),.85)));fin=[(b2[0][0]+b2[1][0])/2,(b2[0][1]+b2[1][1])/2,w2,h2]}
  }
  const kk=Math.max(1,Math.min(8,R/baseScale));
  stopDrift();flyTo([-rot[0],-rot[1]],ms||1500,kk,85);
  return {lon:-rot[0],lat:-rot[1],k:kk,fin,target:[tx,ty,availW,availH]};
}
$("learnBtn").onclick=()=>{
  const open=!$("card").classList.contains("big");
  sndPage();setExplore(open,cardId);
  if(open&&S.mode==="wander"){setTimeout(()=>exploreFit(cardId),80);setTimeout(()=>{if($("card").classList.contains("big")&&S.mode==="wander")capMarkSet(cardId)},1250)}
  else capMarkSet(null);
  setTimeout(relayout,620);
  if(open)setTimeout(()=>{$("learn").scrollIntoView({behavior:reduced?"auto":"smooth",block:"nearest"})},120);
};
let rankArea=null,rankPop=null;
function ranks(){
  if(rankArea)return;
  const ids=playable.map(f=>f.id);
  const ra=ids.slice().sort((a,b)=>FACTS[b].a-FACTS[a].a);rankArea={};ra.forEach((id,i)=>rankArea[id]=i+1);
  const rp=ids.filter(id=>LEARN[id]&&LEARN[id].p).sort((a,b)=>LEARN[b].p-LEARN[a].p);rankPop={};rp.forEach((id,i)=>rankPop[id]=i+1);
}
function antipodeOf(id){
  const [lat,lon]=FACTS[id].ll,pt=[((lon+180+540)%360)-180,-lat];
  const hit=features.find(f=>d3.geoContains(f,pt));
  return hit&&FACTS[hit.id]?FACTS[hit.id].n:null;
}
function funFacts(id){
  ranks();const f=FACTS[id],L=LEARN[id]||{},out=[],n=playable.length;
  const ra=rankArea[id];
  out.push(ra===1?`${f.n} is the largest country in this game, at ${areaTxt(f.a)}.`:ra===n?`${f.n} is the smallest country in this game, at just ${areaTxt(f.a)}.`:`By area, ${f.n} is the ${ord(ra)} largest of the ${n} countries here.`);
  if(L.p){
    const rp=rankPop[id];
    out.push(`About ${L.p>=1e6?(L.p/1e6).toFixed(L.p>=1e7?0:1)+" million":fmt(L.p)} people live there${rp?`, which makes it the ${rp===1?"most":ord(rp)+" most"} populous of the ${n}`:""}.`);
  }
  const ap=antipodeOf(id);
  out.push(ap?`Dig straight through the centre of the Earth from the middle of ${f.n} and you’d come out in ${article(ap)}.`:`Dig straight through the centre of the Earth from the middle of ${f.n} and you’d come out in open ocean.`);
  if(f.ld)out.push(`It has no coastline: every border is a land border.`);
  else if(!f.b.length)out.push(`It shares no land border with anyone. It is surrounded by sea.`);
  else if(f.b.length>=6)out.push(`It has ${f.b.length} land neighbours, more than most countries.`);
  const lmv=((QZ[id]||{}).g||{}).lm;if(lmv)out.splice(1,0,`A famous landmark there: ${[].concat(lmv)[0]}.`);
  return out.slice(0,4);
}
function paras(t){return String(t||"").split(/\n+/).map(s=>s.trim()).filter(Boolean)}
/* Wikipedia text, tidied for reading on a phone: ancient-script glyphs (they show as empty boxes) are dropped with the punctuation around them */
const ASRX=src=>new RegExp(src.split("~a~").join("\\u{10000}-\\u{10FFFF}").split("~A~").join("[\\u{10000}-\\u{10FFFF}]"),"gu");
function tidyText(t){
  let x=String(t||"");
  if(ASRX("~A~").test(x)){
    x=x.replace(ASRX("where it is written as\\s*~A~+ in Ancient South Arabian and\\s*~A~+ in Aramaic"),"where it is written in the Ancient South Arabian and Aramaic scripts")
       .replace(ASRX("formed from\\s*[~a~\\s]+,\\s*meaning"),"formed from a sign meaning")
       .replace(ASRX("Mycenaean Greek ~A~+, ku-pi-ri-jo"),"Mycenaean Greek ku-pi-ri-jo")
       .replace(ASRX("\\s*(?:[A-Z][a-z]+ )*[A-Z][a-z]+:\\s*~A~+;?"),"")
       .replace(ASRX("\\s*\\(\\s*[~a~\\s,;]+\\)"),"")
       .replace(ASRX("\\s*\\([^()]*~A~[^()]*\\)"),"")
       .replace(ASRX("~A~+"),"");
  }
  return x.replace(/Scholars reconstruct its Old Egyptian pronunciation as, its Middle Egyptian pronunciation as, and its Late Egyptian pronunication as\.\s*/,"").replace(/\(\s+/g,"(").replace(/\s+\)/g,")").replace(/\(\s*\)/g,"").replace(/:\s*;/g,";").replace(/\s+([,;.])/g,"$1").replace(/,\s*,/g,",").replace(/([^.])\.\.(?=\s|$)/g,"$1.").replace(/[ \t]{2,}/g," ");
}
/* a few Wikipedia lists arrive as bare lowercase lines: they become real bullets (with a lead-in where the original was lost) */
const LEAD={"196|n":"Several explanations have been suggested for the name:","882|g":"The eight small islets are:"};
const up1=x=>x.charAt(0).toUpperCase()+x.slice(1),dot=x=>/[.!?]$/.test(x)?x:x+".";
function blocks(id,key,t){
  const f=FACTS[id],ps=paras(tidyText(t)),out=[];let i=0;
  while(i<ps.length){
    if(/^[a-z]/.test(ps[i])){
      const items=[];while(i<ps.length&&/^[a-z]/.test(ps[i]))items.push(ps[i++]);
      const lead=LEAD[id+"|"+key];
      if(items.length===1&&!lead){out.push(el("p",{},/^(bounded|located|situated|surrounded|divided)/.test(items[0])?f.n+" is "+items[0]:up1(items[0])));continue}
      if(lead)out.push(el("p",{},lead));
      out.push(el("ul",{},items.map(x=>el("li",{},dot(up1(x))))));
    }else out.push(el("p",{},ps[i++]));
  }
  return out;
}
/* a drawn outline of the country (neighbours faint around it); upgraded to the 10m map once that has downloaded */
let topo10=null,topo10Loading=null;
function load10(){
  if(topo10)return Promise.resolve(topo10);
  if(!topo10Loading)topo10Loading=fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json").then(r=>r.json()).then(t=>{
    const feats=topojson.feature(t,t.objects.countries).features,byid={};feats.forEach(f=>{if(f.id!=null&&!(f.id in byid))byid[f.id]=f});
    topo10={feats,byid};return topo10;
  }).catch(()=>{topo10Loading=null;return null});
  return topo10Loading;
}
function outlineFig(id){
  const f=FACTS[id];if(!byId[id])return null;
  const W0=420,H0=220,key=ensureArt(id);ensureArtSvg(key);
  const svgO=d3.create("svg").attr("viewBox",`0 0 ${W0} ${H0}`).attr("role","img").attr("aria-label","Outline of "+f.n);
  const cap=el("figcaption",{},"Outline of "+f.n);
  const fig=el("figure",{class:"outline"},svgO.node(),cap);
  let drawn=0;
  const draw=(hi)=>{
    const feat=(hi&&hi.byid[id])||byId[id],list=hi?hi.feats:features;
    const c=d3.geoCentroid(feat);if(!isFinite(c[0]))return;
    const proj=d3.geoAzimuthalEqualArea().rotate([-c[0],-c[1]]).fitExtent([[26,22],[W0-26,H0-26]],feat),p=d3.geoPath(proj);
    const rad=(byId[id]._r||.3)*1.1+.07;
    const near=list.filter(g=>g!==feat&&g.id!==id&&g.id!=="010"||g.id==="010"&&false).filter(g=>{const gc=g._c||(g._c=d3.geoCentroid(g));return isFinite(gc[0])&&d3.geoDistance(gc,c)<rad+.25});
    svgO.selectAll("*").remove();
    svgO.append("path").attr("class","ol-g").attr("d",p(d3.geoGraticule().step([5,5])()));
    svgO.append("g").selectAll("path").data(near).join("path").attr("class","ol-n").attr("d",p);
    const own=svgO.append("path").attr("class","ol-c"+(drawn?" still":"")).attr("pathLength",1).attr("d",p(feat)).style("fill",`url(#af-${key})`);
    drawn++;
    cap.textContent="Outline of "+f.n;
  };
  draw(topo10);
  if(!topo10)load10().then(t=>{if(t&&fig.isConnected&&(cardId===id||fig.dataset.rd))draw(t)});
  return fig;
}
function renderLearn(id,rootArg,nav){
  const L=LEARN[id],f=FACTS[id],root=rootArg||$("learn");root.innerHTML="";
  root.style.setProperty("--p",`var(--c-${f.r})`);
  if(!L){root.append(el("p",{},"No reading page for this country yet."));return}
  const fig=outlineFig(id);if(fig){if(rootArg)fig.dataset.rd="1";root.append(fig)}
  let i=0;
  jrReset();
  const sec=(title,...kids)=>{const s=el("section",{style:`--i:${i++}`},el("h3",{},el("span",{class:"dot"}),title),...kids);root.append(s);const jk=JR_SEC.find(x=>x[1]===title);if(jk)jrWatch(s,id,jk[0]);return s};
  const P=(k,t)=>blocks(id,k,t);
  if(L.o)sec("At a glance",P("o",L.o));
  const dl=el("dl",{class:"kv"});
  const add=(k,v)=>{if(v){dl.append(el("dt",{},k),el("dd",{},v))}};
  add("Population",L.p?fmt(L.p):null);
  add("Density",L.p?densTxt(L.p,f.a):null);
  add("Capital",f.cap);add("Drives on the",L.d);
  sec("Quick data",dl);
  if(L.g)sec("The land",P("g",L.g));
  if(L.c)sec("People and culture",P("c",L.c));
  const fd=typeof FOOD!=="undefined"?FOOD[id]:null;
  if(fd&&fd.x)sec("Food and dishes",P("f",fd.x));
  if(L.h)sec("A short history",P("h",L.h),L.m?[el("div",{class:"sub"},"More recently"),P("m",L.m)]:"");
  if(L.n)sec("Where the name comes from",P("n",L.n));
  sec("Did you know",el("ul",{},funFacts(id).map(t=>el("li",{},t))));
  const nb=el("div",{class:"nchips"});
  f.b.forEach(nm=>{const nid=nameId[nm];nb.append(nid?el("button",{onclick:()=>{sndTick();if(nav){nav(nid);return}showCard(nid,true);flyTo(LL(nid),1100,Math.max(zoomK,FACTS[nid].a<30000?2.4:1.3))}},nm):el("span",{},nm))});
  if(f.b.length)sec("Neighbours",nb);
  root.append(el("p",{class:"attrib"},"Text adapted from the Wikipedia article “"+L.t+"” (",el("a",{href:"https://en.wikipedia.org/wiki/"+encodeURIComponent(L.t.replace(/ /g,"_")),target:"_blank",rel:"noopener"},"read the full article"),"), licensed CC BY-SA 4.0."+(fd&&fd.x?" Food text from the Wikipedia article \u201C":" Flags from flagcdn.com."),fd&&fd.x?el("a",{href:"https://en.wikipedia.org/wiki/"+encodeURIComponent(fd.t.replace(/ /g,"_")),target:"_blank",rel:"noopener"},fd.t):"",fd&&fd.x?"\u201D, same licence. Flags from flagcdn.com.":""));
}

