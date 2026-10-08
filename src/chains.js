/* ======================================================================
   NEIGHBOUR CHAINS: join two far-apart countries through land borders, using as few as you can.
   The map is a clean slate (SESS): the two ends are painted, every country you add blooms in.
   ====================================================================== */
const C={active:false,start:null,end:null,path:[],par:[],daily:false,day:null,wrong:0,assists:0,done:false};
let NBg=null;
function nbGraph(){
  if(NBg)return NBg;NBg={};playable.forEach(f=>NBg[f.id]=new Set());
  playable.forEach(f=>(FACTS[f.id].b||[]).forEach(n=>{const o=nameId[n];if(o&&o!==f.id&&NBg[o]){NBg[f.id].add(o);NBg[o].add(f.id)}}));
  return NBg;
}
function nbPath(a,b){
  const g=nbGraph(),prev={[a]:null},q=[a];
  while(q.length){const x=q.shift();if(x===b)break;g[x].forEach(y=>{if(!(y in prev)){prev[y]=x;q.push(y)}})}
  if(!(b in prev))return null;const p=[];for(let x=b;x!=null;x=prev[x])p.unshift(x);return p;
}
function nbDist(a){const g=nbGraph(),d={[a]:0},q=[a];while(q.length){const x=q.shift();g[x].forEach(y=>{if(!(y in d)){d[y]=d[x]+1;q.push(y)}})}return d}
function chainPair(rnd){
  const g=nbGraph(),ids=playable.map(f=>f.id).filter(id=>g[id].size>0).sort();
  for(let tries=0;tries<80;tries++){
    const a=ids[Math.floor(rnd()*ids.length)],d=nbDist(a);
    let c=ids.filter(id=>d[id]>=4&&d[id]<=6);if(!c.length)c=ids.filter(id=>d[id]>=3&&d[id]<=7);
    if(c.length)return [a,c[Math.floor(rnd()*c.length)]];
  }
  return ["620","496"];   // Portugal to Mongolia
}
function chainStop(){if(!C.active)return;C.active=false;C.done=false;clearMissed();$("target").classList.remove("small");endSession()}
function startChain(daily){
  closeModal();
  const day=todayStr();
  if(daily&&S.daily.chains&&S.daily.chains[day]){showChainResult(S.daily.chains[day],true);return}
  if(S.mode!=="find")setMode("find",true,true);
  silHide();clearAuto();hideCard();clearMissed();
  const [a,b]=chainPair(daily?seeded("mapbloom-chain-"+day):Math.random);
  Object.assign(C,{active:true,start:a,end:b,path:[a],par:nbPath(a,b),daily:!!daily,day,wrong:0,assists:0,done:false});
  S.qIdle=false;S.target=null;S.done=false;D.active=false;S.practice=false;
  SESS=new Set([a,b]);fadeRepaint(()=>{paint();updateProgress()});
  const dd=d3.geoDistance(LL(a),LL(b));
  flyTo(d3.geoInterpolate(LL(a),LL(b))(.5),1300,dd>2.2?.9:dd>1.5?1:dd>.9?1.25:1.7);
  chainRender();sndMode("find");
}
function chainRender(){
  $("qFlag").hidden=true;$("ask").textContent="Neighbour chain \u00B7 shortest is "+C.par.length;
  const tg=$("target");tg.classList.add("small");tg.textContent=FACTS[C.start].n+" \u2192 "+FACTS[C.end].n;
  $("hint").textContent=C.path.map(id=>FACTS[id].n).join(" \u2192 ")+(C.done?"":" \u2192 \u2026");
  $("showBtn").hidden=C.done;$("nextBtn").hidden=C.path.length<2||C.done;$("nextBtn").textContent="Undo";
  $("dClock").classList.remove("on");
}
function chainGuess(id,ll,other){
  if(C.done)return;
  if(other||!id||!FACTS[id]){floatLabel("Outside the game",ll,1500);sndOcean();return}
  const last=C.path[C.path.length-1],g=FACTS[id];
  if(C.path.includes(id)){floatLabel("Already in your chain",ll,1600);sndTick();return}
  if(nbGraph()[last].has(id))return chainStep(id,ll,false);
  C.wrong++;cvMiss(id,true);setTimeout(()=>cvMiss(id,false),900);
  floatLabel(g.n+" doesn\u2019t border "+FACTS[last].n,ll,2200);sndMiss();
}
function chainStep(id,ll,assist){
  C.path.push(id);if(assist)C.assists++;
  if(!SESS.has(id))startReveal(id,LL(id),false,()=>{if(C.active&&C.path.includes(id)){SESS.add(id);updateProgress();paint()}},true);
  floatLabel(FACTS[id].n,ll||LL(id),1800);sndHit(FACTS[id].r,false);
  chainRender();
  if(id===C.end)setTimeout(()=>{if(C.active&&!C.done&&C.path[C.path.length-1]===C.end)chainFinish()},assist?500:1000);
}
function chainUndo(){
  if(C.done||C.path.length<2)return;
  const id=C.path.pop();SESS.delete(id);paint();updateProgress();sndTick();chainRender();
}
function chainReveal(){
  if(C.done)return;const p=nbPath(C.path[C.path.length-1],C.end);if(!p||p.length<2)return;
  sndShow();chainStep(p[1],LL(p[1]),true);
}
function chainFinish(){
  if(!C.active)return;C.done=true;
  const n=C.path.length,par=C.par.length;
  S.counts.chain=(S.counts.chain||0)+1;if(n<=par&&!C.assists)S.counts.chainPar=(S.counts.chainPar||0)+1;
  const res={n,par,assists:C.assists,wrong:C.wrong,path:C.path.slice(),parPath:C.par.slice()};
  if(C.daily){S.daily.chains=S.daily.chains||{};S.daily.chains[C.day]=res}
  save();chainRender();sndFlourish(FACTS[C.end].r);showChainResult(res,C.daily);
}
function showChainResult(res,daily){
  const sh=sheetHead(daily?"Daily chain":"Chain complete"),nm=a=>a.map(id=>FACTS[id].n).join(" \u2192 "),extra=res.n-res.par;
  sh.append(el("p",{},extra<=0?(res.assists?`Connected in ${res.n}, the shortest possible, with ${res.assists} hint${res.assists>1?"s":""}.`:`Perfect: ${res.n} countries is the shortest possible chain.`):`${res.n} countries, ${extra} more than the shortest chain (${res.par}).${res.wrong?` ${res.wrong} wrong tap${res.wrong>1?"s":""}.`:""}`));
  sh.append(el("h3",{},"Your chain"),el("p",{style:"font-family:var(--serif);font-size:16px;margin:0 0 8px"},nm(res.path)),
    el("h3",{},"Shortest chain"),el("p",{style:"font-family:var(--serif);font-size:16px;color:var(--ink-soft);margin:0"},nm(res.parPath)));
  sh.append(el("div",{class:"row"},el("button",{class:"btn primary",onclick:()=>{closeModal();startChain(false)}},"Another chain"),el("button",{class:"btn",onclick:()=>{chainStop();idleView()}},"Quiz menu")));
  openModal(true);
}

/* ---- daily challenge ---- */
function startDaily(){
  closeModal();if(D.active)return;
  const day=todayStr();
  if(S.daily.results[day]){showDailyResult(day);return}
  const rnd=seeded("mapbloom-"+day);
  D.ids=shuffle(playable.map(f=>f.id).sort(),rnd).slice(0,10);D.idx=0;D.marks=[];D.active=true;D.t0=null;D.tEnd=null;S.practice=false;S.qIdle=false;
  if(S.mode!=="find")setMode("find",true,true);
  beginSession();
  S.region="World";document.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c.dataset.r==="World"));
  updateProgress();nextRound();
}
function finishDaily(){
  const day=todayStr(),marks=D.marks.slice();
  D.active=false;endSession();
  const firsts=marks.filter(m=>m==="🟩").length;
  S.daily.results[day]={marks,firsts,time:D.tEnd};
  S.daily.streak=S.daily.last===yesterdayStr()?S.daily.streak+1:S.daily.last===day?S.daily.streak:1;
  S.daily.last=day;save();checkAch();
  $("nextBtn").textContent="Next place";
  showDailyResult(day);idleView();
}
function shareText(day){const r=S.daily.results[day];return `Mapbloom daily ${day}\n${r.marks.join("")}\n${r.firsts}/10 first try${r.time?" in "+fmtT(r.time):""} · ${S.daily.streak} day streak`}
function showDailyResult(day){
  const r=S.daily.results[day],sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("h2",{},"Today’s ten"),el("p",{},day+" · "+r.firsts+" of 10 on the first try"+(r.time?", "+fmtT(r.time)+(r.time<60000?" (under a minute!)":""):"")),
    el("div",{class:"share"},shareText(day)),
    el("p",{style:"margin-top:10px"},`Streak: ${S.daily.streak} day${S.daily.streak===1?"":"s"}. A new set of ten arrives tomorrow.`),
    el("div",{class:"row"},el("button",{class:"btn primary",onclick:ev=>{copyText(shareText(day),ev.currentTarget)}},"Copy result"),el("button",{class:"btn",onclick:closeModal},"Close")));
  openModal();
}
function copyText(t,btn){
  const done=()=>{if(btn){const o=btn.textContent;btn.textContent="Copied";setTimeout(()=>btn.textContent=o,1400)}};
  const old=()=>{try{const a=el("textarea",{style:"position:fixed;opacity:0"});a.value=t;document.body.append(a);a.select();const ok=document.execCommand("copy");a.remove();if(ok)done();else toast("!","Could not copy","Select the text and copy it yourself.",3200)}catch(e){toast("⚠️","Could not copy","Select the text and copy it yourself.",3200)}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,old);else old();
}

