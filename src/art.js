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
  if(wash){   // watercolour: pale gesso, a loose wash, layered see-through glazes with pooled edges, blooms with feathered rims, water settling to one side, and pigment granules
    const R=seeded("wc"+sp.gseed),T=sp.tri,a=sp.ang*Math.PI/180,dx=Math.cos(a)*70,dy=Math.sin(a)*70;
    const rich=c=>{const h=d3.hsl(c);h.s=Math.min(1,h.s*1.14);h.l=Math.max(.42,h.l-.05);return h.formatRgb()};
    const alpha=(c,o)=>d3.color(c).copy({opacity:o}).formatRgb();
    const poly=(cx,cy,rad,harm,amp)=>{   // a closed, organic outline: a circle wobbled by a few harmonics
      const ph=[],am=[];for(let h=0;h<harm;h++){ph.push(R()*6.2832);am.push(amp/(1+h*.45)*(.5+R()*.7))}
      x.beginPath();for(let i=0;i<=72;i++){const u=i/72*6.2832;let r=1;for(let h=0;h<harm;h++)r+=am[h]*Math.sin((h+2)*u+ph[h]);const px=cx+Math.cos(u)*rad*r,py=cy+Math.sin(u)*rad*r*.88;i?x.lineTo(px,py):x.moveTo(px,py)}x.closePath();
    };
    x.globalAlpha=.55;x.fillStyle=T[2];x.fillRect(0,0,100,100);                                    // pale gesso so the colour stays luminous on any land
    const g=x.createLinearGradient(50-dx,50-dy,50+dx,50+dy);g.addColorStop(0,T[0]);g.addColorStop(.55,T[1]);g.addColorStop(1,T[2]);
    x.globalAlpha=.72;x.fillStyle=g;x.fillRect(0,0,100,100);                                        // the loose base wash
    const jit=(c,hv,sv,lv)=>{const h=d3.hsl(c);h.h=(h.h+(R()-.5)*hv+360)%360;h.s=Math.max(0,Math.min(1,h.s+(R()-.5)*sv));h.l=Math.max(.4,Math.min(.95,h.l+(R()-.5)*lv));return h.formatRgb()};   // every pool of paint is a slightly different mix
    const finger=(x0,y0,ang,len,wid,col,al,depth)=>{   // pigment bleeding out along the wet paper: a wandering, tapering finger with the odd side branch
      let px=x0,py=y0,an=ang;const steps=Math.max(4,Math.round(len/1.7));x.lineCap="round";x.strokeStyle=col;
      for(let i=0;i<steps;i++){
        const f=1-i/steps;an+=(R()-.5)*.7;const nx=px+Math.cos(an)*1.7,ny=py+Math.sin(an)*1.7;
        x.globalAlpha=al*f;x.lineWidth=Math.max(.14,wid*f);x.beginPath();x.moveTo(px,py);x.lineTo(nx,ny);x.stroke();
        if(depth<2&&i>2&&i<steps-3&&R()<.22)finger(nx,ny,an+(R()<.5?-1:1)*(.5+R()*.5),len*(.3+R()*.25)*f+3,wid*.6,col,al*.85,depth+1);
        px=nx;py=ny;
      }
    };
    for(let k=0;k<7;k++){   // glazes: soft see-through pools, darker where the water dried at the edge, lighter in the middle
      const base=[T[1],T[0],sp.pools[k%6].c,T[1],T[2],sp.pools[(k+2)%6].c,T[0]][k],col=jit(base,k>2?30:16,.2,.1),cx=4+R()*92,cy=4+R()*92,rad=14+R()*28;
      poly(cx,cy,rad,4,.2);x.globalAlpha=.3+R()*.2;x.fillStyle=rich(col);x.fill();
      x.globalAlpha=.2;x.lineWidth=.6;x.strokeStyle=mix(col,sp.ink,.3);x.stroke();
      poly(cx,cy,rad*.6,3,.22);x.globalAlpha=.1;x.fillStyle="#fff";x.fill();
      const nf=3+Math.floor(R()*6),fc=mix(col,sp.ink,.16);
      for(let q=0;q<nf;q++){const u=R()*6.2832;finger(cx+Math.cos(u)*rad*.98,cy+Math.sin(u)*rad*.86,u+(R()-.5)*.8,12+R()*26,1.6+R()*1.5,fc,.4,0)}   // bleeding fingers reaching out of the pool
    }
    {   // a couple of accent washes from the neighbouring palettes: unexpected colour dropped into the wet paint
      const ac=[sp.tint,sp.pools[3].c];for(let k=0;k<2;k++){const cx=10+R()*80,cy=10+R()*80,rad=10+R()*16;poly(cx,cy,rad,5,.3);x.globalAlpha=.16+R()*.1;x.fillStyle=jit(ac[k],18,.15,.06);x.fill();for(let q=0;q<3;q++){const u=R()*6.2832;finger(cx+Math.cos(u)*rad,cy+Math.sin(u)*rad*.88,u,9+R()*14,1.4,mix(ac[k],sp.ink,.14),.34,1)}}
    }    for(let k=0;k<3;k++){   // blooms (backruns): clean water pushed into a wet wash leaves a pale, cauliflower-edged shape with a thin dark rim
      const cx=12+R()*76,cy=12+R()*76,rad=9+R()*15;poly(cx,cy,rad,7,.2);
      x.globalAlpha=.4;x.fillStyle=mix(T[2],"#ffffff",.65);x.fill();
      x.globalAlpha=.17;x.lineWidth=.5;x.strokeStyle=mix(T[1],sp.ink,.3);x.stroke();
    }
    const g3=x.createLinearGradient(50+dy*.7,50-dx*.7,50-dy*.7,50+dx*.7);   // pigment drifts and settles toward one side
    g3.addColorStop(0,alpha(T[1],0));g3.addColorStop(1,alpha(mix(T[1],sp.ink,.28),.3));x.globalAlpha=1;x.fillStyle=g3;x.fillRect(0,0,100,100);
    x.globalAlpha=1;  }  if(motif){
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
  const sp=artSpec(id,spd),a=FACTS[id].a;sp.N=a>2.5e6?256:a>4e5?224:176;artSpecs[key]=sp;   // bigger countries get a finer tile
  const cvs=artCanvas(sp,false,true);artCv[key]=cvs;   // watercolour: a pure wash, no line motif
  if(!CANVAS)defTile("af",key,cvs.toDataURL("image/png"),sp.N);
  return key;
}
const svgAf={};
function ensureArtSvg(key){if(svgAf[key]||!artCv[key])return;svgAf[key]=1;defTile("af",key,artCv[key].toDataURL("image/png"),artSpecs[key].N)}
const washDone={};
function ensureWash(key){if(washDone[key]||!artSpecs[key])return;washDone[key]=1;defTile("aw",key,artCanvas(artSpecs[key],false,true).toDataURL("image/png"),artSpecs[key].N)}
function ensureMotif(key){if(motifDone[key]||!artSpecs[key])return;motifDone[key]=1;defTile("am",key,artCanvas(artSpecs[key],true,false).toDataURL("image/png"),artSpecs[key].N)}const artColor=id=>triFor(id,S.mode==="speed")[1];

const blooms=[];let bloomSeq=0;
/* the heart of a country: the point deepest inside its landmass. If the geographic centre is water (an archipelago, a crescent), the heart of the nearest piece of land is used instead */
function landCenter(id){
  const f=byId[id];if(!f)return null;if(f._lc!==undefined)return f._lc;
  let res=null;
  try{
    const polys=(f.geometry.type==="MultiPolygon"?f.geometry.coordinates:[f.geometry.coordinates]).map(co=>{const g={type:"Polygon",coordinates:co};return {co,g,a:d3.geoArea(g),c:d3.geoCentroid(g)}}).sort((a,b)=>b.a-a.a);
    if(polys.length){
      const all=d3.geoCentroid(f);let pick=polys.find(p=>d3.geoContains(p.g,all));
      if(!pick){const big=polys.filter(p=>p.a>=polys[0].a*.04);pick=big.reduce((m,p)=>d3.geoDistance(p.c,all)<d3.geoDistance(m.c,all)?p:m,big[0])}
      const g=pick.g,b=d3.geoBounds(g);let x0=b[0][0],y0=b[0][1],x1=b[1][0],y1=b[1][1];if(x1<x0)x1+=360;
      const ring=pick.co[0],st=Math.max(1,Math.floor(ring.length/110)),bd=[];for(let i=0;i<ring.length;i+=st)bd.push(ring[i]);
      const n=pick.a<2e-4?8:pick.a<2e-3?12:16,tgt=d3.geoContains(g,all)?all:pick.c,cand=[pick.c];
      for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){let lon=x0+(x1-x0)*i/n;if(lon>180)lon-=360;cand.push([lon,y0+(y1-y0)*j/n])}
      let bestP=null,bestS=-1;
      cand.forEach(p=>{if(!d3.geoContains(g,p))return;let m=Infinity;for(const q of bd){const d=d3.geoDistance(p,q);if(d<m)m=d}const sc=m-.12*d3.geoDistance(p,tgt);if(sc>bestS){bestS=sc;bestP=p}});
      res=bestP||(d3.geoContains(g,pick.c)?pick.c:null);
    }
  }catch(e){}
  return f._lc=res;
}
/* work out every country's heart in small idle slices after start-up, so a reveal never waits for it */
setTimeout(()=>{const ids=Object.keys(FACTS);let i=0;const step=()=>{const t=performance.now();while(i<ids.length&&performance.now()-t<10)landCenter(ids[i++]);if(i<ids.length)(window.requestIdleCallback?window.requestIdleCallback(step,{timeout:400}):setTimeout(step,80))};step()},6000);
function startReveal(id,ll,shown,done,fast,v,onPayoff){
  v=v||MV;ll=landCenter(id)||ll;
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
  function impact(){   // outline draws itself first, then the wash blooms out of it
    if(reduced||fast||!CANVAS){impactMain();return}
    bloomOutline(id,520);setTimeout(impactMain,230);
  }
  function impactMain(){
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

/* a short burst of confetti when a whole region is painted */
function confetti(region){
  if(reduced)return;
  const cv=document.createElement("canvas"),dpr=Math.min(2,window.devicePixelRatio||1),w=innerWidth,h=innerHeight;
  cv.width=w*dpr;cv.height=h*dpr;cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:45;pointer-events:none";
  document.body.append(cv);const c=cv.getContext("2d");c.scale(dpr,dpr);
  const base=region?getComputedStyle(document.documentElement).getPropertyValue("--c-"+region).trim():"",
    light=base&&d3.color(base)?d3.color(base).brighter(.7).formatHex():"#E06F58",
    cols=[base||"#6FA27E","#F2D27A","#ffffff",light,"#E06F58"];
  const ps=d3.range(110).map(()=>{const an=-Math.PI/2+(Math.random()-.5)*1.5,v=7+Math.random()*9;
    return {x:w/2+(Math.random()-.5)*w*.3,y:h*.72,vx:Math.cos(an)*v,vy:Math.sin(an)*v,r:3+Math.random()*4,rot:Math.random()*6,vr:(Math.random()-.5)*.4,col:cols[Math.floor(Math.random()*cols.length)]}});
  const t0=performance.now();
  (function tick(){
    const k=(performance.now()-t0)/2400;if(k>=1){cv.remove();return}
    c.clearRect(0,0,w,h);
    ps.forEach(p=>{p.vy+=.22;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;c.save();c.globalAlpha=Math.max(0,1-Math.pow(k,2.2));c.translate(p.x,p.y);c.rotate(p.rot);c.fillStyle=p.col;c.fillRect(-p.r,-p.r*.5,p.r*2,p.r);c.restore()});
    requestAnimationFrame(tick);
  })();
}