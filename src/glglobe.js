/* ======================================================================
   GPU GLOBE (WebGL2). The detailed, painted world is baked once into equirectangular textures
   (land colours, border lines, paintings); each frame is a single shader pass, so nothing is
   simplified or dropped while the globe moves. Falls back to the 2D canvas engine when WebGL2
   is unavailable. Injected into main.html by build.ps1.
   ====================================================================== */
const GL_VS=`#version 300 es
in vec2 aC;
uniform vec2 uRes;
uniform vec3 uView;
out vec2 vP;
void main(){
  vec2 p=aC*1.03;
  vP=p;
  vec2 px=uView.xy+p*uView.z;
  gl_Position=vec4(px.x/uRes.x*2.0-1.0,1.0-px.y/uRes.y*2.0,0.0,1.0);
}`;
const GL_FS=`#version 300 es
precision highp float;
in vec2 vP;
out vec4 oC;
uniform sampler2D uLand;
uniform sampler2D uLines;
uniform sampler2D uArt;
uniform sampler2D uArt2;
uniform vec3 uRot;
uniform float uS;
uniform vec3 uSeaIn;
uniform vec3 uSeaMid;
uniform vec3 uSeaOut;
uniform vec4 uGrat;
uniform vec4 uBorder;
uniform float uLineK;
uniform float uPA;
uniform float uFade;
uniform sampler2D uPLand;
uniform sampler2D uPLines;
uniform sampler2D uPArt;
uniform float uPOn;
uniform vec4 uP;
const float PI=3.14159265358979;
vec3 layers(vec3 col,sampler2D tL,sampler2D tN,sampler2D tA,vec2 uv,vec2 gx,vec2 gy,float lk,float pa){
  vec4 L=textureGrad(tL,uv,gx,gy);
  col=L.rgb+col*(1.0-L.a);
  float ln=textureGrad(tN,uv,gx,gy).r*lk;
  col=mix(col,uBorder.rgb,clamp(ln,0.0,1.0)*uBorder.a);
  vec4 A=textureGrad(tA,uv,gx,gy)*pa;
  return A.rgb+col*(1.0-A.a);
}
float gridLine(float v,float step){
  float w=max(fwidth(v),1e-5);
  float d=abs(mod(v+step*0.5,step)-step*0.5);
  return clamp(1.0-(d/w-0.35),0.0,1.0);
}
void main(){
  float rr=length(vP);
  float cov=clamp((1.0-rr)*uS,0.0,1.0);
  if(cov<=0.0)discard;
  float z=sqrt(max(0.0,1.0-rr*rr));
  float Yp=vP.x,Zp=-vP.y,Xp=z;
  float cg=cos(uRot.z),sg=sin(uRot.z),cp=cos(uRot.y),sp=sin(uRot.y);
  float Y=cg*Yp+sg*Zp;
  float k=-sg*Yp+cg*Zp;
  float X=Xp*cp+k*sp;
  float Z=-Xp*sp+k*cp;
  float lon=atan(Y,X)-uRot.x;
  lon=lon-2.0*PI*floor((lon+PI)/(2.0*PI));
  float lat=asin(clamp(Z,-1.0,1.0));
  float u=lon/(2.0*PI)+0.5;
  float v=0.5-lat/PI;
  vec2 g1x=dFdx(vec2(u,v)),g1y=dFdy(vec2(u,v));
  float u2=fract(u+0.5);
  vec2 g2x=dFdx(vec2(u2,v)),g2y=dFdy(vec2(u2,v));
  bool useB=(abs(g1x.x)+abs(g1y.x))>(abs(g2x.x)+abs(g2y.x));
  vec2 gx=useB?g2x:g1x;
  vec2 gy=useB?g2y:g1y;
  vec2 uv=vec2(u,v);
  float t=length(vP-vec2(-0.16,-0.28))/1.44;
  vec3 col=t<0.7?mix(uSeaIn,uSeaMid,t/0.7):mix(uSeaMid,uSeaOut,(t-0.7)/0.3);
  float lonD=lon*180.0/PI,latD=lat*180.0/PI;
  float lonS=lonD+180.0;
  float lonS2=mod(lonS+180.0,360.0);
  float wA=fwidth(lonS),wB=fwidth(lonS2);
  float la1=gridLine(lonS,10.0),la2=gridLine(lonS2,10.0);
  float lonLine=(wA<=wB?la1:la2)*step(abs(latD),80.0);
  float latLine=gridLine(latD,10.0)*step(abs(latD),80.5);
  col=mix(col,uGrat.rgb,max(lonLine,latLine)*uGrat.a);
  vec3 base=col;
  col=layers(base,uLand,uLines,uArt,uv,gx,gy,uLineK,uPA);
  float dl=lon-uP.x;dl=dl-2.0*PI*floor((dl+PI)/(2.0*PI));
  vec2 puv=vec2(dl/uP.z+0.5,0.5-(lat-uP.y)/uP.w);
  vec2 pgx=dFdx(puv),pgy=dFdy(puv);
  float pw=smoothstep(0.0,0.06,min(min(puv.x,1.0-puv.x),min(puv.y,1.0-puv.y)))*uPOn;
  if(pw>0.0){vec3 cp=layers(base,uPLand,uPLines,uPArt,puv,pgx,pgy,1.0,uPA);col=mix(col,cp,pw);}
  vec4 B=textureGrad(uArt2,uv,gx,gy)*uFade;
  col=B.rgb+col*(1.0-B.a);
  oC=vec4(col*cov,cov);
}`;

let GLc=null,glProg=null,glLost=false,glReady=false;
const GP={on:false,busy:false,plan:null,last:0,gen:0,tex:null,cA:null,aCtx:null,pg:null,rimW:1};   // the deep-zoom detail patch
const glU={},glT={land:null,lines:null,art:null,art2:null};
let glTW=4096,glTH=2048,glLineTexels=2,glRimW=1.6,glAniso=null;
const glPeq=d3.geoEquirectangular().precision(.25),glPath=d3.geoPath(glPeq);
let glArt=null,glArtCtx=null,glTmp=null,glTmpCtx=null;
let glArtState=new Map();
let glJobs=[],glPumpOn=false,glBusy=0,glIdleCbs=[];
let glLandRun=false,glLandAgain=false,glArtRun=false,glArtAgain=false,glSyncQ=false;
const glFading=new Set(),glFadeQueue=[];
let glFadeV=0;
const glMakeCanvas=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
const glRGB=c=>{const o=d3.color(c)||d3.color("#000");return [o.r/255,o.g/255,o.b/255,o.opacity]};

/* ---- small cooperative job queue: bake work is sliced so frames never stall ---- */
function glKick(){if(glPumpOn)return;glPumpOn=true;requestAnimationFrame(glPump)}
function glJob(step,finish){const j={step,finish,st:null};glJobs.push(j);glKick();return j}
function glPump(){
  glPumpOn=false;
  const t0=performance.now();
  while(glJobs.length&&performance.now()-t0<9){
    const j=glJobs[0];let done=true;
    try{done=j.step(j)}catch(e){console.error("gl job",e);done=true}
    if(done){glJobs.shift();try{if(j.finish)j.finish()}catch(e){console.error("gl finish",e)}}
  }
  if(glJobs.length)glKick();else glFlushIdle();
}
const glPending=()=>glJobs.length>0||glLandRun||glArtRun||glSyncQ||glBusy>0;
function glFlushIdle(){if(glPending())return;const cbs=glIdleCbs;glIdleCbs=[];cbs.forEach(f=>f())}
GLX.whenIdle=cb=>{if(!GLX.on||!glPending())cb();else glIdleCbs.push(cb)};

/* ---- GL setup ---- */
function glShader(type,src){const s=GLc.createShader(type);GLc.shaderSource(s,src);GLc.compileShader(s);if(!GLc.getShaderParameter(s,GLc.COMPILE_STATUS))throw new Error(GLc.getShaderInfoLog(s));return s}
function glTexNew(w,h,fmt){
  const t=GLc.createTexture();GLc.bindTexture(GLc.TEXTURE_2D,t);
  GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_WRAP_S,GLc.REPEAT);GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_WRAP_T,GLc.CLAMP_TO_EDGE);
  GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_MIN_FILTER,GLc.LINEAR_MIPMAP_LINEAR);GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_MAG_FILTER,GLc.LINEAR);
  if(glAniso)GLc.texParameterf(GLc.TEXTURE_2D,glAniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,GLc.getParameter(glAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  if(fmt==="R8")GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.R8,1,1,0,GLc.RED,GLc.UNSIGNED_BYTE,new Uint8Array([0]));
  else GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.RGBA8,1,1,0,GLc.RGBA,GLc.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  return t;
}
function glInitGL(){
  const c=document.getElementById("glcanvas");if(!c)return false;
  let g=null;try{g=c.getContext("webgl2",{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:"high-performance"})}catch(e){}
  if(!g)return false;
  GLc=g;
  glAniso=GLc.getExtension("EXT_texture_filter_anisotropic");
  const max=GLc.getParameter(GLc.MAX_TEXTURE_SIZE);
  glTW=Math.min(isTouch?3072:4096,max);glTH=glTW/2;
  glLineTexels=2*glTW/4096;glRimW=1.6*glTW/4096;
  glPeq.scale(glTW/(2*Math.PI)).translate([glTW/2,glTH/2]);
  const p=GLc.createProgram();
  GLc.attachShader(p,glShader(GLc.VERTEX_SHADER,GL_VS));GLc.attachShader(p,glShader(GLc.FRAGMENT_SHADER,GL_FS));
  GLc.bindAttribLocation(p,0,"aC");GLc.linkProgram(p);
  if(!GLc.getProgramParameter(p,GLc.LINK_STATUS))throw new Error(GLc.getProgramInfoLog(p));
  glProg=p;
  ["uRes","uView","uRot","uS","uSeaIn","uSeaMid","uSeaOut","uGrat","uBorder","uLineK","uPA","uFade","uLand","uLines","uArt","uArt2","uPLand","uPLines","uPArt","uPOn","uP"].forEach(n=>glU[n]=GLc.getUniformLocation(p,n));
  const vao=GLc.createVertexArray();GLc.bindVertexArray(vao);
  const b=GLc.createBuffer();GLc.bindBuffer(GLc.ARRAY_BUFFER,b);GLc.bufferData(GLc.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),GLc.STATIC_DRAW);
  GLc.enableVertexAttribArray(0);GLc.vertexAttribPointer(0,2,GLc.FLOAT,false,0,0);
  glT.land=glTexNew(1,1);glT.lines=glTexNew(1,1,"R8");glT.art=glTexNew(1,1);glT.art2=glTexNew(1,1);
  GP.tex={land:glTexNew(1,1),lines:glTexNew(1,1,"R8"),art:glTexNew(1,1)};
  GLc.disable(GLc.DEPTH_TEST);GLc.disable(GLc.BLEND);
  return true;
}
function glUploadFull(tex,canvas,fmt){
  GLc.bindTexture(GLc.TEXTURE_2D,tex);
  GLc.pixelStorei(GLc.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);GLc.pixelStorei(GLc.UNPACK_FLIP_Y_WEBGL,false);
  if(fmt==="R8"){
    GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.R8,GLc.RED,GLc.UNSIGNED_BYTE,canvas);
    if(GLc.getError()!==GLc.NO_ERROR){GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.RGBA8,GLc.RGBA,GLc.UNSIGNED_BYTE,canvas)}   // older drivers: plain RGBA works too (the shader reads .r)
  }else GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.RGBA8,GLc.RGBA,GLc.UNSIGNED_BYTE,canvas);
  GLc.generateMipmap(GLc.TEXTURE_2D);
}
function glUploadBand(tex,canvas,y,h){
  if(h<=0)return;
  if(!glTmp){glTmp=glMakeCanvas(glTW,64);glTmpCtx=glTmp.getContext("2d")}
  glTmp.width=glTW;glTmp.height=h;glTmpCtx.clearRect(0,0,glTW,h);glTmpCtx.drawImage(canvas,0,y,glTW,h,0,0,glTW,h);
  GLc.bindTexture(GLc.TEXTURE_2D,tex);
  GLc.pixelStorei(GLc.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);GLc.pixelStorei(GLc.UNPACK_FLIP_Y_WEBGL,false);
  GLc.texSubImage2D(GLc.TEXTURE_2D,0,0,y,GLc.RGBA,GLc.UNSIGNED_BYTE,glTmp);
  GLc.generateMipmap(GLc.TEXTURE_2D);
}

/* ---- baking: land colours ---- */
function glLandKey(f){const fa=FACTS[f.id];return !fa?"nopl":S.mode==="wander"?(fa.x?"EA":fa.r):"land"}
function glLandColor(key){return key==="land"?CV.land:key==="nopl"?CV.nopl:key==="EA"?CV.tintEA:CV.tint[key]}
function glStartLand(){
  if(glLandRun){glLandAgain=true;return}
  glLandRun=true;glLandAgain=false;
  const job=glJob(j=>{
    if(!j.st){
      const c=glMakeCanvas(glTW,glTH),ctx=c.getContext("2d"),groups=new Map();
      features.forEach(f=>{const k=glLandKey(f);let a=groups.get(k);if(!a){a=[];groups.set(k,a)}a.push(f)});
      j.st={c,ctx,list:[...groups.entries()],i:0};
    }
    const st=j.st;if(st.i>=st.list.length)return true;
    const [key,fs]=st.list[st.i++];
    glPath.context(st.ctx);st.ctx.beginPath();fs.forEach(f=>glPath(f));st.ctx.fillStyle=glLandColor(key);st.ctx.fill();
    return st.i>=st.list.length;
  },null);
  job.finish=()=>{
    if(job.st){glUploadFull(glT.land,job.st.c);job.st=null}
    glLandRun=false;
    if(glLandAgain)glStartLand();
    render(true);
  };
}
/* ---- baking: border + coast lines (colour comes from a uniform, so this is done once) ---- */function glStartLines(){
  const job=glJob(j=>{
    if(!j.st){const c=glMakeCanvas(glTW,glTH),ctx=c.getContext("2d");ctx.strokeStyle="#fff";ctx.lineWidth=glLineTexels;ctx.lineJoin="round";ctx.lineCap="round";j.st={c,ctx,i:0}}
    const st=j.st;glPath.context(st.ctx);
    st.ctx.beginPath();
    const end=Math.min(features.length,st.i+30);
    for(;st.i<end;st.i++)glPath(features[st.i]);
    st.ctx.stroke();
    return st.i>=features.length;
  },null);
  job.finish=()=>{if(job.st){glUploadFull(glT.lines,job.st.c,"R8");job.st=null}render(true)};
}
/* ---- baking: paintings ---- */
function glAnchor(f){
  if(f._gA&&f._gAW===glTW)return f._gA;
  let g=f;
  if(f.geometry.type==="MultiPolygon"){
    let best=null,ba=-1;
    f.geometry.coordinates.forEach(co=>{const p={type:"Polygon",coordinates:co},a=d3.geoArea(p);if(a>ba){ba=a;best=p}});
    g=best;
  }
  f._gAW=glTW;return f._gA=glPath.bounds(g);
}
function glAnchorWith(f,pg){
  let g=f;
  if(f.geometry.type==="MultiPolygon"){
    let best=null,ba=-1;
    f.geometry.coordinates.forEach(co=>{const p={type:"Polygon",coordinates:co},a=d3.geoArea(p);if(a>ba){ba=a;best=p}});
    g=best;
  }
  return pg.bounds(g);
}
function glBoundsY(f){const b=glPath.bounds(f);return [b[0][1],b[1][1]]}
const glJit=id=>.88+((+id*37)%9)/100;
function glDrawArt(ctx,id,tag,pgen,rimW){
  const f=byId[id];if(!f)return;pgen=pgen||glPath;rimW=rimW||glRimW;
  const shown=tag.charAt(0)==="w",key=artKey(id);
  if(!artCv[key])ensureArt(id);
  const sp=artSpecs[key],fa=FACTS[id];if(!sp)return;
  const tile=shown?(artWcv[key]||(artWcv[key]=artCanvas(sp,false,true))):artCv[key];
  pgen.context(ctx);
  const b=pgen===glPath?glAnchor(f):glAnchorWith(f,pgen),S2=Math.max(b[1][0]-b[0][0],b[1][1]-b[0][1])*1.05,cx=(b[0][0]+b[1][0])/2,cy=(b[0][1]+b[1][1])/2;
  let pat=null;
  try{pat=ctx.createPattern(tile,"repeat");if(pat&&pat.setTransform){const k=S2/sp.N;pat.setTransform(new DOMMatrix([k,0,0,k,cx-S2/2,cy-S2/2]))}else pat=null}catch(e){pat=null}
  ctx.save();ctx.lineJoin="round";
  ctx.beginPath();pgen(f);
  ctx.globalAlpha=pat?(shown?.5:glJit(id)):(shown?.4:1);
  ctx.fillStyle=pat||CV.p[fa.r];ctx.fill();
  if(!shown){ctx.lineWidth=rimW*3;ctx.globalAlpha=.14;ctx.strokeStyle=CV.pd[fa.r];ctx.stroke()}
  ctx.globalAlpha=shown?.25:.5;ctx.strokeStyle=CV.pd[fa.r];ctx.lineWidth=shown?rimW*.75:rimW;ctx.stroke();
  ctx.restore();
}
function glEnsureArt(){if(glArt)return;glArt=glMakeCanvas(glTW,glTH);glArtCtx=glArt.getContext("2d");glUploadFull(glT.art,glArt)}   // the art texture must exist at full size before any sub-rect upload
function glDesired(){
  const F=cf(),speed=S.mode==="speed",out=new Map();
  for(let i=0;i<playable.length;i++){
    const id=playable[i].id;if(glFading.has(id))continue;
    const found=(introOwn?introOwn.has(id):F.has(id))||introSet.has(id),shown=!speed&&!SESS&&!introOwn&&!found&&S.shown.has(id);
    if(found||shown)out.set(id,(shown?"w|":"f|")+artKey(id));
  }
  return out;
}
function glUploadRows(ids){
  let y0=1e9,y1=-1;
  ids.forEach(id=>{const r=glBoundsY(byId[id]);y0=Math.min(y0,r[0]);y1=Math.max(y1,r[1])});
  y0=Math.max(0,Math.floor(y0-12));y1=Math.min(glTH,Math.ceil(y1+12));
  glUploadBand(glT.art,glArt,y0,y1-y0);
}
function glDoSync(){
  if(!glReady&&!glArtRun&&!GLX.baking)return;
  if(glArtRun){glArtAgain=true;return}
  const want=glDesired();
  let full=false;const adds=[];
  glArtState.forEach((v,id)=>{if(want.get(id)!==v)full=true});
  want.forEach((v,id)=>{if(glArtState.get(id)!==v)adds.push(id)});
  if(!full&&!adds.length)return;
  glEnsureArt()
  if(!full&&adds.length<=4){      // a country was just painted: draw it straight in
    adds.forEach(id=>{glDrawArt(glArtCtx,id,want.get(id));glArtState.set(id,want.get(id))});
    glUploadRows(adds);glPatchAdd(adds);return;
  }
  glArtRun=true;glArtAgain=false;glPatchInvalidate();
  const ids=[...want.keys()].filter(id=>full||adds.includes(id));
  const job=glJob(j=>{
    if(!j.st){
      let c=glArt,ctx=glArtCtx;
      if(full){c=glMakeCanvas(glTW,glTH);ctx=c.getContext("2d")}
      j.st={c,ctx,i:0};
    }
    const st=j.st,t0=performance.now();
    while(st.i<ids.length&&performance.now()-t0<9){glDrawArt(st.ctx,ids[st.i],want.get(ids[st.i]));st.i++}
    return st.i>=ids.length;
  },null);
  job.finish=()=>{
    const st=job.st;if(full){glArt=st.c;glArtCtx=st.ctx}
    glArtState=new Map(want);
    glUploadFull(glT.art,glArt);glPatchInvalidate();
    glArtRun=false;
    if(!glReady)glMaybeReady();
    if(glArtAgain){glArtAgain=false;glDoSync()}
    render(true);
  };
}
GLX.stateSize=()=>glArtState.size;
GLX.artCanvas=()=>glArt;GLX.dbg=()=>({jobs:glJobs.length,artRun:glArtRun,landRun:glLandRun,fading:glFading.size,busy:glBusy,fadeV:glFadeV});
GLX.paint=function(){if(!glSyncQ){glSyncQ=true;Promise.resolve().then(()=>{glSyncQ=false;glDoSync()})}};

/* ---- intro washes: a batch of countries fades in as one layer ---- */
GLX.fade=function(id){
  glFading.add(id);glFadeQueue.push(id);
  if(glFadeQueue.length===1)Promise.resolve().then(glFadeStart);
};
function glFadeStart(){
  const ids=glFadeQueue.splice(0);if(!ids.length)return;
  glBusy++;
  const c=glMakeCanvas(glTW,glTH),ctx=c.getContext("2d");
  const want=new Map();ids.forEach(id=>want.set(id,"f|"+artKey(id)));
  ids.forEach(id=>glDrawArt(ctx,id,want.get(id)));
  glUploadFull(glT.art2,c);
  const t0=performance.now();
  const tm=d3.timer(()=>{
    const k=Math.min(1,(performance.now()-t0)/1100);glFadeV=k*k*(3-2*k);render();
    if(k>=1){
      tm.stop();
      glEnsureArt()
      ids.forEach(id=>{glDrawArt(glArtCtx,id,want.get(id));glArtState.set(id,want.get(id));glFading.delete(id)});
      glUploadRows(ids);glPatchAdd(ids);glFadeV=0;glBusy--;render(true);glFlushIdle();
    }
  });
}

/* ---- deep-zoom detail patch: a sharper bake of just the window around the view; the world textures stay underneath, so nothing ever drops out ---- */
function glPatchInvalidate(){GP.gen++;GP.on=false;GP.plan=null;GP.cA=null;GP.aCtx=null}
function glPatchWanted(s){
  const c=projection.invert([W/2,cy()]);if(!c||Math.abs(c[1])>78)return null;
  const D=Math.PI/180,lat0=c[1]*D,lon0=c[0]*D;
  const rho=Math.min(1.5,.5*Math.hypot(W,H)/s*1.12);
  const sinr=Math.sin(rho),cl=Math.max(.05,Math.cos(lat0));
  if(sinr>=cl*.98)return null;                                 // the visible cap reaches the pole: a window would be the whole row anyway
  const latSpan=Math.min(Math.PI*.95,2*rho*1.3);
  const lonSpan=Math.min(2*Math.PI,2*Math.asin(sinr/cl)*1.3);
  const PW=isTouch?2048:3072,PH=Math.max(256,Math.min(PW,Math.round(PW*latSpan/lonSpan)));
  if(PW/lonSpan<glTW/(2*Math.PI)*1.4)return null;       // the world textures are already sharp enough here
  return {lon0,lat0,lonSpan,latSpan,PW,PH,s,rho};
}
function glPatchOK(w){
  const c=GP.plan;if(!c)return false;
  let dl=w.lon0-c.lon0;dl-=2*Math.PI*Math.floor((dl+Math.PI)/(2*Math.PI));
  const dla=w.lat0-c.lat0,r=w.s/c.s;
  const halfLon=Math.asin(Math.min(1,Math.sin(w.rho)/Math.max(.05,Math.cos(c.lat0))));
  return r>.7&&r<1.45&&Math.abs(dl)+halfLon*.85<c.lonSpan/2&&Math.abs(dla)+w.rho*.85<c.latSpan/2;
}
function glPatchTick(s){
  const w=glPatchWanted(s);
  if(!w){if(GP.on&&GP.plan&&s<GP.plan.s*.5)GP.on=false;return}
  if(GP.busy)return;
  const now=performance.now();
  if(GP.plan&&now-GP.last<350)return;
  if(!glPatchOK(w)){GP.last=now;glPatchBake(w)}
}
function glPatchBake(pl){
  GP.busy=true;const gen=GP.gen,D=180/Math.PI;
  const proj=d3.geoEquirectangular().rotate([-pl.lon0*D,0]).center([0,pl.lat0*D]).scale(pl.PW/pl.lonSpan).translate([pl.PW/2,pl.PH/2]).precision(.2);
  const pg=d3.geoPath(proj);
  const pxT=pl.s*pl.lonSpan/pl.PW,lineW=Math.max(.9,.6/pxT),rimW=Math.max(1,.8/pxT);
  const wr=Math.hypot(pl.lonSpan*Math.cos(pl.lat0),pl.latSpan)/2+.05,cen=[pl.lon0*D,pl.lat0*D];
  const fs=features.filter(f=>!f._c||!isFinite(f._c[0])||f._r>=3||d3.geoDistance(f._c,cen)-f._r<wr);
  const stateArt=[...glArtState.entries()].filter(([id])=>fs.includes(byId[id]));
  const job=glJob(j=>{
    if(!j.st){
      const mk=()=>glMakeCanvas(pl.PW,pl.PH),cl=mk(),cn=mk(),ca=mk(),groups=new Map();
      fs.forEach(f=>{const k=glLandKey(f);let a=groups.get(k);if(!a){a=[];groups.set(k,a)}a.push(f)});
      j.st={cl,cn,ca,lc:cl.getContext("2d"),nc:cn.getContext("2d"),ac:ca.getContext("2d"),gl:[...groups.entries()],gi:0,ni:0,ai:0};
      j.st.nc.strokeStyle="#fff";j.st.nc.lineWidth=lineW;j.st.nc.lineJoin="round";j.st.nc.lineCap="round";
    }
    const st=j.st,t0=performance.now();
    while(performance.now()-t0<9){
      if(st.gi<st.gl.length){const [key,list]=st.gl[st.gi++];pg.context(st.lc);st.lc.beginPath();list.forEach(f=>pg(f));st.lc.fillStyle=glLandColor(key);st.lc.fill();continue}
      if(st.ni<fs.length){pg.context(st.nc);st.nc.beginPath();const e=Math.min(fs.length,st.ni+25);for(;st.ni<e;st.ni++)pg(fs[st.ni]);st.nc.stroke();continue}
      if(st.ai<stateArt.length){const [id,tag]=stateArt[st.ai++];glDrawArt(st.ac,id,tag,pg,rimW);continue}
      return true;
    }
    return false;
  },null);
  job.finish=()=>{
    const st=job.st;GP.busy=false;
    if(!st||gen!==GP.gen||!GLX.on||glLost)return;                // the picture changed while baking: the next tick starts over
    glUploadFull(GP.tex.land,st.cl);glUploadFull(GP.tex.lines,st.cn,"R8");glUploadFull(GP.tex.art,st.ca);
    GP.cA=st.ca;GP.aCtx=st.ac;GP.pg=pg;GP.rimW=rimW;GP.plan=pl;GP.on=true;
    job.st=null;render(true);
  };
}
function glPatchAdd(ids){
  if(!GP.on||!GP.aCtx){if(GP.busy)GP.gen++;return}
  ids.forEach(id=>glDrawArt(GP.aCtx,id,glArtState.get(id),GP.pg,GP.rimW));
  glUploadFull(GP.tex.art,GP.cA);
}

/* ---- per-frame draw ---- */
GLX.resize=function(){
  if(!GLX.hasGL)return;
  const dpr=cvDpr;
  glC.width=Math.round(innerWidth*dpr);glC.height=Math.round(innerHeight*dpr);
  glC.style.width=innerWidth+"px";glC.style.height=innerHeight+"px";glC.style.top=(-stageTop)+"px";glC.style.left=(-stageLeft)+"px";
};
GLX.colors=function(){if(GLX.hasGL){glPatchInvalidate();glStartLand();GLX.paint()}};
GLX.draw=function(s,cen0){
  if(glLost)return;
  const r=projection.rotate(),D=Math.PI/180;
  GLc.viewport(0,0,glC.width,glC.height);
  GLc.clearColor(0,0,0,0);GLc.clear(GLc.COLOR_BUFFER_BIT);
  GLc.useProgram(glProg);
  GLc.uniform2f(glU.uRes,innerWidth,innerHeight);
  GLc.uniform3f(glU.uView,stageLeft+W/2,stageTop+cy(),s);
  GLc.uniform3f(glU.uRot,r[0]*D,r[1]*D,r[2]*D);
  GLc.uniform1f(glU.uS,s);
  const si=glRGB(CV.seaIn),sm=glRGB(CV.seaMid),so=glRGB(CV.seaOut),gr=glRGB(CV.grat),bo=glRGB(CV.border);
  GLc.uniform3f(glU.uSeaIn,si[0],si[1],si[2]);GLc.uniform3f(glU.uSeaMid,sm[0],sm[1],sm[2]);GLc.uniform3f(glU.uSeaOut,so[0],so[1],so[2]);
  GLc.uniform4f(glU.uGrat,gr[0],gr[1],gr[2],gr[3]);GLc.uniform4f(glU.uBorder,bo[0],bo[1],bo[2],bo[3]);
  const texPx=s*(2*Math.PI/glTW);                // screen px per texel at the equator
  GLc.uniform1f(glU.uLineK,Math.min(1,.7/(glLineTexels*texPx)));
  GLc.uniform1f(glU.uPA,cvPA);GLc.uniform1f(glU.uFade,glFadeV);
  glPatchTick(s);
  const pl=GP.plan,usePatch=GP.on&&pl&&pl.s*.5<=s&&s<=pl.s*2.2;
  GLc.uniform1f(glU.uPOn,usePatch?1:0);
  if(usePatch)GLc.uniform4f(glU.uP,pl.lon0,pl.lat0,pl.lonSpan,pl.latSpan);
  GLc.activeTexture(GLc.TEXTURE0);GLc.bindTexture(GLc.TEXTURE_2D,glT.land);GLc.uniform1i(glU.uLand,0);
  GLc.activeTexture(GLc.TEXTURE1);GLc.bindTexture(GLc.TEXTURE_2D,glT.lines);GLc.uniform1i(glU.uLines,1);
  GLc.activeTexture(GLc.TEXTURE2);GLc.bindTexture(GLc.TEXTURE_2D,glT.art);GLc.uniform1i(glU.uArt,2);
  GLc.activeTexture(GLc.TEXTURE3);GLc.bindTexture(GLc.TEXTURE_2D,glT.art2);GLc.uniform1i(glU.uArt2,3);
  GLc.activeTexture(GLc.TEXTURE4);GLc.bindTexture(GLc.TEXTURE_2D,GP.tex.land);GLc.uniform1i(glU.uPLand,4);
  GLc.activeTexture(GLc.TEXTURE5);GLc.bindTexture(GLc.TEXTURE_2D,GP.tex.lines);GLc.uniform1i(glU.uPLines,5);
  GLc.activeTexture(GLc.TEXTURE6);GLc.bindTexture(GLc.TEXTURE_2D,GP.tex.art);GLc.uniform1i(glU.uPArt,6);
  GLc.drawArrays(GLc.TRIANGLE_STRIP,0,4);
};

/* ---- start-up: bake during the splash, flip to the GPU globe when the textures are ready ---- */
const glC=document.getElementById("glcanvas");
function glMaybeReady(){
  if(glReady||!GLX.landDone||!GLX.linesDone||glArtRun)return;
  glReady=true;GLX.on=true;document.body.classList.add("gl");
  GLX.resize();render(true);
}
function glBegin(){
  GLX.baking=true;glEnsureArt();
  glStartLines();
  glStartLand();
  glDoSync();
  // flag completion of the first land/lines bake
  const wait=()=>{
    if(!glLandRun&&glJobs.length===0&&!glArtRun){GLX.landDone=true;GLX.linesDone=true;GLX.baking=false;glMaybeReady();return}
    setTimeout(wait,60);
  };
  setTimeout(wait,120);
}
if(GLWANT&&CANVAS){
  try{
    if(glInitGL()){
      GLX.hasGL=true;
      glC.addEventListener("webglcontextlost",e=>{e.preventDefault();glLost=true;GLX.on=false;document.body.classList.remove("gl");render(true)});
      glC.addEventListener("webglcontextrestored",()=>{glLost=false;GLX.hasGL=glInitGL();if(GLX.hasGL){glReady=false;GLX.on=false;GLX.landDone=false;GLX.linesDone=false;glArtState=new Map();glArt=null;glLandRun=false;glArtRun=false;glJobs=[];GLX.resize();glBegin()}});
      GLX.resize();
      setTimeout(glBegin,50);
    }
  }catch(e){console.warn("GPU globe unavailable, using the canvas engine",e);GLX.hasGL=false;GLX.on=false}
}
