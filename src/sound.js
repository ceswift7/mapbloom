/* ======================================================================
   SOUND: everything is synthesised (no audio files). One warm reverb.
   The calm drone sits on D major (D-A-D-F#); speed music is in D major too,
   so switching modes is seamless: the beat fades in over the same drone.
   ====================================================================== */
let actx=null,master=null,dryBus=null,wetBus=null,noiseBuf=null,brushG=null,brushTarget=0;
function makeIR(sec){
  const len=Math.floor(actx.sampleRate*sec),b=actx.createBuffer(2,len,actx.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);let p=0;
    for(let i=0;i<len;i++){const x=(Math.random()*2-1)*Math.pow(1-i/len,2.6);p=p*.55+x*.45;d[i]=p}}
  return b;
}
/* the reverb impulse (2.6 s stereo) and the noise buffer are generated before the first tap, off the main thread, so the tap itself does no number crunching */
let AUDIO_PREP=null,actxPre=null;
function audioPrep(){
  if(AUDIO_PREP||!S.sound)return;AUDIO_PREP={};
  try{actxPre=new (window.AudioContext||window.webkitAudioContext)()}catch(e){actxPre=null}   // created early (it stays suspended until the first tap); the impulse must be built at its sample rate
  const SR=actxPre?actxPre.sampleRate:48000,src=`onmessage=e=>{const SR=e.data,len=Math.floor(SR*2.6),ir=[new Float32Array(len),new Float32Array(len)];
    for(let c=0;c<2;c++){const d=ir[c];let p=0;for(let i=0;i<len;i++){const x=(Math.random()*2-1)*Math.pow(1-i/len,2.6);p=p*.55+x*.45;d[i]=p}}
    const nz=new Float32Array(SR*2);for(let i=0;i<nz.length;i++)nz[i]=Math.random()*2-1;
    postMessage({ir:ir,nz:nz,SR:SR},[ir[0].buffer,ir[1].buffer,nz.buffer])}`;
  try{const w=new Worker(URL.createObjectURL(new Blob([src],{type:"text/javascript"})));w.onmessage=e=>{AUDIO_PREP=e.data;w.terminate()};w.postMessage(SR)}catch(e){AUDIO_PREP=null}
}
const irFromPrep=()=>{if(!AUDIO_PREP||!AUDIO_PREP.ir||AUDIO_PREP.SR!==actx.sampleRate)return null;const b=actx.createBuffer(2,AUDIO_PREP.ir[0].length,AUDIO_PREP.SR);b.copyToChannel(AUDIO_PREP.ir[0],0);b.copyToChannel(AUDIO_PREP.ir[1],1);return b};
const noiseFromPrep=()=>{if(!AUDIO_PREP||!AUDIO_PREP.nz)return null;const b=actx.createBuffer(1,AUDIO_PREP.nz.length,AUDIO_PREP.SR);b.copyToChannel(AUDIO_PREP.nz,0);return b};
audioPrep();
function AC(kind){                                   // kind: "mus" for music/drone, otherwise sound effects
  if(!S.sound)return null;
  if(kind==="mus"?!S.music:!S.sfx)return null;
  try{
    if(!actx){
      actx=actxPre||new (window.AudioContext||window.webkitAudioContext)();actxPre=null;
      master=actx.createGain();master.gain.value=.9*S.vol;
      const comp=actx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;comp.attack.value=.01;comp.release.value=.25;
      master.connect(comp).connect(actx.destination);
      dryBus=actx.createGain();dryBus.connect(master);
      const conv=actx.createConvolver();conv.buffer=irFromPrep()||makeIR(2.6);
      wetBus=actx.createGain();wetBus.gain.value=.5;wetBus.connect(conv).connect(master);
      noiseBuf=noiseFromPrep();
      if(!noiseBuf){noiseBuf=actx.createBuffer(1,actx.sampleRate*2,actx.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1}
      const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
      const bp=actx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1500;bp.Q.value=.6;
      brushG=actx.createGain();brushG.gain.value=0;
      src.connect(bp).connect(brushG);send(brushG,.15);src.start();
    }
    if(actx.state==="suspended")actx.resume();
    applyVol();
    return actx;
  }catch(e){return null}
}
function applyVol(){if(actx&&master){master.gain.cancelScheduledValues(actx.currentTime);master.gain.setTargetAtTime(S.sound?.9*S.vol:0,actx.currentTime,.05)}}
function send(node,wet){node.connect(dryBus);if(wet){const g=actx.createGain();g.gain.value=wet;node.connect(g).connect(wetBus)}}
function env(g,t,peak,attack,dur){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur)}
function pluck(f,t,vol,dur=1.5,wet=.4){            // soft marimba-like note
  [[1,1,dur],[2,.3,dur*.5],[4.02,.14,.18]].forEach(([m,a,d])=>{
    const o=actx.createOscillator(),g=actx.createGain();o.type="sine";o.frequency.value=f*m;
    env(g,t,vol*a,.005,d);o.connect(g);send(g,wet);o.start(t);o.stop(t+d+.05);
  });
}
function bell(f,t,vol,dur=2.4,wet=.6){               // glassy bell, inharmonic partials
  [[1,1,1],[2.76,.35,.5],[5.4,.12,.25]].forEach(([m,a,d])=>{
    const o=actx.createOscillator(),g=actx.createGain();o.type="sine";o.frequency.value=f*m;
    env(g,t,vol*a,.008,dur*d);o.connect(g);send(g,wet);o.start(t);o.stop(t+dur*d+.05);
  });
}
function blip(t,f0,f1,dur,vol,wet=.35){              // water drop
  const o=actx.createOscillator(),g=actx.createGain();o.type="sine";
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  env(g,t,vol,.004,dur);o.connect(g);send(g,wet);o.start(t);o.stop(t+dur+.05);
}
function noise(t,dur,{type="bandpass",f0=1000,f1=f0,q=1,vol=.03,attack=.02,wet=.3}={}){
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type=type;f.Q.value=q;
  f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const g=actx.createGain();env(g,t,vol,attack,dur);
  s.connect(f).connect(g);send(g,wet);s.loop=true;s.start(t,Math.random()*1.5);s.stop(t+dur+.05);
}
function crackle(t,dur,vol){                         // paper rustle
  const s=actx.createBufferSource();s.buffer=noiseBuf;s.loop=true;
  const hp=actx.createBiquadFilter();hp.type="highpass";hp.frequency.value=1800;
  const g=actx.createGain();g.gain.setValueAtTime(0,t);
  for(let x=0;x<dur;x+=.014)g.gain.setValueAtTime(Math.random()<.45?Math.random()*vol:0,t+x);
  g.gain.setValueAtTime(0,t+dur);
  s.connect(hp).connect(g);send(g,.18);s.start(t,Math.random()*1.5);s.stop(t+dur+.02);
}
const ROOT={Africa:293.66,Americas:392,Asia:329.63,Europe:261.63,Oceania:349.23};
const PENT=[0,2,4,7,9,12,14,16,19];
const note=(r,i)=>(ROOT[r]||ROOT.Europe)*Math.pow(2,PENT[i]/12);   // areas such as the Pacific Islands borrow a continent's scale

let sndStreakPrev=0,sndKeyT=0;
function buzz(p){if(reduced||!S.vib||!S.sfx||!navigator.vibrate)return;try{navigator.vibrate(p)}catch(e){}}   // short haptic pulses on phones that have a motor
function sndHit(region,first){
  buzz(first?[14,40,14]:12);const c=AC();if(!c)return;const t=c.currentTime+.02,a=Math.floor(Math.random()*4);
  const st=S.streak||0,up=Math.pow(2,Math.min(5,Math.floor(st/2))*2/12);   // a run of first-try finds climbs the scale, two notes at a time
  sndStreakPrev=st;
  const idx=first?[a,a+1,a+3,a+4]:[a,a+2,a+3];
  idx.forEach((n,i)=>pluck(note(region,n)*up,t+i*.1,.085-i*.01));
  if(first)bell(note(region,8)*up,t+.44,.035,2.8);
}
function sndHeat(w){   // Hot & cold: the warmer the guess, the higher and brighter the note
  buzz(8+Math.round(w*28));const c=AC();if(!c)return;const t=c.currentTime+.01,f=196*Math.pow(2,w*1.9);
  pluck(f,t,.05+.06*w,1.2);
  if(w>.55){bell(f*2,t+.05,.02+.03*w,1.6);if(w>.8)bell(f*3,t+.1,.03,1.8)}
}
function sndBorder(){buzz([18,40,18,40,18]);const c=AC();if(!c)return;const t=c.currentTime+.01;bell(784,t,.045,1.8);bell(1174.66,t+.13,.05,2.2)}
function sndKey(){const c=AC();if(!c)return;const n=performance.now();if(n-sndKeyT<45)return;sndKeyT=n;blip(c.currentTime,2300+Math.random()*400,1800,.03,.012,.05)}
function sndAccept(){const c=AC();if(!c)return;pluck(659.25,c.currentTime,.05,.7,.3)}
function sndThump(){const c=AC();if(!c)return;const t=c.currentTime;blip(t,130,55,.16,.07,.1);noise(t,.07,{type:"lowpass",f0:600,q:.7,vol:.03,wet:.1})}
function sndTheme(dark){
  const c=AC();if(!c)return;const t=c.currentTime;
  if(dark){noise(t,.6,{f0:400,f1:3200,q:1.1,vol:.02,attack:.4,wet:.5});[1318.5,1760,2093].forEach((f,i)=>bell(f,t+.25+i*.09,.014,1.8))}
  else{noise(t,.55,{f0:3200,f1:500,q:1,vol:.02,attack:.05,wet:.4});pluck(783.99,t+.2,.04,1.2);pluck(1046.5,t+.3,.03,1.2)}
}
function unlockAudio(c){if(!c)return;try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0)}catch(e){}}
let audioQ=[],sndChipTm=null;
function showSoundChip(){let b=document.getElementById("soundChip");if(!b){b=el("button",{id:"soundChip",class:"btn soundchip",onclick:()=>{AC();audioGesture()}},"Tap for sound");document.body.append(b)}b.hidden=false}
function hideSoundChip(){clearTimeout(sndChipTm);const b=document.getElementById("soundChip");if(b)b.hidden=true}
function audioFlush(){
  if(!actx||actx.state!=="running")return;
  const q=audioQ;audioQ=[];hideSoundChip();
  q.forEach(o=>{if(performance.now()-o.t<4500)try{o.fn()}catch(e){}});
}
function audioReady(fn){
  const c=AC();if(!c)return;
  if(c.state==="running"){fn();return}
  audioQ.push({fn,t:performance.now()});
  if(!c.__sc){c.__sc=1;c.addEventListener("statechange",audioFlush)}
  c.resume().then(audioFlush,()=>{});
  clearTimeout(sndChipTm);sndChipTm=setTimeout(()=>{if(actx&&actx.state!=="running"&&audioQ.length)showSoundChip()},700);
}
function audioGesture(){
  if(!S.sound)return;
  if(!actx){if(introState==="wait"||introState==="ready")return;AC();return}
  if(actx.state!=="running")actx.resume().then(audioFlush,()=>{});
}/* the opening is all in one key (C major pentatonic): the page sound, the drops, the spin plucks and the closing chord share it.
   Each drop is tuned: the water "plop" slides down onto the bell's own pitch, so it never fights the note. v (0..1) varies speed, loudness and a few cents of tuning per drop. */
function sndIntroDrop(f,v){const c=AC();if(!c)return;const t=c.currentTime;v=v==null?.5:v;f=(f||523.25)*Math.pow(2,(v-.5)*.016);
  blip(t,f*(2.7+v*.9),f,.15+(1-v)*.1,.16+v*.05);blip(t+.05,f*4,f*2,.1,.05+v*.03);bell(f,t+.02,.04+v*.025,1.5+(1-v)*.6);noise(t,.3,{type:"lowpass",f0:900,f1:300,q:.6,vol:.035,wet:.4})}
function sndBrush(done){const c=AC();if(!c)return;const t=c.currentTime;if(done){noise(t,.7,{type:"highpass",f0:2800,f1:6500,q:.5,vol:.01,attack:.3,wet:.5});bell(1046.5,t+.05,.012,2.2,.7)}else{const j=.85+Math.random()*.3;noise(t,.2,{type:"bandpass",f0:700*j,f1:2400*j,q:.9,vol:.014,wet:.3})}}
function sndIntroFall(){const c=AC();if(!c)return;const t=c.currentTime;crackle(t,.3,.03);bell(261.63,t+.04,.02,1.8,.7);noise(t,.43,{f0:2600,f1:700,q:.8,vol:.026,attack:.25,wet:.3})}   // the tap: a paper rustle and a low C that the drops then play over
function sndDrop(){const c=AC();if(!c)return;const t=c.currentTime;blip(t,1100,380,.16,.07);blip(t+.07,1800,700,.1,.025)}
function sndBloom(fast){
  const c=AC();if(!c)return;const t=c.currentTime,k=fast?.45:1;
  noise(t,2.2*k,{f0:350,f1:1700,q:.5,vol:.05,attack:.9*k,wet:.55});
  noise(t+.1,1.8*k,{type:"lowpass",f0:600,f1:200,q:.4,vol:.05,attack:.5*k,wet:.4});
  if(!fast)for(let i=0;i<4;i++)blip(t+.5+Math.random()*1.3,1500+Math.random()*1800,900,.09,.012,.6);
}
function sndMiss(){buzz([30,50,30]);const c=AC();if(!c)return;const t=c.currentTime;blip(t,230,150,.22,.06,.2);noise(t,.08,{type:"lowpass",f0:700,q:.7,vol:.03,wet:.1});if(sndStreakPrev>=3)blip(t+.12,340,170,.34,.04,.3);sndStreakPrev=0}   // a broken streak slides down
function sndOcean(){const c=AC();if(!c)return;const t=c.currentTime;blip(t,520,250,.2,.05,.45);noise(t,.3,{f0:500,f1:250,q:.8,vol:.012,wet:.5})}
function sndShow(){const c=AC();if(!c)return;const t=c.currentTime;[784,659.25,523.25].forEach((f,i)=>bell(f,t+i*.16,.04,2.2))}
function sndFly(sec){const c=AC();if(!c)return;noise(c.currentTime,Math.max(.6,sec),{f0:260,f1:1100,q:.9,vol:.022,attack:sec*.45,wet:.5})}
function sndCard(open){const c=AC();if(!c)return;crackle(c.currentTime,open?.2:.11,open?.03:.016)}
function sndTick(){const c=AC();if(!c)return;const t=c.currentTime;blip(t,1500,1100,.05,.03,.2)}
function sndFlourish(region){
  buzz([30,40,30,40,30,40,90]);const c=AC();if(!c)return;const t=c.currentTime+.05;
  [0,1,2,3,4,6].forEach((n,i)=>pluck(note(region,n),t+i*.09,.06,1.8,.6));
  bell(note(region,8),t+.6,.04,3.2);
}
function sndBadge(){buzz([60,40,30]);const c=AC();if(!c)return;const t=c.currentTime;blip(t,150,68,.16,.08,.1);noise(t,.06,{type:"lowpass",f0:900,q:.7,vol:.04,wet:.1});[587.33,739.99,880,1174.66].forEach((f,i)=>bell(f,t+.09+i*.09,.035,2.4))}   // an inked-stamp thud, then the sparkle
function sndPencil(sec){const c=AC();if(!c)return;const t=c.currentTime;noise(t,Math.max(.5,sec),{f0:2600,f1:4300,q:1.5,vol:.016,attack:.18,wet:.15})}
function sndPage(){const c=AC();if(!c)return;crackle(c.currentTime,.4,.035);noise(c.currentTime,.5,{f0:900,f1:2600,q:.8,vol:.012,attack:.2,wet:.2});bell(587.33,c.currentTime+.05,.02,1.6)}
function brushKick(mag){if(!brushG)return;brushTarget=Math.max(brushTarget,Math.min(.02,mag*.0014))}
function brushTick(){
  if(!brushG||!actx)return;
  brushG.gain.setTargetAtTime(S.sound&&S.sfx?brushTarget:0,actx.currentTime,.05);brushTarget*=.82;
  if(brushTarget<.0003)brushTarget=0;
}
/* ---- SPEED MUSIC: upbeat, in D major (I-vi-IV-V = D, Bm, G, A), 136 → 152 BPM, layers grow with progress ---- */
const MUS={on:false,tm:null,t:0,step:0,bpm:136,lvl:1,bus:null};
const BAR=[
  {r:293.66,third:4,bass:146.83,lead:[739.99,880.00,739.99,659.25]},   // D : F# A F# E
  {r:246.94,third:3,bass:123.47,lead:[587.33,739.99,587.33,493.88]},   // Bm: D F# D B
  {r:196.00,third:4,bass:98.00, lead:[493.88,587.33,783.99,587.33]},   // G : B D G D
  {r:220.00,third:4,bass:110.00,lead:[659.25,880.00,659.25,554.37]}    // A : E A E C#
];
const ARP=[0,2,4,2, 1,3,5,3, 0,2,4,2, 1,3,5,4];
const BASSP={0:1,3:1,6:2,8:1,11:1,14:2};
function mNoise(t,dur,type,f,q,vol){
  const s=actx.createBufferSource();s.buffer=noiseBuf;s.loop=true;
  const fl=actx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  const g=actx.createGain();env(g,t,vol,.002,dur);
  s.connect(fl).connect(g).connect(MUS.bus);s.start(t,Math.random()*1.5);s.stop(t+dur+.03);
}
function mKick(t){
  const o=actx.createOscillator(),g=actx.createGain();o.type="sine";
  o.frequency.setValueAtTime(155,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);
  env(g,t,.8,.002,.26);o.connect(g).connect(MUS.bus);o.start(t);o.stop(t+.3);
}
function mBass(f,t,len){
  const o=actx.createOscillator(),fl=actx.createBiquadFilter(),g=actx.createGain();
  o.type="sawtooth";o.frequency.value=f;fl.type="lowpass";fl.Q.value=4;
  fl.frequency.setValueAtTime(900,t);fl.frequency.exponentialRampToValueAtTime(260,t+len);
  env(g,t,.26,.006,len);o.connect(fl).connect(g).connect(MUS.bus);o.start(t);o.stop(t+len+.03);
}
function mArp(f,t,open){
  const o=actx.createOscillator(),fl=actx.createBiquadFilter(),g=actx.createGain();
  o.type="sawtooth";o.frequency.value=f;fl.type="lowpass";fl.Q.value=3;
  fl.frequency.setValueAtTime(open,t);fl.frequency.exponentialRampToValueAtTime(500,t+.16);
  env(g,t,.05,.003,.17);o.connect(fl).connect(g).connect(MUS.bus);o.start(t);o.stop(t+.2);
}
function mLead(f,t,len){
  [[1,"triangle",.1],[2,"sine",.035]].forEach(([m,ty,v])=>{
    const o=actx.createOscillator(),g=actx.createGain();o.type=ty;o.frequency.value=f*m;
    env(g,t,v,.004,len);o.connect(g).connect(MUS.bus);o.start(t);o.stop(t+len+.03);
  });
}
function musStep(step,t){
  const s=step%16,bar=Math.floor(step/16)%4,ch=BAR[bar],L=MUS.lvl,spb=60/MUS.bpm/4;
  if(s%4===0)mKick(t);
  if(s%4===2)mNoise(t,.07,"highpass",7500,.7,.1);
  if(L>=4&&s%2===1)mNoise(t,.035,"highpass",9000,.7,.045);
  if((s===4||s===12)&&L>=3){mNoise(t,.13,"bandpass",1700,.8,.24);mNoise(t+.012,.1,"bandpass",2400,.8,.12)}
  if(bar===3&&s>=14&&L>=2)mNoise(t,.09,"bandpass",1900,.8,.14);
  if(BASSP[s])mBass(ch.bass*BASSP[s],t,spb*(BASSP[s]===2?2:2.6));
  if(L>=2){
    const semis=[0,ch.third,7,12,12+ch.third,19],f=ch.r*Math.pow(2,semis[ARP[s]]/12);
    mArp(f,t,900+L*350+(bar%2)*250);
  }
  if(L>=3){const li={0:0,3:1,8:2,11:3}[s];if(li!==undefined)mLead(ch.lead[li],t,spb*(s===3||s===11?2.4:3.4))}
}
function musTick(){
  if(!MUS.on||!actx)return;
  if(!S.sound||!S.music){stopMusic();return}
  if(MUS.t<actx.currentTime-.1)MUS.t=actx.currentTime+.05;   // a tab that slept resumes from now, not in a burst of missed notes
  while(MUS.t<actx.currentTime+.14){musStep(MUS.step,MUS.t);MUS.t+=60/MUS.bpm/4;MUS.step++}
}
function startMusic(){
  if(MUS.on)return;const c=AC("mus");if(!c)return;
  MUS.on=true;MUS.step=0;MUS.t=c.currentTime+.06;
  MUS.bus=c.createGain();MUS.bus.gain.setValueAtTime(0,c.currentTime);MUS.bus.gain.linearRampToValueAtTime(.9,c.currentTime+1.8);
  send(MUS.bus,.14);musUpdate();
  MUS.tm=setInterval(musTick,30);
}
function stopMusic(finish){
  if(!MUS.on)return;MUS.on=false;clearInterval(MUS.tm);
  const c=actx,bus=MUS.bus,t=c.currentTime;
  bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+(finish?.9:1.8));
  setTimeout(()=>{try{bus.disconnect()}catch(e){}},2200);
  if(finish&&AC()){[293.66,369.99,440,587.33].forEach((f,i)=>pluck(f,t+.04+i*.05,.09,2.6,.6));bell(1174.66,t+.2,.04,3.4);noise(t+.02,1.8,{type:"highpass",f0:6500,f1:3000,q:.6,vol:.05,attack:.01,wet:.5})}
}
function musUpdate(){
  const tot=Math.max(1,R.total),p=R.found.size/tot;
  MUS.lvl=p<.2?1:p<.45?2:p<.7?3:4;
  if(MUS.on&&S.music&&S.sound&&!R.riser&&tot-R.found.size<=8&&tot>12){
    R.riser=true;const c=actx,t=c.currentTime;
    noise(t,5,{type:"bandpass",f0:400,f1:7000,q:1.2,vol:.06,attack:4,wet:.4});
  }
}
function sndSpeedHit(){
  const c=AC();if(!c)return;
  const sc=[587.33,659.25,739.99,880,987.77,1174.66,1318.51,1479.98],f=sc[R.streak%8];
  const t=MUS.on?Math.max(MUS.t,c.currentTime+.01):c.currentTime+.01;
  pluck(f,t,.1,.9,.45);pluck(f/2,t,.05,.5,.2);
}
function sndPenalty(){
  const c=AC();if(!c)return;const t=c.currentTime;
  [146.83,155.56].forEach(f=>{const o=actx.createOscillator(),fl=actx.createBiquadFilter(),g=actx.createGain();
    o.type="sawtooth";o.frequency.value=f;fl.type="lowpass";fl.frequency.value=520;env(g,t,.06,.005,.28);o.connect(fl).connect(g);send(g,.2);o.start(t);o.stop(t+.32)});
}
function sndCount(go){
  const c=AC();if(!c)return;const t=c.currentTime;
  if(go){[293.66,369.99,440].forEach(f=>pluck(f*2,t,.07,1.4,.5));bell(1174.66,t,.04,2.2)}
  else blip(t,880,860,.14,.07,.25);
}

/* ---------- helpers for hints ---------- */
const DIRS=["north","north-east","east","south-east","south","south-west","west","north-west"];
function bearing(a,b){
  const r=Math.PI/180,[l1,p1]=[a[0]*r,a[1]*r],[l2,p2]=[b[0]*r,b[1]*r];
  const y=Math.sin(l2-l1)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(l2-l1);
  const deg=(Math.atan2(y,x)/r+360)%360;return DIRS[Math.round(deg/45)%8];
}
const LL=id=>[FACTS[id].ll[1],FACTS[id].ll[0]];
function km(a,b){return d3.geoDistance(a,b)*6371}
const isMi=()=>S.unit==="mi";
function distTxt(k){const v=isMi()?k*.621371:k;if(v<25)return "under 25 "+(isMi()?"miles":"km");const r=v<1000?Math.round(v/25)*25:Math.round(v/50)*50;return fmt(r)+(isMi()?" miles":" km")}
function areaTxt(a){return isMi()?fmt(a*.386102)+" sq mi":fmt(a)+" km²"}
function densTxt(p,a){const d=isMi()?p/(a*.386102):p/a;return (d<10?d.toFixed(1):fmt(d))+(isMi()?" per sq mi":" per km²")}

function article(n){return /^(United|Netherlands|Philippines|Bahamas|Gambia|Central African|Czech|Dominican|Solomon|Falkland|Democratic|Republic|Ivory)/.test(n)?"the "+n:n}
function swell(e,txt){
  e.textContent=txt;if(reduced)return;
  e.animate([{opacity:0,transform:"translateY(5px)",filter:"blur(3px)"},{opacity:1,transform:"none",filter:"blur(0)"}],{duration:650,easing:"cubic-bezier(.2,.8,.2,1)"});
}
const shuffle=(a,rnd=Math.random)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function seeded(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}
  let a=h>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hitTest=(id,ll,T)=>id===T;

