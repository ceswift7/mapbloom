/* ======================================================================
   TAKE ME SOMEWHERE: a random place, a dramatic flight, a mystery brief, then the reveal
   ====================================================================== */
let tms=null;
const popTxt=p=>p>=1e6?(p/1e6).toFixed(p>=1e7?0:1)+" million":fmt(Math.round(p/1000)*1000);
function tmsPick(){
  const ok=playable.filter(f=>f.id!==cardId&&FACTS[f.id]&&FACTS[f.id].ll),fresh=ok.filter(f=>!S.found.has(f.id)),src=fresh.length?fresh:ok;
  return src[Math.floor(Math.random()*src.length)].id;
}
function briefHide(){$("brief").classList.remove("on");$("app").classList.remove("tmsrun")}
let tmsTimer=null;
function tmsFly(ll,ms,kEnd){
  return new Promise(res=>{
    stopDrift();animating=true;sndFly(ms/1000);
    const r0=projection.rotate().slice(),k0=zoomK,lat1=Math.max(-70,Math.min(70,ll[1]));
    let d=-ll[0]-r0[0];d=((d%360)+540)%360-180;const spin=reduced?0:(d<0?-1:1)*360;   // one extra full turn
    const t0=performance.now(),run=()=>{
      const t=Math.min(1,(performance.now()-t0)/ms),e=d3.easeCubicInOut(t);
      projection.rotate([r0[0]+(d+spin)*e,r0[1]+(-lat1-r0[1])*e,0]);
      zoomK=Math.max(.85,(k0+(kEnd-k0)*e)*(1-.42*Math.sin(Math.PI*t)));
      render();
      if(t>=1){tm.stop();animating=false;syncZoom();render(true);scheduleDrift();res()}
    },tm=d3.timer(run);tmsTimer=tm;
  });
}
async function tmsGo(){
  if(tms||S.mode!=="wander")return;
  if(reduced){/* no spectacle: a plain flight */}
  hideCard();
  const id=tmsPick(),f=FACTS[id],L=LEARN[id]||{},from=projection.invert([W/2,cy()])||[0,0],me={id,phase:"fly",cancel:false};
  tms=me;$("app").classList.add("tmsrun");
  $("briefGo").disabled=true;$("briefWhere").textContent="Somewhere in "+(f.s||f.r)+".";
  const dl=$("briefFacts");dl.innerHTML="";
  const rows=[];
  if(f.cap)rows.push(["Capital",f.cap]);
  if(L.p)rows.push(["Population","about "+popTxt(L.p)]);
  rows.push(["Area",areaTxt(f.a)]);
  if(f.l&&f.l.length)rows.push([f.l.length>1?"Languages":"Language",f.l.slice(0,3).join(", ")]);
  $("brief").classList.add("on");sndCard(true);
  const ms=reduced?400:3600;
  rows.forEach(([k,v],i)=>setTimeout(()=>{if(tms!==me)return;const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=k;dd.textContent=v;dl.append(dt,dd);sndTick()},reduced?0:700+i*650));
  await tmsFly(LL(id),ms,f.a<30000?2.4:1.6);
  if(tms!==me)return;
  me.phase="brief";$("briefGo").disabled=false;try{$("briefGo").focus({preventScroll:true})}catch(e){}
}
$("tmsBtn").onclick=()=>{sndTick();tmsGo()};
$("briefClose").onclick=()=>{if(tms)tms.cancel=true;tms=null;briefHide()};
$("briefAgain").onclick=()=>{tms=null;briefHide();setTimeout(tmsGo,250)};
$("briefGo").onclick=()=>{
  if(!tms||tms.phase!=="brief")return;
  const id=tms.id;tms=null;briefHide();
  if(S.found.has(id)){showCard(id);return}
  startReveal(id,LL(id),false,()=>{S.found.add(id);S.shown.delete(id);updateProgress();save();paint();setTimeout(checkAch,600)},false);
  setTimeout(()=>{if(S.mode==="wander")showCard(id)},reduced?0:1300);
};

/* ---------- clicks ---------- */
function tap(id,ll,other){
  if(S.mode==="wander"){if(id){showCard(id);floatLabel(FACTS[id].n,ll,2400);sndTick()}return}
  if(S.mode==="hot"){if(id){floatLabel(FACTS[id].n,ll,2400);sndTick();if(HOT.on&&!HOT.done){const i=$("silIn");i.value=FACTS[id].n;try{i.focus({preventScroll:true})}catch(e){}}}return}
  if(S.mode==="speed")return speedGuess(id,ll,other);
  if(skipNext())return;
  guess(id,ll,other);
}
function onClick(e,d){
  const ll=projection.invert(d3.pointer(e,svg.node()));
  if(!ll)return;
  tap(FACTS[d.id]?d.id:null,ll,FACTS[d.id]?false:((d.properties&&d.properties.name)||true));
}
paths.on("click",onClick);
sphere.on("click",function(e){
  const ll=projection.invert(d3.pointer(e,svg.node()));
  if(!ll)return;
  if(CANVAS){const f=hitCountry(ll);if(f)return tap(FACTS[f.id]?f.id:null,ll,FACTS[f.id]?false:((f.properties&&f.properties.name)||true))}
  if(S.mode==="find"){if(skipNext())return;guess(null,ll)}else if(S.mode==="speed")speedGuess(null,ll);
});

/* ---------- progress & chips ---------- */
function updateProgress(){
  {const pr=document.querySelector(".progress");pr.classList.remove("pending");pr.classList.remove("world")}
  if(US.on){const race=S.mode==="speed";$("foundN").textContent=race?R.found.size:US.round.done;$("totalN").textContent=race?R.total:US.round.n;$("progLabel").textContent=race?"found this race":"this round";return}
  if(S.mode==="hot"){$("foundN").textContent=HOT.list.length;$("totalN").textContent=regionPool().length;$("progLabel").textContent="countries guessed";return}
  const all=playable.map(f=>f.id),F=cf(),inRound=RD.active&&S.mode==="find"&&!D.active&&!S.practice;
  const base=S.mode==="speed"?regionPool():inRound?regionPool():all;
  $("foundN").textContent=inRound?RD.done:base.filter(id=>F.has(id)).length;
  $("totalN").textContent=inRound?RD.n:base.length;
  const world=S.mode!=="speed"&&!inRound,nfound=+$("foundN").textContent;
  $("progLabel").textContent=S.mode==="speed"?"found this race":inRound?"this round":(nfound===1?"place in your world":"places in your world");
  {const pr=document.querySelector(".progress");pr.classList.remove("pending");pr.classList.toggle("world",world)}
  const bar=$("bar");
  REGIONS.forEach((r,i)=>{
    const n=base.filter(id=>FACTS[id].r===r&&F.has(id)).length;
    let s=bar.children[i];if(!s){s=document.createElement("span");s.style.background=`var(--c-${r})`;s.style.width="0%";bar.appendChild(s)}
    requestAnimationFrame(()=>{s.style.width=(n/base.length*100)+"%"});
  });
  document.querySelectorAll(".chip[data-r]").forEach(c=>{
    const r=c.dataset.r;const ids=r==="World"?all:all.filter(id=>inReg(id,r));
    c.querySelector(".n").textContent=r==="United States"?"50":`${ids.filter(id=>F.has(id)).length}/${ids.length}`;
  });
}
let flyR=null;
function syncChips(){document.querySelectorAll(".chip[data-r]").forEach(c=>c.setAttribute("aria-pressed",String(c.dataset.r===flyR)))}
ALLR.forEach(r=>{
  const b=document.createElement("button");b.className="chip";b.dataset.r=r;b.setAttribute("aria-pressed","false");
  b.innerHTML=(r==="World"||AREAS.includes(r)?"":`<span class="swatch" style="background:var(--c-${r})"></span>`)+`${r==="World"?"Earth":r} <span class="n"></span>`;
  b.onclick=()=>{
    if(S.mode!=="wander")return;
    sndTick();flyR=r;syncChips();stopDrift();flyTo(REGION_VIEW[r],1300,REGION_ZOOM[r]);
  };
  $("chips").appendChild(b);
});

