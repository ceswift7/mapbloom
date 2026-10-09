/* ======================================================================
   FINALE: three celebrations that play once each, when the last piece falls into place
     paint   every country painted          (the Cartographer stamp)
     stamps  every stamp collected          (the whole Stamp Book)
     full    100%: everything painted, every country mastered, every stamp
   Each one is a short, skippable sequence over the game, in the key of the rest of the sound (D major pentatonic).
   A player who earns several at once sees only the biggest. They can be replayed from About.
   ====================================================================== */
const FIN_FLAG={paint:"fin_paint",stamps:"fin_stamps",full:"fin_full"};   // remembered in S.expDone, which is already saved and merged across devices
let finRun=null;
(function(){
  const st=document.createElement("style");
  st.textContent=`
  .fin{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;overflow:hidden;opacity:0;transition:opacity .9s ease;font-family:var(--sans,system-ui,sans-serif)}
  .fin.on{opacity:1}.fin.off{opacity:0;transition:opacity .7s ease}
  .fin .fincv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .fin.paint{background:radial-gradient(ellipse at 50% 50%,rgba(6,8,16,.5) 0,rgba(6,8,16,.74) 100%)}
  .fin.full{background:radial-gradient(ellipse at 50% 50%,rgba(14,10,28,.52) 0,rgba(4,3,10,.9) 82%)}
  .fin.stamps{background:var(--paper,#E7D9B9);background-image:var(--paper-img);color:var(--ink,#3A2F22)}
  .fin .ftitle{font-family:var(--serif,Georgia,serif);font-style:italic;font-weight:400;line-height:1.05;letter-spacing:-.02em;position:relative;z-index:2;margin:0}
  .fin .ftitle{filter:drop-shadow(0 3px 14px rgba(0,0,0,.7))}.fin.stamps .ftitle{filter:none}.fin .fsub{text-shadow:0 1px 10px rgba(0,0,0,.8)}.fin.stamps .fsub{text-shadow:none}.fin .ftitle span{display:inline-block;opacity:0;white-space:pre;background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
  .fin .fsub{position:relative;z-index:2;margin:14px 20px 0;font-size:clamp(14px,2.1vw,19px);letter-spacing:.02em;opacity:0;max-width:34em;line-height:1.5}
  .fin.stamps .fgo{position:absolute;left:50%;bottom:7vh;margin:0 0 0 -52px;min-width:104px}.fin .fgo{position:relative;z-index:3;margin-top:26px;opacity:0;pointer-events:none;transition:opacity .6s ease}
  .fin .fgo.on{opacity:1;pointer-events:auto}
  .fin .fskip{position:absolute;top:14px;right:14px;z-index:4;font-size:13px;opacity:.7}
  .fin .fnum{position:relative;z-index:2;font-family:var(--serif,Georgia,serif);font-weight:400;font-size:clamp(96px,26vw,260px);line-height:.95;letter-spacing:-.04em;font-variant-numeric:tabular-nums;background:linear-gradient(180deg,#FFF3C4 0,#F2C45A 46%,#C98A2B 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 28px rgba(242,196,90,.55))}
  .fin .fchips{position:relative;z-index:2;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:18px;opacity:0}
  .fin .fchips b{font-weight:600;font-size:13px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,214,120,.35);color:#FFE7A8}
  .fin .fhead{position:relative;z-index:2;font-family:var(--serif,Georgia,serif);font-style:italic;font-size:clamp(22px,4vw,34px);margin:0 0 14px;opacity:0}
  .fin .fgrid{position:relative;z-index:2;display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));gap:12px 8px;width:min(920px,94vw);max-height:62vh;overflow:hidden;padding:4px}
  .fin .fst{display:flex;flex-direction:column;align-items:center;gap:4px;opacity:0;font-size:10.5px;line-height:1.2;color:var(--ink-soft,#6B5B45);position:relative}
  .fin .fst .disc{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:25px;background:rgba(255,250,235,.55);box-shadow:0 0 0 2px var(--ink-soft,#6B5B45) inset,0 0 0 5px rgba(255,250,235,.0),0 0 0 6px rgba(107,91,69,.55) inset;position:relative}
  .fin .fst .disc::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid #C4533F;opacity:0}
  .fin .fst.hit .disc::after{animation:finring .7s ease-out}
  @keyframes finring{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}
  .fin .fseal{position:absolute;z-index:3;left:50%;top:50%;width:min(300px,62vw);aspect-ratio:1;margin:calc(min(300px,62vw)/-2) 0 0 calc(min(300px,62vw)/-2);opacity:0;pointer-events:none}
  .fin .fseal svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 8px 18px rgba(88,66,32,.4))}
  .fin.stamps .fcap{position:absolute;z-index:4;left:0;right:0;top:calc(50% + min(300px,62vw)/2 + 14px);margin:0;opacity:0;font-family:var(--serif,Georgia,serif);font-style:italic;font-size:clamp(20px,3.4vw,30px)}
  @media (prefers-reduced-motion:reduce){.fin,.fin.off{transition:opacity .2s}}
  `;
  document.head.append(st);
})();

const FINCOL=["#E0675A","#F2D27A","#7FB08A","#6FA8D6","#B58AD6","#F4A08E","#FFFFFF"];
const dn=i=>note("Europe",Math.max(0,Math.min(8,i)));       // D major pentatonic, D4 upward
const finSnd=fn=>{const c=AC();if(c&&c.state==="running"){try{fn(c.currentTime+.02)}catch(e){}}};
const finChord=(t,deg,vol=.05)=>deg.forEach((f,i)=>{pluck(f,t+i*.05,vol,2.8,.65);bell(f*2,t+.1+i*.05,vol*.5,3.2,.7)});
const FIN_D=[293.66,369.99,440,587.33],FIN_A=[220,277.18,329.63,440],FIN_BM=[246.94,293.66,369.99,493.88],FIN_G=[196,246.94,293.66,392];

function finTitleText(parent,text,{size,delay=0,step=48}={}){
  const h=el("h2",{class:"ftitle"});if(size)h.style.fontSize=size;
  let k=0;[...text].forEach((ch,i)=>{const p=INTRO_RB[(i+k)%INTRO_RB.length],s=el("span",{style:`background-image:linear-gradient(115deg,${p[0]},${p[1]})`},ch);h.append(s);
    s.animate([{opacity:0,transform:"translateY(.45em) scale(.78)",filter:"blur(6px)"},{opacity:1,transform:"none",filter:"blur(0)"}],{duration:reduced?1:620,delay:reduced?0:delay+i*step,easing:"cubic-bezier(.2,.9,.25,1)",fill:"forwards"})});
  parent.append(h);return h;
}
const finFade=(e,delay,dur=700)=>e.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:reduced?1:dur,delay:reduced?0:delay,easing:"ease-out",fill:"forwards"});

function finStart(kind){
  if(finRun)return;
  const ov=el("div",{class:"fin "+kind,role:"dialog","aria-label":{paint:"Every country painted",stamps:"Every stamp collected",full:"One hundred percent"}[kind]}),
    cv=el("canvas",{class:"fincv"}),dpr=Math.min(1.5,window.devicePixelRatio||1);
  const w=innerWidth,h=innerHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  const c=cv.getContext("2d");c.scale(dpr,dpr);
  const R_={ov,cv,c,w,h,P:[],timers:[],raf:0,alive:true,stars:null};
  const at=(ms,fn)=>{R_.timers.push(setTimeout(()=>{if(R_.alive)fn()},reduced?Math.min(ms,60):ms))};
  R_.at=at;
  const goBtn=el("button",{class:"btn primary fgo",type:"button",onclick:()=>finClose()},"Continue");
  const skip=el("button",{class:"btn fskip",type:"button",onclick:()=>finClose()},"Skip");
  R_.go=goBtn;
  ov.append(cv);document.body.append(ov);ov.append(skip);
  finRun=R_;
  requestAnimationFrame(()=>ov.classList.add("on"));
  const onKey=e=>{if(e.key==="Escape"&&finRun===R_){e.stopPropagation();finClose()}};document.addEventListener("keydown",onKey,true);R_.onKey=onKey;
  stopDrift();
  // particle loop: sparks glow, paint drops are soft blobs; both leave a short trail
  const loop=()=>{
    if(!R_.alive)return;
    c.globalCompositeOperation="destination-out";c.fillStyle=kind==="stamps"?"rgba(0,0,0,.22)":"rgba(0,0,0,.2)";c.fillRect(0,0,w,h);
    if(R_.bg)R_.bg(c,performance.now());
    c.globalCompositeOperation="lighter";
    for(let i=R_.P.length-1;i>=0;i--){const p=R_.P[i];p.t++;p.vy+=p.g;p.vx*=.992;p.vy*=.992;p.x+=p.vx;p.y+=p.vy;
      const k=p.t/p.max;if(k>=1){R_.P.splice(i,1);continue}
      c.globalAlpha=Math.max(0,1-k*k)*(p.a||1);c.fillStyle=p.col;
      c.beginPath();c.arc(p.x,p.y,p.r*(p.paint?1-k*.3:1-k*.55),0,6.2832);c.fill()}
    c.globalAlpha=1;c.globalCompositeOperation="source-over";
    R_.raf=requestAnimationFrame(loop);
  };
  if(!reduced)R_.raf=requestAnimationFrame(loop);
  return R_;
}
function finBurst(R_,x,y,n,{cols=FINCOL,pow=1,paint=false,g=.05}={}){
  if(reduced||!R_||!R_.alive)return;
  for(let i=0;i<n;i++){const an=Math.random()*6.2832,v=(paint?1.5+Math.random()*4.5:1.2+Math.random()*5.2)*pow;
    R_.P.push({x,y,vx:Math.cos(an)*v,vy:Math.sin(an)*v-(paint?1.2:0),g:paint?.11:g,t:0,max:(paint?70:48)+Math.random()*34,r:paint?3+Math.random()*5.5:1.1+Math.random()*1.7,col:cols[Math.floor(Math.random()*cols.length)],paint})}
}
function finClose(){
  const R_=finRun;if(!R_||!R_.alive)return;R_.alive=false;finRun=null;
  R_.timers.forEach(clearTimeout);cancelAnimationFrame(R_.raf);document.removeEventListener("keydown",R_.onKey,true);
  R_.ov.classList.remove("on");R_.ov.classList.add("off");
  setTimeout(()=>R_.ov.remove(),800);
  scheduleDrift();
}
const finEnd=(R_,ms)=>{R_.at(ms,()=>{R_.go.classList.add("on");R_.ov.append(R_.go);try{R_.go.focus({preventScroll:true})}catch(e){}})};

/* ---------- 1. every country painted ---------- */
function finPaint(){
  const R_=finStart("paint");if(!R_)return;const {ov,w,h,at}=R_;
  const box=el("div",{style:"position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;padding:0 12px"});ov.append(box);
  finSnd(t=>{bell(146.83,t,.05,4,.7);bell(293.66,t+.05,.03,4,.7)});
  at(200,()=>{try{flyTo(REGION_VIEW.World,2400,REGION_ZOOM.World||1)}catch(e){}});
  const order=["Africa","Europe","Asia","Oceania","Americas"];
  order.forEach((r,i)=>{at(1500+i*900,()=>{
    const cols=[getComputedStyle(document.documentElement).getPropertyValue("--c-"+r).trim()||"#E0675A","#F2D27A","#FFFFFF"],
      an=-Math.PI/2+(i-2)*.62,rad=Math.min(w,h)*.3,x=w/2+Math.cos(an)*rad*1.25,y=h*.52+Math.sin(an)*rad;
    finBurst(R_,x,y,70,{cols,paint:true,pow:1.15});finBurst(R_,x,y,26,{cols:["#FFF3C4","#F2D27A"],pow:.9});
    finSnd(t=>sndFlourish(r))})});
  at(6200,()=>{
    finTitleText(box,"Every country,",{size:"clamp(40px,9.5vw,104px)",delay:0,step:42});
    finTitleText(box,"painted.",{size:"clamp(52px,12.5vw,138px)",delay:700,step:60});
    finSnd(t=>{finChord(t,FIN_D,.06);bell(1174.66,t+.3,.03,3.6,.8)});
    for(let i=0;i<6;i++)at(6300+i*220,()=>finBurst(R_,w*(.18+Math.random()*.64),h*(.2+Math.random()*.5),48,{paint:i%2===0,pow:1.1}));
    const n=playable.length,sub=el("p",{class:"fsub"},`${n} of ${n} countries. You are a Cartographer.`);box.append(sub);finFade(sub,2000);
  });
  finEnd(R_,9400);
}

/* ---------- 2. every stamp collected ---------- */
function finStamps(){
  const R_=finStart("stamps");if(!R_)return;const {ov,w,h,at}=R_;
  const head=el("p",{class:"fhead"},"The Stamp Book"),grid=el("div",{class:"fgrid"});
  const items=ACH.map(a=>el("div",{class:"fst"},el("span",{class:"disc"},a.i),el("span",{},a.n)));
  items.forEach(i=>grid.append(i));
  const box=el("div",{style:"position:relative;z-index:2;display:flex;flex-direction:column;align-items:center"},head,grid);ov.append(box);
  const seal=el("div",{class:"fseal",html:`<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="fsg" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".55" stop-color="#F2C45A"/><stop offset="1" stop-color="#B9791F"/></radialGradient><path id="fsp" d="M100 100m-72 0a72 72 0 1 1 144 0a72 72 0 1 1-144 0"/></defs>
    <circle cx="100" cy="100" r="94" fill="url(#fsg)" stroke="#8A5A14" stroke-width="3"/><circle cx="100" cy="100" r="84" fill="none" stroke="#8A5A14" stroke-width="1.5" stroke-dasharray="3 4"/>
    <text font-size="12.5" font-weight="700" fill="#5E3C0C" font-family="var(--sans,system-ui)"><textPath href="#fsp" startOffset="0" textLength="440" lengthAdjust="spacing">EVERY STAMP COLLECTED · EVERY STAMP COLLECTED ·</textPath></text>
    <path d="M100 52l13.5 28.4 31 4.2-22.6 21.7 5.6 30.9L100 122.3 72.5 137.2l5.6-30.9-22.6-21.7 31-4.2z" fill="#FFF8DC" stroke="#8A5A14" stroke-width="3" stroke-linejoin="round"/></svg>`});
  ov.append(seal);
  const cap=el("p",{class:"fcap"},`${ACH.length} of ${ACH.length} stamps. The book is complete.`);ov.append(cap);
  finFade(head,150);
  const n=items.length;let t=700;
  items.forEach((it,i)=>{
    const rot=(Math.random()-.5)*10;
    at(t,()=>{
      it.style.opacity="1";
      it.animate([{opacity:0,transform:`scale(2.3) rotate(${rot*3}deg)`},{opacity:1,transform:`scale(.94) rotate(${rot}deg)`,offset:.72},{opacity:1,transform:`scale(1) rotate(${rot*.6}deg)`}],{duration:reduced?1:300,easing:"cubic-bezier(.3,.7,.3,1)",fill:"forwards"});
      setTimeout(()=>it.classList.add("hit"),reduced?0:210);
      const r=it.getBoundingClientRect();finBurst(R_,r.left+r.width/2,r.top+27,10,{cols:["#C4533F","#8A5A14","#F2D27A"],paint:true,pow:.55});
      finSnd(tt=>{blip(tt,170,70,.12,.045+.03*i/n,.1);pluck(dn(i%9)*(i>=18?2:1),tt+.03,.035+.04*i/n,.8,.45)});
    });
    t+=Math.max(75,300*Math.pow(.93,i));
  });
  at(t+500,()=>{
    grid.animate([{transform:"translateY(0)"},{transform:"translateY(5px)"},{transform:"translateY(-3px)"},{transform:"none"}],{duration:reduced?1:380});
    seal.style.opacity="1";
    seal.animate([{opacity:0,transform:"scale(3.2) rotate(-16deg)"},{opacity:1,transform:"scale(.93) rotate(3deg)",offset:.7},{opacity:1,transform:"scale(1) rotate(0)"}],{duration:reduced?1:620,easing:"cubic-bezier(.3,.7,.25,1)",fill:"forwards"});
    finSnd(tt=>{blip(tt,150,52,.28,.12,.15);noise(tt,.18,{type:"lowpass",f0:900,q:.6,vol:.06,wet:.2});finChord(tt+.2,FIN_D,.07);bell(1174.66,tt+.5,.04,3.4,.8)});
    const cx=w/2,cy=h/2;for(let k=0;k<5;k++)at(t+520+k*150,()=>finBurst(R_,cx+(Math.random()-.5)*w*.5,cy+(Math.random()-.5)*h*.4,36,{cols:["#F2D27A","#C4533F","#FFFFFF","#8A5A14"],paint:k%2===0,pow:1}));
    finFade(cap,900);
    const g=grid.animate([{opacity:1},{opacity:.28}],{duration:reduced?1:900,delay:reduced?0:500,fill:"forwards"});
  });
  finEnd(R_,t+3000);
}

/* ---------- 3. 100% ---------- */
function finFull(){
  const R_=finStart("full");if(!R_)return;const {ov,w,h,at}=R_;
  const stars=d3.range(90).map(()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.4+.3,p:Math.random()*6.28}));
  R_.bg=(c,now)=>{c.globalCompositeOperation="source-over";stars.forEach(s=>{c.globalAlpha=.25+.35*Math.sin(now/700+s.p)*.5+.2;c.fillStyle="#fff";c.fillRect(s.x,s.y,s.r,s.r)});c.globalAlpha=1};
  const num=el("div",{class:"fnum"},"0%"),box=el("div",{style:"position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;padding:0 12px"},num);ov.append(box);
  at(0,()=>finSnd(t=>{bell(146.83,t,.06,5,.7);bell(220,t+.05,.04,5,.7)}));
  at(500,()=>{                                   // the count: every tenth part rings a rising note
    const t0=performance.now(),DUR=3300;let last=0;
    const tick=()=>{if(!R_.alive)return;const k=Math.min(1,(performance.now()-t0)/DUR),e=1-Math.pow(1-k,2.2),v=Math.round(e*100);num.textContent=v+"%";
      const step=Math.floor(v/10);if(step>last){last=step;finSnd(t=>{pluck(dn(step-1),t,.06,1.2,.5);if(step===10)bell(1174.66,t,.04,3,.8)});finBurst(R_,w/2,h*.36,12*step/3,{pow:.5+step*.07})}
      if(k<1)requestAnimationFrame(tick);else num.textContent="100%"};tick();
  });
  at(4100,()=>{                                  // the title, then the first big volley
    finSnd(t=>{finChord(t,FIN_D,.08);bell(1174.66,t+.2,.05,4,.8);noise(t,.5,{type:"highpass",f0:3000,f1:7000,q:.5,vol:.02,attack:.1,wet:.5})});
    const tl=finTitleText(box,"Complete.",{size:"clamp(44px,10vw,112px)",delay:0,step:70});
    const sub=el("p",{class:"fsub"},"Every country painted and mastered. Every stamp earned. The whole world is yours.");box.append(sub);finFade(sub,1000);
    const chips=el("div",{class:"fchips"},el("b",{},`${playable.length} countries painted`),el("b",{},`${playable.filter(f=>jrLevel(f.id)===3).length} mastered`),el("b",{},`${ACH.filter(a=>S.ach[a.id]).length} of ${ACH.length} stamps`));box.append(chips);finFade(chips,1700);
  });
  // the fireworks: a volley every beat, each with a whoosh going up, a crackle and a note of the key; chords underneath go D, A, Bm, G
  const prog=[FIN_D,FIN_A,FIN_BM,FIN_G];
  for(let i=0;i<20;i++){
    const ms=2200+i*620;
    at(ms,()=>{
      const x=w*(.12+Math.random()*.76),y=h*(.14+Math.random()*.42),cols=Math.random()<.5?FINCOL:[FINCOL[Math.floor(Math.random()*6)],"#FFF3C4","#F2D27A"];
      finSnd(t=>{noise(t,.38,{type:"bandpass",f0:500,f1:2800,q:1.1,vol:.016,attack:.3,wet:.4});crackle(t+.4,.2,.02);bell(dn(Math.floor(Math.random()*9))*2,t+.4,.02,2.2,.7)});
      setTimeout(()=>finBurst(R_,x,y,70+Math.floor(Math.random()*40),{cols,pow:1.1+Math.random()*.4}),reduced?0:400);
    });
    if(i%3===0)at(ms,()=>finSnd(t=>finChord(t,prog[(i/3)%4],.04)));
  }
  finEnd(R_,9200);
}

/* ---------- when they play ---------- */
let finTimer=null;
const finPlayers={paint:finPaint,stamps:finStamps,full:finFull};
function finQuiet(){
  const m=document.getElementById("modal");
  return !finRun&&typeof introState!=="undefined"&&introState==="done"&&!(m&&m.classList.contains("on"))&&!rdWin&&!raceBusy()&&!SESS;
}
function finWhenQuiet(kind,tries=0){
  clearTimeout(finTimer);
  finTimer=setTimeout(()=>{if(finQuiet()){finPlayers[kind]();return}if(tries<40)finWhenQuiet(kind,tries+1)},tries?2000:2600);
}
function finCheck(){
  const allPaint=playable.length>0&&S.found.size>=playable.length,
    allStamps=ACH.every(a=>S.ach[a.id]),
    full=allPaint&&allStamps&&playable.every(f=>jrLevel(f.id)===3),
    now={paint:allPaint,stamps:allStamps,full};
  let best=null;
  ["paint","stamps","full"].forEach(k=>{if(now[k]&&!S.expDone[FIN_FLAG[k]]){S.expDone[FIN_FLAG[k]]=Date.now();best=k}});
  if(best){save();finWhenQuiet(best)}
}
function finReplay(kind){closeModal();setTimeout(()=>{if(!finRun)finPlayers[kind]()},350)}
