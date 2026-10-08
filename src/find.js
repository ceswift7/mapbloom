/* ======================================================================
   FIND MODE (name / flag / capital quiz, practice, daily challenge)
   ====================================================================== */
const quizOf=()=>D.active?"country":S.quiz;
const regionPool=()=>playable.filter(f=>S.region==="World"||inReg(f.id,S.region)).map(f=>f.id);
const weakIds=()=>Object.keys(S.weak).filter(id=>S.weak[id]>0&&FACTS[id]);
function pool(){
  let p=S.practice?weakIds():regionPool();
  if(quizOf()==="capital")p=p.filter(id=>FACTS[id].cap);
  return p;
}
function pickTarget(){
  S.turn++;
  if(RD.active&&!D.active&&!S.practice){
    const rp=regionPool().filter(id=>(S.quiz!=="capital"||FACTS[id].cap)&&!RD.ids.has(id)&&!(S.undisc&&RD.fresh&&!RD.fresh.has(id)));
    let c2=rp.filter(id=>!S.recent.includes(id));if(!c2.length)c2=rp;if(!c2.length)return null;
    const w2=c2.map(id=>{const sn=S.seen[id],stale=sn==null?2:1+Math.max(0,Math.min(3,(S.turn-sn)/30));return Math.pow(Math.max(FACTS[id].a,2000),.2)*(S.weak[id]>0?3:1)*stale});
    let t2=Math.random()*d3.sum(w2),pick=c2[c2.length-1];for(let i=0;i<c2.length;i++){t2-=w2[i];if(t2<=0){pick=c2[i];break}}
    S.seen[pick]=S.turn;return pick;
  }
  const p=pool();
  const due=!S.practice&&S.returnQ.find(q=>q.at<=S.turn&&p.includes(q.id));
  if(due){S.returnQ=S.returnQ.filter(q=>q!==due);return due.id}
  let cand=S.practice?p.filter(id=>!S.recent.includes(id)):p.filter(id=>!cf().has(id)&&!S.recent.includes(id));
  if(!cand.length)cand=p.filter(id=>!S.recent.includes(id));
  if(!cand.length)cand=p;
  const w=cand.map(id=>Math.pow(Math.max(FACTS[id].a,2000),.25));
  let t=Math.random()*d3.sum(w);for(let i=0;i<cand.length;i++){t-=w[i];if(t<=0)return cand[i]}
  return cand[0];
}
const tn=()=>quizOf()==="country"?FACTS[S.target].n:"That country";
/* ---- "Need a hint?": one more clue per press (continent, neighbours, outline, then the location itself) ---- */
const HINT={lvl:0};
const hintOk=()=>S.mode==="find"&&!S.qIdle&&!US.on&&!C.active&&S.target!=null&&quizOf()!=="name"&&quizOf()!=="silhouette";
function hintReset(){HINT.lvl=0;if(S.mode==="find"&&HC.size){HC.clear();paint()}const hs=$("hintShape");if(hs)hs.hidden=true;syncHintBtn()}
function syncHintBtn(){
  const b=$("showBtn");if(!b)return;
  if(!hintOk()){b.textContent="Reveal";b.title="Reveal (R)";return}
  b.textContent="";
  b.append(el("span",{class:"pips","aria-hidden":"true"},[1,2,3,4].map(i=>el("i",{class:i<=HINT.lvl?"on":""}))),HINT.lvl>=3?"Show me":HINT.lvl?"Another hint":"Need a hint?");
  b.title=["Show the continent","Show its neighbours","Draw its outline","Show where it is"][Math.min(HINT.lvl,3)]+" (R)";
}
function hintDraw(id){
  const feat=silShape(id),c=d3.geoCentroid(feat),proj=d3.geoAzimuthalEqualArea().rotate([-c[0],-c[1]]).fitExtent([[10,10],[350,220]],feat),sv=d3.select("#hintShape");
  sv.selectAll("*").remove();sv.append("path").attr("d",d3.geoPath(proj)(feat));$("hintShape").hidden=false;
}
function hintStep(){
  if(!hintOk()||S.done)return false;
  const T=S.target,f=FACTS[T];HINT.lvl++;S.tries=Math.max(S.tries,1);sndTick();   // a hint means no first-try credit for this country
  if(HINT.lvl===1){
    swell($("hint"),"Hint: it is in "+regName(f)+(f.s?" ("+f.s+")":"")+".");
    stopDrift();flyTo(REGION_VIEW[f.r]||LL(T),1100,REGION_ZOOM[f.r]||1);
  }else if(HINT.lvl===2){
    const nb=(f.b||[]).filter(n=>nameId[n]);
    swell($("hint"),nb.length?"Hint: it borders "+nb.slice(0,6).join(", ")+(nb.length>6?" and more":"")+".":"Hint: it has no land borders. It is surrounded by sea.");
    nb.forEach(n=>HC.set(nameId[n],"rgba(233,196,106,.85)"));paint();requestRender();
  }else if(HINT.lvl===3){
    swell($("hint"),"Hint: this is its outline.");hintDraw(T);
  }else{
    const hs=$("hintShape");if(hs)hs.hidden=true;HC.clear();paint();success(true);return true;
  }
  syncHintBtn();return true;
}
/* ---- answer feedback: a small card with the flag, the name, the capital and where it is, then what you gained ---- */
function fbHide(){const e=$("fb");if(e){e.hidden=true;e.classList.remove("in","miss")}}
function showFeedback(o){
  const e=$("fb");if(!e||!FACTS[o.id])return;const f=FACTS[o.id];
  e.className="fbcard"+(o.ok?"":" miss");e.innerHTML="";
  const flag=FLAGS[o.id]?el("img",{class:"fbflag",src:FLAGS[o.id],alt:""}):el("span",{class:"fbflag e"},f.f||"");
  const where=[f.s,regName(f)].filter((x,i,a)=>x&&a.indexOf(x)===i).join(" · ");
  const mark=o.ok?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>':'<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  e.append(flag,el("div",{class:"fbmain"},el("b",{class:"fbname"},el("span",{class:"chk",html:mark}),f.n),f.cap?el("span",{class:"fbcap"},f.cap):null,el("span",{class:"fbwhere"},where)));
  (o.lines||[]).forEach((l,i)=>e.append(el("div",{class:"fbline"+(i===0&&o.ok?" up":"")},l)));
  e.hidden=false;void e.offsetWidth;e.classList.add("in");
}
function showPrompt(id){
  const f=FACTS[id],q=quizOf(),img=$("qFlag"),tg=$("target");
  img.hidden=q!=="flag";tg.classList.toggle("small",q!=="country");
  if(q==="flag"){img.src=FLAGS[id]||"";img.alt="A flag to identify";$("ask").textContent="Find the country with this flag";swell(tg,"Whose flag is this?")}
  else if(q==="capital"){$("ask").textContent="Find the country whose capital is";swell(tg,f.cap)}
  else if(q==="name"){$("ask").textContent="Name the glowing country";swell(tg,"?")}
  else{$("ask").textContent="";swell(tg,f.n)}
}
function nextRound(){
  if(S.region==="United States"&&S.mode==="find"&&US.on&&!S.qIdle&&US.round){usNext();return}
  clearAuto();usStop();
  hideCard();
  clearMissed();fbHide();
  if(D.active&&D.idx>=D.ids.length){finishDaily();return}
  if(RD.active&&!D.active&&!S.practice&&RD.done>=RD.n){showRoundResult();return}
  if(S.practice&&!weakIds().length){S.practice=false;endSession();toast("🌿","All caught up","Your weak spots are cleared.")}
  if(D.active&&D.t0==null)D.t0=performance.now();
  $("dClock").classList.toggle("on",!!D.active);
  S.target=D.active?D.ids[D.idx]:pickTarget();
  if(S.target==null){S.practice=false;endSession();toast("\u{1F33F}","Nothing left to ask","There is nothing left for this setup. Pick another.");quizIdle();return}
  S.tries=0;S.done=false;warmArt(S.target);
  if(FACTS[S.target]){const cs=csOf(S.target);cs.a=(cs.a||0)+1;cs.ls=todayStr()}

  S.recent.push(S.target);if(S.recent.length>6)S.recent.shift();
  const f=FACTS[S.target];
  if(quizOf()==="silhouette"){silBegin();$("showBtn").hidden=true;$("nextBtn").hidden=true;save();return}
  silHide();
  showPrompt(S.target);
  let pre="";
  if(D.active)pre=`Daily ${D.idx+1} of ${D.ids.length}. `;
  else if(S.practice)pre=`Practice, ${weakIds().length} to revisit. `;
  const co=clusterOf(S.target),isl=co?` It’s in the ${co.name} islands: tap their bubble to zoom in.`:(BEACON.includes(S.target)?` It’s tiny: look for its dotted ring.`:"");
  if(quizOf()==="name")swell($("hint"),S.hints?pre+`It is in ${regName(f)}.`:pre.trim());else
  swell($("hint"),S.hints?pre+(S.region==="World"||S.practice||D.active?`Somewhere in ${regName(f)}. Take your time.`:`Take your time. Turn the globe and tap it when you spot it.`)+isl:pre.trim());
  $("showBtn").hidden=false;$("nextBtn").hidden=true;hintReset();
  if(quizOf()==="name"){$("showBtn").hidden=true;nameBegin(S.target,false)}
  save();
  requestAnimationFrame(()=>{if(S.mode==="find"&&!silOn)size()});   // re-measure the prompt so the globe never sits under it
}
/* ---- auto-advance: after a find the next country starts by itself (tap the map or press Enter to skip ahead; hovering/tapping the card pauses it) ---- */
const AUTO_MS={fast:1500,normal:2500,slow:4000};
let autoT=null,autoLeft=0;const autoHold={card:0,btn:0,tapped:false};
function clearAuto(){clearInterval(autoT);autoT=null;autoHold.tapped=false;autoHold.card=0;autoHold.btn=0;const b=$("nextBtn");if(b)b.classList.remove("auto","hold")}
function armAutoNext(){
  clearAuto();
  if(S.autoNext==="off"||S.mode!=="find"||S.qIdle)return;
  if(D.active&&D.idx>=D.ids.length)return;           // "See results" stays manual
  if(RD.active&&!D.active&&RD.done>=RD.n)return;
  const ms=AUTO_MS[S.autoNext]||2500,b=$("nextBtn");autoLeft=ms;
  b.style.setProperty("--auto-ms",ms+"ms");void b.offsetWidth;b.classList.add("auto");
  autoT=setInterval(()=>{
    const hold=autoHold.card||autoHold.btn||autoHold.tapped||$("modal").classList.contains("on")||moving||document.hidden;
    b.classList.toggle("hold",!!hold);
    if(hold)return;
    autoLeft-=100;if(autoLeft<=0){clearAuto();if(S.mode==="find"&&S.done)nextRound()}
  },100);
}
function skipNext(){if(S.mode==="find"&&S.done&&!S.qIdle&&!$("nextBtn").hidden){sndTick();nextRound();return true}return false}
{const cd=$("card"),nb=$("nextBtn");
  cd.addEventListener("pointerenter",()=>{autoHold.card=1});cd.addEventListener("pointerleave",()=>{autoHold.card=0});
  cd.addEventListener("pointerdown",()=>{if(autoT)autoHold.tapped=true});
  nb.addEventListener("pointerenter",()=>{autoHold.btn=1});nb.addEventListener("pointerleave",()=>{autoHold.btn=0});}
function guess(id,ll,other){
  if(C.active)return chainGuess(id,ll,other);
  if(S.done||S.mode!=="find"||S.qIdle||!S.target||nmOn)return;
  if(other){swell($("hint"),typeof other==="string"?`That’s ${other}. It isn’t part of the game, so no penalty.`:"That’s outside this game. No penalty.");sndOcean();return}
  const T=S.target,f=FACTS[T];
  if(hitTest(id,ll,T))return success(false,id===T?ll:null);
  S.tries++;
  if(id&&FACTS[id]){
    S.streak=0;const g=FACTS[id];
    d3.selectAll(`[data-id="${id}"]`).classed("missed",!cf().has(id));cvMiss(id,!cf().has(id));
    floatLabel(g.n,ll,2600,MV);
    const d=km(LL(id),LL(T));
    const near=g.b.includes(f.n);
    swell($("hint"),!S.hints?`That’s ${article(g.n)}. Not quite.`:near?`That’s ${article(g.n)}. You’re right next door; ${tn()} borders it to the ${bearing(LL(id),LL(T))}.`
      :`That’s ${article(g.n)}. ${tn()} is about ${distTxt(d)} to the ${bearing(LL(id),LL(T))}.`);
    S.weak[T]=Math.min(10,(S.weak[T]||0)+2);
    if(!S.hints){$("hint").textContent="";showFeedback({ok:false,id,lines:["Not quite. Keep looking for "+tn()+"."]})}
    sndMiss();
  }else{
    const d=km(ll,LL(T));
    swell($("hint"),S.hints?`That’s open water. ${tn()} is about ${distTxt(d)} to the ${bearing(ll,LL(T))}.`:"That’s open water.");
    S.tries--;
    sndOcean();
  }
  if(S.tries>=3)$("hint").textContent+=" You can also ask to be shown.";
}
const total=()=>playable.length;
const foundN=()=>playable.filter(f=>cf().has(f.id)).length;
function success(shown,ll){
  const T=S.target,f=FACTS[T];S.done=true;
  if(CANVAS&&cvPA<.99&&performance.now()>fadeUntil)cvTweenPA(1,300);   // safety net: painted countries are never left invisible
  if(S.mode==="find"&&HC.size){HC.clear();paint()}{const hs=$("hintShape");if(hs)hs.hidden=true}
  const before=foundN(),regBefore=playable.filter(x=>FACTS[x.id].r===f.r&&cf().has(x.id)).length,regB=(f.x?[f.r,f.x]:[f.r]).map(r=>[r,playable.filter(x=>inReg(x.id,r)&&cf().has(x.id)).length,playable.filter(x=>inReg(x.id,r)).length]);
  const first=S.tries===0&&!shown;
  const lifeB=(f.x?[f.r,f.x]:[f.r]).map(r=>[r,playable.filter(x=>inReg(x.id,r)&&S.found.has(x.id)).length,playable.filter(x=>inReg(x.id,r)).length]),wasNew=!S.found.has(T);
  if(first)csOf(T).f=(csOf(T).f||0)+1;
  if(shown){if(RD.active&&!D.active&&!S.practice){RD.ids.add(T);RD.done++;RD.miss.push(T)}if(!SESS)S.shown.add(T);if(!D.active)S.returnQ.push({id:T,at:S.turn+4});S.weak[T]=Math.min(10,(S.weak[T]||0)+3);S.streak=0}
  else{
    if(RD.active&&!D.active&&!S.practice){SESS.add(T);S.found.add(T);S.shown.delete(T);RD.ids.add(T);RD.done++;if(first)RD.first++}
    else if(SESS){SESS.add(T);if(D.active||S.practice){S.found.add(T);S.shown.delete(T)}}   // today's ten and weak-spot practice show on a clean map, and what you find still joins your own world
    else{S.found.add(T);S.shown.delete(T)}
    if(S.tries>=2&&!D.active)S.returnQ.push({id:T,at:S.turn+6});
    if(first){S.streak++;S.bestStreak=Math.max(S.bestStreak,S.streak);if(S.weak[T])S.weak[T]=Math.max(0,S.weak[T]-1)}
    if(S.quiz==="flag"&&!D.active){S.counts.flag++;jrMark(T,"f")}
    if(S.quiz==="silhouette"&&!D.active)S.counts.sil=(S.counts.sil||0)+1;
    if(S.quiz==="name"&&!D.active)S.counts.nameit=(S.counts.nameit||0)+1;
    if(S.quiz==="capital"&&!D.active){S.counts.capital++;jrMark(T,"c")}
  }
  if(S.weak[T]===0)delete S.weak[T];
  if(D.active){D.marks.push(shown?"🟥":first?"🟩":S.tries<=2?"🟨":"🟧");D.idx++;if(D.idx>=D.ids.length&&D.t0!=null)D.tEnd=performance.now()-D.t0}
  updateProgress();save();
  if(shown)sndShow();
  const regTotal=playable.filter(x=>FACTS[x.id].r===f.r).length;
  const after=foundN(),regAfter=regBefore+(shown?0:1);
  const praise=["Found it.","There it is.","Lovely.","Exactly right.","Well spotted."];
  let msg=shown?`Here it is. It’ll come back around in a few turns.`:
    (first?praise[Math.floor(Math.random()*praise.length)]+" First try.":`${praise[Math.floor(Math.random()*praise.length)]} Painted in.`);
  const msgBase=msg;
  let big=null;
  if(!shown&&!SESS){
    const th=[.25,.5,.75,1].find(x=>before/total()<x&&after/total()>=x);
    const dr=regB.find(([r,b,t])=>b+1===t);
    if(dr){big=dr[0];msg+=` That’s all of ${dr[0]==="Americas"?"the Americas":dr[0]} painted.`;setTimeout(()=>confetti(dr[0]),1500)}
    else if(th){big=f.r;if(th===1)setTimeout(()=>confetti(null),1500);msg+=th===1?" The whole world is painted.":` A ${th===.25?"quarter":th===.5?"half":"three quarters"} of the world is painted.`}
  }
  else if(!shown&&wasNew&&S.found.has(T)){   // on a clean round map: your lifetime map still completes a region
    const lr=lifeB.find(([r,b,t])=>b+1===t);
    if(lr){big=lr[0];msg+=` That’s all of ${lr[0]==="Americas"?"the Americas":lr[0]} painted on your map.`;setTimeout(()=>confetti(lr[0]),1500)}
  }
  const mile=msg.slice(msgBase.length).trim();
  if(shown||S.mode!=="find"){swell($("hint"),msg)}
  else{
    $("hint").textContent="";
    const lines=[];
    lines.push(wasNew?"+1 country learned · "+S.found.size+" of "+total()+" painted":"Painted again, already on your map");
    if(first&&S.streak>=3)lines.push(S.streak+" first tries in a row");
    if(S.tries>=1&&!first)lines.push("Take another look at where it is, then keep going");
    if(mile)lines.push(mile);
    showFeedback({ok:true,id:T,lines});
  }
  if(quizOf()!=="country"){$("ask").textContent="That’s";swell($("target"),f.n);$("target").classList.remove("small")}
  $("showBtn").hidden=true;$("nextBtn").hidden=false;
  $("nextBtn").textContent=(D.active&&D.idx>=D.ids.length)||(RD.active&&!D.active&&!S.practice&&RD.done>=RD.n)?"See results":"Next place";
  armAutoNext();
  const fp=focusFor(T,ll);
  if(fp.fly)flyTo(fp.fly,1300,Math.min(5,Math.max(zoomK,f.a<30000?2.6:f.a<350000?1.7:1))).then(()=>{floatLabel(f.n,fp.fly,3200)});
  else floatLabel(f.n,fp.pt,3200);
  startReveal(T,ll||fp.pt||LL(T),shown,()=>paint(),false,MV,()=>{if(!shown){sndHit(f.r,first);if(big)setTimeout(()=>sndFlourish(big),700)}});
  showCard(T);
  setTimeout(checkAch,1800);
  setTimeout(()=>$("nextBtn").focus({preventScroll:true}),50);
}

/* ---- clean-slate sessions + the Quiz start sheet ---- */
let fadeTok=0,fadeUntil=0;
function fadeRepaint(fn){
  const pg=document.getElementById("paint");
  if(reduced||!pg){fn();return}
  if(CANVAS){
    const tok=++fadeTok;fadeUntil=performance.now()+2500;
    cvTweenPA(0,350);
    setTimeout(()=>{fn();GLX.whenIdle(()=>{if(tok===fadeTok)cvTweenPA(1,350)})},380);   // every repaint runs; only the latest one fades the paint back in, so it can never be left invisible
    return;
  }
  pg.style.transition="opacity .35s ease";pg.style.opacity="0";
  setTimeout(()=>{fn();pg.style.opacity="";setTimeout(()=>{pg.style.transition=""},420)},360);
}
function beginSession(){if(SESS)return;SESS=new Set();fadeRepaint(()=>{paint();updateProgress()})}
function endSession(){RD.active=false;if(!SESS)return;SESS=null;fadeRepaint(()=>{paint();updateProgress()})}
function idleView(){fbHide();
  clearAuto();usStop();
  S.qIdle=true;S.target=null;S.done=false;D.active=false;S.practice=false;endSession();
  hideCard();clearMissed();$("dClock").classList.remove("on");$("qFlag").hidden=true;$("target").classList.remove("small");
  $("ask").textContent="";swell($("target"),"Ready?");swell($("hint"),"Choose how you would like to play.");
  $("showBtn").hidden=true;$("nextBtn").hidden=false;$("nextBtn").textContent="Choose how to play";
  if(typeof silHide==="function")silHide();
  updateProgress();
}
function quizIdle(compact){idleView();if(compact)showQuizCompact();else showQuizSheet()}
function showQuizCompact(){
  chainStop();
  const st=QUIZ_STYLES.find(x=>x[0]===S.quiz)||QUIZ_STYLES[0],len=S.rlen===0?"Whole region":S.rlen+" countries";
  modeCompact({title:"Quiz",desc:MODE_DESC.find,chips:[[st[2],st[1]],["rall",regionLabel(S.region)],[S.rlen===0?"rall":S.rlen===10?"r10":"r20",len]],
    moreHint:"What to find, region, round length, daily challenges, records",startLabel:"Begin",start:()=>{if(!leaveDailyOk())return;sndTick();beginFree()},expand:()=>expandFrom(showQuizSheet)});
}
function beginFree(){
  if(S.region==="United States"){usQuizBegin();return}
  closeModal();D.active=false;S.qIdle=false;S.practice=false;
  let rp=regionPool().filter(id=>S.quiz!=="capital"||FACTS[id].cap);
  const fresh=S.undisc?new Set(rp.filter(id=>!S.found.has(id))):null;
  if(fresh){
    if(!fresh.size){toast(String.fromCodePoint(0x2728),"Nothing left to discover","You have painted every country here. Turn off Undiscovered only to keep playing.",4200);quizIdle();return}
    rp=rp.filter(id=>fresh.has(id));
  }
  Object.assign(RD,{active:true,fresh,n:S.rlen?Math.min(S.rlen,rp.length):rp.length,done:0,first:0,miss:[],ids:new Set(),t0:performance.now()});
  SESS=new Set();fadeRepaint(()=>{paint();updateProgress()});
  updateProgress();nextRound();
}
function showRoundResult(){
  silHide();clearAuto();hideCard();
  const sh=$("sheet");sh.innerHTML="";
  const ms=performance.now()-RD.t0,pct=RD.n?Math.round(RD.first/RD.n*100):0,where=S.region==="World"?"Earth":S.region==="Americas"?"the Americas":S.region;
  sh.append(closeBtn(),el("div",{class:"hero"},el("p",{class:"sub"},`Round complete \xB7 ${RD.n} countries \xB7 ${where}`),el("div",{class:"bignum"},`${RD.first}/${RD.n}`),el("span",{class:"delta"+(pct>=80?" up":"")},`${pct}% on the first try`)));
  const stat=(k,v)=>el("div",{class:"stat"},el("b",{},v),el("small",{},k));
  sh.append(el("div",{class:"stats",style:"grid-template-columns:repeat(3,1fr)"},stat("Time",fmtT(ms)),stat("Revealed",String(RD.miss.length)),stat("Best streak ever",String(S.bestStreak||0))));
  if(RD.miss.length)sh.append(el("h3",{},"Worth another look"),el("div",{class:"nchips"},RD.miss.map(id=>el("button",{onclick:()=>{closeModal();endSession();setMode("wander");openCountry(id)}},FACTS[id].n))));
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",onclick:()=>{endSession();setMode("wander")}},"Back to Explore"),el("button",{class:"btn",onclick:()=>{sndTick();quizIdle()}},"Change settings"),el("span",{class:"grow"}),el("button",{class:"btn primary",onclick:()=>{sndTick();beginFree()}},"Another round")));
  sndFlourish(S.region==="World"?"Europe":S.region);
  if(!RD.miss.length&&RD.n>=regionPool().length)setTimeout(()=>confetti(REGIONS.includes(S.region)?S.region:null),500);   // a whole area with nothing revealed
  openModal();
}
function leaveDailyOk(){return !D.active||confirm("Leave today’s ten? Your progress in it will be lost.")}
function showQuizSheet(){
  chainStop();
  const sh=$("sheet");sh.innerHTML="";
  const day=todayStr(),done=S.daily.results[day],wk=weakIds().length;
  sh.append(closeBtn(),el("h2",{},"Quiz"),el("p",{},MODE_DESC.find+" Choose what to find and where, then begin."));
  const q=tiles(QUIZ_STYLES.map(([k,l,ic])=>tile({icon:ic,label:l,pressed:S.quiz===k,onclick:()=>{S.quiz=k;save();sndTick();showQuizSheet()}})),5);
  const rc=regionTiles(S.region,r=>{pickRegion(r);showQuizSheet()},r=>r==="United States"?"50 states":regionCount(r)+" countries");const how={country:"Tap the named country on the globe.",flag:"Tap the country whose flag you see.",capital:"Tap the country with this capital.",name:"A country glows. Type its name.",silhouette:"See a shape with no globe. Type its name."}[S.quiz];
  sh.append(el("div",{class:"qcard"},el("h3",{},"Free play"),
    step(1,"What to find",how,q),
    step(2,"Where",S.region==="United States"?"The 50 states on their own map. Flag and Silhouette are not available, so Locate is used.":S.region==="World"?"Anywhere in the world.":"Only countries in "+(S.region==="Americas"?"the Americas":S.region)+".",rc),
    step(3,"Round","Each round starts on a blank map. Your saved map is kept.",tiles([[10,"10 countries","r10"],[20,"20 countries","r20"],[0,"Whole region","rall"]].map(([n,l,ic])=>tile({icon:ic,label:l,pressed:S.rlen===n,onclick:()=>{S.rlen=n;save();sndTick();showQuizSheet()}})),3)),
    step(4,"Options",null,el("div",{},opt("Undiscovered only",S.region==="United States"?"Not available for states.":"Skip countries you have already painted.",toggle(S.undisc&&S.region!=="United States",v=>{S.undisc=v;save();sndTick();showQuizSheet()},"Undiscovered only")),opt("Borderless","Hide borders. Coastlines stay.",toggle(S.nb,v=>{S.nb=v;save();applyNb();sndTick()},"Borderless")))),
    ));
  const chainDone=S.daily.chains&&S.daily.chains[todayStr()];
  sh.append(el("div",{class:"qcard"},el("h3",{},"Challenges"),
    el("div",{class:"crow"},crIcon("daily"),el("div",{class:"t"},el("b",{},"Today’s ten"),el("small",{},done?`Done: ${done.marks.join("")}${done.time?" in "+fmtT(done.time):""}`:"Ten countries, the same for everyone.")),el("button",{class:"btn",onclick:startDaily},D.active?"Resume":done?"See result":"Play")),
    el("div",{class:"crow"},crIcon("chain"),el("div",{class:"t"},el("b",{},"Neighbour chains"),el("small",{},"Link two distant countries by land borders in as few steps as you can.")),el("button",{class:"btn",onclick:()=>{if(leaveDailyOk())startChain(true)}},chainDone?"Daily result":"Daily"),el("button",{class:"btn",onclick:()=>{if(leaveDailyOk())startChain(false)}},"Play")),
    el("div",{class:"crow"},crIcon("practice"),el("div",{class:"t"},el("b",{},"Practice weak spots"),el("small",{},wk?`${wk} countr${wk===1?"y":"ies"} to revisit.`:"No weak spots yet. Misses collect here.")),el("button",{class:"btn",disabled:wk?null:"disabled",onclick:()=>{if(wk&&leaveDailyOk())startPractice()}},"Practice"))));
  sh.append(fold("Your records",quizRecordsBlock()));
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"linkbtn",onclick:askReset},"Erase paint"),el("span",{class:"grow"}),el("button",{class:"btn",onclick:()=>{if(leaveDailyOk())setMode("wander")}},"Back to Explore"),el("button",{class:"btn primary bigstart",style:"width:auto;min-width:130px",id:"qFree",onclick:()=>{if(!leaveDailyOk())return;sndTick();beginFree()}},"Begin")));
  openModal(true);setTimeout(()=>{const s=$("qFree");if(s)s.focus({preventScroll:true})},60);
}function startPractice(){
  closeModal();if(S.mode!=="find")setMode("find",true,true);
  S.qIdle=false;D.active=false;S.practice=true;S.region="World";syncChips();beginSession();updateProgress();nextRound();
}

