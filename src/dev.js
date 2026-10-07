/* =====================================================================
   TEMPORARY DEV MENU. Left out of release builds (build.ps1 -Release).
   Open with the ` key, ?dev in the address, or the little DEV tab.
   ===================================================================== */
(function devMenu(){
  const qs=new URLSearchParams(location.search);
  const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const css=`
.dvTab{position:fixed;left:8px;bottom:8px;z-index:90;font:600 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.08em;padding:6px 9px;border-radius:8px;border:1px solid rgba(0,0,0,.25);background:rgba(20,24,30,.78);color:#9fe6ff;cursor:pointer}
.dvPanel{position:fixed;left:8px;bottom:40px;z-index:90;width:330px;max-height:calc(100vh - 60px);overflow:auto;padding:10px 12px 12px;border-radius:12px;background:rgba(14,18,24,.94);color:#dfe8ee;font:12px/1.45 ui-monospace,Consolas,monospace;box-shadow:0 12px 40px rgba(0,0,0,.45);display:none}
.dvPanel.on{display:block}
.dvPanel h4{margin:12px 0 5px;font:600 11px ui-monospace,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:#9fe6ff}
.dvPanel h4:first-child{margin-top:0}
.dvPanel button{font:inherit;color:#dfe8ee;background:#243040;border:1px solid #3a4a5e;border-radius:6px;padding:4px 8px;margin:2px 4px 2px 0;cursor:pointer}
.dvPanel button:hover{background:#2f4058}
.dvPanel button.hot{background:#7a3b2e;border-color:#b5604a}
.dvPanel label{display:flex;align-items:center;gap:6px;margin:2px 0}
.dvPanel select,.dvPanel input[type=range]{font:inherit;background:#1b2430;color:#dfe8ee;border:1px solid #3a4a5e;border-radius:5px;max-width:100%}
.dvPanel canvas{display:block;width:100%;height:56px;background:#0b0f14;border-radius:6px}
.dvPanel table{width:100%;border-collapse:collapse;margin-top:4px}
.dvPanel td,.dvPanel th{padding:1px 4px;text-align:right;border-top:1px solid #243040}
.dvPanel td:first-child,.dvPanel th:first-child{text-align:left}
.dvKV{display:grid;grid-template-columns:1fr auto;gap:0 10px}
.dvWarn{color:#ffb86b}
.dvBig{font-size:16px;font-weight:700;color:#9fe6ff}
`;
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);

  /* ---------- measurement: frames, marks, phase timers ---------- */
  const FR=[],MK=[],PH={render:0,paint:0,bloom:0,tile:0,clickSync:0,rpf:0,rpfMax:0,renders:0,flyToVisual:0};
  let lastF=performance.now(),rpfWin=[];
  const mark=n=>{MK.push({t:performance.now(),n});if(MK.length>80)MK.shift()};
  function frameLoop(t){
    const dt=t-lastF;lastF=t;
    FR.push({dt,t});if(FR.length>600)FR.shift();
    rpfWin.push(PH.renders);if(rpfWin.length>60)rpfWin.shift();PH.rpf=PH.renders;PH.rpfMax=Math.max(...rpfWin);PH.renders=0;
    if(panel.classList.contains("on"))drawHud();
    requestAnimationFrame(frameLoop);
  }
  const _render=renderNow;renderNow=function(){const t=performance.now();_render();PH.render=performance.now()-t;PH.renders++};
  const _paint=paint;paint=function(){const t=performance.now();_paint();PH.paint=performance.now()-t};
  const _pb=placeBloom;placeBloom=function(b){const t=performance.now();_pb(b);PH.bloom=performance.now()-t};
  const _ea=ensureArt;ensureArt=function(id){const had=artDone[artKey(id)],t=performance.now();const r=_ea(id);if(!had)PH.tile=performance.now()-t;return r};
  const _fly=flyTo;flyTo=function(...a){mark("fly");const p=_fly(...a);p.then(()=>mark("flyEnd"));return p};
  const _sr=startReveal;startReveal=function(...a){mark("reveal");const d=a[3],op=a[6];a[3]=function(){mark("done");d&&d()};if(op)a[6]=function(){mark("payoff");op()};return _sr(...a)};
  const _guess=guess;guess=function(...a){const t=performance.now();mark("click");const r=_guess(...a);PH.clickSync=performance.now()-t;return r};
  let devFilled=false;const _save=save;save=function(){if(devFilled)return;_save()};

  const stats=(arr)=>{
    if(!arr.length)return {n:0,avg:0,p95:0,worst:0,o16:0,o33:0,o50:0,fps:0};
    const s=arr.slice().sort((a,b)=>a-b),sum=arr.reduce((a,b)=>a+b,0);
    return {n:arr.length,avg:sum/arr.length,p95:s[Math.min(s.length-1,Math.floor(s.length*.95))],worst:s[s.length-1],o16:arr.filter(x=>x>17).length,o33:arr.filter(x=>x>33).length,o50:arr.filter(x=>x>50).length,fps:1000/(sum/arr.length)};
  };
  const f1=x=>(+x).toFixed(1);

  /* ---------- UI ---------- */
  const tab=el("button",{class:"dvTab",title:"Dev menu (` key)"},"DEV");
  const panel=el("div",{class:"dvPanel"});
  document.body.append(tab,panel);
  const toggle=()=>{panel.classList.toggle("on");LS("mb-dev",panel.classList.contains("on")?"1":"0")};
  tab.onclick=toggle;
  document.addEventListener("keydown",e=>{if(e.key==="`"&&!/input|textarea|select/i.test((document.activeElement||{}).tagName||"")){e.preventDefault();toggle()}});
  if(qs.has("dev")||LS("mb-dev")==="1")panel.classList.add("on");

  const hud=el("canvas",{width:300,height:56});
  const hudTxt=el("div",{class:"dvKV"});
  const ph=el("div",{class:"dvKV"});
  const warn=el("div",{class:"dvWarn"});
  function drawHud(){
    const ctx=hud.getContext("2d"),w=hud.width,h=hud.height,n=Math.min(FR.length,150),fr=FR.slice(-n);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#1b2430";[16.7,33.3].forEach(m=>ctx.fillRect(0,h-h*m/66,w,1));
    fr.forEach((f,i)=>{const bh=Math.min(h,h*f.dt/66);ctx.fillStyle=f.dt<=17.5?"#4fd18b":f.dt<=33.5?"#f0b44c":"#ef5b5b";ctx.fillRect(i*2,h-bh,1.6,bh)});
    const t0=fr.length?fr[0].t:0,t1=fr.length?fr[fr.length-1].t:1;
    const col={click:"#ffffff",fly:"#7cc4ff",flyEnd:"#7cc4ff",reveal:"#ff9ad5",payoff:"#ffe28a",done:"#b8ffb0"};
    MK.forEach(m=>{if(m.t<t0||m.t>t1)return;const x=2*fr.findIndex(f=>f.t>=m.t);if(x<0)return;ctx.fillStyle=col[m.n]||"#fff";ctx.fillRect(x,0,1,12)});
    const s=stats(FR.slice(-120).map(f=>f.dt));
    hudTxt.innerHTML=`<span>fps</span><span class="dvBig">${f1(s.fps)}</span><span>avg / p95 / worst ms</span><span>${f1(s.avg)} / ${f1(s.p95)} / ${f1(s.worst)}</span><span>frames &gt;17 / &gt;33 / &gt;50 ms</span><span>${s.o16} / ${s.o33} / ${s.o50}</span>`;
    ph.innerHTML=`<span>render()</span><span>${f1(PH.render)} ms</span><span>renders per frame (max 1s)</span><span>${PH.rpfMax}</span><span>paint()</span><span>${f1(PH.paint)} ms</span><span>placeBloom</span><span>${f1(PH.bloom)} ms</span><span>last tile build</span><span>${f1(PH.tile)} ms</span><span>last click handler</span><span>${f1(PH.clickSync)} ms</span><span>DOM nodes / defs</span><span>${document.getElementsByTagName("*").length} / ${document.querySelector("#globe defs").children.length}</span><span>LOD level / zoom</span><span>${lodLvl} / ${zoomK.toFixed(2)}</span>${performance.memory?`<span>JS heap</span><span>${(performance.memory.usedJSHeapSize/1048576).toFixed(0)} MB</span>`:""}`;
    warn.textContent=document.visibilityState!=="visible"?"Page is hidden: the browser pauses animation frames, so numbers are not valid.":"";
  }

  /* ---------- fill controls ---------- */
  let snap=null,gradTimer=null;
  const order=()=>{const by={};playable.forEach(f=>(by[FACTS[f.id].r]=by[FACTS[f.id].r]||[]).push(f.id));const out=[];let more=true,i=0;while(more){more=false;REGIONS.forEach(r=>{if(by[r]&&by[r][i]){out.push(by[r][i]);more=true}});i++}return out};
  const ORDER=order();
  const fillLab=el("span",{},"");
  function fillTo(n){
    if(!snap)snap={found:[...S.found],shown:[...S.shown]};
    devFilled=true;S.found.clear();S.shown.clear();ORDER.slice(0,n).forEach(id=>S.found.add(id));
    paint();updateProgress();fillLab.textContent=` ${n}/${ORDER.length} (not saved)`;slider.value=Math.round(n/ORDER.length*100);
  }
  function restore(){
    clearInterval(gradTimer);if(!snap){fillLab.textContent="";return}
    S.found.clear();S.shown.clear();snap.found.forEach(id=>S.found.add(id));snap.shown.forEach(id=>S.shown.add(id));snap=null;devFilled=false;
    paint();updateProgress();fillLab.textContent=" restored";
  }
  const slider=el("input",{type:"range",min:"0",max:"100",value:"0"});
  slider.oninput=()=>fillTo(Math.round(slider.value/100*ORDER.length));
  function fillGradually(){clearInterval(gradTimer);let n=0;fillTo(0);gradTimer=setInterval(()=>{n++;fillTo(n);if(n>=ORDER.length)clearInterval(gradTimer)},50)}

  /* ---------- benchmarks ---------- */
  let lastReport=null;
  const out=el("div",{});
  function showTable(title,rows,keys){
    out.innerHTML="";out.append(el("h4",{},title));
    const t=el("table",{});t.append(el("tr",{},keys.map(k=>el("th",{},k))));
    rows.forEach(r=>t.append(el("tr",{},keys.map(k=>el("td",{},String(r[k]))))));out.append(t);
  }
  async function benchClicks(n){
    if(S.mode!=="find"||S.qIdle){toast("T","Dev","Start a Quiz (free play) first");return}
    const rows=[];stopDrift();closeLens();
    for(let i=0;i<n;i++){
      const ids=playable.map(f=>f.id).filter(id=>!lensOf(id)),id=ids[Math.floor(Math.random()*ids.length)];
      S.found.delete(id);S.shown.delete(id);S.target=id;S.done=false;S.tries=0;
      projection.rotate([-(Math.random()*340-170),-(Math.random()*60-30),0]);zoomK=1;syncZoom();render();
      await sleep(350);
      const start=FR.length;guess(id,LL(id));await sleep(3300);
      const d=FR.slice(start).map(f=>f.dt),s=stats(d);
      rows.push({country:FACTS[id].n.slice(0,16),clickMs:f1(PH.clickSync),worst:f1(s.worst),p95:f1(s.p95),">33":s.o33,avg:f1(s.avg)});
      S.done=false;hideCard();clearMissed();
    }
    const all=rows.reduce((a,r)=>a.concat(+r.worst),[]);
    lastReport={kind:"clicks",rows,worstOverall:Math.max(...all),meanWorst:all.reduce((a,b)=>a+b,0)/all.length};
    showTable(`Click-to-pan test (${n} clicks), mean worst ${f1(lastReport.meanWorst)} ms`,rows,["country","clickMs","worst","p95",">33","avg"]);
  }
  function setZoomTo(z){let g=0;while(Math.abs(zoomK-z)/z>.04&&g++<90){svg.node().dispatchEvent(new WheelEvent("wheel",{deltaY:zoomK<z?-120:120,bubbles:true,cancelable:true,clientX:W/2,clientY:cy()}))}render();return zoomK}
  async function benchTour(){
    const rows=[];stopDrift();
    for(const z of [1,2.2,4,8]){
      setZoomTo(z);await sleep(400);
      const start=FR.length;
      for(let i=0;i<70;i++){svg.node().dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));await new Promise(r=>requestAnimationFrame(r))}
      const s=stats(FR.slice(start+3).map(f=>f.dt));
      rows.push({zoom:z,fps:f1(s.fps),avg:f1(s.avg),p95:f1(s.p95),worst:f1(s.worst),">33":s.o33});
    }
    setZoomTo(1);lastReport={kind:"tour",rows};
    showTable("Drag test (arrow-key drag at each zoom)",rows,["zoom","fps","avg","p95","worst",">33"]);
  }
  function report(){
    const o={report:lastReport,hud:stats(FR.slice(-120).map(f=>f.dt)),phases:PH,fx:FX,env:{ua:navigator.userAgent,dpr:devicePixelRatio,vw:innerWidth,vh:innerHeight,cores:navigator.hardwareConcurrency,found:S.found.size,mode:S.mode,audio:(typeof actx!=="undefined"&&actx&&actx.state)||"none"}};
    const txt=JSON.stringify(o,null,1);
    (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast("🛠","Dev","Report copied"),()=>{console.log(txt);toast("🛠","Dev","Report printed to the console")});
  }

  /* ---------- isolation toggles ---------- */
  const chk=(label,get,set)=>{const i=el("input",{type:"checkbox"});i.checked=get();i.onchange=()=>set(i.checked);return el("label",{},i,label)};
  const bodyCls=(c,on)=>document.body.classList.toggle(c,on);
  const disp=(sel,on)=>sel.style("display",on?null:"none");
  const sel=(opts,get,set)=>{const s=el("select",{},opts.map(([v,l])=>el("option",{value:v},l)));s.value=String(get());s.onchange=()=>set(s.value);return s};
  let noDrift=false;const _sd=scheduleDrift;scheduleDrift=function(){if(noDrift)return;_sd()};

  const targetSel=el("select",{},[el("option",{value:""},"force next target…"),...playable.map(f=>FACTS[f.id].n).sort().map(n=>el("option",{value:n},n))]);
  targetSel.onchange=()=>{const n=targetSel.value;if(!n)return;const id=playable.find(f=>FACTS[f.id].n===n).id;if(S.mode!=="find"){setMode("find",true,true)}S.qIdle=false;S.target=id;S.done=false;S.tries=0;warmArt(id);showPrompt(id);$("showBtn").hidden=false;$("nextBtn").hidden=true;hideCard();swell($("hint"),"Dev: target forced.")};
  const regionSel=sel([["","jump to region…"],["World","World"],...REGIONS.map(r=>[r,r])],()=>"",v=>{if(!v)return;const c=document.querySelector(`.chip[data-r="${v}"]`);c&&c.click()});

  panel.append(
    el("h4",{},"Frame rate"),hud,hudTxt,warn,
    el("div",{style:"font-size:10px;color:#7d8da0;margin-top:3px"},"green ≤17ms · amber ≤33ms · red slower · ticks: white click, blue fly, pink reveal, yellow payoff, green done"),
    el("h4",{},"Phase timers"),ph,
    el("h4",{},"Fill countries (never saved)"),
    el("div",{},el("button",{class:"hot",onclick:()=>fillTo(ORDER.length)},"Fill every country"),el("button",{onclick:fillGradually},"Fill gradually"),el("button",{onclick:restore},"Restore mine"),fillLab),
    el("div",{},slider),
    el("h4",{},"Benchmarks"),
    el("div",{},el("button",{onclick:()=>benchClicks(8)},"Click-to-pan ×8"),el("button",{onclick:benchTour},"Drag at zoom 1-8"),el("button",{onclick:report},"Copy report")),
    out,
    el("h4",{},"Isolate what costs frames"),
    chk("paint filter (#wc)",()=>FX.wc,v=>{FX.wc=v;gPaint.attr("filter",v?"url(#wc)":null);lPaint.attr("filter",v?"url(#wc)":null)}),
    chk("bloom mask filter",()=>FX.bloomFx,v=>FX.bloomFx=v),
    chk("painting tiles (off = flat colour)",()=>FX.tiles,v=>{FX.tiles=v;paint()}),
    chk("globe shadow / lift",()=>true,v=>{disp(gShadow,v);disp(gLift,v)}),
    chk("graticule",()=>true,v=>disp(grat,v)),
    chk("pills, rings, labels",()=>true,v=>{disp(gPills,v);disp(gBeacon,v);labelsEl.style.display=v?"":"none"}),
    chk("viewport clipping",()=>FX.clip,v=>{FX.clip=v;render()}),
    chk("off-screen culling",()=>FX.cull,v=>{FX.cull=v;render()}),
    chk("auto-drift",()=>true,v=>{noDrift=!v;if(!v)stopDrift();else scheduleDrift()}),
    el("label",{},"LOD",sel([["auto","auto"],[0,"110m lo"],[1,"simplified mid"],[2,"50m full"]],()=>FX.lod,v=>{FX.lod=v==="auto"?"auto":+v;render()})),
    el("label",{},"animation speed",sel([[1,"1x"],[2,"0.5x (2x slower)"],[4,"0.25x (4x slower)"]],()=>FX.ts,v=>FX.ts=+v)),
    el("h4",{},"Utilities"),
    el("div",{},el("button",{onclick:()=>{audioReady(()=>{sndIntroDrop();sndBloom(false)})}},"Play intro drop"),(()=>{setInterval(()=>{const e=document.getElementById("dvAudio");if(e)e.textContent="audio: "+((typeof actx!=="undefined"&&actx&&actx.state)||"none")},500);return el("span",{id:"dvAudio",style:"margin-left:8px"},"audio: -")})()),
    el("div",{},targetSel),el("div",{},regionSel),
    el("label",{},"zoom",(()=>{const z=el("input",{type:"range",min:"1",max:"8",step:".1",value:"1"});z.oninput=()=>setZoomTo(+z.value);return z})()),
    chk("skip the opening next time",()=>LS("mb-skip-intro")==="1",v=>LS("mb-skip-intro",v?"1":"0")),
    el("div",{},el("button",{onclick:()=>{if(confirm("Clear ALL saved Mapbloom data in this browser?")){["mapbloom","mapbloom-records-v3","tidewash","tidewash-records","tidewash-records-v3","slowatlas"].forEach(k=>localStorage.removeItem(k));location.reload()}}},"Wipe saved data"))
  );
  /* ---------- culprit finder + per-shape profile ---------- */
  const ctoggles=[
    ["paint filter (#wc)",()=>{FX.wc=false;gPaint.attr("filter",null);lPaint.attr("filter",null)},()=>{FX.wc=true;gPaint.attr("filter","url(#wc)");lPaint.attr("filter","url(#wc)")}],
    ["painting tiles (flat colour)",()=>{FX.tiles=false;paint()},()=>{FX.tiles=true;paint()}],
    ["globe shadow / lift",()=>{disp(gShadow,false);disp(gLift,false)},()=>{disp(gShadow,true);disp(gLift,true)}],
    ["graticule",()=>disp(grat,false),()=>disp(grat,true)],
    ["pills, rings, labels",()=>{disp(gPills,false);disp(gBeacon,false);labelsEl.style.display="none"},()=>{disp(gPills,true);disp(gBeacon,true);labelsEl.style.display=""}],
    ["viewport clipping",()=>{FX.clip=false;render(true)},()=>{FX.clip=true;render(true)}],
    ["off-screen culling",()=>{FX.cull=false;render(true)},()=>{FX.cull=true;render(true)}],
    ["detail forced to lowest",()=>{FX.lod=0;render(true)},()=>{FX.lod="auto";render(true)}]
  ];
  async function dragRun(n=50){const start=FR.length;for(let i=0;i<n;i++){svg.node().dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));await new Promise(r=>requestAnimationFrame(r))}return stats(FR.slice(start+3).map(f=>f.dt))}
  async function culprit(){
    if(document.visibilityState!=="visible"){toast("🛠","Dev","Bring this tab to the front first");return}
    stopDrift();out.innerHTML="";out.append(el("h4",{},"Running… (about 20 s, don't touch anything)"));
    const base=await dragRun(),rows=[];
    for(const [name,off,on] of ctoggles){off();await sleep(250);const r=await dragRun();on();await sleep(200);rows.push({test:"without "+name,avg:f1(r.avg),p95:f1(r.p95),fps:f1(r.fps),saved:+(base.avg-r.avg).toFixed(1)})}
    rows.sort((a,b)=>b.saved-a.saved);
    const all=[{test:"BASELINE (all on), zoom "+zoomK.toFixed(1)+", "+S.found.size+" painted",avg:f1(base.avg),p95:f1(base.p95),fps:f1(base.fps),saved:0},...rows];
    lastReport={kind:"culprit",zoom:+zoomK.toFixed(2),painted:S.found.size,rows:all};
    showTable("Culprit finder: biggest win first",all,["test","avg","p95","fps","saved"]);
  }
  function featureProfile(){
    const lvl=typeof FX.lod==="number"?FX.lod:lodLvl,cen=projection.invert([W/2,cy()]),rows=[];
    features.forEach(f=>{const g=lvl===2?f:lvl===1?(f._mid||f._lo):f._lo;if(!g)return;const t=performance.now();for(let i=0;i<3;i++)drawFeature(g,cen,1.6);
      rows.push({country:(FACTS[f.id]?FACTS[f.id].n:(f.properties&&f.properties.name)||String(f.id)).slice(0,18),ms:+((performance.now()-t)/3).toFixed(2),parts:g.geometry.type==="MultiPolygon"?g.geometry.coordinates.length:1})});
    rows.sort((a,b)=>b.ms-a.ms);
    lastReport={kind:"shapes",lod:lvl,top:rows.slice(0,15),total:+rows.reduce((a,r)=>a+r.ms,0).toFixed(1)};
    showTable(`Slowest shapes to draw (detail level ${lvl}, all together ${lastReport.total} ms)`,rows.slice(0,10),["country","ms","parts"]);
  }
  panel.insertBefore(el("div",{},el("button",{class:"hot",onclick:culprit},"Find the culprit"),el("button",{onclick:featureProfile},"Slowest shapes")),out);
  requestAnimationFrame(frameLoop);
})();
