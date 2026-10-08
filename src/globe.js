/* ======================================================================
   ISLAND GROUPS: a small pill on the globe opens a magnified paper lens where
   each island is big enough to tap. Tiny countries outside a group get a beacon.
   ====================================================================== */
/* ---- zoomed in on the Pacific and the Antilles, each island gets a pale reef halo, and the low coral atolls a lagoon with a sand rim,
   drawn from the island's own outline: the shape is the clue, never a name ---- */
const gReef=svg.append("g").attr("class","reef").style("pointer-events","none"),reefEl={};
function reefUpdate(cen){
  const vis=cen&&zoomK>=3.2&&typeof AREA_SET!=="undefined";
  if(!vis){if(gReef.attr("data-on")){gReef.attr("data-on",null).style("display","none")}return}
  gReef.attr("data-on","1").style("display",null).style("opacity",Math.min(1,(zoomK-3.2)/1.2).toFixed(2));
  const ids=[...AREA_SET["Pacific Islands"],...AREA_SET["Antilles"]];
  ids.forEach(id=>{
    const f=byId[id];if(!f)return;
    let e=reefEl[id];
    if(!e){const a=FACTS[id].a;e=reefEl[id]={g:gReef.append("g"),atoll:a<1500&&FACTS[id].grp!=="Caribbean"||a<450};
      ["h1","h2","h3"].forEach(c=>e.g.append("path").attr("class","rf "+c));
      if(e.atoll){e.g.append("path").attr("class","rf lg");e.g.append("path").attr("class","rf sand")}
    }
    const near=d3.geoDistance(LL(id),cen)<.55;
    if(!near){if(e.on){e.g.style("display","none");e.on=false}return}
    const d=path(f)||"";e.g.style("display",null);e.on=true;e.g.selectAll("path").attr("d",d);
  });
}
const gBeacon=svg.append("g");
const CL_DEF=[{name:"Pacific",ids:playable.map(f=>f.id).filter(id=>["Polynesia","Micronesia","Melanesia"].includes(FACTS[id].grp))},
  {name:"Lesser Antilles",ids:["028","052","212","308","659","662","670"]}];
const clusterOf=id=>CL_DEF.find(c=>c.ids.includes(id))||null;
const AREA_SET={"Pacific Islands":new Set(CL_DEF[0].ids),"Antilles":new Set(playable.map(f=>f.id).filter(id=>FACTS[id].grp==="Caribbean"||["192","388","332","214","044"].includes(id))),"United States":new Set()};
const BEACON=playable.map(f=>f.id).filter(id=>FACTS[id].a<9000);
CL_DEF.forEach(g=>{g.pts=g.ids.map(id=>[FACTS[id].ll[1],FACTS[id].ll[0]]);g.c=d3.geoCentroid({type:"MultiPoint",coordinates:g.pts});g.rad=Math.max(...g.pts.map(p=>d3.geoDistance(g.c,p)))});
/* tiny countries get a dotted ring so they can be found and tapped */
const beaconList=BEACON.map(id=>{
  const ge=gBeacon.append("g").attr("data-id",id);
  const c=ge.append("circle").attr("class","beacon").attr("r",5.5);
  ge.append("circle").attr("class","beaconhit").attr("r",10.5).attr("data-id",id)
    .on("click",()=>tap(id,LL(id))).on("pointermove",ev=>onMove(ev,{id})).on("pointerleave",clearHover);
  return {id,g:ge,c,diam:2*Math.sqrt(FACTS[id].a/Math.PI)/6371};
});
function positionIslands(cen){
  const s=baseScale*zoomK;reefUpdate(cen);
  beaconList.forEach(b=>{
    const ll=LL(b.id),p=projection(ll),vis=cen&&d3.geoDistance(ll,cen)<1.5&&b.diam*s<16;
    b.g.attr("display",vis?null:"none");if(vis)b.g.attr("transform",`translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`);
  });
}
function updateBeacons(){
  const F=cf();
  beaconList.forEach(b=>{const on=F.has(b.id);b.c.classed("found",on).style("fill",on?(()=>{const k=ensureArt(b.id);if(CANVAS)ensureArtSvg(k);return `url(#af-${k})`})():null)});
}/* ---------- interaction: drag to turn, wheel/pinch to zoom ---------- */
let lastT=d3.zoomIdentity, idleTimer=null, drifting=!reduced;
let movT=null,moving=false,rq=false;
function requestRender(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;render()})}
function markMoving(){if(!moving){moving=true;svg.classed("moving",true);}clearTimeout(movT);movT=setTimeout(()=>{moving=false;svg.classed("moving",false);render();saveViewSoon()},170)}
const zoom=d3.zoom().scaleExtent([.8,8]).clickDistance(5)
  .on("start",()=>{stopDrift()})
  .on("zoom",e=>{
    const t=e.transform;
    if(t.k!==lastT.k){zoomK=t.k}
    else{
      const k=75/(baseScale*zoomK);
      const r=projection.rotate();
      brushKick(Math.hypot(t.x-lastT.x,t.y-lastT.y));
      projection.rotate([r[0]+(t.x-lastT.x)*k, Math.max(-85,Math.min(85,r[1]-(t.y-lastT.y)*k)), r[2]]);
    }
    lastT=t;markMoving();requestRender();
  })
  .on("end",()=>{scheduleDrift()});
zoom.wheelDelta(e=>-e.deltaY*(e.deltaMode===1?.05:e.deltaMode?1:.002)*(e.ctrlKey?10:(e.deltaMode===0&&Math.abs(e.deltaY)>=50?1.8:1)));   // mouse-wheel notches zoom faster; trackpads keep their feel
svg.call(zoom).on("dblclick.zoom",null);

svg.on("keydown",e=>{
  const r=projection.rotate();const step=8/zoomK;
  const m={ArrowLeft:[step,0],ArrowRight:[-step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
  if(m){e.preventDefault();stopDrift();brushKick(18);projection.rotate([r[0]+m[0],Math.max(-85,Math.min(85,r[1]+m[1])),0]);markMoving();requestRender();scheduleDrift();}
  if(e.key==="+"||e.key==="="){svg.transition().duration(250).call(zoom.scaleBy,1.3)}
  if(e.key==="-"){svg.transition().duration(250).call(zoom.scaleBy,1/1.3)}
});

function stopDrift(){drifting=false;clearTimeout(idleTimer)}
function scheduleDrift(){clearTimeout(idleTimer);if(reduced||S.mode==="speed"||S.mode==="hot")return;idleTimer=setTimeout(()=>{drifting=true},9000)}
let lastTs=0;
d3.timer(ts=>{
  const dt=ts-lastTs;lastTs=ts;
  brushTick();
  if(R.phase==="run")$("sTime").textContent=fmtT((R.pausedAt||performance.now())-R.t0+R.pen);
  if(D.active&&D.t0!=null){const dt2=D.tEnd!=null?D.tEnd:performance.now()-D.t0;$("dClock").textContent=fmtT(dt2);$("dClock").classList.toggle("gold",dt2<60000)}
  if(drifting&&introState==="done"&&!LITE&&!animating&&dt<100&&zoomK<=1.03&&S.mode!=="speed"&&S.mode!=="hot"&&!nmOn&&!silOn){const r=projection.rotate();projection.rotate([r[0]+dt*.0035,r[1],r[2]]);render();}
});
svg.on("pointerenter",()=>{if(S.mode==="find")stopDrift()}).on("pointerleave",scheduleDrift);

/* ---------- rotate-to ---------- */
let animating=false;
function flyTo(lonlat,ms=1400,k){
  const [lon,lat]=lonlat;
  const r0=projection.rotate(), r1=[-lon,-Math.max(-60,Math.min(60,lat)),0];
  while(r1[0]-r0[0]>180)r1[0]-=360;while(r1[0]-r0[0]<-180)r1[0]+=360;
  const k0=zoomK,k1=k||zoomK;ms*=FX.ts||1;
  if(reduced){projection.rotate(r1);zoomK=k1;syncZoom();render();return Promise.resolve()}
  animating=true;sndFly(ms/1000);
  return new Promise(res=>{
    d3.transition().duration(ms).ease(d3.easeCubicInOut).tween("fly",()=>{
      const ir=d3.interpolate(r0,r1), ik=d3.interpolate(k0,k1);
      return t=>{projection.rotate(ir(t));zoomK=ik(t);render()};
    }).on("end",()=>{animating=false;syncZoom();render();res()}).on("interrupt",()=>res());   // a newer flight takes over; callers waiting on this one carry on
  });
}
/* while something is flying or blooming, translucent blurred panels become plain ones (re-blurring over a moving map every frame is costly) */

/* build a country’s painting tiles ahead of time (when it becomes the target) so the click itself does no canvas work */
function warmArt(id){
  if(!id||!FACTS[id])return;
  const run=()=>{const k=ensureArt(id);ensureWash(k);ensureMotif(k)};
  if(window.requestIdleCallback)requestIdleCallback(run,{timeout:700});else setTimeout(run,80);
}
function syncZoom(){lastT=d3.zoomIdentity.scale(zoomK);svg.property("__zoom",lastT)}

/* ---------- labels ---------- */
const labelsEl=document.getElementById("labels");
const live=[];
function floatLabel(text,lonlat,ms=2600,v){v=v||MV;
  const e=document.createElement("div");e.className="label";e.textContent=text;labelsEl.appendChild(e);
  const item={el:e,lonlat,v};live.push(item);positionLabels();
  requestAnimationFrame(()=>requestAnimationFrame(()=>e.classList.add("on")));
  if(ms) setTimeout(()=>{e.classList.remove("on");setTimeout(()=>{e.remove();const i=live.indexOf(item);if(i>-1)live.splice(i,1)},800)},ms);
  return item;
}
function positionLabels(){
  const c=projection.invert([W/2,cy()]);
  live.forEach(({el:e,lonlat,v})=>{

    const p=projection(lonlat);const vis=c&&d3.geoDistance(lonlat,c)<Math.PI/2;
    e.style.left=p[0]+"px";e.style.top=p[1]+"px";e.style.visibility=vis?"visible":"hidden";
  });
}
let hoverLabel=null;
function onMove(e,d){
  const f=FACTS[d.id];if(!f)return;
  if(S.mode==="speed")return clearHover();
  if(S.mode==="find"&&!cf().has(d.id)&&!(S.done&&S.target===d.id))return clearHover();
  if(e.pointerType==="touch")return;
  const ll=projection.invert(d3.pointer(e,svg.node()));
  if(!hoverLabel||hoverLabel.id!==d.id){clearHover();hoverLabel=floatLabel(f.n,ll,0);hoverLabel.id=d.id}
  hoverLabel.lonlat=ll;positionLabels();
}
paths.on("pointermove",onMove).on("pointerleave",clearHover);
/* canvas globe: hover label, hover tint and the over-a-country cursor come from hit-testing the pointer position */
let cvHQ=null,cvHRaf=0;
sphere.on("pointermove.cv",ev=>{
  if(!CANVAS||ev.pointerType==="touch")return;
  cvHQ=ev;if(cvHRaf)return;
  cvHRaf=requestAnimationFrame(()=>{
    cvHRaf=0;const e=cvHQ;if(!e)return;const ll=projection.invert(d3.pointer(e,svg.node()));
    const f=ll&&!moving?hitCountry(ll):null,pl=f&&FACTS[f.id]?f.id:null;
    svg.classed("overland",!!pl);
    if(pl)onMove(e,{id:pl});else clearHover();
    const hv=(pl&&!cf().has(pl))?pl:null;
    if(hv!==cvHover){cvHover=hv;requestRender()}
  });
}).on("pointerleave.cv",()=>pointerAway());
/* the highlight and label must never outlive the pointer: clear them whenever it leaves the globe, the stage or the window */
function pointerAway(){cvHQ=null;svg.classed("overland",false);clearHover();if(cvHover!=null){cvHover=null;requestRender()}}
document.getElementById("stage").addEventListener("pointerleave",pointerAway);
document.documentElement.addEventListener("pointerleave",pointerAway);
document.addEventListener("mouseleave",pointerAway);
window.addEventListener("blur",pointerAway);
document.addEventListener("pointermove",e=>{if(e.pointerType==="touch"||(cvHover==null&&!hoverLabel))return;const t=e.target;if(!(t===sphere.node()||(t.closest&&t.closest("#globe"))))pointerAway()},{passive:true});
function clearHover(){if(hoverLabel){const h=hoverLabel;h.el.classList.remove("on");setTimeout(()=>{h.el.remove();const i=live.indexOf(h);if(i>-1)live.splice(i,1)},500);hoverLabel=null}}

