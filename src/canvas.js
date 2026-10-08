/* ======================================================================
   CANVAS GLOBE: the land is drawn straight onto a canvas each frame (no per-frame DOM/SVG work).
   Pills, labels and the bloom animation stay in the svg above it.
   ====================================================================== */
const cv=document.getElementById("gcanvas"),cctx=cv.getContext?cv.getContext("2d"):null;
if(!cctx)CANVAS=false;
const pcPath=d3.geoPath(projection,cctx),pcC=d3.geoPath(projC,cctx);
let cvHL=null,hlTimer=null,nmOn=false,nmMiss=0;
let cvDpr=1,cvPA=1,cvHover=null,cvQ=1,cvLastT=0,cvAvg=16,cvN=0;
const CV={},cvMissed=new Set(),cvFades=new Map();
let cvKey=null;
function cvColors(){
  const cs=getComputedStyle(document.documentElement),g=n=>cs.getPropertyValue(n).trim();
  CV.seaIn=g("--sea-in");CV.seaMid=g("--sea-mid");CV.seaOut=g("--sea-out");CV.land=g("--land");CV.border=g("--border");CV.grat=g("--grat");CV.edge=g("--edge");CV.miss=g("--miss");
  CV.p={};CV.pd={};CV.tint={};
  REGIONS.forEach(r=>{CV.p[r]=g("--c-"+r);CV.pd[r]=g("--c-"+r+"-d");CV.tint[r]=d3.interpolateRgb(CV.land,CV.p[r])(.4)});
  CV.tintEA=d3.interpolateRgb(CV.land,d3.interpolateRgb(CV.p.Europe,CV.p.Asia)(.5))(.4);
  CV.nopl=d3.interpolateRgb(CV.land,CV.seaIn)(.16);CV.hover=d3.interpolateRgb(CV.land,"#8a7b5a")(.08);
  const ck=`${isDark()}|${S.mode==="speed"}|${S.mode==="wander"}|${nbNow()}`;   // the heavy parts (land bake, paper and book tiles) only change with these
  if(ck!==cvKey){cvKey=ck;if(GLX.colors)GLX.colors();makePaperBg();makeBookTiles()}
  benchSoon();
}
/* the paper: a single small tile of fibre specks and soft mottling, built once per theme and used as the body background (static: it never costs a frame) */
const benchEl=document.getElementById("bench"),benchCtx=benchEl.getContext("2d");let benchTm=0;
function benchSoon(){if(benchTm)return;benchTm=setTimeout(()=>{benchTm=0;benchDraw()},90)}
/* the night bench: in the dark theme the margins become a night sky. A faint milky way, scattered stars, a crescent moon, and one star for every country you have found,
   in its region's colour, joined to its neighbours by thin constellation lines (drawn once, never per frame) */
function benchNight(c,w,h,gx,gy,R0){
  let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const spark=(x,y,r,a,col)=>{c.fillStyle=col||`rgba(225,232,255,${a})`;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill()};
  // milky way: a wide soft diagonal band
  c.save();c.translate(w*.5,h*.5);c.rotate(-.5);
  for(let i=-6;i<=6;i++){const x=i*w*.11,g=c.createRadialGradient(x,0,0,x,0,h*.34);g.addColorStop(0,"rgba(150,165,235,.05)");g.addColorStop(.5,"rgba(130,120,210,.025)");g.addColorStop(1,"rgba(120,120,200,0)");c.fillStyle=g;c.fillRect(x-h*.4,-h*.4,h*.8,h*.8)}
  c.restore();
  // soft coloured clouds, one tint per continent you have found something in
  const seen={};[...S.found].forEach(id=>{const f=FACTS[id];if(f)seen[f.r]=(seen[f.r]||0)+1});
  Object.keys(seen).forEach((r,i)=>{const col=d3.color(CV.p[r]);if(!col)return;const a=seeded("neb-"+r),x=(.12+a()*.76)*w,y=(.1+a()*.8)*h,rad=Math.min(w,h)*(.22+Math.min(.18,seen[r]/180)),g=c.createRadialGradient(x,y,0,x,y,rad);
    g.addColorStop(0,col.copy({opacity:.04}).formatRgb());g.addColorStop(1,col.copy({opacity:0}).formatRgb());c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2)});
  // scattered stars
  for(let i=0;i<Math.round(w*h/11000);i++){const x=rnd()*w,y=rnd()*h,b=rnd();c.fillStyle=`rgba(${b>.8?"255,236,205":"215,225,255"},${.12+b*.4})`;c.beginPath();c.arc(x,y,.35+b*.9,0,6.2832);c.fill();if(b>.985)spark(x,y,3+b*1.5,.35)}
  // crescent moon and a shooting star
  c.fillStyle="rgba(255,240,205,.22)";c.beginPath();c.arc(w*.9,h*.13,13,0,6.2832);c.arc(w*.9+6,h*.13-4,12,0,6.2832,true);c.fill("evenodd");
  {const x=w*.16,y=h*.2,g=c.createLinearGradient(x,y,x+90,y+34);g.addColorStop(0,"rgba(235,240,255,.55)");g.addColorStop(1,"rgba(235,240,255,0)");c.strokeStyle=g;c.lineWidth=1.3;c.lineCap="round";c.beginPath();c.moveTo(x,y);c.lineTo(x+90,y+34);c.stroke();spark(x,y,4.5,.75)}
  // one star per found country, joined by thin lines
  const pts=[];
  [...S.found].forEach(id=>{
    const f=FACTS[id];if(!f)return;const r=seeded("bench-"+id),col=d3.color(CV.p[f.r]);if(!col)return;
    for(let t=0;t<14;t++){
      const ang=r()*6.2832,dist=R0*(1.1+r()*1.4),px=gx+Math.cos(ang)*dist,py=gy+Math.sin(ang)*dist,sz=1.3+r()*1.9;
      if(px<12||px>w-12||py<12||py>h-12)continue;
      pts.push({x:px,y:py,col,sz});break}
  });
  c.lineWidth=.7;
  pts.forEach((p,i)=>{let n=0;for(let j=i-1;j>=0&&n<2;j--){const q=pts[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<150){c.strokeStyle=`rgba(200,214,255,${.06-d/3600})`;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();n++}}});
  pts.forEach(p=>{
    const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,p.sz*3);g.addColorStop(0,p.col.copy({opacity:.13}).formatRgb());g.addColorStop(1,p.col.copy({opacity:0}).formatRgb());c.fillStyle=g;c.fillRect(p.x-p.sz*3,p.y-p.sz*3,p.sz*6,p.sz*6);
    c.fillStyle=p.col.copy({opacity:.8}).formatRgb();c.beginPath();c.arc(p.x,p.y,p.sz*.45,0,6.2832);c.fill()});
}
/* the cartographer's bench: faint pencil arcs, a ruler edge, brush tests and a cup ring, plus a splatter of colour in the margins for every country you have found (drawn once, never per frame) */
function benchDraw(){
  const dpr=Math.min(1.25,window.devicePixelRatio||1),w=innerWidth,h=innerHeight;
  if(benchEl.width!==Math.round(w*dpr)||benchEl.height!==Math.round(h*dpr)){benchEl.width=Math.round(w*dpr);benchEl.height=Math.round(h*dpr)}
  const c=benchCtx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  if(S.mode==="speed"||!CV.p)return;
  const dark=isDark(),gx=stageLeft+W/2,gy=stageTop+cy(),R0=baseScale*1.07,ink=dark?"235,225,205":"90,70,45";
  if(dark){benchNight(c,w,h,gx,gy,R0);return}
  c.lineCap="round";c.lineWidth=1;
  c.strokeStyle=`rgba(${ink},${dark?.07:.09})`;
  for(const k of[1.32,1.62]){c.beginPath();c.arc(gx,gy,R0*k,Math.PI*.1,Math.PI*.9);c.stroke();c.beginPath();c.arc(gx,gy,R0*k,Math.PI*1.1,Math.PI*1.9);c.stroke()}
  c.beginPath();c.moveTo(0,gy);c.lineTo(w,gy);c.moveTo(gx,0);c.lineTo(gx,h);c.stroke();
  c.strokeStyle=`rgba(${ink},${dark?.12:.15})`;   // ruler edge down the left side
  for(let y=70;y<h-70;y+=10){c.beginPath();c.moveTo(0,y);c.lineTo(y%50===0?12:6,y);c.stroke()}
  const tests=[["Africa",.1],["Europe",.2],["Asia",.3]];   // brush tests
  tests.forEach(([r,o],i)=>{c.strokeStyle=d3.color(CV.p[r]).copy({opacity:dark?.28:.32}).formatRgb();c.lineWidth=7-i;c.beginPath();const bx=w-130,by=h*.62+i*16;c.moveTo(bx,by);c.bezierCurveTo(bx+30,by-8,bx+60,by+8,bx+100-i*14,by-2);c.stroke()});
  c.lineWidth=2.5;c.strokeStyle=`rgba(${dark?"200,170,120":"120,80,40"},${dark?.06:.08})`;   // a cup ring
  c.beginPath();c.arc(w*.09,h*.82,44,.2,5.9);c.stroke();c.lineWidth=1.2;c.beginPath();c.arc(w*.09+2,h*.82+1,45,.4,5.5);c.stroke();
  [...S.found].forEach(id=>{
    const f=FACTS[id];if(!f)return;const r=seeded("bench-"+id),col=d3.color(CV.p[f.r]);if(!col)return;
    for(let t=0;t<14;t++){
      const ang=r()*6.2832,dist=R0*(1.1+r()*1.4),px=gx+Math.cos(ang)*dist,py=gy+Math.sin(ang)*dist,sz=6+r()*9;
      if(px<sz+4||px>w-sz-4||py<sz+4||py>h-sz-4)continue;
      c.fillStyle=col.copy({opacity:dark?.5:.44}).formatRgb();c.beginPath();
      for(let k=0;k<5;k++){const ox=px+(r()-.5)*sz*.9,oy=py+(r()-.5)*sz*.9,rr=sz*(.32+r()*.42);c.moveTo(ox+rr,oy);c.arc(ox,oy,rr,0,6.2832)}c.fill();
      c.fillStyle=col.copy({opacity:dark?.4:.34}).formatRgb();c.beginPath();
      for(let k=0;k<6;k++){const a2=r()*6.2832,d2=sz*(1.1+r()*1.2),rr=.8+r()*1.9;c.moveTo(px+Math.cos(a2)*d2+rr,py+Math.sin(a2)*d2);c.arc(px+Math.cos(a2)*d2,py+Math.sin(a2)*d2,rr,0,6.2832)}c.fill();
      break}
  });
}
/* the journal's own materials, baked once per theme: pebbled leather for the cover, toothy paper for the pages */
function makeBookTiles(){
  const dark=isDark(),mk=N=>{const c=document.createElement("canvas");c.width=c.height=N;return c},st=document.documentElement.style;
  let seed=29;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  {const N=160,c=mk(N),x=c.getContext("2d");
    for(let i=0;i<1500;i++){const px=rnd()*N,py=rnd()*N,r=.7+rnd()*1.6;
      x.fillStyle=`rgba(25,12,0,${.06+rnd()*.1})`;x.beginPath();x.arc(px,py,r,0,6.2832);x.fill();
      x.fillStyle=`rgba(255,226,180,${.04+rnd()*.07})`;x.beginPath();x.arc(px-.8,py-.8,r*.55,0,6.2832);x.fill()}
    x.lineCap="round";for(let i=0;i<16;i++){const px=rnd()*N,py=rnd()*N,a=rnd()*6.28,l=5+rnd()*14;x.strokeStyle=`rgba(255,226,180,${.05+rnd()*.06})`;x.lineWidth=.7;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
    st.setProperty("--leather-img",`url(${c.toDataURL("image/png")})`)}
  {const N=128,c=mk(N),x=c.getContext("2d"),ink=dark?"235,225,205":"110,85,50";
    for(let i=0;i<5;i++){const px=rnd()*N,py=rnd()*N,r=34+rnd()*40,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,`rgba(${ink},${dark?.03:.045})`);g.addColorStop(1,`rgba(${ink},0)`);x.fillStyle=g;
      for(const ox of[-N,0,N])for(const oy of[-N,0,N]){x.save();x.translate(ox,oy);x.fillRect(px-r,py-r,r*2,r*2);x.restore()}}
    for(let i=0;i<520;i++){x.fillStyle=`rgba(${ink},${(dark?.05:.07)+rnd()*.07})`;x.fillRect(Math.floor(rnd()*N),Math.floor(rnd()*N),1+(rnd()<.2?1:0),1)}
    x.lineWidth=.6;for(let i=0;i<30;i++){const px=rnd()*N,py=rnd()*N,a=rnd()*6.28,l=3+rnd()*7;x.strokeStyle=`rgba(${ink},${dark?.05:.07})`;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
    st.setProperty("--page-img",`url(${c.toDataURL("image/png")})`)}
}
/* signs of life on the pages: a coffee ring, an ink blot, a thumb smudge, pencil marks (drawn once when the book opens) */
function drawBookMarks(cv,tab){
  const bp=cv&&cv.parentElement;if(!bp)return;
  const w=bp.clientWidth,h=bp.clientHeight,dpr=Math.min(1.5,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);const c=cv.getContext("2d");c.scale(dpr,dpr);
  if(bp.scrollHeight>bp.clientHeight+1)return;   // marks only on pages that do not scroll
  const dark=isDark(),ink=dark?"235,225,205":"90,70,45",br=bp.getBoundingClientRect();
  const blot=(x,y,s)=>{let sd=Math.round(x*7+y*3);const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
    c.fillStyle=dark?"rgba(150,175,230,.36)":"rgba(28,32,70,.38)";c.beginPath();
    for(let k=0;k<6;k++){const ox=x+(r()-.5)*10*s,oy=y+(r()-.5)*10*s,rr=(3+r()*5)*s;c.moveTo(ox+rr,oy);c.arc(ox,oy,rr,0,6.28)}c.fill();
    c.beginPath();for(let k=0;k<9;k++){const a=r()*6.28,d=(11+r()*20)*s,rr=.6+r()*1.7;c.moveTo(x+Math.cos(a)*d+rr,y+Math.sin(a)*d);c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,rr,0,6.28)}c.fill()};
  const smudge=(x,y)=>{const g=c.createRadialGradient(x,y,2,x,y,70);g.addColorStop(0,`rgba(${ink},.08)`);g.addColorStop(1,`rgba(${ink},0)`);
    c.save();c.translate(x,y);c.rotate(-.5);c.scale(1.5,.8);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-80,y-80,160,160);c.restore()};
  const pencil=()=>{c.strokeStyle=`rgba(${ink},${dark?.18:.22})`;c.lineWidth=1;c.lineCap="round";c.setLineDash([])};
  const star=(x,y)=>{pencil();for(let k=0;k<4;k++){const a=k*Math.PI/4;c.beginPath();c.moveTo(x-Math.cos(a)*7,y-Math.sin(a)*7);c.lineTo(x+Math.cos(a)*7,y+Math.sin(a)*7);c.stroke()}};
  const tick=(x,y,l)=>{pencil();c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+l*.2,y-4,x+l*.45,y+4,x+l*.7,y-1);c.bezierCurveTo(x+l*.8,y-3,x+l*.9,y,x+l,y-2);c.stroke()};
  const route=(x,y,l)=>{pencil();c.setLineDash([4,5]);c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+l*.3,y-26,x+l*.55,y+22,x+l,y-8);c.stroke();c.setLineDash([]);
    c.beginPath();c.moveTo(x+l-5,y-13);c.lineTo(x+l+5,y-3);c.moveTo(x+l+5,y-13);c.lineTo(x+l-5,y-3);c.stroke();c.beginPath();c.arc(x,y,3,0,6.28);c.stroke()};
  const compass=(x,y)=>{pencil();c.beginPath();c.arc(x,y,16,.4,2.9);c.stroke();c.beginPath();c.arc(x,y,16,3.5,5.9);c.stroke();c.beginPath();c.arc(x,y,2,0,6.28);c.stroke();c.beginPath();c.moveTo(x,y-22);c.lineTo(x,y-10);c.moveTo(x,y+10);c.lineTo(x,y+22);c.stroke()};
  const dots=(x,y)=>{pencil();for(let k=0;k<5;k++){c.beginPath();c.arc(x+k*9,y+Math.sin(k*1.7)*3,1,0,6.28);c.stroke()}};
  /* at night the pages carry star-gazer doodles instead: constellations, a crescent moon, a shooting star and candle glow */
  const nl="rgba(215,226,255,",sp=(x,y,r,a)=>{c.fillStyle=nl+a+")";c.strokeStyle=nl+a+")";c.lineWidth=.8;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill()};
  const consts=(x,y,seed)=>{let sd=seed;const r=()=>(sd=(sd*16807)%2147483647)/2147483647,pts=[];for(let k=0;k<6;k++)pts.push([x+k*17+r()*8,y+(r()-.5)*34]);
    c.strokeStyle=nl+".2)";c.lineWidth=.8;c.setLineDash([]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
    pts.forEach((p,i)=>{c.fillStyle=nl+".7)";c.beginPath();c.arc(p[0],p[1],i%3===0?1.8:1.1,0,6.28);c.fill();if(i%3===0)sp(p[0],p[1],6,.45)})};
  const moon=(x,y)=>{c.fillStyle="rgba(255,240,200,.34)";c.beginPath();c.arc(x,y,11,0,6.28);c.arc(x+5,y-3,10,0,6.28,true);c.fill("evenodd");sp(x+20,y-10,4,.5);sp(x+28,y+6,3,.4);sp(x-14,y+12,3,.35)};
  const shoot=(x,y,l)=>{const g=c.createLinearGradient(x,y,x+l,y+l*.38);g.addColorStop(0,nl+".7)");g.addColorStop(1,nl+"0)");c.strokeStyle=g;c.lineWidth=1.4;c.lineCap="round";c.beginPath();c.moveTo(x,y);c.lineTo(x+l,y+l*.38);c.stroke();sp(x,y,5,.8)};
  const glow=(x,y)=>{const g=c.createRadialGradient(x,y,2,x,y,70);g.addColorStop(0,"rgba(255,190,110,.09)");g.addColorStop(1,"rgba(255,190,110,0)");c.fillStyle=g;c.fillRect(x-80,y-80,160,160)};
  const SETS=(dark?{atlas:{l:["const"],r:["moon"]},stamps:{l:["shoot","dots"],r:["glow","const"]},exp:{l:["moon","const"],r:["shoot","dots"]}}:{atlas:{l:["star","tick"],r:["route"]},stamps:{l:["blot","tick"],r:["smudge","compass"]},exp:{l:["route","blot"],r:["star","dots"]}})[tab]||{l:[],r:[]};
  [["l",bp.querySelector(".bkpage.l")],["r",bp.querySelector(".bkpage.r")]].forEach(([side,pg])=>{
    if(!pg||pg.scrollHeight>pg.clientHeight+1)return;
    const r=pg.getBoundingClientRect(),x0=r.left-br.left,y0=r.top-br.top,pw=r.width,ph=r.height;
    (SETS[side]||[]).forEach(m=>{
      if(m==="blot")blot(x0+pw-52,y0+ph-34,1);
      else if(m==="smudge")smudge(x0+pw*.78,y0+ph-18);
      else if(m==="star")star(x0+pw-46,y0+ph-22);
      else if(m==="tick")tick(x0+34,y0+ph-14,70);
      else if(m==="route")route(x0+36,y0+ph-26,Math.min(130,pw*.4));
      else if(m==="compass")compass(x0+44,y0+ph-30);
      else if(m==="dots")dots(x0+pw*.45,y0+ph-14);
      else if(m==="const")consts(x0+pw*.18,y0+ph-34,Math.round(x0+y0+17));
      else if(m==="moon")moon(x0+pw-60,y0+ph-34);
      else if(m==="shoot")shoot(x0+pw*.5,y0+ph-46,90);
      else if(m==="glow")glow(x0+pw*.78,y0+ph-22);
    });
  });
}function makePaperBg(){   // the page background: a fine per-pixel grain (the globe has its own, coarser, paper grain wrapped around it)
  const dark=isDark()||S.mode==="speed",N=Math.round(128*Math.min(2,window.devicePixelRatio||1)),c=document.createElement("canvas");c.width=c.height=N;const x=c.getContext("2d"),im=x.createImageData(N,N),d=im.data;
  let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<N*N;i++){const r=rnd(),lit=r>.5,a=(lit?rnd():rnd())*(dark?.09:.14);
    d[i*4]=lit?(dark?255:255):(dark?0:70);d[i*4+1]=lit?(dark?250:248):(dark?0:55);d[i*4+2]=lit?(dark?235:225):(dark?0:35);d[i*4+3]=Math.round(a*255)}
  x.putImageData(im,0,0);
  document.documentElement.style.setProperty("--paper-img",`url(${c.toDataURL("image/png")})`);
}
function cvResize(){
  cvDpr=Math.max(1,Math.min(1.5,window.devicePixelRatio||1)*cvQ);
  const w=innerWidth,h=innerHeight;
  const nw=Math.round(w*cvDpr),nh=Math.round(h*cvDpr),same=cv.width===nw&&cv.height===nh;
  if(GLX.resize)GLX.resize();
  benchSoon();
  if(!same)cv.width=nw,cv.height=nh;   // changing a canvas size wipes it: only do it when the size really changed
  cv.style.width=w+"px";cv.style.height=h+"px";cv.style.top=(-stageTop)+"px";cv.style.left=(-stageLeft)+"px";
  if(!same&&!cvResize.busy&&typeof renderNow==="function"){cvResize.busy=true;try{renderNow()}finally{cvResize.busy=false}}   // redraw in the same task so the cleared frame is never shown
}
function cvMiss(id,on){
  if(id==null){if(cvMissed.size){cvMissed.clear();if(CANVAS)requestRender()}return}
  if(on)cvMissed.add(id);else cvMissed.delete(id);
  if(CANVAS)requestRender();
}
let cvPAtok=0;
function cvTweenPA(to,ms,done){   // the painted layer's opacity; a newer call always takes over from an older one and finishes at its own target
  const from=cvPA,tok=++cvPAtok;
  if(reduced||!ms){cvPA=to;requestRender();if(done)done();return}
  const t0=performance.now(),tm=d3.timer(()=>{
    if(tok!==cvPAtok){tm.stop();return}
    const k=Math.min(1,(performance.now()-t0)/ms);cvPA=from+(to-from)*d3.easeCubicInOut(k);render();
    if(k>=1){tm.stop();cvPA=to;render();if(done)done()}
  });
}
function cvFadeIn(id){
  if(GLX.on){GLX.fade(id);return}
  cvFades.set(id,performance.now());
  if(cvFades.size===1){const tick=()=>{render();if(cvFades.size)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
}
const cvPats={},projU=d3.geoOrthographic().clipAngle(null);   // projU: like projection but never clips, so a country whose centre is just over the horizon still has an anchor
let cvBuild=3,cvPending=false;
function cvExt(f){
  let e=f._ext;if(e!=null)return e;
  const b=d3.geoBounds(f);let w=b[1][0]-b[0][0];if(w<0)w+=360;
  const h=b[1][1]-b[0][1],lat=(b[0][1]+b[1][1])/2*Math.PI/180;
  return f._ext=Math.max(w*Math.PI/180*Math.max(.3,Math.cos(lat)),h*Math.PI/180);
}
function cvPattern(id,shown){
  const key=artKey(id),k2=key+(shown?"w":"f");let p=cvPats[k2];
  if(p)return p;if(p===false)return null;
  if(!artCv[key]){if(cvBuild<=0){cvPending=true;return null}cvBuild--;ensureArt(id)}
  const sp=artSpecs[key];if(!sp)return null;
  const tile=shown?(artWcv[key]||(artWcv[key]=artCanvas(sp,false,true))):artCv[key];
  p=cctx.createPattern(tile,"repeat");
  if(!p||!p.setTransform){cvPats[k2]=false;return null}
  p.__N=sp.N;cvPats[k2]=p;return p;
}
/* a country''s outline draws itself just before its wash blooms in */
/* the capital of the country whose page is open: a small gold star with its name beside it */
const CAPM={id:null,ll:null,t0:0};
function capMarkSet(id){
  const c=id&&typeof CAPLL!=="undefined"?CAPLL[id]:null;
  if(!c){if(CAPM.id){CAPM.id=null;requestRender()}return}
  CAPM.id=id;CAPM.ll=[c[1],c[0]];CAPM.t0=performance.now();
  const tick=()=>{requestRender();if(CAPM.id&&performance.now()-CAPM.t0<800)requestAnimationFrame(tick)};requestAnimationFrame(tick);
}
function capDraw(c,s){
  if(!CAPM.id)return;
  const r=projection.rotate(),cen=[-r[0],-r[1]];if(d3.geoDistance(CAPM.ll,cen)>1.45)return;
  const p=projection(CAPM.ll);if(!p)return;
  const k=Math.min(1,(performance.now()-CAPM.t0)/550),e=1-Math.pow(1-k,3),name=FACTS[CAPM.id].cap;
  c.save();c.globalAlpha=e;c.translate(p[0],p[1]);
  c.beginPath();c.arc(0,0,9+10*(1-e),0,6.2832);c.lineWidth=1.6;c.strokeStyle="rgba(58,47,38,.55)";c.stroke();
  c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?3.1:6.6;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}c.closePath();
  c.fillStyle="#F2C14E";c.fill();c.lineWidth=1.1;c.strokeStyle="rgba(58,47,38,.9)";c.stroke();
  const left=p[0]>W-170,tx=left?-15:15;c.textAlign=left?"right":"left";c.textBaseline="middle";c.lineJoin="round";
  c.font="italic 600 15px Newsreader,Georgia,serif";c.lineWidth=4;c.strokeStyle="rgba(255,250,236,.92)";c.strokeText(name,tx,-5);c.fillStyle="#3a2f26";c.fillText(name,tx,-5);
  c.font="600 9.5px Figtree,system-ui,sans-serif";c.lineWidth=3;c.strokeStyle="rgba(255,250,236,.92)";c.strokeText("CAPITAL",tx,8);c.fillStyle="rgba(58,47,38,.75)";c.fillText("CAPITAL",tx,8);
  c.restore();
}
const BLOOMOUT=new Map();
function bloomOutline(id,ms){
  BLOOMOUT.set(id,{t0:performance.now(),ms});
  const tick=()=>{const n=performance.now();BLOOMOUT.forEach((o,k)=>{if(n-o.t0>o.ms)BLOOMOUT.delete(k)});requestRender();if(BLOOMOUT.size)requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
}
function outDraw(c,s,cen0,lim,lvl){
  if(!BLOOMOUT.size)return;const n=performance.now();
  BLOOMOUT.forEach((o,id)=>{
    const f=byId[id];if(!f)return;const g=lvl===2?f:lvl===1?(f._mid||f._lo):f._lo;if(!g)return;
    const k=Math.min(1,(n-o.t0)/o.ms),a=Math.min(1,k/.35)*(1-Math.max(0,(k-.55)/.45));
    c.save();c.beginPath();drawFeatureCtx(g,cen0,lim);c.lineJoin="round";c.lineWidth=2.4;c.globalAlpha=Math.max(0,a);c.strokeStyle=(CV.pd&&CV.pd[FACTS[id].r])||"#5b4a3a";c.stroke();c.restore();
  });
}
/* hot and cold: a soft halo around the globe in the colour of the latest guess */
const HALO={col:null,t0:0};
function hotHaloSet(col){
  HALO.col=col;HALO.t0=performance.now();
  if(!col)return;
  const tick=()=>{requestRender();if(performance.now()-HALO.t0<700)requestAnimationFrame(tick)};requestAnimationFrame(tick);
}
function haloDraw(c,s){
  if(S.mode!=="hot"||!HALO.col||!d3.color(HALO.col))return;
  const k=Math.min(1,(performance.now()-HALO.t0)/600),e=1-Math.pow(1-k,3),cx=W/2,cy0=cy(),col=d3.color(HALO.col);
  const g=c.createRadialGradient(cx,cy0,s*.8,cx,cy0,s*1.14);
  g.addColorStop(0,col.copy({opacity:0}).formatRgb());g.addColorStop(.6,col.copy({opacity:.36*e}).formatRgb());g.addColorStop(1,col.copy({opacity:0}).formatRgb());
  c.save();c.fillStyle=g;c.beginPath();c.arc(cx,cy0,s*1.14,0,6.2832);c.fill();c.restore();
}
/* GPU globe: the thin 2D canvas above it only carries the hover / wrong-guess tints */
function drawOverlay(s,cen0,lim,lvl){
  const c=cctx,dpr=cvDpr;
  c.setTransform(dpr,0,0,dpr,stageLeft*dpr,stageTop*dpr);c.clearRect(-stageLeft,-stageTop,innerWidth,innerHeight);
  haloDraw(c,s);capDraw(c,s);
  if(!cvMissed.size&&!HC.size&&cvHover==null&&cvHL==null&&!BLOOMOUT.size)return;
  c.lineWidth=.5;c.strokeStyle=nbNow()?"rgba(0,0,0,0)":CV.border;
  const one=(id,col)=>{const f=byId[id];if(!f)return;const g=lvl===2?f:lvl===1?(f._mid||f._lo):f._lo;if(!g)return;c.beginPath();drawFeatureCtx(g,cen0,lim);c.fillStyle=col;c.fill();c.stroke()};
  HC.forEach((col,id)=>one(id,col));hcDots(c,s);
  cvMissed.forEach(id=>one(id,CV.miss));
  if(cvHover!=null&&!cvMissed.has(cvHover)&&!HC.has(cvHover))one(cvHover,CV.hover);
  hlDraw(c,s,cen0,lim,lvl);outDraw(c,s,cen0,lim,lvl);
}
/* hot and cold: a guessed country too small to see gets a coloured dot, so a guess like Tonga is never invisible */
function hcDots(c,s){
  if(!HC.size)return;const r=projection.rotate(),cen=[-r[0],-r[1]];
  HC.forEach((col,id)=>{
    const px=2*Math.sqrt(FACTS[id].a/Math.PI)/6371*s;if(px>=24)return;
    const ll=LL(id);if(d3.geoDistance(ll,cen)>1.5)return;const p=projection(ll);if(!p)return;
    c.save();c.beginPath();c.arc(p[0],p[1],10,0,6.2832);c.fillStyle=col;c.fill();c.lineWidth=2.4;c.strokeStyle="rgba(255,255,255,.92)";c.stroke();c.restore();
  });
}
/* the country a "Name it" round asks about: a soft pulsing glow, plus a ring when it is only a few pixels wide */
function hlDraw(c,s,cen0,lim,lvl){
  if(cvHL==null)return;const f=byId[cvHL];if(!f)return;
  const g=lvl===2?f:lvl===1?(f._mid||f._lo):f._lo;if(!g)return;
  const pu=reduced?1:1+Math.sin(performance.now()/260),col=d3.color(MODE_ACC[S.mode]||"#E06F58");
  c.save();c.beginPath();drawFeatureCtx(g,cen0,lim);c.fillStyle=col.copy({opacity:.26+.14*pu}).formatRgb();c.fill();
  c.lineWidth=2.2;c.strokeStyle=col.copy({opacity:.95}).formatRgb();c.stroke();
  const pp=projection(LL(cvHL)),px=2*Math.sqrt(FACTS[cvHL].a/Math.PI)/6371*s;
  if(pp&&px<26){c.beginPath();c.arc(pp[0],pp[1],15+3*pu,0,6.2832);c.lineWidth=2.6;c.strokeStyle=col.copy({opacity:.9}).formatRgb();c.stroke()}
  c.restore();
}
function hlSet(id){
  cvHL=id;clearInterval(hlTimer);hlTimer=null;
  if(id!=null&&!reduced)hlTimer=setInterval(()=>{if(cvHL!=null&&!document.hidden)requestRender()},60);
  requestRender();
}
function drawFeatureCtx(g,cen,lim){
  if(g.geometry.type!=="MultiPolygon"||g.geometry.coordinates.length<5||!FX.cull||!cen){pcC(g);return}
  const parts=g._pp||(g._pp=makeParts(g));
  for(let i=0;i<parts.length;i++){const p=parts[i];if(p.r>=2.5||d3.geoDistance(p.c,cen)-p.r<lim)pcC(p.f)}
}
function drawCanvas(s,cen0,lim,lvl){
  const c=cctx,dpr=cvDpr,now=performance.now(),cxs=W/2,cys=cy();
  c.setTransform(dpr,0,0,dpr,stageLeft*dpr,stageTop*dpr);c.clearRect(-stageLeft,-stageTop,innerWidth,innerHeight);
  // sea
  c.beginPath();pcPath({type:"Sphere"});
  const gx=cxs-s+.84*s,gy=cys-s+.72*s,gr=c.createRadialGradient(gx,gy,0,gx,gy,1.44*s);
  gr.addColorStop(0,CV.seaIn);gr.addColorStop(.7,CV.seaMid);gr.addColorStop(1,CV.seaOut);
  c.fillStyle=gr;c.fill();
  // graticule
  c.beginPath();pcPath(graticule);c.strokeStyle=CV.grat;c.lineWidth=.4;c.stroke();
  // land: unpainted shapes are batched by colour, painted ones drawn one by one
  const F=cf(),speed=S.mode==="speed",expl=S.mode==="wander",buckets=new Map(),special=[],painted=[];
  cvBuild=3;projU.rotate(projection.rotate()).scale(s).translate([cxs,cys]);
  for(let i=0;i<features.length;i++){
    const f=features[i];
    if(FX.cull&&cen0&&f._c&&!(d3.geoDistance(f._c,cen0)-f._r<lim))continue;
    const g=lvl===2?f:lvl===1?(f._mid||f._lo):f._lo;if(!g)continue;
    const fa=FACTS[f.id];
    if(fa){
      const found=F.has(f.id),shown=!speed&&!SESS&&S.mode!=="hot"&&!found&&S.shown.has(f.id);
      if(found||shown){painted.push([g,fa,shown,f.id,f]);continue}
      if(HC.has(f.id)){special.push([g,HC.get(f.id)]);continue}
      if(cvMissed.has(f.id)){special.push([g,CV.miss]);continue}
      if(cvHover===f.id){special.push([g,CV.hover]);continue}
    }
    const key=!fa?"nopl":expl?(fa.x?"EA":fa.r):"land";
    let b=buckets.get(key);if(!b){b=[];buckets.set(key,b)}b.push(g);
  }
  c.lineWidth=.5;c.strokeStyle=nbNow()?"rgba(0,0,0,0)":CV.border;
  buckets.forEach((list,key)=>{
    c.beginPath();for(let i=0;i<list.length;i++)drawFeatureCtx(list[i],cen0,lim);
    c.fillStyle=key==="land"?CV.land:key==="nopl"?CV.nopl:key==="EA"?CV.tintEA:CV.tint[key];c.fill();c.stroke();
  });
  special.forEach(([g,col])=>{c.beginPath();drawFeatureCtx(g,cen0,lim);c.fillStyle=col;c.fill();c.stroke()});
  painted.forEach(([g,fa,shown,id,f])=>{
    let a=cvPA;const t=cvFades.get(id);
    if(t!=null){const k=(now-t)/1100;if(k>=1)cvFades.delete(id);else a*=k<0?0:k*k*(3-2*k)}
    if(a<=0)return;
    c.beginPath();drawFeatureCtx(g,cen0,lim);
    let pat=null,big=false;
    if(FX.tiles){
      const S2=Math.max(20,Math.min(1.7*s,cvExt(f)*s*1.05));
      big=S2>=64;                          // a shape only a few dozen pixels wide shows no texture anyway: flat colour is identical and far cheaper
      if(big){
        pat=cvPattern(id,shown);
        if(pat){const pp=projU(f._c);if(pp){const k=S2/pat.__N;pat.setTransform(new DOMMatrix([k,0,0,k,pp[0]-S2/2,pp[1]-S2/2]))}else pat=null}
      }
    }
    c.globalAlpha=pat?(shown?a*.5:a*jit(id)):(shown?a*.4:(FX.tiles?a*.93:a));
    c.fillStyle=pat||CV.p[fa.r];c.fill();
    if(!shown&&big){c.lineWidth=3;c.globalAlpha=a*.14;c.strokeStyle=CV.pd[fa.r];c.stroke()}   // pooled pigment at the rim
    c.globalAlpha=shown?a*.25:a*.5;c.strokeStyle=CV.pd[fa.r];c.lineWidth=shown?.6:.8;c.stroke();
    c.globalAlpha=1;
  });
  hlDraw(c,s,cen0,lim,lvl);outDraw(c,s,cen0,lim,lvl);hcDots(c,s);haloDraw(c,s);capDraw(c,s);
  if(cvPending){cvPending=false;requestRender()}
}/* which country is under a point on the globe? (smallest containing shape wins, so enclaves like Lesotho work) */
function hitCountry(ll){
  let best=null;
  for(let i=0;i<features.length;i++){
    const f=features[i],c=f._c;if(!c||!isFinite(c[0]))continue;
    if(best&&f._r>=best._r)continue;
    if(d3.geoDistance(ll,c)>f._r+.01)continue;
    if(d3.geoContains(f,ll))best=f;
  }
  return best;
}

let W=0,H=0,baseScale=1,zoomK=1,stageTop=0,stageLeft=0,lodLvl=0;
function size(){
  const r=document.getElementById("stage").getBoundingClientRect();
  W=r.width;H=r.height;stageTop=r.top;stageLeft=r.left;
  const mobile=W<720;
  if(!mobile)document.getElementById("card").classList.remove("peek");
  promptBottom=Math.max(6,document.querySelector("header").getBoundingClientRect().bottom-r.top+4);
  const avail=H-promptBottom-8;
  baseScale=Math.max(110,Math.min(W*(mobile?.49:.45),H*.45));   // the same size in every mode
  svg.attr("viewBox",`0 0 ${W} ${H}`);
  if(CANVAS)cvResize();
  cyVal=layoutCy();

  {const wc=document.getElementById("wc");if(wc){wc.setAttribute("filterUnits","userSpaceOnUse");wc.setAttribute("x",-stageLeft-10);wc.setAttribute("y",-stageTop-10);wc.setAttribute("width",innerWidth+20);wc.setAttribute("height",innerHeight+20)}}   // bound the paint filter to the screen, however big the painted area gets
  render(true);
  if(US.on)usLayout();
}
let cyVal=0,promptBottom=0;
function layoutCy(){   // the globe sits dead centre of the stage in every mode, whatever floats over it
  return H/2;
}
function cy(){return cyVal}
function relayout(){
  const target=layoutCy();if(Math.abs(target-cyVal)<1)return;
  if(reduced||!cyVal){cyVal=target;render();return}
  const from=cyVal;d3.select("#stage").transition("cy").duration(600).ease(d3.easeCubicInOut).tween("cy",()=>t=>{cyVal=from+(target-from)*t;render()});
}
/* where to look after a find: small countries are centred, but a big one that is already (partly) on screen stays put,
   so tapping Russia in Europe mode doesn't drag the view away from Europe */
function onScreen(p,m=24){const q=projection(p),c=projection.invert([W/2,cy()]);return !!(q&&c&&d3.geoDistance(p,c)<1.45&&q[0]>m&&q[0]<W-m&&q[1]>promptBottom&&q[1]<H-m)}
function nearestVisiblePoint(feat){
  const c=projection.invert([W/2,cy()]);if(!c)return null;let best=null,bd=9;
  const walk=a=>{if(typeof a[0]==="number"){if(onScreen(a,8)){const d=d3.geoDistance(a,c);if(d<bd){bd=d;best=a}}}else a.forEach(walk)};
  walk(feat.geometry.coordinates);return best;
}
function focusFor(id,ll){
  const f=FACTS[id];
  if(f.a<350000)return {fly:LL(id),pt:ll||LL(id)};
  if(ll&&onScreen(ll))return {fly:null,pt:ll};
  const feat=byId[id],p=feat&&nearestVisiblePoint(feat);
  if(p)return {fly:null,pt:p};
  return {fly:LL(id),pt:LL(id)};
}
/* every caller may ask for a render; at most one actually runs per animation frame (the rest are folded into the next frame) */
let lastRenderStamp=-99,renderDeferred=false;
function render(force){
  const now=performance.now();
  if(!force&&!document.hidden&&now-lastRenderStamp<6){if(!renderDeferred){renderDeferred=true;requestAnimationFrame(()=>{renderDeferred=false;render()})}return}
  lastRenderStamp=now;renderNow();
}
/* big multi-part countries (Canada, Indonesia, Russia...) only project the parts that can be seen */
function makeParts(g){
  return g.geometry.coordinates.map(poly=>{
    const ft={type:"Feature",geometry:{type:"Polygon",coordinates:poly}},c=d3.geoCentroid(ft),b=d3.geoBounds(ft);let r=Math.PI;
    if(isFinite(c[0])&&isFinite(b[0][0])&&b[0][0]<=b[1][0])r=Math.max(...[[b[0][0],b[0][1]],[b[1][0],b[0][1]],[b[0][0],b[1][1]],[b[1][0],b[1][1]]].map(q=>d3.geoDistance(c,q)));
    return {f:ft,c,r};
  });
}
function drawFeature(g,cen,lim){
  if(g.geometry.type!=="MultiPolygon"||g.geometry.coordinates.length<5||!FX.cull||!cen)return pathC(g)||"";
  const parts=g._pp||(g._pp=makeParts(g));let out="";
  for(let i=0;i<parts.length;i++){const p=parts[i];if(p.r>=2.5||d3.geoDistance(p.c,cen)-p.r<lim)out+=pathC(p.f)||""}
  return out;
}
function renderNow(){
  const _pS=performance.now();
  const s=baseScale*zoomK;
  projection.scale(s).translate([W/2,cy()]);
  const skey=s+"|"+cy()+"|"+W;   // the globe outline only changes with size, never with rotation: no per-frame svg repaint while turning
  if(skey!==renderNow.sk){renderNow.sk=skey;const sp=path({type:"Sphere"});sphere.attr("d",sp);edge.attr("d",sp)}
  if(!CANVAS)grat.attr("d",path(graticule));
  const cen0=projection.invert([W/2,cy()]);
  projC.rotate(projection.rotate()).scale(s).translate([W/2,cy()]).clipExtent(FX.clip?[[-stageLeft-24,-stageTop-24],[innerWidth-stageLeft+24,innerHeight-stageTop+24]]:null);
  if(!animating){   // no geometry swaps in the middle of a fly-to; one full-quality render lands when it ends
    if(zoomK>=6)lodLvl=2;else if(zoomK<5.2&&lodLvl===2)lodLvl=1;
    if(lodLvl<2){if(zoomK>=(LITE?2.4:1.7))lodLvl=1;else if(zoomK<(LITE?2.2:1.5))lodLvl=0}
  }
  const lvl=typeof FX.lod==="number"?FX.lod:(moving&&lodLvl===2?1:lodLvl);
  const lim=Math.min(1.5708,Math.asin(Math.min(1,Math.hypot(W/2,Math.max(cy(),H-cy()))/s)))+.04;
  const _p0=performance.now();
  if(CANVAS){if(GLX.on){GLX.draw(s,cen0);drawOverlay(s,cen0,lim,lvl)}else drawCanvas(s,cen0,lim,lvl)}else paths.each(function(d){
    const vis=!FX.cull||!cen0||!d._c||d3.geoDistance(d._c,cen0)-d._r<lim,g=lvl===2?d:lvl===1?(d._mid||d._lo):d._lo;
    if(vis&&g){this.setAttribute("d",drawFeature(g,cen0,lim));this.__e=false}
    else if(!this.__e){this.setAttribute("d","");this.__e=true}
  });
  gLift.attr("cx",W/2).attr("cy",cy()+s*.035).attr("r",s*1.0);
  gShadow.attr("cx",W/2).attr("cy",cy()+s*1.1).attr("rx",s*.72).attr("ry",s*.06).attr("opacity",zoomK>1.3||S.mode==="speed"?0:.16);
  const cen=projection.invert([W/2,cy()]);
  const _p1=performance.now();
  positionIslands(cen);
  const _p2=performance.now();
  if(blooms.length)blooms.forEach(b=>{if(b.v===MV)placeBloom(b)});
  positionLabels();
  renderNow.prof={pre:_p0-_pS,draw:_p1-_p0,islands:_p2-_p1,rest:performance.now()-_p2};
  if(CANVAS&&(moving||animating)){
    const n=performance.now();
    if(cvLastT&&n-cvLastT<200){cvAvg=cvAvg*.92+(n-cvLastT)*.08;cvN++}
    cvLastT=n;
    if(cvN>30&&cvAvg>19&&cvQ>.6&&cvDpr>1){cvQ=Math.max(.6,cvQ-.15);cvN=0;cvAvg=16;cvResize()}   // 60 fps governor: render a little smaller whenever frames run long
  }else cvLastT=0;
}
const jit=id=>.88+((+id*37)%9)/100;  // each wash settles a little differently
function paintSel(sel,landG,paintG){
  const F=cf(),speed=S.mode==="speed";
  sel.each(function(d){
    const f=FACTS[d.id];const e=d3.select(this);
    const found=F.has(d.id), shown=!speed&&!SESS&&S.mode!=="hot"&&!found&&S.shown.has(d.id), painted=(found||shown)&&f;
    e.classed("found",found).classed("shown",shown).attr("data-r",painted?f.r:null);
    if(painted){
      if(!FX.tiles){e.style("fill",null).style("fill-opacity",null)}
      else if(!artDone[artKey(d.id)]&&artBudget--<=0){paintMore=true;e.style("fill",null).style("fill-opacity",null)}   // a big save is painted in slices so loading never stalls
      else{const key=ensureArt(d.id);if(found&&CANVAS)ensureArtSvg(key);if(!found)ensureWash(key);e.style("fill",`url(#${found?"af":"aw"}-${key})`).style("fill-opacity",found?jit(d.id):.5)}
    }
    else{const hc=HC.get(d.id);if(hc)e.style("fill",hc).style("fill-opacity",1);else e.style("fill",null).style("fill-opacity",null)}
    const parent=(painted?paintG:landG).node();
    if(this.parentNode!==parent)parent.appendChild(this);
  });
}
let artBudget=0,paintMore=false;
function paint(){benchSoon();artBudget=14;paintMore=false;if(CANVAS){if(GLX.hasGL&&GLX.paint)GLX.paint();requestRender()}else paintSel(paths,gCountries,gPaint);updateBeacons();if(paintMore)setTimeout(paint,40)}
function clearMissed(){d3.selectAll(".missed").classed("missed",false);cvMiss(null)}
