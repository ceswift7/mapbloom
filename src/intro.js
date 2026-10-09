/* ======================================================================
   OPENING SEQUENCE: tap to begin (the tap unlocks audio), a drop of color washes the
   name onto the paper, the globe rises and a few countries bloom, then the game fades in.
   ====================================================================== */
const introEl=$("intro"),introTimers=[];
const introLater=(fn,ms)=>{introTimers.push(setTimeout(fn,ms))};
/* ---- ?introperf: records frame times, long tasks and long animation frames from the tap to the handoff, so the opening can be measured instead of guessed at ---- */
const IP=/[?&]introperf/.test(location.search)?{t0:0,marks:[],frames:[],long:[],loaf:[],done:false}:null;
if(IP){
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>IP.long.push([Math.round(e.startTime),Math.round(e.duration)]))).observe({type:"longtask",buffered:true})}catch(e){}
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>IP.loaf.push({s:Math.round(e.startTime),d:Math.round(e.duration),b:Math.round(e.blockingDuration||0),sc:(e.scripts||[]).slice(0,3).map(x=>(x.sourceFunctionName||x.invoker||"?")+":"+Math.round(x.duration))}))).observe({type:"long-animation-frame",buffered:true})}catch(e){}
}
const ipMark=n=>{if(IP&&IP.t0)IP.marks.push([n,Math.round(performance.now()-IP.t0)])};
const ipSlow=(n,a)=>{if(IP&&IP.t0){const d=performance.now()-a;if(d>=5)(IP.slow||(IP.slow=[])).push([n,Math.round(a-IP.t0),Math.round(d)])}};
const ipW=(n,fn)=>function(){const a=performance.now();const r=fn.apply(this,arguments);ipSlow(n,a);return r};
if(IP)setTimeout(()=>{   // time the usual suspects: anything over 5 ms is listed with when it ran
  const w=(n,get,set)=>{try{const f=get();if(typeof f==="function")set(ipW(n,f))}catch(e){}};
  w("ensureArt",()=>ensureArt,f=>{ensureArt=f});w("glPump",()=>glPump,f=>{glPump=f});w("benchDraw",()=>benchDraw,f=>{benchDraw=f});w("regionThumb",()=>regionThumb,f=>{regionThumb=f});
  w("makePaperBg",()=>makePaperBg,f=>{makePaperBg=f});w("makeBookTiles",()=>makeBookTiles,f=>{makeBookTiles=f});w("cvColors",()=>cvColors,f=>{cvColors=f});w("renderNow",()=>renderNow,f=>{renderNow=f});
  w("AC",()=>AC,f=>{AC=f});w("makeIR",()=>makeIR,f=>{makeIR=f});w("sndIntroDrop",()=>sndIntroDrop,f=>{sndIntroDrop=f});w("sndSpin",()=>sndSpin,f=>{sndSpin=f});w("sndBloom",()=>sndBloom,f=>{sndBloom=f});
  w("glDoSync",()=>glDoSync,f=>{glDoSync=f});w("glStartLand",()=>glStartLand,f=>{glStartLand=f});w("glUploadFull",()=>glUploadFull,f=>{glUploadFull=f});w("cloudLoad",()=>cloudLoad,f=>{cloudLoad=f});w("introSpin",()=>introSpin,f=>{introSpin=f});w("unlockAudio",()=>unlockAudio,f=>{unlockAudio=f});w("sndPage",()=>sndPage,f=>{sndPage=f});w("sndIntroFall",()=>sndIntroFall,f=>{sndIntroFall=f});w("crackle",()=>crackle,f=>{crackle=f});w("render",()=>render,f=>{render=f});w("positionLabels",()=>positionLabels,f=>{positionLabels=f});
},0);
function ipStart(){if(!IP)return;IP.t0=performance.now();let last=IP.t0;const f=t=>{IP.frames.push(Math.round(t-last));last=t;if(!IP.done)requestAnimationFrame(f)};requestAnimationFrame(f);ipMark("tap")}
function ipEnd(){
  if(!IP||IP.done)return;IP.done=true;
  const fr=IP.frames.slice(1),s=fr.slice().sort((a,b)=>a-b),n=s.length||1,t0=IP.t0;
  const out={marks:IP.marks,frames:{n:fr.length,avg:+(fr.reduce((a,b)=>a+b,0)/n).toFixed(1),p95:s[Math.floor(n*.95)]||0,max:s[n-1]||0,over25:fr.filter(x=>x>25).length,over50:fr.filter(x=>x>50).length,worst:IP.marks.length?undefined:undefined},
    slow:(IP.slow||[]).sort((a,b)=>b[2]-a[2]).slice(0,30),long:IP.long.filter(x=>x[0]>=t0).map(x=>[Math.round(x[0]-t0),x[1]]),loaf:IP.loaf.filter(x=>x.s>=t0).map(x=>Object.assign({},x,{s:Math.round(x.s-t0)})).sort((a,b)=>b.d-a.d).slice(0,14),
    env:{dpr:devicePixelRatio,w:innerWidth,h:innerHeight,found:S.found.size,gl:typeof GLX!=="undefined"&&GLX.on,theme:S.theme}};
  window.__introperf=out;console.log("INTROPERF "+JSON.stringify(out));
  const d=document.createElement("pre");d.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;max-height:45vh;overflow:auto;z-index:9999;background:rgba(0,0,0,.85);color:#9f9;font:11px/1.35 ui-monospace,Consolas,monospace;padding:8px;border-radius:8px;white-space:pre-wrap;user-select:text";d.textContent=JSON.stringify(out,null,1);document.body.append(d);
}
function initIntro(){
  const skip=/[?&]nointro/.test(location.search)||(()=>{try{return localStorage.getItem("mb-skip-intro")==="1"}catch(e){return false}})();
  if(skip){introEl.remove();document.body.classList.remove("introing");introState="done";setTimeout(themeTip,1800);return}
  introState="wait";
  if(S.found.size&&FX.tiles){   // build their paintings while the splash waits, a couple at a time, so the opening never has to do it all at once
    const order=["Africa","Europe","Asia","Americas","Oceania"],ids=[...S.found].filter(id=>FACTS[id]).sort((a,b)=>order.indexOf(FACTS[a].r)-order.indexOf(FACTS[b].r));let wi=0;
    const step=()=>{const t0=performance.now();while(wi<ids.length&&performance.now()-t0<9)ensureArt(ids[wi++]);if(wi<ids.length)setTimeout(step,24)};
    setTimeout(step,200);
  }
  const ready=()=>{if(introState!=="wait")return;introState="ready";$("introBegin").hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>{$("introBegin").classList.add("on");$("introHint").classList.add("on")}));try{$("introBegin").focus({preventScroll:true})}catch(e){}};
  (document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]):Promise.resolve()).then(ready);
  // the whole splash is one big button: any tap or key is the gesture the browser needs before it allows sound
  const start=()=>{if(introState==="wait")ready();{const c=AC();if(c&&c.state!=="running")c.resume().catch(()=>{})}introPlay()};
  $("introBegin").onclick=start;
  $("introSkip").onclick=()=>introHandoff(true);
  document.addEventListener("keydown",e=>{
    if(["Shift","Control","Alt","Meta","CapsLock","Tab"].includes(e.key)||e.ctrlKey||e.metaKey||e.altKey||/^F\d+$/.test(e.key))return;
    if(introState==="wait"||introState==="ready"){e.preventDefault();start()}
    else if(introState==="run"&&(e.key==="Escape"||e.key==="Enter"||e.key===" ")){e.preventDefault();introHandoff(true)}
  });
  ["click","touchend"].forEach(ev=>introEl.addEventListener(ev,()=>{if(introState==="wait"||introState==="ready")start()}));
  introEl.addEventListener("pointerdown",()=>{if(introState==="wait"||introState==="ready")start();else if(introState==="run")introHandoff(true)});
}
/* ---- the opening is drawn on ONE canvas by one animation clock (the letters, the brush stroke, the drops, rings and splatter): no per-frame style changes, filters or masks on page text, so the browser has almost nothing to repaint ---- */
const INTRO_RB=[["#E0675A","#F4A08E"],["#E9984E","#F4C592"],["#DDB445","#F3DB93"],["#5FAE86","#A5D8BA"],["#4FB0AE","#A0DAD4"],["#5E8FDB","#ABC8F2"],["#7B7BD0","#B8B6EE"],["#B27BCF","#E0BFEE"]];
let introCv=null,introRaf=0;
function introCanvasPlan(order){
  const word=document.querySelector(".intro-word"),wr=word.getBoundingClientRect(),cs=getComputedStyle(word),fs=parseFloat(cs.fontSize),font=`${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`,ls=-.02*fs;
  const dpr=Math.min(1.5,window.devicePixelRatio||1),cv=document.createElement("canvas");cv.width=Math.round(innerWidth*dpr);cv.height=Math.round(innerHeight*dpr);
  cv.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";introEl.insertBefore(cv,introEl.firstChild);introEl.classList.add("cv");
  const ctx=cv.getContext("2d");ctx.scale(dpr,dpr);
  const mc=document.createElement("canvas").getContext("2d");mc.font=font;
  const text="Mapbloom",tm=mc.measureText(text),asc=tm.actualBoundingBoxAscent,desc=tm.actualBoundingBoxDescent,pre=i=>mc.measureText(text.slice(0,i)).width+i*ls,W=pre(8);
  const x0=wr.left+(wr.width-W)/2,base=wr.top+wr.height/2+(asc-desc)/2,top=base-asc,boxH=asc+desc,PAD=Math.ceil(fs*.12);
  const letters=text.split("").map((ch,i)=>{
    const lx=x0+pre(i),w=mc.measureText(ch).width,sp=document.createElement("canvas");sp.width=Math.ceil((w+PAD*2)*dpr);sp.height=Math.ceil((boxH+PAD*2)*dpr);
    const sx=sp.getContext("2d");sx.scale(dpr,dpr);sx.font=font;sx.textBaseline="alphabetic";
    const g=sx.createLinearGradient(PAD,PAD,PAD+w,PAD+boxH);g.addColorStop(0,INTRO_RB[i][0]);g.addColorStop(1,INTRO_RB[i][1]);sx.fillStyle=g;sx.fillText(ch,PAD,PAD+asc);
    return {ch,i,x:lx,w,sp,bx:lx-PAD,by:top-PAD,bw:w+PAD*2,bh:boxH+PAD*2}});
  const tmp=document.createElement("canvas"),tctx=tmp.getContext("2d");
  const drops=order.map((li,n)=>{
    const L=letters[li],start=n*130,FALL=360+300*.35,dx=L.x+L.w*(.3+Math.random()*.4),dy=top+boxH*(.45+Math.random()*.2),
      spl=Array.from({length:9},(_,q)=>{const ang=-Math.PI/2+(Math.random()-.5)*2.6,dist=26+Math.random()*60;return {vx:Math.cos(ang)*dist,vy:Math.sin(ang)*dist,sz:3+Math.random()*6,dur:620+Math.random()*320,col:INTRO_RB[li][q%2?0:1]}});
    return {n,li,start,FALL,impact:start+FALL,dx,dy,spl,reach:Math.min(1,(L.x+L.w-x0)/W)};
  });
  const last=Math.max(...drops.map(d=>d.impact)),shineAt=last+420;
  const guideCol=(()=>{const g=document.querySelector(".intro-word .guide");return g?getComputedStyle(g).color:"rgba(0,0,0,1)"})();
  const bar={x:wr.left+wr.width*.01,w:wr.width*.98,h:fs*.075,y:wr.bottom-fs*.03-fs*.075};
  let rp=0,lastT=0;
  const lerp=(a,b,u)=>a+(b-a)*u,clamp01=v=>Math.max(0,Math.min(1,v)),eo=u=>1-Math.pow(1-clamp01(u),3);
  function pop(u){   // the little squash and bounce of a letter when its drop lands
    if(u<=0||u>=1)return [0,1,1];
    if(u<.35){const k=u/.35;return [lerp(-6,3,k),lerp(.94,1.1,k),lerp(1.08,.9,k)]}
    if(u<.65){const k=(u-.35)/.3;return [lerp(3,-2,k),lerp(1.1,.98,k),lerp(.9,1.03,k)]}
    const k=(u-.65)/.35;return [lerp(-2,0,k),lerp(.98,1,k),lerp(1.03,1,k)];
  }
  function draw(t){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const ou=(t-INTRO_HOLD)/1000,outA=ou>0?1-eo(ou/.8):1,lift=ou>0?-18*eo(ou/1.3):0,ribA=ou>0?1-eo((ou-.55)/.8):1;
    ctx.save();ctx.translate(0,lift);
    // the faint grey word, each grey letter melting as its colour arrives
    ctx.font=font;ctx.textBaseline="alphabetic";
    drops.forEach(d=>{const L=letters[d.li],a=1-clamp01((t-d.impact)/450);if(a>0){ctx.globalAlpha=.09*a*outA;ctx.fillStyle=guideCol;ctx.fillText(L.ch,L.x,base)}});
    // the colour reveals: each letter is uncovered by a soft circle growing out of its drop
    drops.forEach(d=>{
      if(t<d.impact)return;const L=letters[d.li],k=clamp01((t-d.impact)/900),r=Math.hypot(L.w,boxH)*1.15*eo(k),[ty,sx,sy]=pop((t-d.impact)/750),sh=t-(shineAt+d.li*60),sl=sh>0&&sh<1100?(()=>{const u=sh/1100;return -8*(u<.4?u/.4:1-(u-.4)/.6)})():0;
      let src=L.sp;
      if(k<1){   // still being uncovered: mask a copy of the letter with a radial fade
        tmp.width=L.sp.width;tmp.height=L.sp.height;tctx.setTransform(1,0,0,1,0,0);tctx.globalCompositeOperation="source-over";tctx.drawImage(L.sp,0,0);
        tctx.globalCompositeOperation="destination-in";const cx=(d.dx-L.bx)*dpr,cy=(d.dy-L.by)*dpr,rr=r*dpr,gr=tctx.createRadialGradient(cx,cy,Math.max(0,rr-18*dpr),cx,cy,rr+1);gr.addColorStop(0,"rgba(0,0,0,1)");gr.addColorStop(1,"rgba(0,0,0,0)");tctx.fillStyle=gr;tctx.fillRect(0,0,tmp.width,tmp.height);src=tmp;
      }
      ctx.save();const ox=L.x+L.w/2,oy=top+boxH*.8;ctx.translate(ox,oy+ty+sl);ctx.scale(sx,sy);ctx.translate(-ox,-oy);ctx.globalAlpha=outA;ctx.drawImage(src,L.bx,L.by,L.bw,L.bh);ctx.restore();
    });
    // the brush stroke follows the drops across the word, then settles
    let target=0;drops.forEach(d=>{if(t>=d.impact)target=Math.max(target,d.reach)});if(t>=shineAt)target=1;
    const dt=Math.min(64,t-lastT);lastT=t;rp+=(target-rp)*(1-Math.exp(-dt/150));
    if(rp>.002&&ribA>0){
      const sy=t>=shineAt?lerp(1,.7,clamp01((t-shineAt)/1000)):1,w=bar.w*rp,gr=ctx.createLinearGradient(bar.x,0,bar.x+bar.w,0);
      ["#E0675A","#E9984E","#DDB445","#5FAE86","#4FB0AE","#5E8FDB","#7B7BD0","#B27BCF"].forEach((c,i)=>gr.addColorStop(i/7,c));
      ctx.fillStyle=gr;ctx.globalAlpha=.8*ribA;ctx.beginPath();ctx.roundRect(bar.x,bar.y+bar.h*(1-sy)/2,w,bar.h*sy,bar.h/2);ctx.fill();
      ctx.globalAlpha=.36*ribA;ctx.beginPath();ctx.roundRect(bar.x+bar.w*.06,bar.y+bar.h*1.55,Math.max(0,Math.min(bar.w*.84,w-bar.w*.06)),bar.h*.34,bar.h*.17);ctx.fill();
    }
    ctx.restore();
    // drops, rings and splatter ride over everything
    drops.forEach(d=>{
      const c=INTRO_RB[d.li];
      if(t>=d.start&&t<d.impact){const k=(t-d.start)/d.FALL,e=k*k*(.35+.65*k);ctx.globalAlpha=1;ctx.fillStyle=c[0];ctx.beginPath();ctx.arc(d.dx,d.dy-(1-e)*300,7,0,6.2832);ctx.fill()}
      if(t<d.impact)return;
      [[0,1700,1.5,c[0]],[120,2000,3,c[1]]].forEach(([dl,dur,lw,col])=>{const u=(t-d.impact-dl)/dur;if(u>0&&u<1){const e=eo(u);ctx.globalAlpha=.85*(1-e);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(d.dx,d.dy,(10+160*e)/2,0,6.2832);ctx.stroke()}});
      d.spl.forEach(s=>{
        const u=(t-d.impact)/s.dur;if(u<=0||u>=1)return;const e=1-Math.pow(1-u,2.2);
        const x=u<.45?s.vx*.7*(e/(1-Math.pow(1-.45,2.2))):s.vx*(.7+.3*((e-(1-Math.pow(.55,2.2)))/(1-(1-Math.pow(.55,2.2))))),
          y=u<.45?(s.vy-14)*(e/(1-Math.pow(.55,2.2))):s.vy-14+60*((e-(1-Math.pow(.55,2.2)))/Math.pow(.55,2.2));
        const sc=u<.45?lerp(1,.9,u/.45):lerp(.9,.2,(u-.45)/.55),a=u<.45?lerp(.95,.9,u/.45):lerp(.9,0,(u-.45)/.55);
        ctx.globalAlpha=a;ctx.fillStyle=s.col;ctx.beginPath();ctx.arc(d.dx+x,d.dy+y,s.sz*sc/2,0,6.2832);ctx.fill();
      });
    });
    ctx.globalAlpha=1;
  }
  return {drops,last,shineAt,draw,cv};
}
function introPlay(){
  if(introState!=="ready")return;introState="run";ipStart();
  unlockAudio(AC());audioReady(()=>sndIntroFall());   // inside the user’s gesture: the first sound plays right away
  $("introBegin").classList.add("gone");$("introHint").classList.remove("on");$("introSkip").hidden=false;
  if(reduced){introHandoff(true);return}
  const order=[0,1,2,3,4,5,6,7];
  // each drop is a note of the C pentatonic scale, wandering up and down (never the same note twice) and settling on a restful one
  const mel=[];{let p=[0,2,3][Math.floor(Math.random()*3)];for(let n=0;n<8;n++){mel.push(p);let q;do{q=Math.max(0,Math.min(7,p+(Math.random()<.5?-1:1)*(1+Math.floor(Math.random()*3))))}while(q===p);p=q}mel[7]=[0,3,5][Math.floor(Math.random()*3)];if(mel[7]===mel[6])mel[7]=mel[7]===5?3:5}
  for(let i=0;i<7;i++)if(Math.random()<.3){[order[i],order[i+1]]=[order[i+1],order[i]];i++}   // a brush sweeping left to right, with the odd drop landing a little ahead
  const P=introCanvasPlan(order);introCv=P.cv;
  // the picture runs on its own animation clock; the sounds stay on timers of their own so a slow frame never moves the beat
  P.drops.forEach(d=>introLater(()=>{if(introState!=="run")return;ipMark("drop"+d.n);audioReady(()=>{sndIntroDrop(note("Europe",mel[d.n])*2,Math.random());sndBrush(false);if(d.n===0)sndBloom(true)})},d.impact));
  introLater(()=>{if(introState!=="run")return;audioReady(()=>sndBrush(true));$("introSub").classList.add("on")},P.shineAt);
  introLater(()=>{if(introState!=="run")return;ipMark("hold");introEl.classList.add("out");document.body.classList.add("introglobe")},INTRO_HOLD);
  const T0=performance.now(),loop=()=>{if(introState!=="run")return;const t=performance.now()-T0;P.draw(t);if(t<INTRO_HOLD+2400)introRaf=requestAnimationFrame(loop)};
  P.draw(0);introRaf=requestAnimationFrame(loop);
  introSpin();}/* the globe rises already turning, then eases (fast, then slower and slower) onto the saved view while wind and soft notes follow its speed */
let spinT=null,spinFinal=null,spinG=null;
const INTRO_HOLD=4300;   // the name stays long enough to read the motto beneath it, then the globe rises
const SPIN_MS=3300;
function introSpin(){
  const r1=projection.rotate().slice(),k1=zoomK,D=SPIN_MS*(FX.ts||1);
  spinFinal={r:r1,k:k1};
  const k0=k1>1.3?1.1:k1*.84;   // a deep saved zoom is reached by zooming in at the end, so the spin always shows the whole globe
  const at=e=>{projection.rotate([r1[0]-540*(1-e),Math.max(-85,Math.min(85,r1[1]+20*(1-e))),0]);zoomK=k0+(k1-k0)*e};
  at(0);render(true);
  introLater(()=>{
    if(introState!=="run")return;
    const t0=performance.now();animating=true;
    spinT=d3.timer(()=>{
      const t=Math.min(1,(performance.now()-t0)/D);at(1-Math.pow(1-t,3));render();
      if(t>=1){spinT.stop();spinT=null;animating=false;syncZoom();}
    });
    audioReady(()=>sndSpin(D/1000));
    const seq=[0,2,4,3,5,4,2,3,1,5,4,2];
    for(let k=1;k<12;k++){const a=k*45/540,tk=1-Math.pow(1-a,1/3);   // a pluck every 45 degrees: they thin out as the globe slows
      introLater(()=>{const c=AC();if(c&&c.state==="running")pluck(note("Europe",seq[k]),c.currentTime+.02,Math.max(.025,.075-k*.005),1.6,.6)},tk*D)}
    introLater(()=>{const c=AC();if(c&&c.state==="running"){const t=c.currentTime+.02;[587.33,739.99,880].forEach((f,i)=>bell(f,t+i*.07,.03,2.8,.7))}},D-120);
  },INTRO_HOLD);
  introLater(()=>introHandoff(false),INTRO_HOLD+D+350);
}
function sndSpin(sec){
  const c=AC();if(!c||!noiseBuf)return;const t=c.currentTime+.02;
  const s=c.createBufferSource();s.buffer=noiseBuf;s.loop=true;
  const f=c.createBiquadFilter();f.type="bandpass";f.Q.value=.7;
  const g=c.createGain();g.gain.setValueAtTime(0,t);f.frequency.setValueAtTime(260,t);
  for(let i=1;i<=48;i++){const u=i/48,v=Math.pow(1-u,2);
    f.frequency.linearRampToValueAtTime(260+1500*Math.pow(v,.6),t+u*sec);
    g.gain.linearRampToValueAtTime(.05*Math.sqrt(v)*Math.min(1,u*12),t+u*sec)}
  g.gain.linearRampToValueAtTime(0,t+sec+.3);
  s.connect(f).connect(g);send(g,.35);spinG=g;s.start(t,Math.random()*1.5);s.stop(t+sec+.4);
}
function introHandoff(fast){
  if(introState!=="run")return;introState="done";ipMark("handoff");setTimeout(ipEnd,2500);
  introTimers.forEach(clearTimeout);introTimers.length=0;cancelAnimationFrame(introRaf);if(introCv){introCv.remove();introCv=null}
  if(spinT){spinT.stop();spinT=null}
  if(spinFinal){projection.rotate(spinFinal.r);zoomK=spinFinal.k;animating=false;syncZoom();spinFinal=null}
  if(spinG&&actx){try{spinG.gain.cancelScheduledValues(actx.currentTime);spinG.gain.setTargetAtTime(0,actx.currentTime,.06)}catch(e){}spinG=null}
  document.body.classList.remove("introing","introglobe");document.body.classList.add("introout");
  $("introSkip").hidden=true;introEl.classList.add("out");
  stopDrift();scheduleDrift();render(true);
  setTimeout(()=>{introEl.remove();document.body.classList.remove("introout")},1400);
  setTimeout(themeTip,2200);
  if(!S.found.size)setTimeout(()=>toast("\u{1F331}","Welcome to Mapbloom","Tap any country to read about it, or try Seek to start painting.",6500),900);
}
/* ---------- frame-rate readout: add ?fps to the address, or press Shift+F. Shows frames per second, the slowest recent frame, how long the game's own drawing code takes per frame, and which graphics chip the browser is really using ---------- */
let fpsHud=null;
function fpsToggle(){
  if(fpsHud){fpsHud.stop=true;fpsHud.el.remove();fpsHud=null;renderNow=fpsHud0;return}
  const el=document.createElement("div");el.style.cssText="position:fixed;left:10px;bottom:34px;z-index:99;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;background:rgba(0,0,0,.72);color:#e8e2cf;padding:7px 10px;border-radius:8px;pointer-events:none;white-space:pre";
  document.body.append(el);
  let gpu="unknown";try{const t=document.createElement("canvas").getContext("webgl2"),x=t&&t.getExtension("WEBGL_debug_renderer_info");if(x)gpu=t.getParameter(x.UNMASKED_RENDERER_WEBGL)}catch(e){}
  const h={el,stop:false};fpsHud=h;let acc=0,cnt=0,last=performance.now(),ds=[],t0=last;
  fpsHud0=renderNow;const orig=renderNow;renderNow=function(){const a=performance.now();orig();acc+=performance.now()-a;cnt++};
  const tick=t=>{if(h.stop)return;ds.push(t-last);last=t;
    if(t-t0>1000){const s=ds.slice().sort((a,b)=>a-b),avg=s.reduce((a,b)=>a+b,0)/s.length;
      el.textContent=`${Math.round(1000/avg)} fps   worst ${Math.round(s[s.length-1])} ms   95% ${Math.round(s[Math.floor(s.length*.95)])} ms\ndraw code ${cnt?(acc/cnt).toFixed(1):"0"} ms x ${cnt}/s   engine ${GLX.on?"GPU":CANVAS?"canvas":"svg"}\nscreen ${innerWidth}x${innerHeight} @${devicePixelRatio}x   chip: ${gpu}`;
      ds=[];acc=0;cnt=0;t0=t}
    requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
}
let fpsHud0=null;
if(/[?&]fps/.test(location.search))setTimeout(fpsToggle,800);
document.addEventListener("keydown",e=>{if(e.shiftKey&&e.key==="F"&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||""))fpsToggle()});
/* ---------- phones: no page zoom, and lighter effects only if the device is visibly struggling ---------- */
const onSheet=e=>!!(e.target&&e.target.closest&&e.target.closest("#modal,.rdwin"));
["gesturestart","gesturechange","gestureend"].forEach(ev=>document.addEventListener(ev,e=>{if(!onSheet(e))e.preventDefault()}));
document.addEventListener("touchmove",e=>{if(e.touches&&e.touches.length>1&&!onSheet(e))e.preventDefault()},{passive:false});
let fxForced=false;
function liteMode(){if(S.fx==="full")return;fxForced=true;applyFx();paint();render(true)}   // a touch device that is visibly struggling
/* graphics level: Auto = lite on phones/tablets, full on computers; the user can pick either */
function applyFx(){
  const soft=S.fx==="lite"||(S.fx==="auto"&&(isTouch||fxForced));
  LITE=soft;
  FX.wc=!soft;FX.bloomFx=!soft;
  FX.tiles=CANVAS?S.fx!=="lite":!soft;      // textures stay on with the canvas globe unless Lite is chosen
  gPaint.attr("filter",FX.wc?"url(#wc)":null);
  gShadow.style("display",soft||CANVAS?"none":null);gLift.style("display",soft||CANVAS?"none":null);
  projection.precision(soft?1.2:.4);projC.precision(soft?1.2:.5);
  document.body.classList.toggle("lite",S.fx==="lite"||(soft&&!CANVAS));   // lite = no paper grain either
}
function engineSeg(){return seg([["gl","Fast (GPU)","bolt"],["canvas","Compatible","grid"],["svg","Classic","pen"]],S.engine2,k=>{if(S.engine2===k)return;S.engine2=k;save();location.reload()})}
function autoSeg(){return seg([["off","Off","off"],["fast","Quick","fast"],["normal","Normal","play"],["slow","Slow","slow"]],S.autoNext,k=>{S.autoNext=k;save();sndTick();if(k==="off")clearAuto();renderSettings()})}
let nbApplied=null;
function applyNb(){nbApplied=nbNow();document.body.classList.toggle("nb",nbApplied);if(GLX.hasGL&&GLX.colors)GLX.colors();paint();render(true)}
function fxSeg(){return seg([["auto","Auto","themeauto"],["full","Full","sparkle"],["lite","Lite","feather"]],S.fx,k=>{S.fx=k;fxForced=false;cvQ=1;cvN=0;cvAvg=16;if(CANVAS)cvResize();save();applyFx();paint();render(true);sndTick();renderSettings()})}
if(isTouch){
  let n=0,sum=0,last=0;
  const tick=t=>{if(last&&!document.hidden){const dt=t-last;if(dt<500){sum+=dt;n++}}last=t;if(n>=45){if(sum/n>48)liteMode();return}requestAnimationFrame(tick)};
  setTimeout(()=>requestAnimationFrame(tick),2500);
}
/* ---------- text selection: only reading text can be selected, and a stray selection is cleared ---------- */
const SEL_OK=".learn,.card .note,.card dd,.card dt,.sheet,.share,.attrib,input,textarea,select,.dvPanel";
const inSelOk=n=>{const t=n&&(n.nodeType===1?n:n.parentElement);return !!(t&&t.closest&&t.closest(SEL_OK))};
function clearSel(){try{const sel=getSelection();if(sel&&sel.rangeCount&&!sel.isCollapsed&&!inSelOk(sel.anchorNode))sel.removeAllRanges()}catch(e){}}
document.addEventListener("selectstart",e=>{if(!inSelOk(e.target))e.preventDefault()});
document.addEventListener("pointerdown",e=>{if(!inSelOk(e.target))clearSel()},true);
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="a"&&!inSelOk(e.target)&&!inSelOk(document.activeElement)){e.preventDefault();clearSel()}},true);
document.addEventListener("visibilitychange",clearSel);window.addEventListener("pageshow",clearSel);clearSel();

