/* ======================================================================
   ART PIECE: each country you find becomes a small painting. A drop lands,
   pigment bleeds outward through its shape, and once the wash settles a
   fine line motif (contours, waves, stipple, hatching or halftone) is drawn
   over it. Every country gets its own pastel triad, always the same one.
   ====================================================================== */
const TRI={
 Africa:[["#F3DDB0","#EFC08F","#E6CDB9"],["#F5E3B9","#EBC896","#DDBFA6"],["#F0D2A6","#E8AE92","#EDDCC0"],["#EEDAB0","#DCC795","#F0BFA6"]],
 Americas:[["#D2E8D8","#ABD4BF","#E9F1D2"],["#C9E5D4","#A2CEC1","#E8EECD"],["#D8EAD2","#B8DAB3","#CDE6E4"],["#C2E1CE","#E7EECA","#A9D0D6"]],
 Asia:[["#F6D0DA","#EBB5C8","#F8E4DA"],["#F2CADB","#D9BBE4","#F8DDD3"],["#F7D4D2","#EBBCC8","#E6D0EC"],["#F4C6D3","#F6DCC6","#D0BBE5"]],
 Europe:[["#D0DBF4","#B7CAEC","#E6E0F4"],["#CBE0F2","#ACC6E8","#DDE7F5"],["#D6D3F2","#BBCAED","#EBE0F2"],["#C4DDEF","#D3CFF0","#E7EFF6"]],
 Oceania:[["#F8D3BD","#F4BCAA","#CDE9DF"],["#F7D9C3","#EDB8AC","#C1E4DC"],["#F5CDB8","#CAE7DB","#F0DFC4"],["#F4C3B2","#C2E5E1","#F6E4C9"]]};
const TRI_S={   // speed mode: luminous pastel-neon
 Africa:[["#FFE79A","#FFC04D","#FFF3CC"],["#FFD98A","#FFAD66","#FFE9B8"]],
 Americas:[["#9CF5CC","#4DE2A8","#D2FFE9"],["#8FF0DB","#62E6B2","#CFFFF1"]],
 Asia:[["#FF9DBF","#FF6B9E","#FFD0E1"],["#FFA9D1","#E58BFF","#FFD6EC"]],
 Europe:[["#9CCBFF","#5EA4FF","#D4E7FF"],["#9FD8FF","#7C9BFF","#DCEBFF"]],
 Oceania:[["#D1A8FF","#B07CFF","#EBD9FF"],["#C7B2FF","#8FA0FF","#E4DDFF"]]};
const mix=(a,b,t)=>d3.interpolateRgb(a,b)(t);
const artDone={},artCv={},artWcv={};
const artKey=id=>id+(S.mode==="speed"?"s":"n");
/* Each country's painting is drawn once into a small canvas (gradient wash, pooled pigment, granulation,
   and a line motif) and used as an image tile, which the GPU can repeat far more cheaply than vector patterns. */
const ART_N=192,artSpecs={},motifDone={};
const TRI_ALL=["Africa","Americas","Asia","Europe","Oceania"];
function triFor(id,spd){   // the country's base triad from its region bank, nudged in hue, saturation and lightness so neighbours differ
  const f=FACTS[id],r=seeded("tw-art-"+id),bank=(spd?TRI_S:TRI)[f.r]||TRI.Europe,base=bank[Math.floor(r()*bank.length)],j=seeded("tw-jit-"+id);
  const dh=(j()-.5)*(spd?20:34),ds=.86+j()*.34,dl=(j()-.5)*(spd?.05:.075);
  return base.map((c,i)=>{const h=d3.hsl(c);h.h=(h.h+dh+(i-1)*(j()-.5)*10+360)%360;h.s=Math.min(1,h.s*ds);h.l=Math.max(.5,Math.min(.95,h.l+dl));return h.formatHex()});
}
function artSpec(id,spd){
  const f=FACTS[id],r=seeded("tw-art-"+id),bank=(spd?TRI_S:TRI)[f.r]||TRI.Europe,tri=(r(),triFor(id,spd));
  const ink=spd?"#EAF8FF":"#5b4a3a",ang=30+r()*120;
  const jb=seeded("tw-acc-"+id),acc=(TRI_ALL.filter(x=>x!==f.r).map(x=>(spd?TRI_S:TRI)[x]).map(b=>b[Math.floor(jb()*b.length)][1]))[Math.floor(jb()*4)],
    pc=[tri[2],tri[1],jb()<.7?mix(tri[2],acc,.7):"#ffffff",mix(tri[0],ink,.32),tri[0],mix(tri[1],ink,.22)],po=[.9,.85,.5,.34,.6,.42];   // six pigment pools: pale, mid, a lifted white, a pooled dark, the light tone and a deeper mid
  const pools=pc.map((c,i)=>({cx:10+r()*80,cy:10+r()*80,rad:22+r()*40,c,o:po[i]}));
  const m={kind:Math.floor(r()*5),cx:30+r()*40,cy:30+r()*40,rot:r()*Math.PI,sq:.65+r()*.4,dots:[],ph:[],hatch2:false,hcx:20+r()*60,hcy:20+r()*60};
  for(let i=0;i<150;i++)m.dots.push([r()*100,r()*100,.35+r()*.85,.3+r()*.45]);
  for(let i=0;i<13;i++)m.ph.push(r()*3);
  m.hatch2=r()<.5;
  return {tri,ang,pools,m,tint:mix(f.x?(()=>{const b2=(spd?TRI_S:TRI)[f.x]||TRI.Asia;return b2[Math.floor(seeded("tw-art2-"+id)()*b2.length)][1]})():tri[1],ink,spd?.15:(f.x?.2:.55)),gseed:"gr"+id};
}
function artCanvas(sp,motif,wash){
  const N=sp.N||ART_N,c=document.createElement("canvas");c.width=c.height=N;const x=c.getContext("2d");x.scale(N/100,N/100);
  if(wash){   // just colour: a smooth three-tone gradient with two soft pools, no texture (the paper grain lives on the globe itself)
    const a=sp.ang*Math.PI/180,dx=Math.cos(a)*70,dy=Math.sin(a)*70;
    const g=x.createLinearGradient(50-dx,50-dy,50+dx,50+dy);g.addColorStop(0,sp.tri[0]);g.addColorStop(.55,sp.tri[1]);g.addColorStop(1,sp.tri[2]);
    x.fillStyle=g;x.fillRect(0,0,100,100);
    sp.pools.slice(0,3).forEach(p=>{const col=d3.color(p.c),g2=x.createRadialGradient(p.cx,p.cy,0,p.cx,p.cy,p.rad+10);
      g2.addColorStop(0,col.copy({opacity:p.o*.7}).formatRgb());g2.addColorStop(1,col.copy({opacity:0}).formatRgb());x.fillStyle=g2;x.fillRect(0,0,100,100)});
  }  if(motif){
    const m=sp.m,tc=d3.color(sp.tint);
    x.lineCap="round";x.lineWidth=.7;x.strokeStyle=tc.copy({opacity:.42}).formatRgb();
    if(m.kind===0){for(let i=1;i<=11;i++){const rx=i*7+m.ph[i%13]*.6;x.beginPath();x.ellipse(m.cx,m.cy,rx,rx*m.sq,m.rot,0,6.2832);x.stroke()}}
    else if(m.kind===1){x.strokeStyle=tc.copy({opacity:.4}).formatRgb();for(let i=0;i<13;i++){const y=i*8+m.ph[i];x.beginPath();x.moveTo(-5,y);x.quadraticCurveTo(10,y-5,25,y);x.quadraticCurveTo(40,y+5,55,y);x.quadraticCurveTo(70,y-5,85,y);x.quadraticCurveTo(100,y+5,115,y);x.stroke()}}
    else if(m.kind===2){m.dots.forEach(d=>{x.fillStyle=tc.copy({opacity:d[3]}).formatRgb();x.beginPath();x.arc(d[0],d[1],d[2],0,6.2832);x.fill()})}
    else if(m.kind===3){x.lineWidth=.6;x.strokeStyle=tc.copy({opacity:.34}).formatRgb();for(let v=-60;v<110;v+=6.5){x.beginPath();x.moveTo(v,-5);x.lineTo(v+55,105);x.stroke()}
      if(m.hatch2){x.strokeStyle=tc.copy({opacity:.17}).formatRgb();for(let v=-10;v<170;v+=11){x.beginPath();x.moveTo(v,-5);x.lineTo(v-55,105);x.stroke()}}}
    else{x.fillStyle=tc.copy({opacity:.45}).formatRgb();for(let px=4;px<100;px+=8)for(let py=4;py<100;py+=8){const d=Math.hypot(px-m.hcx,py-m.hcy)/70,r=Math.max(.15,1.9*(1-Math.min(1,d)));x.beginPath();x.arc(px,py,r,0,6.2832);x.fill()}}
  }
  return c;
}
function defTile(pid,key,url,N){
  defs.node().insertAdjacentHTML("beforeend",`<pattern id="${pid}-${key}" x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox" viewBox="0 0 ${N} ${N}" preserveAspectRatio="xMidYMid slice"><image href="${url}" width="${N}" height="${N}"/></pattern>`);
}
function ensureArt(id){
  const spd=S.mode==="speed",key=artKey(id);if(artDone[key])return key;artDone[key]=1;
  const sp=artSpec(id,spd),a=FACTS[id].a;sp.N=a>2.5e6?192:a>4e5?160:128;artSpecs[key]=sp;   // bigger countries get a finer tile
  const cvs=artCanvas(sp,false,true);artCv[key]=cvs;   // watercolour: a pure wash, no line motif
  if(!CANVAS)defTile("af",key,cvs.toDataURL("image/jpeg",.9),sp.N);
  return key;
}
const svgAf={};
function ensureArtSvg(key){if(svgAf[key]||!artCv[key])return;svgAf[key]=1;defTile("af",key,artCv[key].toDataURL("image/jpeg",.9),artSpecs[key].N)}
const washDone={};
function ensureWash(key){if(washDone[key]||!artSpecs[key])return;washDone[key]=1;defTile("aw",key,artCanvas(artSpecs[key],false,true).toDataURL("image/jpeg",.9),artSpecs[key].N)}
function ensureMotif(key){if(motifDone[key]||!artSpecs[key])return;motifDone[key]=1;defTile("am",key,artCanvas(artSpecs[key],true,false).toDataURL("image/png"),artSpecs[key].N)}const artColor=id=>triFor(id,S.mode==="speed")[1];

const blooms=[];let bloomSeq=0;
function startReveal(id,ll,shown,done,fast,v,onPayoff){
  v=v||MV;
  const key=ensureArt(id);ensureWash(key);ensureMotif(key);
  if(reduced){done();if(onPayoff)onPayoff();return}
  const f=FACTS[id],src=byId[id],uid="b"+(++bloomSeq),col=`var(--c-${f.r}-d)`,TS=FX.ts||1;
  const drop=v.gFx.append("circle").attr("class","drop").attr("fill",`var(--c-${f.r})`).attr("stroke",col).attr("stroke-width",1);
  const T0=performance.now(),FALL=(fast?130:170)*TS;
  const tm=d3.timer(()=>{
    const k=Math.min(1,(performance.now()-T0)/FALL),p=v.projection(ll),e=k*k;
    drop.attr("cx",p[0]).attr("cy",p[1]-(fast?36:60)*(1-e)).attr("r",6-2.5*e).attr("opacity",k<1?.95:0);
    if(k>=1){tm.stop();drop.remove();impact()}
  });
  function impact(){
    if(!fast)sndDrop();rings(ll,col,fast,v);
    if(GLX.on&&v===MV){      // GPU globe: the wash bleeds out inside the shader
      const rMax=(src._r||.3)*1.6+.04,si=GLX.bloomStart(id,ll,rMax,shown,f.r);
      if(!fast||S.mode!=="speed")sndBloom(fast);
      if(si<0){done();if(onPayoff)onPayoff();return}
      const t1=performance.now(),DUR=(fast?950:1700)*TS,MOT=(fast?380:900)*TS;let paid=false;
      const tg=d3.timer(()=>{
        const k=Math.min(1,(performance.now()-t1)/DUR);GLX.bloomP(si,k);if(!animating)render();
        if(!paid&&k>=(fast?1:.4)){paid=true;if(!fast){sndPencil(MOT/1000);if(onPayoff)onPayoff();glint(ll,v)}}
        if(k>=1){tg.stop();done();GLX.whenIdle(()=>{GLX.bloomEnd(si);render(true)});if(fast)glint(ll,v)}
      });
      return;
    }
    const seed=1+Math.floor(Math.random()*99),fx=FX.bloomFx;
    defs.node().insertAdjacentHTML("beforeend",
      `<filter id="f-${uid}" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="1.6"/></filter>`+
      `<mask id="m-${uid}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${v.W+400}" height="${v.H+400}"><g ${fx?`filter="url(#f-${uid})"`:""}></g></mask>`);
    const maskG=d3.select(`#m-${uid} g`);
    const lobes=d3.range(5).map(i=>({
      el:maskG.append("circle").attr("fill","#fff").node(),
      ox:i?(Math.random()-.5)*.7:0,oy:i?(Math.random()-.5)*.7:0,delay:i?.08+Math.random()*.25:0,size:i?1.1+Math.random()*.4:1.5}));
    const clone=v.gPaint.append("path").datum(src).attr("class","country bloom").attr("data-r",f.r).attr("mask",`url(#m-${uid})`).style("fill",`url(#aw-${key})`);
    const b={uid,v,ll,src,lobes,clone,ov:null,t:0,fin:shown?.5:.94,dispEl:document.querySelector(`#f-${uid} feDisplacementMap`),turbEl:document.querySelector(`#f-${uid} feTurbulence`)};
    blooms.push(b);if(!fast||S.mode!=="speed")sndBloom(fast);
    const t1=performance.now(),DUR=(fast?950:1700)*TS,MOT=(fast?380:900)*TS;
    let moStarted=false,bloomDone=false,moDone=false;
    const tick=()=>{if(v!==MV||!animating)placeBloom(b)};   // during a fly-to render() already places main-view blooms
    const t2=d3.timer(()=>{
      b.t=Math.min(1,(performance.now()-t1)/DUR);tick();
      if(!moStarted&&b.t>=(fast?1:.4))startMotif();
      if(b.t>=1){t2.stop();bloomDone=true;maybeFinish()}
    });
    function startMotif(){
      moStarted=true;const t3s=performance.now();
      b.ov=v.gPaint.append("path").datum(src).attr("class","country bloom motif").attr("data-r",f.r).style("fill",`url(#am-${key})`).style("fill-opacity",0).style("stroke","none");
      placeBloom(b);
      if(!fast){sndPencil(MOT/1000);if(onPayoff)onPayoff();glint(ll,v)}   // the star and the chime arrive about a second after the click
      const t3=d3.timer(()=>{
        const k=Math.min(1,(performance.now()-t3s)/MOT);
        b.ov.style("fill-opacity",easeOut(k));tick();
        if(k>=1){t3.stop();moDone=true;maybeFinish()}
      });
    }
    function maybeFinish(){
      if(!(bloomDone&&moDone))return;
      blooms.splice(blooms.indexOf(b),1);done();
      clone.remove();b.ov.remove();document.getElementById("m-"+uid)?.remove();document.getElementById("f-"+uid)?.remove();
      if(v===MV&&!animating)render();
      if(fast)glint(ll,v);
    }
  }
}function placeBloom(b){
  const v=b.v,p=v.projection(b.ll),bb=v.path.bounds(b.src),d=v.path(b.src);
  b.clone.attr("d",d);if(b.ov)b.ov.attr("d",d);
  const m=document.getElementById("m-"+b.uid);if(!m)return;
  m.setAttribute("width",v.W);m.setAttribute("height",v.H);
  if(!isFinite(bb[0][0])||!p){b.lobes.forEach(l=>l.el.setAttribute("r",0));return}
  const Rr=Math.max(Math.hypot(bb[0][0]-p[0],bb[0][1]-p[1]),Math.hypot(bb[1][0]-p[0],bb[0][1]-p[1]),Math.hypot(bb[0][0]-p[0],bb[1][1]-p[1]),Math.hypot(bb[1][0]-p[0],bb[1][1]-p[1]),4);
  if(b.dispEl){b.dispEl.setAttribute("scale",clamp(Rr*.32,3,34));b.turbEl.setAttribute("baseFrequency",clamp(1.1/(Rr*2),.008,.16).toFixed(4))}
  b.lobes.forEach(l=>{
    const k=clamp((b.t-l.delay)/(1-l.delay),0,1);
    l.el.setAttribute("cx",p[0]+l.ox*Rr*.5);l.el.setAttribute("cy",p[1]+l.oy*Rr*.5);
    l.el.setAttribute("r",Rr*l.size*easeOut(k)+(k>0?1:0));
  });
  b.clone.style("fill-opacity",.97-(.97-b.fin)*easeOut(clamp(b.t*1.1,0,1)));
}
function rings(ll,col,fast,v){
  if(reduced)return;v=v||MV;
  (fast?[0]:[0,230]).forEach((delay,j)=>{
    const c=v.gFx.append("circle").attr("class","pulse").attr("stroke",col);
    const t0=performance.now(),L=fast?900:1700-j*250;
    const t=d3.timer(()=>{
      const k=(performance.now()-t0-delay)/L;
      if(k<0){c.attr("opacity",0);return}
      if(k>1){c.remove();t.stop();return}
      const p=v.projection(ll),e=easeOut(k);
      c.attr("cx",p[0]).attr("cy",p[1]).attr("r",5+e*(46-j*12)).attr("stroke-width",2.4*(1-k)+.4).attr("opacity",.75*Math.pow(1-k,1.5));
    });
  });
}
/* a tiny gold glint, like a signature, where the capital sits */
function glint(ll,v){
  if(reduced)return;
  const g=v.gFx.append("path").attr("d","M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z").attr("fill","#F2D27A").attr("stroke","#fff").attr("stroke-width",.6).attr("opacity",0);
  const t0=performance.now();
  const t=d3.timer(()=>{
    const k=(performance.now()-t0)/1500;if(k>1){g.remove();t.stop();return}
    const q=v.projection(ll),s=Math.sin(k*Math.PI);
    g.attr("transform",`translate(${q[0]},${q[1]}) rotate(${k*70}) scale(${.4+s*.9})`).attr("opacity",s*.9);
  });
}

