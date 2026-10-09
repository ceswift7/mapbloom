/* ======================================================================
   ACCOUNT: email sign-in with a one-time code (or the link in the same email), a username, and a cloud copy of the save.
   Offline-first: nothing here loads until someone opens Account or Friends, and the game plays exactly the same signed out.
   All cross-player data goes through database functions (supabase/schema.sql); the browser never reads other players' rows.
   ====================================================================== */
const CLOUD={sb:null,user:null,profile:null,loading:null,pushT:0,pushing:false,status:"",synced:false};
const cloudOn=()=>!!(MB_CLOUD.url&&MB_CLOUD.key);
const CLOUD_SDK="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
function cloudLoad(){
  if(CLOUD.loading)return CLOUD.loading;
  CLOUD.loading=new Promise((res,rej)=>{
    if(window.supabase)return res(window.supabase);
    const s=document.createElement("script");s.src=CLOUD_SDK;s.onload=()=>res(window.supabase);s.onerror=()=>{s.remove();rej(new Error("offline"))};document.head.append(s);
  }).then(lib=>{
    const sb=lib.createClient(MB_CLOUD.url,MB_CLOUD.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"mb-auth"}});
    CLOUD.sb=sb;
    sb.auth.onAuthStateChange((ev,session)=>{
      const was=CLOUD.user&&CLOUD.user.id;CLOUD.user=session?session.user:null;
      if(!CLOUD.user){CLOUD.profile=null;CLOUD.synced=false;return}
      if(ev==="SIGNED_IN"&&CLOUD.user.id!==was)setTimeout(cloudAfterSignIn,0);
    });
    return sb;
  }).catch(e=>{CLOUD.loading=null;throw e});
  return CLOUD.loading;
}
// someone who signed in before gets the session restored quietly once the game is idle (the library loads only then)
if(cloudOn()){try{if(localStorage.getItem("mb-auth"))setTimeout(()=>cloudLoad().then(sb=>sb.auth.getSession()).catch(()=>{}),4000)}catch(e){}}

const cloudMsg=e=>{const m=String((e&&e.message)||e||"");return /Failed to fetch|NetworkError|offline|Load failed/i.test(m)?"Could not reach the server. Check your connection and try again.":m||"Something went wrong."};
async function cloudProfile(){
  const sb=CLOUD.sb;if(!sb||!CLOUD.user)return null;
  const {data,error}=await sb.from("profiles").select("username,share_progress").eq("id",CLOUD.user.id).maybeSingle();
  if(error)throw error;
  CLOUD.profile=data||null;return CLOUD.profile;
}

/* ---------- merging a cloud save with this device's save (never throws progress away) ---------- */
const mUnion=(a,b)=>[...new Set([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])];
const mNumMax=(a,b)=>{const o=Object.assign({},a||{});Object.keys(b||{}).forEach(k=>{if(typeof b[k]==="number")o[k]=Math.max(typeof o[k]==="number"?o[k]:0,b[k]);else if(!(k in o))o[k]=b[k]});return o};
function mergeMain(L,C){
  L=L||{};C=C||{};const M=Object.assign({},C,L);   // settings and anything else: this device wins
  ["found","shown","learned"].forEach(k=>M[k]=mUnion(L[k],C[k]));
  M.weak=mNumMax(L.weak,C.weak);M.ach=Object.assign({},C.ach||{},L.ach||{});M.expDone=Object.assign({},C.expDone||{},L.expDone||{});
  M.counts=mNumMax(L.counts,C.counts);
  const hb=Object.assign({},(C.counts||{}).hotBest||{});Object.keys((L.counts||{}).hotBest||{}).forEach(r=>{const v=L.counts.hotBest[r];hb[r]=typeof hb[r]==="number"?Math.min(hb[r],v):v});M.counts.hotBest=hb;
  M.bestStreak=Math.max(L.bestStreak||0,C.bestStreak||0);M.turn=Math.max(L.turn||0,C.turn||0);
  // journal: per country, keep every step either side has done
  const jr=Object.assign({},C.jr||{});Object.keys(L.jr||{}).forEach(id=>{const a=jr[id]||{},b=L.jr[id]||{},o=Object.assign({},a,b);["s","p","g"].forEach(k=>{if(a[k]||b[k])o[k]=mUnion(a[k],b[k])});o.c=!!(a.c||b.c);o.f=!!(a.f||b.f);jr[id]=o});M.jr=jr;
  const cs=Object.assign({},C.cs||{});Object.keys(L.cs||{}).forEach(id=>{const a=cs[id]||{},b=L.cs[id]||{},o=Object.assign({},a,b);o.a=Math.max(a.a||0,b.a||0);o.f=Math.max(a.f||0,b.f||0);if(a.bt!=null&&b.bt!=null)o.bt=Math.min(a.bt,b.bt);cs[id]=o});M.cs=cs;
  // daily results are final once recorded; streaks follow whichever side played most recently
  const dl=L.daily||{},dc=C.daily||{},D=Object.assign({},dc,dl);D.results=Object.assign({},dc.results||{},dl.results||{});D.hot=Object.assign({},dc.hot||{},dl.hot||{});
  D.streak=(dl.last||"")>=(dc.last||"")?(dl.streak||0):(dc.streak||0);D.last=(dl.last||"")>=(dc.last||"")?dl.last:dc.last;
  D.hotStreak=(dl.hotLast||"")>=(dc.hotLast||"")?(dl.hotStreak||0):(dc.hotStreak||0);D.hotLast=(dl.hotLast||"")>=(dc.hotLast||"")?dl.hotLast:dc.hotLast;
  M.daily=D;return M;
}
function mergeRecs(L,C){
  const o=Object.assign({},C||{});
  Object.keys(L||{}).forEach(k=>{
    const a=o[k]||{},b=L[k]||{},r=Object.assign({},a,b);
    r.best=(a.best!=null&&b.best!=null)?Math.min(a.best,b.best):(a.best!=null?a.best:b.best);
    const seen=new Set(),runs=[...(a.runs||[]),...(b.runs||[])].filter(x=>{const id=x.date+"|"+x.t;if(seen.has(id))return false;seen.add(id);return true}).sort((p,q)=>String(p.date).localeCompare(String(q.date))).slice(-20);
    r.runs=runs;if(a.ended||b.ended)r.ended=[...(a.ended||[]),...(b.ended||[])].slice(-20);
    o[k]=r;
  });
  return o;
}
const cloudBlob=()=>({main:localStorage.getItem(KEY),records:localStorage.getItem(RKEY)});

/* ---------- pull on sign-in, push after saves ---------- */
async function cloudAfterSignIn(){
  const sb=CLOUD.sb;if(!sb||!CLOUD.user)return;
  try{
    await cloudProfile();
    if(!CLOUD.profile)return;   // a new player: the Account screen asks for a username first, then calls this again
    const {data,error}=await sb.from("saves").select("data").eq("user_id",CLOUD.user.id).maybeSingle();
    if(error)throw error;
    if(data&&data.data&&data.data.main&&!sessionStorage.getItem("mb-merged")){
      save();const loc=cloudBlob(),cm=JSON.parse(data.data.main||"{}"),lm=JSON.parse(loc.main||"{}");
      const mm=mergeMain(lm,cm),mr=mergeRecs(JSON.parse(loc.records||"{}"),JSON.parse(data.data.records||"{}"));
      const a=JSON.stringify(mm),b=loc.main,c2=JSON.stringify(mr),d=loc.records||"{}";
      if(a!==b||c2!==d){
        sessionStorage.setItem("mb-merged","1");
        try{localStorage.setItem(KEY,a);localStorage.setItem(RKEY,c2)}catch(e){}
        WIPED=true;   // stop the page from saving its old state over the merged one while it reloads
        location.reload();return;
      }
    }
    CLOUD.synced=true;cloudPush(true);
  }catch(e){CLOUD.status=cloudMsg(e)}
}
function cloudPushSoon(){
  if(!CLOUD.user||!CLOUD.profile)return;
  clearTimeout(CLOUD.pushT);CLOUD.pushT=setTimeout(()=>cloudPush(),6000);
}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&CLOUD.pushT){clearTimeout(CLOUD.pushT);CLOUD.pushT=0;cloudPush()}});
function cloudStats(){
  const ids=playable.map(f=>f.id);
  return {found:S.found.size,studied:ids.filter(id=>jrLevel(id)>=2).length,mastered:ids.filter(id=>jrLevel(id)===3).length,stamps:ACH.filter(a=>S.ach[a.id]).length,streak:S.daily.streak||0,best_streak:S.bestStreak||0};
}
function cloudDailyRows(){
  const out=[],lim=new Date(Date.now()-15*864e5).toISOString().slice(0,10);
  Object.entries(S.daily.results||{}).forEach(([day,r])=>{if(day>=lim&&r)out.push({day,kind:"ten",marks:(r.marks||[]).join(""),score:r.firsts||0,time_ms:r.time||null})});
  Object.entries(S.daily.hot||{}).forEach(([day,r])=>{if(day>=lim&&r)out.push({day,kind:"hot",marks:String(r.marks||""),score:r.win?Math.max(0,100-(r.n||0)):0,time_ms:null})});
  return out.slice(-30);
}
function cloudRecordRows(){
  const out=[];Object.entries(REC).forEach(([k,r])=>{if(r&&r.best>0)out.push({key:"race:"+k,best:Math.round(r.best)})});
  Object.entries((S.counts&&S.counts.hotBest)||{}).forEach(([reg,n])=>{if(n>0)out.push({key:"hot:"+reg,best:n})});
  return out.slice(0,80);
}
async function cloudPush(force){
  const sb=CLOUD.sb;if(!sb||!CLOUD.user||!CLOUD.profile||CLOUD.pushing)return;
  CLOUD.pushing=true;CLOUD.pushT=0;
  try{
    const blob=cloudBlob();
    const r1=await sb.from("saves").upsert({user_id:CLOUD.user.id,data:blob,updated_at:new Date().toISOString()});if(r1.error)throw r1.error;
    const r2=await sb.rpc("sync_stats",{p:cloudStats()});if(r2.error)throw r2.error;
    const rr=cloudRecordRows();if(rr.length){const r3=await sb.rpc("submit_records",{p:rr});if(r3.error)throw r3.error}
    const dd=cloudDailyRows();if(dd.length){const r4=await sb.rpc("sync_daily",{p:dd});if(r4.error)throw r4.error}
    CLOUD.status="Saved to your account "+new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  }catch(e){CLOUD.status=cloudMsg(e)}
  CLOUD.pushing=false;
}

/* ---------- the Account screen ---------- */
function acctShell(title){const sh=$("sheet");sh.innerHTML="";sh.append(closeBtn(),el("h2",{},title||"Account"));return sh}
function acctBack(sh){sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",type:"button",onclick:renderMenu},"‹ Back to the menu")))}
function renderAccount(step,email,note){
  if(!cloudOn()){const sh=acctShell();sh.append(el("p",{},"Accounts are not set up in this copy of Mapbloom."));acctBack(sh);openModal();return}
  const sh=acctShell();sh.append(el("p",{class:"modesub"},"Loading…"));openModal();
  cloudLoad().then(async sb=>{
    const {data}=await sb.auth.getSession();CLOUD.user=data&&data.session?data.session.user:null;
    if(CLOUD.user&&!CLOUD.profile)await cloudProfile();
    if(!CLOUD.user)return acctSignIn(step||"email",email||"",note);
    if(!CLOUD.profile)return acctUsername(note);
    acctHome();
  }).catch(e=>{const s2=acctShell();s2.append(el("p",{},cloudMsg(e)),el("div",{class:"sheetfoot"},el("button",{class:"btn primary",type:"button",onclick:()=>renderAccount()},"Try again")));openModal()});
}
function acctSignIn(step,email,note){
  const sh=acctShell("Sign in");
  const err=el("p",{class:"acctnote",role:"alert"},note||"");
  if(step==="code"){
    const code=el("input",{type:"text",inputmode:"numeric",autocomplete:"one-time-code",maxlength:"8",placeholder:"123456",class:"acctin code","aria-label":"Code from your email"});
    const go=async()=>{
      const t=code.value.replace(/\s/g,"");if(t.length<6){err.textContent="Enter the code from the email.";return}
      go.b.disabled=true;err.textContent="";
      const {error}=await CLOUD.sb.auth.verifyOtp({email,token:t,type:"email"});
      if(error){go.b.disabled=false;err.textContent=/expired|invalid/i.test(error.message)?"That code did not work. It may have expired: go back and ask for a new one.":cloudMsg(error);return}
      sndTick();await cloudProfile().catch(()=>{});
      if(CLOUD.profile)acctHome("Signed in.");else acctUsername();
    };
    sh.append(el("p",{},"We sent a 6-digit code to ",el("b",{},email),". Type it here, or just tap the link in that email."),code,err,
      el("div",{class:"sheetfoot"},el("button",{class:"btn",type:"button",onclick:()=>acctSignIn("email",email)},"‹ Different email"),el("span",{class:"grow"}),(go.b=el("button",{class:"btn primary",type:"button",onclick:go},"Sign in"))));
    openModal();code.addEventListener("keydown",e=>{if(e.key==="Enter")go()});setTimeout(()=>code.focus({preventScroll:true}),80);return;
  }
  const em=el("input",{type:"email",autocomplete:"email",inputmode:"email",placeholder:"you@example.com",class:"acctin",value:email||"","aria-label":"Email address"});
  const send=async()=>{
    const v=em.value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){err.textContent="Enter a valid email address.";return}
    send.b.disabled=true;err.textContent="";
    const {error}=await CLOUD.sb.auth.signInWithOtp({email:v,options:{shouldCreateUser:true,emailRedirectTo:location.href.split("#")[0].split("?")[0]}});
    if(error){send.b.disabled=false;err.textContent=/rate|seconds|too many/i.test(error.message)?"Please wait a minute before asking for another code.":cloudMsg(error);return}
    sndTick();acctSignIn("code",v);
  };
  sh.append(el("p",{},"Sign in to keep your map safe in the cloud and play with friends. No password: we email you a one-time code."),em,err,
    el("p",{class:"acctfine"},"You must be 13 or older. Your email is never shown to other players. Playing without an account always works."),
    el("div",{class:"sheetfoot"},el("button",{class:"btn",type:"button",onclick:renderMenu},"Not now"),el("span",{class:"grow"}),(send.b=el("button",{class:"btn primary",type:"button",onclick:send},"Email me a code"))));
  openModal();em.addEventListener("keydown",e=>{if(e.key==="Enter")send()});setTimeout(()=>em.focus({preventScroll:true}),80);
}
function acctUsername(note){
  const sh=acctShell("Choose a username");
  const err=el("p",{class:"acctnote",role:"alert"},note||"");
  const nm=el("input",{type:"text",autocomplete:"off",autocapitalize:"none",spellcheck:"false",maxlength:"20",placeholder:"username",class:"acctin","aria-label":"Username"});
  const go=async()=>{
    const v=nm.value.trim().toLowerCase();if(!/^[a-z0-9_]{3,20}$/.test(v)){err.textContent="Use 3 to 20 letters, numbers or underscores.";return}
    go.b.disabled=true;err.textContent="";
    const {error}=await CLOUD.sb.rpc("claim_username",{p:v});
    if(error){go.b.disabled=false;err.textContent=cloudMsg(error);return}
    sndTick();await cloudProfile();await cloudAfterSignIn();if(CLOUD.profile)acctHome("Welcome, "+CLOUD.profile.username+".");
  };
  nm.addEventListener("input",()=>{nm.value=nm.value.toLowerCase().replace(/[^a-z0-9_]/g,"")});
  sh.append(el("p",{},"Friends find you by this name. Letters, numbers and underscores, 3 to 20 characters. Your email stays private."),nm,err,
    el("div",{class:"sheetfoot"},el("span",{class:"grow"}),(go.b=el("button",{class:"btn primary",type:"button",onclick:go},"Save username"))));
  openModal();nm.addEventListener("keydown",e=>{if(e.key==="Enter")go()});setTimeout(()=>nm.focus({preventScroll:true}),80);
}
function acctHome(note){
  const sh=acctShell("Account"),p=CLOUD.profile||{};
  sh.append(el("div",{class:"acctcard"},el("span",{class:"avatar lg",style:avatarStyle(p.username||"?")},(p.username||"?").charAt(0).toUpperCase()),el("div",{},el("b",{class:"acctname"},p.username||""),el("small",{},CLOUD.user&&CLOUD.user.email||""))),
    note?el("p",{class:"acctnote ok"},note):null,
    el("div",{class:"qcard"},
      opt("Share my progress with friends","Friends see your found, studied and mastered counts, streak, records and daily results. Turn off to hide them.",toggle(p.share_progress!==false,async v=>{sndTick();const {error}=await CLOUD.sb.rpc("set_sharing",{p:v});if(!error)CLOUD.profile.share_progress=v;else toast("⚠️","Could not change that",cloudMsg(error),3200);acctHome()},"Share my progress with friends"))),
    el("p",{class:"acctfine",id:"acctStatus"},CLOUD.status||"Your map is saved to your account whenever you play."));
  sh.append(el("div",{class:"sheetfoot acctfoot"},el("button",{class:"btn primary",type:"button",onclick:()=>renderFriends()},"Friends"),el("button",{class:"btn",type:"button",onclick:async e=>{e.target.disabled=true;await cloudPush(true);acctHome()}},"Sync now"),el("span",{class:"grow"}),el("button",{class:"btn",type:"button",onclick:acctSignOut},"Sign out")));
  sh.append(el("details",{class:"acctdanger"},el("summary",{},"Delete my account"),el("p",{},"This permanently deletes your account, your cloud save and all your friends data. The map on this device stays."),
    (()=>{const t=el("input",{type:"text",class:"acctin",placeholder:"Type your username to confirm","aria-label":"Type your username to confirm",autocomplete:"off"});const b=el("button",{class:"btn danger",type:"button",onclick:async()=>{if(t.value.trim().toLowerCase()!==p.username){t.focus();return}b.disabled=true;const {error}=await CLOUD.sb.rpc("delete_account");if(error){b.disabled=false;toast("⚠️","Could not delete",cloudMsg(error),3600);return}await CLOUD.sb.auth.signOut().catch(()=>{});CLOUD.user=null;CLOUD.profile=null;toast("✅","Account deleted","Your cloud data is gone.",3600);renderMenu()}},"Delete forever");return el("div",{},t,b)})()));
  openModal();
}
async function acctSignOut(){
  try{await cloudPush(true)}catch(e){}
  await CLOUD.sb.auth.signOut().catch(()=>{});CLOUD.user=null;CLOUD.profile=null;CLOUD.synced=false;try{sessionStorage.removeItem("mb-merged")}catch(e){}
  toast("\u{1F44B}","Signed out","Your map stays on this device.",3000);renderMenu();
}
const avatarStyle=n=>{let h=0;for(const ch of String(n))h=(h*31+ch.charCodeAt(0))%360;return `background:hsl(${h} 45% 52%)`};
