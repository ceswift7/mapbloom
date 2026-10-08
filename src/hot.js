/* ======================================================================
   HOT AND COLD: a country is hidden, you type guesses, each guess is coloured by how close it is
   ====================================================================== */
const HEAT=d3.scaleLinear().domain([0,.3,.55,.78,1]).range(["#3f6fb5","#8fc0e4","#f1e7a3","#f2a24c","#d23b2c"]).clamp(true);
const heatOf=d=>HEAT(Math.pow(1-Math.min(d,14000)/14000,1.6));
function hotPts(id){   // a thinned set of boundary points, enough to measure the gap between two countries
  const f=byId[id];if(f._hp)return f._hp;
  const polys=(f.geometry.type==="MultiPolygon"?f.geometry.coordinates:[f.geometry.coordinates]).map(p=>p[0]).sort((a,b)=>b.length-a.length).slice(0,30);
  const tot=polys.reduce((a,r)=>a+r.length,0)||1,out=[];
  polys.forEach(r=>{const want=Math.max(3,Math.round(300*r.length/tot)),st=Math.max(1,Math.floor(r.length/want));for(let i=0;i<r.length;i+=st)out.push(r[i])});
  return f._hp=out.length?out:[f._c||LL(id)];
}
function hotDist(a,b){
  if(a===b)return 0;
  const A=hotPts(a),B=hotPts(b);let m=Infinity;
  for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){const d=d3.geoDistance(A[i],B[j]);if(d<m)m=d}
  return m*6371;
}
const hotBorders=(a,b)=>(FACTS[a].b||[]).includes(FACTS[b].n)||(FACTS[b].b||[]).includes(FACTS[a].n);
function hotResolve(txt){
  const t=silNorm(txt);if(!t)return null;silBuild();
  const ids=Object.keys(FACTS).filter(id=>byId[id]);
  for(const id of ids)if(silNames.byId[id].has(t))return id;
  if(silNames.all.has(t))return null;
  const near=ids.filter(id=>[...silNames.byId[id]].some(n=>n.length>=6&&Math.abs(n.length-t.length)<=1&&lev(t,n)<=1));   // the same one-letter rule as Name it, and only when it points at a single country
  return near.length===1?near[0]:null;
}
const hotWhere=()=>S.region==="World"?"Earth":S.region==="Americas"?"the Americas":S.region;
function hotEnter(){
  HOT.on=false;HC.clear();S.done=false;hideCard();clearMissed();
  if(S.region==="United States"){S.region="World";syncChips()}
  paint();updateProgress();showHotSheet();
}
function hotStop(){HOT.on=false;HOT.done=false;HC.clear();silHide();paint();requestRender()}
function showHotSheet(){
  const sh=$("sheet");sh.innerHTML="";
  const chips=el("div",{class:"row",style:"margin:0"}),best=(S.counts.hotBest||{})[S.region];
  ALLR.filter(r=>r!=="United States").forEach(r=>{
    const n=r==="World"?playable.length:playable.filter(f=>inReg(f.id,r)).length;
    chips.append(el("button",{class:"chip","aria-pressed":String(r===S.region),onclick:()=>{sndTick();S.region=r;syncChips();updateProgress();stopDrift();flyTo(REGION_VIEW[r],1300,REGION_ZOOM[r]);showHotSheet()}},r==="World"?"Earth":r,el("span",{class:"n"},n+"")));
  });
  sh.append(closeBtn(),el("h2",{},"Hot & cold"),el("p",{},"A country is hidden. Type guesses: each one is coloured by how close it is. Find it in as few as you can."));
  sh.append(el("div",{class:"qcard"},step(1,"Where it hides","You can still guess anywhere on Earth.",chips)));
  sh.append(el("p",{class:"bestline"},`Best in ${hotWhere()}: `+(best?`${best} guess${best===1?"":"es"}`:"none yet")));
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",onclick:()=>setMode("wander")},"Back to Explore"),el("span",{class:"grow"}),el("button",{class:"btn primary bigstart",style:"width:auto;min-width:140px",id:"startHot",onclick:hotStart},"Start")));
  const hb=S.counts.hotBest||{},rows=ALLR.filter(r=>r!=="United States").map(r=>el("div",{class:"recrow",style:"display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-top:1px dashed var(--panel-line)"},el("span",{},r==="World"?"Earth":r==="Americas"?"The Americas":r),el("b",{},hb[r]?hb[r]+" guess"+(hb[r]===1?"":"es"):"\u2014")));
  sh.append(fold("Your records",el("div",{},el("p",{style:"margin:0 0 6px;color:var(--ink-soft);font-size:13px"},`Found ${S.counts.hot||0} hidden countr${(S.counts.hot||0)===1?"y":"ies"} in all. Fewest guesses per area:`),rows)));
  openModal(true);setTimeout(()=>{const b=$("startHot");if(b)b.focus({preventScroll:true})},60);
}
function hotStart(){
  closeModal();
  const rp=regionPool().filter(id=>byId[id]&&id!==HOT.target);if(!rp.length)return;
  $("sil").classList.remove("hotdone");HOT.target=rp[Math.floor(Math.random()*rp.length)];HOT.list=[];HOT.done=false;HOT.on=true;HC.clear();
  silKeep();silOn=false;nmOn=false;hideCard();clearMissed();hlSet(null);
  $("app").classList.add("nameit");
  const box=$("sil");box.hidden=false;box.classList.remove("out");box.classList.add("nameit","hot");$("silSvg").style.display="none";
  $("silForm").hidden=false;$("silQ").textContent="Find the hidden country";$("silHint").textContent="Type any country. Warmer colours are closer.";
  $("silIn").value="";$("silSug").innerHTML="";$("silShow").textContent="Give up";$("silSkip").hidden=true;
  hotRender();paint();requestRender();updateProgress();
  stopDrift();flyTo(REGION_VIEW[S.region],1300,REGION_ZOOM[S.region]);
  setTimeout(()=>{try{$("silIn").focus({preventScroll:true})}catch(e){}},80);
}
function hotRender(){
  const ul=$("hotList");ul.innerHTML="";
  [...HOT.list].sort((a,b)=>a.d-b.d).forEach(g=>ul.append(el("li",{class:g===HOT.last?"last":""},el("i",{style:`background:${g.col}`}),el("span",{class:"hn"},FACTS[g.id].n),g.nb?el("span",{class:"hb"},"Borders it"):null)));
  ul.hidden=!HOT.list.length;
}
function hotGuess(){
  if(!HOT.on||HOT.done)return;
  const inp=$("silIn"),txt=inp.value;if(!txt.trim())return;
  const id=hotResolve(txt);
  const bad=m=>{const fm=$("silForm");fm.classList.remove("shake");void fm.offsetWidth;fm.classList.add("shake");$("silHint").textContent=m;inp.select();sndMiss()};
  if(!id)return bad("Not a country I know. Check the spelling.");
  if(HOT.list.some(g=>g.id===id))return bad(`You already tried ${FACTS[id].n}.`);
  const T=HOT.target,win=id===T,nb=!win&&hotBorders(id,T),d=win?0:nb?0:hotDist(id,T);
  const g={id,d,nb,col:win?"#3fa66a":heatOf(d),dir:win?"":bearing(LL(id),LL(T))};
  $("silHint").classList.remove("bord");HOT.list.push(g);HOT.last=g;HC.set(id,g.col);inp.value="";$("silSug").innerHTML="";
  hotRender();paint();requestRender();updateProgress();
  if(win)return hotFinish(false);
  if(nb)sndBorder();else sndHeat(1-Math.min(d,14000)/14000);nameFly(id);$("silHint").textContent=nb?FACTS[id].n+" shares a border with the hidden country!":"Warmer colours are closer.";$("silHint").classList.toggle("bord",!!nb);
}
/* Enter on the result card plays again (a moment after the winning Enter, so that one never restarts it) */
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.repeat&&S.mode==="hot"&&HOT.on&&HOT.done&&performance.now()-(HOT.doneAt||0)>600&&!modal.classList.contains("on")&&!/^(BUTTON|A)$/.test((document.activeElement||{}).tagName||"")){e.preventDefault();sndTick();hotStart()}});
function hotGiveUp(){if(HOT.on&&!HOT.done){sndTick();hotFinish(true)}}
function hotFinish(gaveUp){
  HOT.done=true;HOT.doneAt=performance.now();try{$("silIn").blur()}catch(e){}$("sil").classList.add("hotdone");const T=HOT.target,n=HOT.list.length;
  HC.set(T,"#3fa66a");paint();requestRender();nameFly(T);
  $("silForm").hidden=true;$("silSug").innerHTML="";$("silSkip").hidden=false;$("silSkip").textContent="Change area";$("silShow").textContent="Play again";
  $("silQ").textContent=gaveUp?`It was ${FACTS[T].n}`:`${FACTS[T].n}: found in ${n} guess${n===1?"":"es"}`;
  $("silHint").textContent=gaveUp?"Tap Play again for another country.":(()=>{const b=(S.counts.hotBest||{})[S.region];return !b||n<b?"A new best for this area.":n===b?`You matched your best here: ${b}.`:`Best in ${hotWhere()}: ${b} guess${b===1?"":"es"}.`})();
  if(!gaveUp){
    S.counts.hot=(S.counts.hot||0)+1;const b=S.counts.hotBest=S.counts.hotBest||{};if(!b[S.region]||n<b[S.region])b[S.region]=n;save();
    sndFlourish(S.region==="World"?"Europe":S.region);setTimeout(checkAch,900);
  }
  hotRender();updateProgress();
}
