/* ======================================================================
   GPU GLOBE (WebGL2). The detailed, painted world is baked once into equirectangular textures
   (land colours, border lines, paintings); each frame is a single shader pass, so nothing is
   simplified or dropped while the globe moves. Falls back to the 2D canvas engine when WebGL2
   is unavailable. Injected into main.html by build.ps1.
   ====================================================================== */
/* borders are NOT baked: they are drawn every frame as vector hairlines (second shader pass below), so they are razor sharp at any zoom and cost nothing to re-bake */
const GL_LVS=`#version 300 es
in vec3 aA;
in vec3 aB;
uniform vec2 uRes;
uniform vec3 uView;
uniform vec3 uRot;
uniform float uS;
uniform float uPx;
out float vD;
out float vF;
vec3 prj(vec3 p){
  float c0=cos(uRot.x),s0=sin(uRot.x);
  float X=c0*p.x-s0*p.y,Y=s0*p.x+c0*p.y,Z=p.z;
  float cg=cos(uRot.z),sg=sin(uRot.z),cp=cos(uRot.y),sp=sin(uRot.y);
  float Xp=X*cp-Z*sp,k=X*sp+Z*cp;
  float Yp=cg*Y-sg*k,Zp=sg*Y+cg*k;
  return vec3(uView.xy+vec2(Yp,-Zp)*uS,Xp);
}
void main(){
  vec3 a=prj(aA),b=prj(aB);
  float mz=min(a.z,b.z);
  if(mz<=0.0){gl_Position=vec4(2.0,2.0,2.0,1.0);vD=0.0;vF=0.0;return;}
  int id=gl_VertexID;
  float t=float(id&1),side=float((id>>1)&1)*2.0-1.0;
  vec2 d=b.xy-a.xy;float len=length(d);
  vec2 dir=len>1e-5?d/len:vec2(1.0,0.0);
  vec2 n=vec2(-dir.y,dir.x);
  float hw=uPx*1.5;
  vec2 pos=mix(a.xy,b.xy,t)+n*side*hw;
  vD=side*hw;vF=smoothstep(0.0,0.06,mz);
  gl_Position=vec4(pos.x/uRes.x*2.0-1.0,1.0-pos.y/uRes.y*2.0,0.0,1.0);
}`;
const GL_LFS=`#version 300 es
precision highp float;
in float vD;
in float vF;
out vec4 oC;
uniform vec4 uBorder;
uniform float uPx;
void main(){
  float a=clamp((uPx*0.95-abs(vD))/(uPx*0.8),0.0,1.0)*vF*uBorder.a;
  oC=vec4(uBorder.rgb*a,a);
}`;
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
uniform sampler2D uArt;
uniform sampler2D uArt2;
uniform vec3 uRot;
uniform float uS;
uniform vec3 uSeaIn;
uniform vec3 uSeaMid;
uniform vec3 uSeaOut;
uniform vec4 uGrat;
uniform vec4 uBorder;
uniform vec4 uEdge;
uniform sampler2D uGrain;
uniform float uPA;
uniform float uFade;
uniform sampler2D uPLand;
uniform sampler2D uPArt;
uniform float uPOn;
uniform vec4 uP;
uniform vec4 uDrop[3];
uniform vec4 uDropC[3];
const float PI=3.14159265358979;
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnp(vec2 p,float per){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=h21(vec2(mod(i.x,per),i.y)),b=h21(vec2(mod(i.x+1.0,per),i.y)),c=h21(vec2(mod(i.x,per),i.y+1.0)),d=h21(vec2(mod(i.x+1.0,per),i.y+1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
vec3 layers(vec3 col,sampler2D tL,sampler2D tA,vec2 uv,vec2 gx,vec2 gy,float pa){
  vec4 L=textureGrad(tL,uv,gx,gy);
  col=L.rgb+col*(1.0-L.a);
  vec4 A=textureGrad(tA,uv,gx,gy)*pa;
  return A.rgb+col*(1.0-A.a);
}
float gridLine(float v,float step){
  float w=max(fwidth(v),1e-5);
  float d=abs(mod(v+step*0.5,step)-step*0.5);
  return clamp(0.8-d/w,0.0,1.0);
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
  vec3 col=uSeaMid;
  float lonD=lon*180.0/PI,latD=lat*180.0/PI;
  float lonS=lonD+180.0;
  float lonS2=mod(lonS+180.0,360.0);
  float wA=fwidth(lonS),wB=fwidth(lonS2);
  float la1=gridLine(lonS,10.0),la2=gridLine(lonS2,10.0);
  float lonLine=(wA<=wB?la1:la2)*step(abs(latD),80.0);
  float latLine=gridLine(latD,10.0)*step(abs(latD),80.5);
  col=mix(col,uGrat.rgb,max(lonLine,latLine)*uGrat.a);
  vec3 base=col;
  col=layers(base,uLand,uArt,uv,gx,gy,uPA);
  float dl=lon-uP.x;dl=dl-2.0*PI*floor((dl+PI)/(2.0*PI));
  vec2 puv=vec2(dl/uP.z+0.5,0.5-(lat-uP.y)/uP.w);
  vec2 pgx=dFdx(puv),pgy=dFdy(puv);
  float pw=smoothstep(0.0,0.06,min(min(puv.x,1.0-puv.x),min(puv.y,1.0-puv.y)))*uPOn;
  if(pw>0.0){vec3 cp=layers(base,uPLand,uPArt,puv,pgx,pgy,uPA);col=mix(col,cp,pw);}
  vec4 B2=textureGrad(uArt2,uv,gx,gy);
  float bm=uFade,bring=0.0;vec3 brc=vec3(0.0);bool anyD=false;
  for(int i=0;i<3;i++){
    vec4 c=uDropC[i];if(c.w<0.0)continue;
    if(!anyD){anyD=true;bm=0.0;}
    vec4 d=uDrop[i];
    float dlo=lon-d.x;dlo-=2.0*PI*floor((dlo+PI)/(2.0*PI));
    float ang=acos(clamp(sin(lat)*sin(d.y)+cos(lat)*cos(d.y)*cos(dlo),-1.0,1.0));
    vec2 q=vec2(dlo*cos(lat),lat-d.y)/max(d.z,1e-3)*d.w;
    float n=vn(q)*0.6+vn(q*2.3+7.0)*0.4;
    float p=c.w,e=1.0-pow(1.0-p,2.2);
    float front=d.z*(e*(0.6+0.9*n)+smoothstep(0.85,1.0,p)*1.6);
    float soft=d.z*0.05+1e-4;
    bm=max(bm,1.0-smoothstep(front-soft,front+soft,ang));
    float rg=exp(-pow((ang-front)/(soft*1.7),2.0))*smoothstep(0.0,0.05,p)*(1.0-smoothstep(0.85,1.0,p));
    if(rg>bring){bring=rg;brc=c.rgb;}
  }
  vec4 B=B2*bm;
  col=B.rgb+col*(1.0-B.a);
  col=mix(col,brc,bring*B2.a*0.38);       // the darker pigment line that bleeds along the front of the wash
  {   // a separate paper-grain plane wrapped around the earth: it is fixed to the map, so it turns with every drag (mip-mapped: never aliases)
    float cpp=1.0/(uS*max(z,0.2));
    float k2=clamp(1.0-cpp*1300.0*0.9,0.0,1.0);
    float gr=(textureGrad(uGrain,uv*3.0,gx*3.0,gy*3.0).r-0.5)*0.9+(vnp(vec2(lon,lat)*1300.0+vec2(5.0,3.0),8168.0)-0.5)*k2*0.45;
    col*=1.0+gr*0.19;
  }
  col=mix(col,uEdge.rgb,uEdge.a*clamp(1.15-(1.0-rr)*uS,0.0,1.0)*step(0.0,(1.0-rr)*uS));   // thin limb line
  oC=vec4(col*cov,cov);
}`;

let glVao=null;
let GLc=null,glProg=null,glLProg=null,glLVao=null,glLN=0,glLVaoC=null,glLNC=0,glLU={},glLost=false,glReady=false;
const GP={on:false,busy:false,plan:null,last:0,gen:0,tex:null,cA:null,aCtx:null,pg:null,rimW:1,still:0,t0:0,sched:false};   // the deep-zoom detail patch
const glU={},glT={land:null,art:null,art2:null};
let glTW=4096,glTH=2048,glRimW=1.6,glAniso=null;
const GL_WET1=5.2,GL_WET2=2.2,GL_INK=1.7;   // pooled wet edge and ink rim, in baked pixels at 4096 wide; the detail bake uses the same widths in screen pixels so the edge looks the same at every zoom
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
  GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.RGBA8,1,1,0,GLc.RGBA,GLc.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
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
  glRimW=1.6*glTW/4096;
  glPeq.scale(glTW/(2*Math.PI)).translate([glTW/2,glTH/2]);
  const p=GLc.createProgram();
  GLc.attachShader(p,glShader(GLc.VERTEX_SHADER,GL_VS));GLc.attachShader(p,glShader(GLc.FRAGMENT_SHADER,GL_FS));
  GLc.bindAttribLocation(p,0,"aC");GLc.linkProgram(p);
  if(!GLc.getProgramParameter(p,GLc.LINK_STATUS))throw new Error(GLc.getProgramInfoLog(p));
  glProg=p;
  ["uRes","uView","uRot","uS","uSeaIn","uSeaMid","uSeaOut","uGrat","uBorder","uEdge","uGrain","uPA","uFade","uLand","uArt","uArt2","uPLand","uPArt","uPOn","uP","uDrop","uDropC"].forEach(n=>glU[n]=GLc.getUniformLocation(p,n));
  const vao=GLc.createVertexArray();glVao=vao;GLc.bindVertexArray(vao);
  const b=GLc.createBuffer();GLc.bindBuffer(GLc.ARRAY_BUFFER,b);GLc.bufferData(GLc.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),GLc.STATIC_DRAW);
  GLc.enableVertexAttribArray(0);GLc.vertexAttribPointer(0,2,GLc.FLOAT,false,0,0);
  {   // the grain plane: white noise baked once, wrapped around the sphere by the shader
    const GW=isTouch?2048:4096,GH=GW/2,data=new Uint8Array(GW*GH);let x=2463534242;
    for(let i=0;i<data.length;i++){x^=x<<13;x^=x>>>17;x^=x<<5;data[i]=x&255}
    const t=GLc.createTexture();GLc.bindTexture(GLc.TEXTURE_2D,t);
    GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_WRAP_S,GLc.REPEAT);GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_WRAP_T,GLc.REPEAT);
    GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_MIN_FILTER,GLc.LINEAR_MIPMAP_LINEAR);GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_MAG_FILTER,GLc.LINEAR);
    GLc.pixelStorei(GLc.UNPACK_ALIGNMENT,1);GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.R8,GW,GH,0,GLc.RED,GLc.UNSIGNED_BYTE,data);GLc.generateMipmap(GLc.TEXTURE_2D);
    GLc.pixelStorei(GLc.UNPACK_ALIGNMENT,4);glT.grain=t;
  }
  glT.land=glTexNew(1,1);glT.art=glTexNew(1,1);glT.art2=glTexNew(1,1);
  GP.tex={land:glTexNew(1,1),art:glTexNew(1,1)};
  GLc.disable(GLc.DEPTH_TEST);GLc.disable(GLc.BLEND);
  glLInit();
  return true;
}
/* ---- border hairlines: every segment of the (deduplicated) country mesh as one instance, drawn in a second pass ---- */
function glLInit(){
  const p=GLc.createProgram();
  GLc.attachShader(p,glShader(GLc.VERTEX_SHADER,GL_LVS));GLc.attachShader(p,glShader(GLc.FRAGMENT_SHADER,GL_LFS));
  GLc.bindAttribLocation(p,0,"aA");GLc.bindAttribLocation(p,1,"aB");GLc.linkProgram(p);
  if(!GLc.getProgramParameter(p,GLc.LINK_STATUS))throw new Error(GLc.getProgramInfoLog(p));
  glLProg=p;["uRes","uView","uRot","uS","uPx","uBorder"].forEach(n=>glLU[n]=GLc.getUniformLocation(p,n));
  glLVao=GLc.createVertexArray();
}
function glLMake(mesh){
  const D=Math.PI/180,out=[];
  const v=(c)=>{const lo=c[0]*D,la=c[1]*D,cl=Math.cos(la);return [cl*Math.cos(lo),cl*Math.sin(lo),Math.sin(la)]};
  mesh.coordinates.forEach(line=>{
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i];
      if(Math.abs(a[0])>=179.999&&Math.abs(b[0])>=179.999&&a[0]*b[0]>0)continue;      // the antimeridian cut and the pole are not borders
      if(a[1]<=-89.99&&b[1]<=-89.99)continue;
      const A=v(a),B=v(b);out.push(A[0],A[1],A[2],B[0],B[1],B[2]);
    }
  });
  const data=new Float32Array(out),vao=GLc.createVertexArray();
  GLc.bindVertexArray(vao);
  const buf=GLc.createBuffer();GLc.bindBuffer(GLc.ARRAY_BUFFER,buf);GLc.bufferData(GLc.ARRAY_BUFFER,data,GLc.STATIC_DRAW);
  GLc.enableVertexAttribArray(0);GLc.vertexAttribPointer(0,3,GLc.FLOAT,false,24,0);GLc.vertexAttribDivisor(0,1);
  GLc.enableVertexAttribArray(1);GLc.vertexAttribPointer(1,3,GLc.FLOAT,false,24,12);GLc.vertexAttribDivisor(1,1);
  GLc.bindVertexArray(null);
  return {vao,n:data.length/6};
}
function glLBuild(){
  const all=glLMake(topojson.mesh(WORLD,WORLD.objects.countries)),co=glLMake(topojson.mesh(WORLD,WORLD.objects.countries,(a,b)=>a===b));   // all lines, and coastlines only (borderless mode)
  glLVao=all.vao;glLN=all.n;glLVaoC=co.vao;glLNC=co.n;
}function glUploadFull(tex,canvas,fmt){
  GLc.bindTexture(GLc.TEXTURE_2D,tex);
  GLc.pixelStorei(GLc.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);GLc.pixelStorei(GLc.UNPACK_FLIP_Y_WEBGL,false);
  GLc.texImage2D(GLc.TEXTURE_2D,0,GLc.RGBA8,GLc.RGBA,GLc.UNSIGNED_BYTE,canvas);
  if(fmt==="nomip")GLc.texParameteri(GLc.TEXTURE_2D,GLc.TEXTURE_MIN_FILTER,GLc.LINEAR);   // no mip levels: a mip-mapped filter would make the texture incomplete and sample as black
  else GLc.generateMipmap(GLc.TEXTURE_2D);
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
    {const c0=d3.color(glLandColor(key));if(c0){const k=glTW/4096,cx=st.ctx;cx.save();cx.clip();cx.lineJoin="round";   // wet-edge pigment pool just inside every coast and border
      if(nbNow()&&key!=="nopl"){const ids=new Set(fs.map(f=>f.id));cx.beginPath();glPath(topojson.merge(WORLD,WORLD.objects.countries.geometries.filter(g=>ids.has(g.id))))}   // borderless: pool only along the merged outline
      cx.strokeStyle=c0.darker(.55).copy({opacity:.2}).formatRgb();cx.lineWidth=GL_WET1*k;cx.stroke();
      cx.strokeStyle=c0.darker(.75).copy({opacity:.2}).formatRgb();cx.lineWidth=GL_WET2*k;cx.stroke();cx.restore()}}
    return st.i>=st.list.length;
  },null);
  job.finish=()=>{
    if(job.st){glUploadFull(glT.land,job.st.c);job.st=null}
    glLandRun=false;
    if(glLandAgain)glStartLand();
    render(true);
  };
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
  if(tag.indexOf("~")<0){   // (borderless mode draws no per-country rim)
    if(!shown){ctx.lineWidth=rimW*GL_INK;ctx.globalAlpha=.35;ctx.strokeStyle=CV.pd[fa.r];ctx.stroke()}   // one crisp ink rim
    ctx.globalAlpha=shown?.25:.5;ctx.strokeStyle=CV.pd[fa.r];ctx.lineWidth=shown?rimW*.75:rimW;ctx.stroke();
  }
  if(!shown&&tag.slice(-2)==="|m"&&isFinite(cx+cy+S2)){   // mastered: a pearly foil sheen with a few glints instead of an outline
    ctx.save();ctx.beginPath();pgen(f);ctx.clip();ctx.globalAlpha=1;
    const g=ctx.createLinearGradient(cx-S2*.6,cy-S2*.6,cx+S2*.6,cy+S2*.6);
    [[0,"rgba(255,255,255,0)"],[.30,"rgba(255,244,214,0)"],[.40,"rgba(255,250,232,.5)"],[.48,"rgba(255,222,140,.36)"],[.56,"rgba(235,246,255,.5)"],[.66,"rgba(255,214,235,.22)"],[.74,"rgba(255,255,255,0)"],[1,"rgba(255,236,190,.16)"]].forEach(c=>g.addColorStop(c[0],c[1]));
    ctx.fillStyle=g;ctx.fillRect(cx-S2,cy-S2,S2*2,S2*2);
    const rr=seeded("foil-"+id),n=Math.round(Math.max(4,Math.min(18,S2/14)));ctx.fillStyle="rgba(255,255,255,.95)";
    for(let i=0;i<n;i++){const x=b[0][0]+rr()*(b[1][0]-b[0][0]),y=b[0][1]+rr()*(b[1][1]-b[0][1]),R=Math.max(1.8,Math.min(8,S2*(.014+rr()*.022)));
      ctx.beginPath();ctx.moveTo(x,y-R*2);ctx.quadraticCurveTo(x,y,x+R*2,y);ctx.quadraticCurveTo(x,y,x,y+R*2);ctx.quadraticCurveTo(x,y,x-R*2,y);ctx.quadraticCurveTo(x,y,x,y-R*2);ctx.fill();
      ctx.beginPath();ctx.arc(x,y,R*.45,0,6.2832);ctx.fill()}
    ctx.restore();
  }
  ctx.restore();
}
function glEnsureArt(){if(glArt)return;glArt=glMakeCanvas(glTW,glTH);glArtCtx=glArt.getContext("2d");glUploadFull(glT.art,glArt)}   // the art texture must exist at full size before any sub-rect upload
function glDesired(){
  const F=cf(),speed=S.mode==="speed",out=new Map();
  for(let i=0;i<playable.length;i++){
    const id=playable[i].id;if(glFading.has(id))continue;
    const found=F.has(id),shown=!speed&&!SESS&&S.mode!=="hot"&&!found&&S.shown.has(id);
    if(found||shown)out.set(id,(shown?"w|":"f|")+artKey(id)+(nbNow()?"~":"")+(found&&jrLevel(id)===3?"|m":""));
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
  glArtState.forEach((v,id)=>{if(want.get(id)!==v&&!(want.has(id)&&want.get(id).replace("|m","")===v.replace("|m","")))full=true});   // a country gaining its gold rim only needs a small redraw
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
/* ---- the colour drop: the painting bleeds out of the drop point inside the shader (no SVG filters, no extra layers) ---- */
const GB={slots:[null,null,null],cv:null,ctx:null,ready:false,dArr:new Float32Array(12),cArr:new Float32Array(12)};
GLX.bloomStart=function(id,ll,rMax,shown,region){
  const si=GB.slots.findIndex(x=>!x),f=byId[id];if(si<0||!f)return -1;
  if(!GB.ready){GB.cv=glMakeCanvas(glTW,glTH);GB.ctx=GB.cv.getContext("2d");glUploadFull(glT.art2,GB.cv);GB.ready=true}
  glDrawArt(GB.ctx,id,(shown?"w|":"f|")+artKey(id));
  const yb=glBoundsY(f),y0=Math.max(0,Math.floor(yb[0]-12)),y1=Math.min(glTH,Math.ceil(yb[1]+12));
  glUploadBand(glT.art2,GB.cv,y0,y1-y0);
  const c=glRGB(CV.pd[region]||"#7a6a58");
  GB.slots[si]={id,y0,y1,lon:ll[0]*Math.PI/180,lat:ll[1]*Math.PI/180,rMax,col:c,p:0,shown};
  requestRender();return si;
};
GLX.bloomP=function(si,p){const b=GB.slots[si];if(b)b.p=p};
GLX.bloomEnd=function(si){
  const b=GB.slots[si];if(!b)return;GB.slots[si]=null;
  GB.ctx.clearRect(0,b.y0,glTW,b.y1-b.y0);
  GB.slots.forEach(o=>{if(o&&o.y0<b.y1&&o.y1>b.y0)glDrawArt(GB.ctx,o.id,(o.shown?"w|":"f|")+artKey(o.id))});   // redraw any other live drop that shared those rows
  glUploadBand(glT.art2,GB.cv,b.y0,b.y1-b.y0);requestRender();
};
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
  glUploadFull(glT.art2,c);GB.ready=false;
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
  if(moving||animating){GP.still=0;return}                       // never bake while a drag or zoom is running
  if(!GP.still)GP.still=now;
  if(now-GP.still<260){if(!GP.sched){GP.sched=true;setTimeout(()=>{GP.sched=false;render(true)},280)}return}
  if(GP.plan&&now-GP.last<350)return;
  if(!glPatchOK(w)){GP.last=now;glPatchBake(w)}
  else if(!GP.on&&GP.plan){GP.on=true;GP.t0=now;requestRender()}      // an earlier patch still fits the view again: fade it back in
}
function glPatchBake(pl){
  GP.busy=true;const gen=GP.gen,D=180/Math.PI;
  const proj=d3.geoEquirectangular().rotate([-pl.lon0*D,0]).center([0,pl.lat0*D]).scale(pl.PW/pl.lonSpan).translate([pl.PW/2,pl.PH/2]).precision(.2);
  const pg=d3.geoPath(proj);
  const pxT=pl.s*pl.lonSpan/pl.PW,rimW=Math.max(1,.8/pxT);
  const wr=Math.hypot(pl.lonSpan*Math.cos(pl.lat0),pl.latSpan)/2+.05,cen=[pl.lon0*D,pl.lat0*D];
  const fs=features.filter(f=>!f._c||!isFinite(f._c[0])||f._r>=3||d3.geoDistance(f._c,cen)-f._r<wr);
  const stateArt=[...glArtState.entries()].filter(([id])=>fs.includes(byId[id]));
  const job=glJob(j=>{
    if(!j.st){
      const mk=()=>glMakeCanvas(pl.PW,pl.PH),cl=mk(),ca=mk(),groups=new Map();
      fs.forEach(f=>{const k=glLandKey(f);let a=groups.get(k);if(!a){a=[];groups.set(k,a)}a.push(f)});
      j.st={cl,ca,lc:cl.getContext("2d"),ac:ca.getContext("2d"),gl:[...groups.entries()],gi:0,ai:0};
    }
    const st=j.st,t0=performance.now();
    while(performance.now()-t0<9){
      if(st.gi<st.gl.length){const [key,list]=st.gl[st.gi++];pg.context(st.lc);st.lc.beginPath();list.forEach(f=>pg(f));st.lc.fillStyle=glLandColor(key);st.lc.fill();
        {const c0=d3.color(glLandColor(key));if(c0&&key!=="nopl"){const lc=st.lc,u=.46/pxT;lc.save();lc.clip();lc.lineJoin="round";   // the same pooled wet edge as the world bake
          lc.strokeStyle=c0.darker(.55).copy({opacity:.2}).formatRgb();lc.lineWidth=GL_WET1*u;lc.stroke();
          lc.strokeStyle=c0.darker(.75).copy({opacity:.2}).formatRgb();lc.lineWidth=GL_WET2*u;lc.stroke();lc.restore()}}
        continue}
      if(st.ai<stateArt.length){const [id,tag]=stateArt[st.ai++];glDrawArt(st.ac,id,tag,pg,rimW);continue}
      return true;
    }
    return false;
  },null);
  job.finish=()=>{
    const st=job.st;GP.busy=false;
    if(!st||gen!==GP.gen||!GLX.on||glLost)return;                // the picture changed while baking: the next tick starts over
    glUploadFull(GP.tex.land,st.cl,"nomip");glUploadFull(GP.tex.art,st.ca,"nomip");
    GP.cA=st.ca;GP.aCtx=st.ac;GP.pg=pg;GP.rimW=rimW;GP.plan=pl;GP.on=true;GP.t0=performance.now();
    job.st=null;render(true);
  };
}
function glPatchAdd(ids){
  if(!GP.on||!GP.aCtx){if(GP.busy)GP.gen++;return}
  ids.forEach(id=>glDrawArt(GP.aCtx,id,glArtState.get(id),GP.pg,GP.rimW));
  glUploadFull(GP.tex.art,GP.cA,"nomip");
}

/* ---- per-frame draw ---- */
GLX.resize=function(){
  if(!GLX.hasGL)return;
  const dpr=cvDpr;
  const nw=Math.round(innerWidth*dpr),nh=Math.round(innerHeight*dpr);
  if(glC.width!==nw||glC.height!==nh){glC.width=nw;glC.height=nh}
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
  const ed=glRGB(CV.edge);GLc.uniform4f(glU.uEdge,ed[0],ed[1],ed[2],Math.min(1,ed[3]*1.6));
  GLc.uniform4f(glU.uGrat,gr[0],gr[1],gr[2],gr[3]);GLc.uniform4f(glU.uBorder,bo[0],bo[1],bo[2],bo[3]);
  GLc.uniform1f(glU.uPA,cvPA);GLc.uniform1f(glU.uFade,glFadeV);
  for(let i=0;i<3;i++){const b=GB.slots[i];
    if(b){GB.dArr.set([b.lon,b.lat,b.rMax,3.2],i*4);GB.cArr.set([b.col[0],b.col[1],b.col[2],b.p],i*4)}
    else{GB.dArr.set([0,0,1,1],i*4);GB.cArr.set([0,0,0,-1],i*4)}}
  GLc.uniform4fv(glU.uDrop,GB.dArr);GLc.uniform4fv(glU.uDropC,GB.cArr);
  glPatchTick(s);
  const pl=GP.plan,usePatch=GP.on&&pl&&pl.s*.5<=s&&s<=pl.s*2.2;
  const pf=usePatch?Math.min(1,(performance.now()-GP.t0)/320):0;
  GLc.uniform1f(glU.uPOn,pf);
  if(usePatch){GLc.uniform4f(glU.uP,pl.lon0,pl.lat0,pl.lonSpan,pl.latSpan);if(pf<1)requestRender()}
  GLc.activeTexture(GLc.TEXTURE0);GLc.bindTexture(GLc.TEXTURE_2D,glT.land);GLc.uniform1i(glU.uLand,0);
  GLc.activeTexture(GLc.TEXTURE1);GLc.bindTexture(GLc.TEXTURE_2D,glT.grain);GLc.uniform1i(glU.uGrain,1);
  GLc.activeTexture(GLc.TEXTURE2);GLc.bindTexture(GLc.TEXTURE_2D,glT.art);GLc.uniform1i(glU.uArt,2);
  GLc.activeTexture(GLc.TEXTURE3);GLc.bindTexture(GLc.TEXTURE_2D,glT.art2);GLc.uniform1i(glU.uArt2,3);
  GLc.activeTexture(GLc.TEXTURE4);GLc.bindTexture(GLc.TEXTURE_2D,GP.tex.land);GLc.uniform1i(glU.uPLand,4);
  GLc.activeTexture(GLc.TEXTURE6);GLc.bindTexture(GLc.TEXTURE_2D,GP.tex.art);GLc.uniform1i(glU.uPArt,6);
  GLc.drawArrays(GLc.TRIANGLE_STRIP,0,4);
  if(glLN){                                                      // border hairlines, always about 1 device pixel wide
    GLc.useProgram(glLProg);GLc.bindVertexArray(nbNow()?glLVaoC:glLVao);GLc.enable(GLc.BLEND);GLc.blendFunc(GLc.ONE,GLc.ONE_MINUS_SRC_ALPHA);
    GLc.uniform2f(glLU.uRes,innerWidth,innerHeight);GLc.uniform3f(glLU.uView,stageLeft+W/2,stageTop+cy(),s);
    GLc.uniform3f(glLU.uRot,r[0]*D,r[1]*D,r[2]*D);GLc.uniform1f(glLU.uS,s);GLc.uniform1f(glLU.uPx,(S.mode!=="speed"&&isDark()?1.25:1)/cvDpr);
    const lc=S.mode==="speed"?[.55,.86,1,.5]:isDark()?[1,.96,.86,.95]:[.27,.31,.36,.55];   // cool slate on paper, soft cream on the dark sea
    GLc.uniform4f(glLU.uBorder,lc[0],lc[1],lc[2],lc[3]);
    GLc.drawArraysInstanced(GLc.TRIANGLE_STRIP,0,4,nbNow()?glLNC:glLN);
    GLc.disable(GLc.BLEND);GLc.bindVertexArray(glVao);
  }
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
  glLBuild();
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
      glC.addEventListener("webglcontextrestored",()=>{glLost=false;try{glPatchInvalidate();GB.ready=false;GB.slots=[null,null,null];glBusy=0;glFading.clear();glFadeQueue.length=0;glSyncQ=false}catch(e){}GLX.hasGL=false;try{GLX.hasGL=glInitGL()}catch(e){console.warn("GPU globe could not restart",e)}if(GLX.hasGL){glReady=false;GLX.on=false;GLX.landDone=false;GLX.linesDone=false;glArtState=new Map();glArt=null;glLandRun=false;glArtRun=false;glJobs=[];GLX.resize();glBegin()}});
      GLX.resize();
      setTimeout(glBegin,50);
    }
  }catch(e){console.warn("GPU globe unavailable, using the canvas engine",e);GLX.hasGL=false;GLX.on=false}
}
