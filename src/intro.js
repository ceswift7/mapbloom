/* ======================================================================
   OPENING SEQUENCE: tap to begin (the tap unlocks audio), a drop of color washes the
   name onto the paper, the globe rises and a few countries bloom, then the game fades in.
   ====================================================================== */
const introEl=$("intro"),introTimers=[];
const introLater=(fn,ms)=>{introTimers.push(setTimeout(fn,ms))};
function initIntro(){
  const skip=/[?&]nointro/.test(location.search)||(()=>{try{return localStorage.getItem("mb-skip-intro")==="1"}catch(e){return false}})();
  if(skip){introEl.remove();document.body.classList.remove("introing");introState="done";return}
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
function introPlay(){
  if(introState!=="ready")return;introState="run";
  unlockAudio(AC());audioReady(()=>sndIntroFall());   // inside the user’s gesture: the first sound plays right away
  $("introBegin").classList.add("gone");$("introHint").classList.remove("on");$("introSkip").hidden=false;
  if(reduced){introHandoff(true);return}
  // eight drops, one per letter, each a different watercolour of the game palette in rainbow order, landing in a shuffled, staggered order
  const ink=$("introInk"),RB=[["#E0675A","#F4A08E"],["#E9984E","#F4C592"],["#DDB445","#F3DB93"],["#5FAE86","#A5D8BA"],["#4FB0AE","#A0DAD4"],["#5E8FDB","#ABC8F2"],["#7B7BD0","#B8B6EE"],["#B27BCF","#E0BFEE"]];
  ink.textContent="";
  const guide=document.querySelector(".intro-word .guide"),guides=[];   // the faint grey word is split too, so each grey letter melts away as its colour arrives
  if(guide){guide.textContent="";"Mapbloom".split("").forEach(ch=>{const g=document.createElement("span");g.className="gl";g.textContent=ch;guide.append(g);guides.push(g)})}
  const letters="Mapbloom".split("").map((ch,i)=>{const b=document.createElement("span");b.className="il";b.textContent=ch;b.style.setProperty("--a",RB[i][0]);b.style.setProperty("--b",RB[i][1]);ink.append(b);return b});
  const order=[0,1,2,3,4,5,6,7];
  // each drop is a note of the C pentatonic scale, wandering up and down (never the same note twice) and settling on a restful one
  const mel=[];{let p=[0,2,3][Math.floor(Math.random()*3)];for(let n=0;n<8;n++){mel.push(p);let q;do{q=Math.max(0,Math.min(7,p+(Math.random()<.5?-1:1)*(1+Math.floor(Math.random()*3))))}while(q===p);p=q}mel[7]=[0,3,5][Math.floor(Math.random()*3)];if(mel[7]===mel[6])mel[7]=mel[7]===5?3:5}
  for(let i=0;i<7;i++)if(Math.random()<.3){[order[i],order[i+1]]=[order[i+1],order[i]];i++}   // a brush sweeping left to right, with the odd drop landing a little ahead
  const brush=$("introBrush"),wordEl=document.querySelector(".intro-word");let reach=0;
  if(brush){brush.classList.remove("settle");brush.style.setProperty("--p",0)}
  order.forEach((li,n)=>{
    const L=letters[li],start=n*130;   // an even tick: one drop every 130 ms, none early or late
    introLater(()=>{
      if(introState!=="run")return;
      const lr=L.getBoundingClientRect(),dx=lr.left+lr.width*(.3+Math.random()*.4),dy=lr.top+lr.height*(.45+Math.random()*.2),H0=300;
      const drop=document.createElement("i"),ring=document.createElement("i"),ring2=document.createElement("i");drop.className="intro-drop";ring.className="intro-ring";ring2.className="intro-ring r2";
      drop.style.background=RB[li][0];ring.style.borderColor=RB[li][0];ring2.style.borderColor=RB[li][1];
      introEl.append(drop,ring,ring2);drop.style.opacity=1;
      const t0=performance.now(),FALL2=360+H0*.35;
      const tm=d3.timer(()=>{
        const k=Math.min(1,(performance.now()-t0)/FALL2),e=k*k*(.35+.65*k);
        drop.style.transform=`translate(${dx}px,${dy-(1-e)*H0}px)`;
        if(k>=1){tm.stop();drop.remove()}
      });
      introLater(impact,FALL2);   // the impact and its sound are on a clock of their own, so a slow frame can never shift the beat
      function impact(){
        if(introState!=="run")return;
        audioReady(()=>{sndIntroDrop(note("Europe",mel[n])*2,Math.random());sndBrush(false);if(n===0)sndBloom(true)});
        if(brush&&wordEl){const wr=wordEl.getBoundingClientRect();reach=Math.max(reach,Math.min(1,(lr.right-wr.left)/wr.width));brush.style.setProperty("--p",reach.toFixed(3))}   // the stroke follows the drops across the word
        ring.style.left=ring2.style.left=dx+"px";ring.style.top=ring2.style.top=dy+"px";ring.classList.add("go");ring2.classList.add("go");setTimeout(()=>{ring.remove();ring2.remove()},2000);
        L.classList.remove("hit");void L.offsetWidth;L.classList.add("hit");if(guides[li])guides[li].style.opacity=0;
        for(let q=0;q<9;q++){   // splatter: little droplets thrown up and out that fall back under gravity
          const sp=document.createElement("i");sp.className="intro-spl";const sz=3+Math.random()*6;sp.style.cssText=`width:${sz}px;height:${sz}px;left:${dx}px;top:${dy}px;background:${RB[li][q%2?0:1]}`;introEl.append(sp);
          const ang=-Math.PI/2+(Math.random()-.5)*2.6,dist=26+Math.random()*60,vx=Math.cos(ang)*dist,vy=Math.sin(ang)*dist;
          sp.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:.95},{transform:`translate(calc(-50% + ${vx*.7}px),calc(-50% + ${vy-14}px)) scale(.9)`,opacity:.9,offset:.45},{transform:`translate(calc(-50% + ${vx}px),calc(-50% + ${vy+46}px)) scale(.2)`,opacity:0}],{duration:620+Math.random()*320,easing:"cubic-bezier(.2,.6,.4,1)"}).onfinish=()=>sp.remove();
        }
        L.style.setProperty("--dx",(dx-lr.left)+"px");L.style.setProperty("--dy",(dy-lr.top)+"px");
        const maxR=Math.hypot(lr.width,lr.height)*1.15,t1=performance.now(),DUR=900;
        const t2=d3.timer(()=>{const k=Math.min(1,(performance.now()-t1)/DUR);L.style.setProperty("--mr",(maxR*easeOut(k))+"px");if(k>=1)t2.stop()});
        if(n===7)introLater(()=>{if(brush){brush.style.setProperty("--p",1);brush.classList.add("settle")}audioReady(()=>sndBrush(true));$("introSub").classList.add("on");letters.forEach((l,i)=>{l.style.animationDelay=(i*60)+"ms";l.classList.add("shine")})},420);
      }
    },start);
  });
  introLater(()=>{if(introState!=="run")return;introEl.classList.add("out");document.body.classList.add("introglobe")},INTRO_HOLD);
  introSpin();
}/* the globe rises already turning, then eases (fast, then slower and slower) onto the saved view while wind and soft notes follow its speed */
let spinT=null,spinFinal=null,spinG=null;
const INTRO_HOLD=2450;   // the last letters are still finishing as the globe starts to rise, so the title never just sits
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
    introLater(()=>{const c=AC();if(c&&c.state==="running"){const t=c.currentTime+.02;[523.25,659.25,783.99].forEach((f,i)=>bell(f,t+i*.07,.03,2.8,.7))}},D-120);
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
  if(introState!=="run")return;introState="done";
  introTimers.forEach(clearTimeout);introTimers.length=0;
  if(spinT){spinT.stop();spinT=null}
  if(spinFinal){projection.rotate(spinFinal.r);zoomK=spinFinal.k;animating=false;syncZoom();spinFinal=null}
  if(spinG&&actx){try{spinG.gain.cancelScheduledValues(actx.currentTime);spinG.gain.setTargetAtTime(0,actx.currentTime,.06)}catch(e){}spinG=null}
  document.body.classList.remove("introing","introglobe");document.body.classList.add("introout");
  $("introSkip").hidden=true;introEl.classList.add("out");
  stopDrift();scheduleDrift();render(true);
  setTimeout(()=>{introEl.remove();document.body.classList.remove("introout")},1400);
  if(!S.found.size)setTimeout(()=>toast("\u{1F331}","Welcome to Mapbloom","Tap any country to read about it, or try Quiz to start painting.",6500),900);
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

