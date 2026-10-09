/* ======================================================================
   FRIENDS: your friends and their stats, requests, adding by username, friends-only leaderboards, today's results, and Race challenges.
   Everything goes through the database functions in supabase/schema.sql, so you only ever see what a friend chooses to share.
   ====================================================================== */
const FR={tab:"friends",region:"World",reqIn:0};
const CH={pending:null};   // a challenge waiting to be raced: {id, seed}
const FR_TABS=[["friends","Friends"],["requests","Requests"],["add","Add"],["board","Leaderboard"],["today","Today"],["chal","Challenges"]];
async function frReady(){
  if(!cloudOn())throw new Error("Friends are not set up in this copy of Mapbloom.");
  const sb=await cloudLoad();
  if(!CLOUD.user){const {data}=await sb.auth.getSession();CLOUD.user=data&&data.session?data.session.user:null}
  if(!CLOUD.user){renderAccount();return null}
  if(!CLOUD.profile)await cloudProfile();
  if(!CLOUD.profile){renderAccount();return null}
  return sb;
}
async function frCall(name,args){const {data,error}=await CLOUD.sb.rpc(name,args||{});if(error)throw error;return data}
function frShell(tab){
  const sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("h2",{},"Friends"),
    el("div",{class:"ftabs",role:"tablist"},...FR_TABS.map(([k,l])=>el("button",{type:"button",role:"tab",class:"ftab","aria-selected":String(k===tab),onclick:()=>{sndTick();renderFriends(k)}},l,k==="requests"&&FR.reqIn?el("i",{class:"fbadge"},String(FR.reqIn)):null))));
  const body=el("div",{class:"fbody"},el("p",{class:"acctfine"},"Loading…"));sh.append(body);
  sh.append(el("div",{class:"sheetfoot"},el("button",{class:"btn",type:"button",onclick:()=>renderAccount()},"‹ Account"),el("span",{class:"grow"})));
  openModal();return body;
}
async function renderFriends(tab){
  tab=tab||FR.tab||"friends";FR.tab=tab;
  let body;
  try{if(!(await frReady()))return;body=frShell(tab);
    const rq=await frCall("my_requests");FR.reqIn=rq.filter(r=>r.direction==="in").length;
    const tb=[...$("sheet").querySelectorAll(".ftab")].find(b=>b.textContent.startsWith("Requests"));if(tb&&FR.reqIn&&!tb.querySelector(".fbadge"))tb.append(el("i",{class:"fbadge"},String(FR.reqIn)));
    ({friends:frFriends,requests:frRequests,add:frAdd,board:frBoard,today:frToday,chal:frChal})[tab](body,rq);
  }catch(e){(body||frShell(tab)).replaceChildren(el("p",{class:"acctnote"},cloudMsg(e)),el("button",{class:"btn",type:"button",onclick:()=>renderFriends(tab)},"Try again"))}
}
const frInitial=n=>el("span",{class:"avatar",style:avatarStyle(n)},String(n).charAt(0).toUpperCase());
function frEmpty(t,sub){return el("div",{class:"fempty"},el("b",{},t),sub?el("small",{},sub):null)}

async function frFriends(body){
  const list=await frCall("my_friends");body.replaceChildren();
  if(!list.length){body.append(frEmpty("No friends yet","Add a friend by their username and they will show up here."),el("button",{class:"btn primary",type:"button",onclick:()=>renderFriends("add")},"Add a friend"));return}
  list.forEach(f=>body.append(el("div",{class:"frow"},frInitial(f.username),
    el("div",{class:"fmain"},el("b",{},f.username),
      f.shared?el("small",{},`${f.found} found · ${f.studied} studied · ${f.mastered} mastered${f.streak?` · ${f.streak} day streak`:""}`):el("small",{},"Keeping their progress private")),
    el("button",{class:"tbtn",type:"button",title:"Challenge "+f.username,onclick:()=>{FR.to=f.friend_id;renderFriends("chal")}},"Challenge"),
    el("button",{class:"tbtn fdel",type:"button","aria-label":"Remove "+f.username,onclick:async()=>{if(!confirm("Remove "+f.username+" from your friends?"))return;await frCall("remove_friend",{p:f.friend_id}).catch(e=>toast("⚠️","Could not remove",cloudMsg(e),3000));renderFriends("friends")}},"Remove"))));
}
async function frRequests(body,rq){
  body.replaceChildren();
  if(!rq.length){body.append(frEmpty("No requests","Friend requests you send or receive appear here."));return}
  rq.forEach(r=>body.append(el("div",{class:"frow"},frInitial(r.username),el("div",{class:"fmain"},el("b",{},r.username),el("small",{},r.direction==="in"?"wants to be your friend":"request sent")),
    r.direction==="in"?el("button",{class:"btn primary",type:"button",onclick:async()=>{sndTick();await frCall("respond_request",{p_requester:r.user_id,p_accept:true}).catch(e=>toast("⚠️","Could not accept",cloudMsg(e),3000));renderFriends("requests")}},"Accept"):null,
    el("button",{class:"tbtn",type:"button",onclick:async()=>{await frCall(r.direction==="in"?"respond_request":"remove_friend",r.direction==="in"?{p_requester:r.user_id,p_accept:false}:{p:r.user_id}).catch(()=>{});renderFriends("requests")}},r.direction==="in"?"Decline":"Cancel"))));
}
function frAdd(body){
  body.replaceChildren();
  const note=el("p",{class:"acctnote",role:"status"},""),nm=el("input",{type:"text",class:"acctin",placeholder:"Their username",autocomplete:"off",autocapitalize:"none",spellcheck:"false","aria-label":"Friend's username"});
  nm.addEventListener("input",()=>{nm.value=nm.value.toLowerCase().replace(/[^a-z0-9_]/g,"")});
  const go=async()=>{
    const v=nm.value.trim();if(v.length<3){note.className="acctnote";note.textContent="Type their full username.";return}
    go.b.disabled=true;note.textContent="";
    try{const r=await frCall("send_request",{p:v});sndTick();note.className="acctnote ok";note.textContent=r==="accepted"?"You are now friends.":r==="already"?"You have already sent them a request.":"Request sent to "+v+".";nm.value=""}
    catch(e){note.className="acctnote";note.textContent=cloudMsg(e)}
    go.b.disabled=false;
  };
  body.append(el("p",{},"Ask your friend for their username (it is on their Account screen), then type it exactly."),el("div",{class:"faddrow"},nm,(go.b=el("button",{class:"btn primary",type:"button",onclick:go},"Send request"))),note,
    el("p",{class:"acctfine"},"You can find your own username under Menu, then Account. Players cannot be searched or listed, so only people who know the name can find each other."));
  nm.addEventListener("keydown",e=>{if(e.key==="Enter")go()});
}
async function frBoard(body){
  body.replaceChildren();
  const regs=ALLR.filter(r=>r!=="United States").concat(["United States"]),sel=el("select",{class:"csel","aria-label":"Region"},...regs.map(r=>el("option",{value:r},regionLabel(r))));sel.value=FR.region;
  const out=el("div",{});body.append(el("div",{class:"fregion"},el("span",{},"Region"),sel),out);
  const load=async()=>{
    FR.region=sel.value;out.replaceChildren(el("p",{class:"acctfine"},"Loading…"));
    try{
      const [race,hot]=await Promise.all([frCall("leaderboard",{p_key:"race:"+FR.region}),FR.region==="United States"?Promise.resolve([]):frCall("leaderboard",{p_key:"hot:"+FR.region})]);
      out.replaceChildren(frBoardBlock("Race · Locate",race,v=>fmtT(v,0)),FR.region==="United States"?null:frBoardBlock("Hot & cold",hot,v=>v+(v===1?" guess":" guesses")));
    }catch(e){out.replaceChildren(el("p",{class:"acctnote"},cloudMsg(e)))}
  };
  sel.onchange=()=>{sndTick();load()};load();
}
function frBoardBlock(title,rows,fmt){
  const b=el("div",{class:"qcard fboard"},el("h3",{},title));
  if(!rows.length){b.append(el("p",{class:"acctfine"},"No results here yet. Play a game in this region to put yours on the board."));return b}
  rows.forEach((r,i)=>b.append(el("div",{class:"frank"+(r.is_me?" me":"")},el("span",{class:"pos"},String(i+1)),frInitial(r.username),el("b",{},r.is_me?r.username+" (you)":r.username),el("span",{class:"val"},fmt(r.best)))));
  return b;
}
async function frToday(body){
  const day=todayStr(),rows=await frCall("friends_daily",{p_day:day});body.replaceChildren(el("p",{class:"modesub"},"Everyone's Today's ten and Daily mystery for "+day+"."));
  if(!rows.length){body.append(frEmpty("Nothing yet today","Play Today's ten or the Daily mystery and your result shows here for your friends."));return}
  const block=(kind,title)=>{const rs=rows.filter(r=>r.kind===kind);if(!rs.length)return;const b=el("div",{class:"qcard fboard"},el("h3",{},title));
    rs.forEach(r=>b.append(el("div",{class:"frank"+(r.is_me?" me":"")},frInitial(r.username),el("div",{class:"fmain"},el("b",{},r.is_me?r.username+" (you)":r.username),el("small",{class:"marks"},r.marks||"")),el("span",{class:"val"},kind==="ten"?`${r.score}/10`+(r.time_ms?" · "+fmtT(r.time_ms):""):(r.score?`${100-r.score} guess${100-r.score===1?"":"es"}`:"gave up")))));body.append(b)};
  block("ten","Today's ten");block("hot","Daily mystery");
}
const frCfgText=c=>`${regionLabel(c.region)} · ${({country:"Locate",flag:"Flag",capital:"Capital",name:"Name it",sil:"Silhouette"})[c.variant]||"Locate"}${c.nb?" · borderless":""}`;
async function frChal(body){
  const [friends,list]=await Promise.all([frCall("my_friends"),frCall("my_challenges")]);body.replaceChildren();
  const cfg={region:S.region,variant:S.region==="United States"&&!["country","capital","name"].includes(S.rv)?"country":S.rv,nb:!!S.nb};
  if(!friends.length)body.append(frEmpty("Add a friend first","Challenges are sent to friends."));
  else{
    const sel=el("select",{class:"csel","aria-label":"Friend"},...friends.map(f=>el("option",{value:f.friend_id},f.username)));if(FR.to)sel.value=FR.to;
    body.append(el("div",{class:"qcard"},el("h3",{},"Send a Race challenge"),el("p",{class:"acctfine"},"Same countries in the same order, so the times compare fairly. Setup: "+frCfgText(cfg)+". Change it in Race first if you want a different one."),
      el("div",{class:"faddrow"},sel,el("button",{class:"btn primary",type:"button",onclick:async e=>{e.target.disabled=true;try{await frCall("send_challenge",{p_to:sel.value,p_config:Object.assign({seed:Math.random().toString(36).slice(2,10)},cfg)});sndTick();toast("\u{1F3C1}","Challenge sent","They will see it under Challenges.",3200);renderFriends("chal")}catch(er){e.target.disabled=false;toast("⚠️","Could not send",cloudMsg(er),3400)}}},"Send"))));
  }
  if(!list.length){body.append(frEmpty("No challenges yet"));return}
  const mine=n=>n===CLOUD.profile.username;
  list.forEach(c=>{
    const other=c.incoming?c.from_name:c.to_name,done=c.mine_ms!=null,sub=c.theirs_ms!=null?(done?(c.mine_ms<c.theirs_ms?"You won by "+fmtT(c.theirs_ms-c.mine_ms):c.mine_ms>c.theirs_ms?other+" won by "+fmtT(c.mine_ms-c.theirs_ms):"A tie"):other+" has finished"):done?"Waiting for "+other:(c.incoming?"Your turn":"Waiting for "+other);
    body.append(el("div",{class:"frow"},frInitial(other),el("div",{class:"fmain"},el("b",{},(c.incoming?"From ":"To ")+other),el("small",{},frCfgText(c.config)+" · "+sub),
      (done||c.theirs_ms!=null)?el("small",{class:"marks"},"You "+(c.mine_ms!=null?fmtT(c.mine_ms):"—")+"  ·  "+other+" "+(c.theirs_ms!=null?fmtT(c.theirs_ms):"—")):null),
      !done?el("button",{class:"btn primary",type:"button",onclick:()=>frPlayChallenge(c)},"Play"):null));
  });
}
/* a challenge sets up the same race (region, style, borders) and shuffles the countries from the shared seed; the result goes back when you finish */
function frPlayChallenge(c){
  if(guardRace())return;const k=c.config||{};
  if(!ALLR.includes(k.region)||!["country","flag","capital","name","sil"].includes(k.variant)){toast("⚠️","Cannot play this one","It uses a setup this version does not have.",3200);return}
  closeModal();S.region=k.region;S.rv=k.variant;S.nb=!!k.nb;save();syncChips();
  const go=()=>{CH.pending={id:c.id,seed:String(k.seed||c.id)};if(S.region==="United States"&&!US.data){usLoad().then(()=>startRace()).catch(()=>{});return}startRace()};
  if(S.mode!=="speed"){setMode("speed");setTimeout(go,700)}else go();
}
