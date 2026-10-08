/* ======================================================================
   MASTERY QUIZZES: made from each country's own pages. Pass 2 of 3 on every page quiz (plus capital and flag) to master a country.
   ====================================================================== */
/* ======================================================================
   MASTERY QUIZZES (v2): five questions per page, every one built from exact data with a verify() that must hold,
   wrong answers taken from the same region and close in size. Pass 4 of 5; 5 of 5 earns the gold node.
   ====================================================================== */
const Q_NAMES={g:"The land",c:"People and culture",f:"Food and dishes",h:"A short history",n:"Where the name comes from"};
const Q_SHORT={g:"Land",c:"People",f:"Food",h:"History",n:"Name"};
const Q_ABOUT={g:"the land",c:"the people and culture",f:"the food",h:"the history",n:"the story of the name"};
const qP=()=>playable.map(f=>f.id),qNm=id=>FACTS[id].n,qNb=id=>(FACTS[id].b||[]).map(n=>nameId[n]).filter(Boolean),qBord=(a,b)=>qNb(a).includes(b)||qNb(b).includes(a);
function qPeers(id,rnd,n,ok){
  ok=ok||(()=>true);const f=FACTS[id],all=qP().filter(o=>o!==id&&ok(o)),out=[];
  for(const t of [all.filter(o=>FACTS[o].s===f.s),all.filter(o=>FACTS[o].r===f.r),all]){for(const o of shuffle(t,rnd)){if(out.length>=n)break;if(!out.includes(o))out.push(o)}if(out.length>=n)break}
  return out;
}
function qOk(o){return o&&o.opts.length>=3&&new Set(o.opts).size===o.opts.length&&o.ans>=0&&o.ans<o.opts.length&&(!o.ver||o.ver())}
function qMk(q,correct,wrongs,why,ver,rnd,flags){
  const w=[...new Set(wrongs.filter(x=>x!=null&&x!==correct))];if(w.length<2)return null;
  const opts=shuffle([correct,...w.slice(0,3)],rnd),o={q,opts,ans:opts.indexOf(correct),why,ver,flags:!!flags};
  return qOk(o)?o:null;
}
const qExt=(ids,val,max,margin)=>{const s=ids.slice().sort((a,b)=>max?val(b)-val(a):val(a)-val(b));return Math.abs(val(s[0])-val(s[1]))>=margin?s[0]:null};
const km2=id=>FACTS[id].a;
/* ---- data-driven templates ---- */
const QT_LAND=[
  (id,r)=>{const ns=qNb(id);if(!ns.length)return null;const c=ns[Math.floor(r()*ns.length)],w=qPeers(id,r,3,o=>!qBord(id,o));
    return qMk(`Which of these borders ${qNm(id)}?`,qNm(c),w.map(qNm),`${qNm(id)} shares a land border with ${qNm(c)}.`,()=>qBord(id,c)&&w.every(x=>!qBord(id,x)),r)},
  (id,r)=>{const w=qPeers(id,r,3,o=>{const q=km2(o)/km2(id);return q>.3&&q<3.2});if(w.length<3)return null;const ids=[id,...w],mx=r()<.55,c=qExt(ids,km2,mx,Math.max(1,km2(id)*.08));if(!c)return null;
    return qMk(`Which of these has the ${mx?"largest":"smallest"} area?`,qNm(c),ids.filter(x=>x!==c).map(qNm),ids.map(o=>`${qNm(o)} ${fmt(km2(o))} km\u00B2`).join(", ")+".",()=>qExt(ids,km2,mx,0)===c,r)},
  (id,r)=>{const w=qPeers(id,r,3,o=>{const q=km2(o)/km2(id);return q>.25&&q<4});if(w.length<3)return null;const ids=[id,...w],mx=r()<.5,c=qExt(ids,km2,mx,Math.max(1,km2(id)*.08));if(!c||c===id&&r()<.3)return null;
    return qMk(`Which of these is the ${mx?"biggest":"smallest"} country by area?`,qNm(c),ids.filter(x=>x!==c).map(qNm),ids.map(o=>`${qNm(o)} ${fmt(km2(o))} km\u00B2`).join(", ")+".",()=>qExt(ids,km2,mx,0)===c,r)},
  (id,r)=>{const n=qNb(id).length;if(!n)return null;const w=[n+1,n+2,Math.max(0,n-1),n+3,Math.max(0,n-2)].filter(x=>x!==n);
    return qMk(`How many countries share a land border with ${qNm(id)}?`,String(n),w.map(String),`${qNm(id)} borders ${n}: ${qNb(id).map(qNm).join(", ")}.`,()=>qNb(id).length===n,r)},
  (id,r)=>{const f=FACTS[id],nb=qNb(id).length,kind=!nb?"An island nation":f.ld?"Landlocked":"A coast and land borders";
    return qMk(`Which best describes ${qNm(id)}?`,kind,["An island nation","Landlocked","A coast and land borders"],!nb?"It has no land borders.":f.ld?"It has no sea coast.":"It touches the sea and has land neighbours.",()=>true,r)},
  (id,r)=>{const w=qPeers(id,r,3,o=>Math.abs(FACTS[o].ll[0]-FACTS[id].ll[0])>2);if(w.length<3)return null;const ids=[id,...w],north=r()<.5,c=qExt(ids,o=>FACTS[o].ll[0],north,2);if(!c)return null;
    return qMk(`Which of these lies furthest ${north?"north":"south"}?`,qNm(c),ids.filter(x=>x!==c).map(qNm),ids.map(o=>`${qNm(o)} ${Math.abs(FACTS[o].ll[0]).toFixed(0)}\u00B0${FACTS[o].ll[0]>=0?"N":"S"}`).join(", ")+".",()=>qExt(ids,o=>FACTS[o].ll[0],north,0)===c,r)},
  (id,r)=>{const f=FACTS[id],subs=[...new Set(qP().map(o=>FACTS[o].s).filter(s=>s&&s!==f.s))];if(!f.s)return null;
    const near=shuffle(subs.filter(s=>qP().some(o=>FACTS[o].s===s&&FACTS[o].r===f.r)),r),w=[...near,...shuffle(subs,r)];
    return qMk(`In which part of the world is ${qNm(id)}?`,f.s,w,`${qNm(id)} is in ${f.s}.`,()=>true,r)}
];
const Q_BRACKETS=[[0,1e6,"under 1 million"],[1e6,5e6,"1 to 5 million"],[5e6,2e7,"5 to 20 million"],[2e7,8e7,"20 to 80 million"],[8e7,3e8,"80 to 300 million"],[3e8,1e11,"over 300 million"]];
const QT_PEOPLE=[
  (id,r)=>{const p=(LEARN[id]||{}).p;if(!p)return null;const w=qPeers(id,r,3,o=>{const q=((LEARN[o]||{}).p||0)/p;return q>.3&&q<3.5});if(w.length<3)return null;const ids=[id,...w],pv=o=>(LEARN[o]||{}).p||0,mx=r()<.55,c=qExt(ids,pv,mx,p*.08);if(!c)return null;
    return qMk(`Which of these has the ${mx?"largest":"smallest"} population?`,qNm(c),ids.filter(x=>x!==c).map(qNm),ids.map(o=>`${qNm(o)} ${popTxt(pv(o))}`).join(", ")+".",()=>qExt(ids,pv,mx,0)===c,r)},
  (id,r)=>{const p=(LEARN[id]||{}).p;if(!p)return null;const w=qPeers(id,r,3,o=>{const q=((LEARN[o]||{}).p||0)/p;return q>.2&&q<5});if(w.length<3)return null;const ids=[id,...w],pv=o=>(LEARN[o]||{}).p||0,mx=r()<.5,c=qExt(ids,pv,mx,p*.08);if(!c)return null;
    return qMk(`Which of these countries has more people than the others?`.replace("more people than the others",mx?"the most people":"the fewest people"),qNm(c),ids.filter(x=>x!==c).map(qNm),ids.map(o=>`${qNm(o)} ${popTxt(pv(o))}`).join(", ")+".",()=>qExt(ids,pv,mx,0)===c,r)},
  (id,r)=>{const f=FACTS[id];if(!f.l||!f.l.length)return null;const mine=f.l.map(x=>x.toLowerCase()),c=f.l[Math.floor(r()*f.l.length)],
      w=[...new Set(qPeers(id,r,9,o=>true).flatMap(o=>FACTS[o].l||[]).filter(x=>!mine.includes(x.toLowerCase())))];
    return qMk(`Which language is spoken in ${qNm(id)}?`,c,shuffle(w,r),`${qNm(id)}: ${f.l.join(", ")}.`,()=>f.l.includes(c)&&!w.slice(0,3).some(x=>mine.includes(x.toLowerCase())),r)},
  (id,r)=>{const f=FACTS[id];if(!f.cur)return null;const w=[...new Set(qPeers(id,r,12,o=>FACTS[o].cur&&FACTS[o].cur!==f.cur).map(o=>FACTS[o].cur))];
    return qMk(`What is the currency of ${qNm(id)}?`,f.cur,shuffle(w,r),`${qNm(id)} uses the ${f.cur}.`,()=>true,r)},
  (id,r)=>{const p=(LEARN[id]||{}).p;if(!p)return null;const bi=Q_BRACKETS.findIndex(b=>p>=b[0]&&p<b[1]);if(bi<0)return null;
    const w=Q_BRACKETS.map((b,i)=>i===bi?null:b[2]).filter(Boolean).sort((a,b)=>Math.abs(Q_BRACKETS.findIndex(x=>x[2]===a)-bi)-Math.abs(Q_BRACKETS.findIndex(x=>x[2]===b)-bi));
    return qMk(`About how many people live in ${qNm(id)}?`,Q_BRACKETS[bi][2],w.slice(0,3),`${qNm(id)} has about ${popTxt(p)} people.`,()=>p>=Q_BRACKETS[bi][0]&&p<Q_BRACKETS[bi][1],r)}
];
/* ---- written questions: facts from the authored bank QZ (quiz_*.js), wrong answers of the same type from far-off countries ---- */
const Q_FIX={
  cli:["Tropical rainforest","Savanna","Desert","Semi-arid","Mediterranean","Humid subtropical","Oceanic","Temperate continental","Cold continental","Subarctic","Highland / alpine","Monsoon"],
  rel:["Christianity","Islam","Hinduism","Buddhism","Judaism","Folk religions","Non-religious"],
  spt:["Football","Cricket","Rugby","Baseball","Basketball","Ice hockey","Volleyball","Wrestling","Tennis","Cycling","Skiing","Boxing","Athletics","Handball","Water polo","Rugby league","American football","Badminton","Gaelic football","Taekwondo"],
  frm:["United Kingdom","France","Spain","Portugal","Netherlands","Belgium","Italy","Soviet Union","Ottoman Empire","Yugoslavia","Germany","United States","Japan","Australia","Sudan","Ethiopia","Czechoslovakia","Pakistan","Malaysia","Denmark","Sweden","Russia","Brazil","Haiti"]
};
const Q_FAM={"Tropical rainforest":"t","Savanna":"t","Monsoon":"t","Desert":"a","Semi-arid":"a","Mediterranean":"m","Oceanic":"m","Humid subtropical":"m","Temperate continental":"c","Cold continental":"c","Subarctic":"c","Highland / alpine":"h"};
const Q_COMMON=new Set(["Rice","Bread","Potatoes","Maize","Corn","Wheat","Beans","Fish","Cheese","Meat","Mutton","Beef","Lamb","Pork","Tea","Coffee","Wine","Beer","Football","Christianity","Islam"]);
const qV=(id,k,t)=>{const v=(QZ[id]||{})[k];const x=v&&v[t];return x==null?null:Array.isArray(x)?x:[x]};
const qHas=(id,k,t)=>{const v=(QZ[id]||{})[k];return !!(v&&v[t]!=null)};
const fmtY=y=>y<0?`${-y} BC`:String(y);
function qYears(y,r){const old=Math.abs(y)<1800,out=new Set();let g=0;while(out.size<5&&g++<80){const d=Math.round(old?15+r()*170:3+r()*38)*(r()<.5?-1:1),v=y+d;if(v!==y&&(y<0?v<0:v>0)&&v<=2025)out.add(v)}return [...out]}
function qDist(id,k,t,r,fix){
  const own=new Set(qV(id,k,t)||[]),bad=new Set(own);
  qNb(id).forEach(o=>(qV(o,k,t)||[]).forEach(v=>bad.add(v)));
  const reg=FACTS[id].r;let c=[];
  if(fix){
    c=shuffle(fix.filter(v=>!bad.has(v)),r);
    const mine=[...own][0];
    if(t==="cli"){const fam=Q_FAM[mine];c=c.filter(v=>Q_FAM[v]!==fam)}
    if(t==="rel"){if(mine==="Christianity")c=c.filter(v=>v!=="Islam");else if(mine==="Islam")c=c.filter(v=>v!=="Christianity")}
    if(t==="spt"&&mine!=="Football")c=c.filter(v=>v!=="Football");
    if(t==="frm"){c=c.filter(v=>!mine.includes(v)&&!v.includes(mine))}
  }else{
    const nb=new Set(qNb(id));
    qPeers(id,r,60,o=>!nb.has(o)&&qHas(o,k,t)).forEach(o=>qV(o,k,t).forEach(v=>{if(!bad.has(v)&&!c.includes(v))c.push(v)}));
    if(t==="stp"||t==="ing"||t==="drk")c=c.filter(v=>!Q_COMMON.has(v));
  }
  const nmS=qNm(id).toLowerCase(),colo=/colon(y|ies|ial)|protectorate|territory|trust|trucial|condominium/i;
  c=c.filter(v=>String(v).toLowerCase().indexOf(nmS)<0&&!(t==="emp"&&colo.test(v)));
  if(t==="sea"){const lake=(qV(id,k,t)||[]).some(v=>/lake/i.test(v));c=c.filter(v=>/lake/i.test(v)===lake)}
  return c.slice(0,6);
}
const Q_WORD={
  hi:["What is the highest point in {n}?","The highest point in {n} is which of these?"],
  riv:["Which of these rivers flows through {n}?","{n} is crossed by which of these rivers?"],
  sea:["Which sea or ocean borders {n}?","{n} has a coast on which of these?"],
  rng:["Which of these is a mountain range, desert or highland region in {n}?","Which of these natural regions lies in {n}?"],
  wond:["Which of these natural wonders or landmarks is found in {n}?","Visitors to {n} might see which of these?"],
  lm:["Which of these famous landmarks is found in {n}?","Which of these would you go to see in {n}?"],
  cli:["Which climate is most typical of {n}?"],
  pers:["Which of these people is from {n}?","Which of these famous people is linked to {n}?"],
  rel:["What is the main religion in {n}?"],
  grp:["Which of these peoples lives in {n}?"],
  hol:["Which of these holidays or festivals is celebrated in {n}?","{n} celebrates which of these?"],
  spt:["Which sport is the most popular in {n}?"],
  art:["Which of these is a traditional art, music or cultural form from {n}?","{n} is known for which of these?"],
  dish:["Which of these is a national or signature dish of {n}?","{n} is famous for which of these dishes?"],
  drk:["Which of these drinks is typical of {n}?","People in {n} often drink which of these?"],
  stp:["Which of these is a traditional staple food in {n}?"],
  des:["Which of these desserts or sweets comes from {n}?","Which of these sweet treats is linked to {n}?"],
  snk:["Which of these snacks or street foods is popular in {n}?","You might buy which of these snacks in {n}?"],
  ing:["Which of these ingredients is closely linked to the cooking of {n}?"],
  frm:["From whom did {n} gain independence?"],
  emp:["Which of these ancient civilisations, empires or kingdoms is linked to {n}?","Which of these shaped the early history of {n}?"],
  ldr:["Which of these leaders is linked to the history of {n}?","Which of these figures is part of the history of {n}?"],
  lng:["From which language does the name {n} come?"],
  mng:["What does the name {n} mean?"],
  old:["Which of these was a former name of {n}?"],
  off:["What is the official name of {n}?"],
  who:["After whom, or what, is {n} named?"]
};
const Q_FIXED={cli:"cli",rel:"rel",spt:"spt",frm:"frm"};
function qAuth(k,t){
  return (id,r,st)=>{
    if(st.skipEx&&(EX_T[k]||[]).includes(t))return null;   // the typed exam asks about these: the multiple-choice quiz uses other facts first
    if(t==="cli"&&FACTS[id].a>=1.5e6)return null;
    let mine=qV(id,k,t);if(!mine)return null;
    if(t==="emp")mine=mine.filter(v=>!/colon(y|ies|ial)|protectorate|territory|trust|trucial|condominium/i.test(v));
    if(t==="who"){const mg=(qV(id,"n","mng")||[]).join(" ");mine=mine.filter(v=>mg.indexOf(v)<0)}
    if(!mine.length)return null;
    const key=k+t,used=st.n[key]||0,words=Q_WORD[t];if(used>=words.length)return null;
    const pool=mine.filter(v=>!st.u.has(k+t+v));if(used>0&&!pool.length)return null;
    const c=(pool.length?pool:mine)[Math.floor(r()*(pool.length?pool.length:mine.length))];
    let fix=Q_FIXED[t]?Q_FIX[Q_FIXED[t]]:null;
    if(t==="lng"||t==="mng"||t==="old"||t==="off"||t==="who"){fix=null}
    let wr=qDist(id,k,t,r,fix);
    if(t==="lng"&&wr.length<3){wr=qP().flatMap(o=>qV(o,"n","lng")||[]).filter(v=>!mine.includes(v));wr=[...new Set(shuffle(wr,r))]}
    if(wr.length<3)return null;
    st.n[key]=used+1;st.u.add(k+t+c);
    return qMk(words[used].replace("{n}",qNm(id)),c,wr,`${qNm(id)}: ${mine.join(", ")}.`,()=>mine.includes(c)&&wr.slice(0,3).every(w=>!mine.includes(w)),r);
  };
}
const QT_YEAR=[
  (id,r,st)=>{const hh=(QZ[id]||{}).h||{},y=hh.ind;if(!y||st.skipEx||st.n.ind||(hh.evt||[]).some(e=>e.y===y))return null;st.n.ind=1;const w=qYears(y,r);if(w.length<3)return null;
    return qMk(`In which year did ${qNm(id)} gain independence?`,String(y),w.map(String),`${qNm(id)} became independent in ${y}.`,()=>true,r)},
  ...[0,1,2].map(i=>(id,r,st)=>{const ev=((QZ[id]||{}).h||{}).evt;if(!ev||!ev.length)return null;const free=ev.filter(e=>!st.u.has("e"+e.t)&&!(st.skipEx&&ev.indexOf(e)<2));if(!free.length)return null;
    const e=free[Math.floor(r()*free.length)],w=qYears(e.y,r);if(w.length<3)return null;st.u.add("e"+e.t);
    return qMk(`In which year did this happen: ${e.t}?`,fmtY(e.y),w.map(fmtY),`${fmtY(e.y)}.`,()=>true,r)})
];
const qAuthored=k=>{
  const types={g:["hi","riv","sea","rng","wond","lm","cli"],c:["pers","rel","grp","hol","spt","art"],f:["dish","drk","stp","des","snk","ing"],h:["frm","emp","ldr"],n:["lng","mng","old","off","who"]}[k];
  const out=[];types.forEach(t=>{out.push(qAuth(k,t));if(Q_WORD[t].length>1)out.push(qAuth(k,t))});
  if(k==="h")out.push(...QT_YEAR);
  return out;
};
const QT={g:[...QT_LAND,...qAuthored("g")],c:[...QT_PEOPLE,...qAuthored("c")],f:qAuthored("f"),h:qAuthored("h"),n:qAuthored("n")};function qBuild(id,key,attempt){
  const r=seeded(`q3-${id}-${key}-${attempt}`),st={n:{},u:new Set(),skipEx:true},seen=new Set(),qs=[],T=QT[key]||[];
  for(let pass=0;pass<3&&qs.length<5;pass++){
    st.skipEx=pass===0;
    for(const t of shuffle(T,r)){
      if(qs.length>=5)break;let q=null;try{q=t(id,r,st)}catch(e){q=null}
      if(q&&!seen.has(q.q)){seen.add(q.q);qs.push(q)}
    }
  }
  return qs;
}
/* ---- the typed mastery exam: five fixed questions per page, the same every time, answers typed from memory ---- */
const EX_T={g:["hi","riv","sea","wond"],c:["rel","spt","pers"],f:["dish","drk","stp","des","snk"],h:["frm","ldr","emp"],n:["lng","mng","off","old","who"]};
const EX_X={g:["cli"],c:["rel"],f:["ing"],h:["frm"],n:[]};
const EX_Q={
  hi:"Name the highest point in {n}.",riv:"Name a major river that flows through {n}.",sea:"Name a sea or ocean that borders {n}.",rng:"Name a mountain range, desert or highland region in {n}.",wond:"Name a natural wonder or famous landmark in {n}.",lm:"Name a famous landmark in {n}.",cli:"Name the climate most typical of {n}.",
  pers:"Name a famous person from {n}.",grp:"Name a people or ethnic group that lives in {n}.",hol:"Name a holiday or festival celebrated in {n}.",art:"Name a traditional art, music or cultural form of {n}.",spt:"What is the most popular sport in {n}?",rel:"What is the main religion in {n}?",
  dish:"Name a national or signature dish of {n}.",drk:"Name a drink typical of {n}.",stp:"Name a traditional staple food of {n}.",des:"Name a dessert or sweet from {n}.",snk:"Name a snack or street food from {n}.",ing:"Name an ingredient closely linked to the cooking of {n}.",
  ldr:"Name a leader linked to the history of {n}.",emp:"Name an ancient civilisation, empire or kingdom linked to {n}.",frm:"From whom did {n} gain independence?",
  lng:"From which language does the name {n} come?",mng:"What does the name {n} mean?",off:"What is the official name of {n}?",old:"Name a former name of {n}.",who:"After whom, or what, is {n} named?"
};
const EX_STOP=new Set(["the","of","and","river","mount","mountain","mountains","mt","lake","sea","ocean","desert","national","park","day","festival","island","islands","republic","kingdom","empire","people","peoples","saint","st","a","an"]);
const exN=s=>silNorm(String(s).replace(/\u00F8/gi,"o").replace(/\u0142/gi,"l").replace(/\u00E6/gi,"ae").replace(/\u00DF/g,"ss").replace(/\u0111/gi,"d").replace(/\u0153/gi,"oe").replace(/\u0131/g,"i").replace(/\([^)]*\)/g,""));
const exW=s=>exN(s).split(" ").filter(w=>w&&!EX_STOP.has(w));
function exMatch(txt,acc){
  const t=exN(txt);if(!t)return false;const tw=exW(txt);if(!tw.length)return false;
  for(const a of acc){
    const n=exN(a);if(!n)continue;if(n===t)return true;
    if(n.length>=6&&Math.abs(n.length-t.length)<=2&&lev(t,n)<=(n.length>=11?2:1))return true;
    const aw=exW(a);if(!aw.length)continue;
    if(tw.join("").length>=4&&tw.every(w=>aw.includes(w)))return true;        // "Kilimanjaro" for "Mount Kilimanjaro"
    if(aw.length>1&&aw.every(w=>tw.includes(w)))return true;
    if(tw.length===aw.length&&tw.every((w,i)=>w===aw[i]||(w.length>=6&&lev(w,aw[i])<=1)))return true;
  }
  return false;
}
function exYear(txt){const m=String(txt).match(/-?\d{1,4}/);if(!m)return null;let y=+m[0];if(/\b(bc|bce)\b/i.test(txt)&&y>0)y=-y;return y}
/* facts with several right answers (rivers, dishes, people...) come with the first letter of the expected one, so no true answer is marked wrong */
/* Exam questions are worded so that the right answer is definite. Where a country has several true answers (a river, a dish, a person), the question says
   "best-known" or "a famous", every answer on our list counts, the failed screen lists them, and a wrong answer to such an open question can be counted by the player. */
function qExam(id,key){
  const f=FACTS[id],n=qNm(id),L=LEARN[id]||{},h=(QZ[id]||{}).h||{},ev=h.evt||[],out=[],used=new Set();
  const list=t=>{const v=qV(id,key,t);return v&&v.length?v.map(String):null};
  const add=(tag,q,acc,x)=>{if(used.has(tag))return;used.add(tag);out.push(Object.assign({q:q.replace("{n}",n),accept:acc.map(String),show:acc.slice(0,5).join(", ")},x||{}))};
  const open=(tag,q,t)=>{const v=list(t);if(v)add(tag,q,v,{open:true})};
  const nb=qNb(id).map(qNm);
  const C={
    hi:()=>{const v=list("hi");if(v)add("hi",`What is the highest point in ${n}?`,v)},
    cap:()=>f.cap&&add("cap",`What is the capital of ${n}?`,[f.cap]),
    nbr:()=>nb.length&&add("nbr",`Name a country bordering ${n}.`,nb,{open:true}),
    riv:()=>open("riv",`What is the best-known river in ${n}?`,"riv"),
    area:()=>f.a&&add("area",`About how many square kilometres is ${n}? (a number; within 25%)`,[f.a],{num:f.a,tol:.25,show:fmt(f.a)+" km²"}),
    wond:()=>open("wond",`What is a famous natural wonder or landmark in ${n}?`,"wond"),
    lm:()=>{const v=[...(list("lm")||[]),...(list("wond")||[])];if(v.length)add("lm",`Name a famous landmark in ${n}.`,v,{open:true})},
    sea:()=>open("sea",`Name a sea or ocean that touches ${n}.`,"sea"),
    cur:()=>f.cur&&add("cur",`What currency does ${n} use?`,[f.cur]),
    rel:()=>{const v=list("rel");if(v)add("rel",`What is the main religion in ${n}?`,v)},
    spt:()=>{const v=list("spt");if(v)add("spt",`What is the most popular sport in ${n}?`,v)},
    lang:()=>f.l&&f.l.length&&add("lang",`Name a language spoken in ${n}.`,f.l,{open:true}),

    pers:()=>open("pers",`Name a famous person from ${n}.`,"pers"),
    pop:()=>L.p&&add("pop",`About how many people live in ${n}? (e.g. 5 million; within 30%)`,[L.p],{num:L.p,tol:.3,show:popTxt(L.p)}),
    dish:()=>open("dish",`What is the best-known dish of ${n}?`,"dish"),
    drk:()=>open("drk",`What is a traditional drink of ${n}?`,"drk"),
    stp:()=>open("stp",`What is a traditional staple food in ${n}?`,"stp"),
    des:()=>open("des",`Name a traditional dessert or sweet of ${n}.`,"des"),
    snk:()=>open("snk",`Name a popular snack or street food in ${n}.`,"snk"),
    ing:()=>open("ing",`Name an ingredient closely linked to the cooking of ${n}.`,"ing"),
    ind:()=>h.ind&&add("ind",`In what year did ${n} become independent?`,[h.ind],{year:true,show:fmtY(h.ind)}),
    ev1:()=>ev[0]&&add("ev1",`In what year did this happen: ${ev[0].t}?`,[ev[0].y],{year:true,show:fmtY(ev[0].y)}),
    ev2:()=>ev[1]&&add("ev2",`In what year did this happen: ${ev[1].t}?`,[ev[1].y],{year:true,show:fmtY(ev[1].y)}),
    frm:()=>{const v=list("frm");if(v)add("frm",`From whom did ${n} gain independence?`,v)},
    ldr:()=>open("ldr",`Name a leader linked to the history of ${n}.`,"ldr"),
    emp:()=>open("emp",`Name an ancient civilisation, empire or kingdom linked to ${n}.`,"emp"),
    lng:()=>{const v=list("lng");if(v)add("lng",`From which language does the name ${n} come?`,v)},
    mng:()=>{const v=list("mng");if(v)add("mng",`What does the name ${n} mean?`,v)},
    off:()=>{const v=list("off");if(v)add("off",`What is the official name of ${n}?`,v)},
    old:()=>open("old",`Name a former name of ${n}.`,"old"),
    who:()=>{const v=list("who");if(v)add("who",`After whom, or what, is ${n} named?`,v)}
  };
  const order={g:["hi","cap","nbr","riv","lm","area","sea","wond"],c:["cur","rel","spt","lang","pers","pop"],f:["dish","stp","drk","des","snk","ing"],h:["ind","ev1","ev2","frm","ldr","emp"],n:["lng","mng","off","who","old"]}[key]||[];
  for(const t of order){if(out.length>=5)break;C[t]()}
  for(const t of ["cap","cur","lang","nbr","area"]){if(out.length>=5)break;C[t]()}
  return out.slice(0,5);
}function qCapital(id,attempt){
  const rnd=seeded(`qc-${id}-${attempt}`),f=FACTS[id],w=qPeers(id,rnd,8,o=>FACTS[o].cap&&FACTS[o].cap!==f.cap).map(o=>FACTS[o].cap);
  const q=qMk(`What is the capital of ${f.n}?`,f.cap,w,`${f.cap} is the capital of ${f.n}.`,()=>true,rnd);return q?[q]:[];
}
function qFlag(id,attempt){
  const rnd=seeded(`qf-${id}-${attempt}`),w=qPeers(id,rnd,8,o=>FLAGS[o]),ids=[id,...w.slice(0,3)],arr=shuffle(ids,rnd);
  return [{q:`Which flag belongs to ${FACTS[id].n}?`,opts:arr.map(o=>FLAGS[o]),flags:true,ans:arr.indexOf(id),why:`That is the flag of ${FACTS[id].n}.`}];
}
/* ---- screens: the mastery tree, the quiz, the result ---- */
let mq=null,mqFrom=null,mqAttempt=0;
const mTitle={cap:"capital",flg:"flag"};
function mqStartExam(id,key){
  closeReader();
  const f=FACTS[id],qs=qExam(id,key);
  if(qs.length<3){toast("\u{1F4D8}","Not enough material","This page has no exam yet.",2600);return}
  mq={id,key,qs,i:0,right:0,exam:true,rev:[],title:f.n+": "+Q_NAMES[key]+", the exam"};showQ();
}
function mqStart(id,key){
  closeReader();
  const f=FACTS[id];let qs;
  if(key==="cap"){   // the capital is typed, never chosen from a list
    const ALT={"South Africa":["Pretoria","Cape Town","Bloemfontein"],"Bolivia":["La Paz","Sucre"],"Netherlands":["Amsterdam","The Hague"],"Eswatini":["Mbabane","Lobamba"],"Malaysia":["Kuala Lumpur","Putrajaya"],"Sri Lanka":["Sri Jayawardenepura Kotte","Kotte","Colombo"],"Benin":["Porto-Novo","Cotonou"],"Ivory Coast":["Yamoussoukro","Abidjan"],"Tanzania":["Dodoma","Dar es Salaam"],"Montenegro":["Podgorica","Cetinje"]};   // countries with more than one capital accept each
    const acc=[...new Set([f.cap,...String(f.cap).split(/\s*(?:,|\/|;| and )\s*/),...(ALT[f.n]||[])])].filter(Boolean);
    mq={id,key,qs:[{q:`What is the capital of ${f.n}?`,accept:acc,show:f.cap}],i:0,right:0,exam:true,rev:[],title:f.n+": capital"};showQ();return;
  }
  if(key==="flg")qs=qFlag(id,++mqAttempt);else qs=qBuild(id,key,++mqAttempt);
  if(!qs.length){toast("\u{1F4D8}","Not enough material","This page cannot be quizzed yet.",2600);return}
  mq={id,key,qs,i:0,right:0,title:f.n+": "+(mTitle[key]||Q_NAMES[key])};showQ();
}
const IC_BOOK='<path d="M-7 -4.2Q-3.5 -6.2 0 -3.6Q3.5 -6.2 7 -4.2V4.8Q3.5 2.8 0 5.4Q-3.5 2.8 -7 4.8Z"/><path d="M0 -3.6V5.4"/>';
const IC_PAPER='<rect x="-6.5" y="-6.5" width="9.5" height="12.5" rx="1"/><path d="M-4 -3H0.5M-4 0H0.5M-4 3H-1"/><path class="pen" d="M0.8 5.2L6.2 -4.6L8.4 -3.3L3 6.6L0.2 7Z"/>';
function mTree(id,j,secs){
  const pageSecs=jrSecs(id),n=secs.length,xs=secs.map((k,i)=>n===1?180:34+i*(292/(n-1))),lvl=jrLevel(id),g=j.g||[],p=j.p||[],rd=j.s||[];
  const seq=[["lo"],["c"],["f"]];secs.forEach(k=>seq.push([k,"r"],[k,"p"],[k,"g"]));
  const lit=nd=>nd.length===1?(nd[0]==="lo"?S.found.has(id):nd[0]==="c"?!!j.c:!!j.f):nd[1]==="r"?(rd.includes(nd[0])||!pageSecs.includes(nd[0])):nd[1]==="p"?(p.includes(nd[0])||g.includes(nd[0])):g.includes(nd[0]);
  const nx=seq.find(x=>!lit(x)),isNx=(a,b)=>nx&&nx[0]===a&&nx[1]===b;
  const node=(a,x,y,txt,on,gold,next,act)=>`<g class="nd${gold?" g":""}${on?" on":""}${next?" nx":""}" data-a="${act}"><circle cx="${x}" cy="${y}" r="12"/>${txt.startsWith("<")?`<g class="ic" transform="translate(${x} ${y})">${txt}</g>`:`<text x="${x}" y="${y}">${txt}</text>`}</g>`;
  const line=(d,on,gd)=>`<path class="tl${on?" on":""}${gd?" gd":""}" d="${d}"/>`;
  let svg="",ln="",nodes="";
  const lo=S.found.has(id),cOn=!!j.c,fOn=!!j.f;
  ln+=line("M180 430 L180 418",lo)+line("M180 418 L180 376",cOn)+line("M180 376 L180 334",fOn)+line("M180 334 L180 300",fOn);
  nodes+=node("lo",180,418,"\u25CE",lo,0,isNx("lo"),"lo")+`<text class="tk" x="202" y="422">Located</text>`;
  nodes+=node("c",180,376,"C",cOn,0,isNx("c"),"cap")+`<text class="tk" x="202" y="380">Capital</text>`;
  nodes+=node("f",180,334,"F",fOn,0,isNx("f"),"flg")+`<text class="tk" x="202" y="338">Flag</text>`;
  secs.forEach((k,i)=>{
    const x=xs[i],r=rd.includes(k)||!pageSecs.includes(k),pp=p.includes(k)||g.includes(k),gg=g.includes(k);
    ln+=line(`M180 300 C180 286 ${x} 288 ${x} 272`,fOn&&r)+line(`M${x} 272 L${x} 226`,r)+line(`M${x} 226 L${x} 176`,pp)+line(`M${x} 176 L${x} 126`,gg,1)+line(`M${x} 114 C${x} 92 180 96 180 76`,gg,1);
    nodes+=`<text class="lb" x="${x}" y="262">${Q_SHORT[k]}</text>`+node(k,x,226,IC_BOOK,r,0,isNx(k,"r"),k+":r")+node(k,x,176,IC_PAPER,pp,0,isNx(k,"p"),k+":p")+node(k,x,126,"\u2605",gg,1,isNx(k,"g"),k+":g");
  });
  svg=`<svg class="mtree" viewBox="0 0 360 440" role="img" aria-label="Mastery path">${ln}<g class="crown${lvl===3?" on":""}"><circle cx="180" cy="56" r="19"/><path d="M180 44l3.5 7.2 7.9 1-5.8 5.5 1.5 7.8-7.1-3.8-7.1 3.8 1.5-7.8-5.8-5.5 7.9-1z"/></g>${nodes}</svg>`;
  const box=el("div",{});box.innerHTML=svg;return box;
}
/* ---- the country in the journal book: opening a country riffles a few blank pages and lands on its section. Its first page is the country
   (flag, status, quick facts and the mastery path); the pages after it read through the country, two to a spread, with real page turns ---- */
let cbTimers=[];const cbPos={};
function openCountryBook(id,from,opts){
  opts=opts||{};closeReader();cbTimers.forEach(clearTimeout);cbTimers=[];
  const f=FACTS[id],L=LEARN[id]||{},fd=typeof FOOD!=="undefined"?FOOD[id]:null,P=(k,t)=>blocks(id,k,t);
  const defs=[["o","At a glance",()=>L.o&&P("o",L.o)],["g","The land",()=>L.g&&P("g",L.g)],["c","People and culture",()=>L.c&&P("c",L.c)],["f","Food and dishes",()=>fd&&fd.x&&P("f",fd.x)],
    ["h","A short history",()=>L.h&&[P("h",L.h),L.m?[el("div",{class:"sub"},"More recently"),P("m",L.m)]:""]],["n","Where the name comes from",()=>L.n&&P("n",L.n)],["d","Did you know",()=>el("ul",{},funFacts(id).map(t=>el("li",{},t)))]];
  const reading=defs.filter(d=>d[0]==="d"||d[2]()).map(([k,t,fn])=>({k,t,fn})),pages=[{k:"country",t:f.n},...reading],N=Math.ceil(pages.length/2);
  let cur=0;if(opts.key){const i=pages.findIndex(p=>p.k===opts.key);if(i>=0)cur=Math.floor(i/2)}else if(cbPos[id]!=null&&!opts.riffle)cur=Math.min(cbPos[id],N-1);
  const sh=$("sheet");sh.innerHTML="";
  const back=()=>{sndPage();cbTimers.forEach(clearTimeout);if(from==="book")renderBook("mastery",BK.spread);else closeModal()};
  const quickDl=()=>{const g=el("div",{class:"cbfacts"}),add=(k,v)=>{if(v)g.append(el("span",{},el("i",{},k),el("b",{title:String(v)},String(v))))};add("Capital",f.cap);add("Population",L.p?fmt(L.p):null);add("Area",areaTxt(f.a));add("Density",L.p?densTxt(L.p,f.a):null);add("Currency",f.cur||null);add("Drives on the",L.d);return g};
  const onTree=e=>{
    const g=e.target.closest("[data-a]");if(!g)return;const a=g.dataset.a;sndTick();
    if(a==="lo"){toast("\u{1F9ED}","Located",S.found.has(id)?"You have found it.":"Find it in Quiz, Race, or Take me somewhere.",2600);return}
    if(a==="cap"||a==="flg")return mqStart(id,a);
    const [k,t]=a.split(":");
    if(t==="r"){const pi=pages.findIndex(p=>p.k===k);if(pi>=0)moveTo(Math.floor(pi/2));return}
    if(t==="g"){const jj=jrObj(id);if(!jj.p.includes(k)&&!jj.g.includes(k)){toast("✏️","Pass the quiz first","Pass this page’s quiz to unlock its exam.",3000);return}return mqStartExam(id,k)}
    mqStart(id,k);
  };
  const statsLine=()=>{
    const c=S.cs[id];if(!c||!(c.a||c.bt!=null))return "";const bits=[];
    if(c.a)bits.push("Asked "+c.a+" time"+(c.a===1?"":"s"),"first try "+Math.round(100*(c.f||0)/c.a)+"%");
    if(c.ls){const d=new Date(c.ls+"T12:00:00");if(!isNaN(d))bits.push("last seen "+d.toLocaleDateString(undefined,{month:"short",day:"numeric"}))}
    if(c.bt!=null)bits.push("best race "+(c.bt/1000).toFixed(1)+"s");
    return el("div",{class:"cbstats",title:bits.join(" · ")},bits.join(" · "));
  };
  const countryNodes=()=>{
    const j=jrObj(id),lv=jrLevel(id),w=el("div",{class:"learn cbwrap"});w.style.setProperty("--p",`var(--c-${f.r})`);
    w.append(el("div",{class:"cbhead"},FLAGS[id]?el("img",{src:FLAGS[id],alt:"Flag of "+f.n}):"",el("div",{class:"cbid"},el("h2",{},f.n),el("small",{},`${["Not found yet","Found","Studied","Mastered"][lv]} · ${jrDone(id)} of ${jrTotal(id)} steps`))),quickDl(),statsLine());
    const tree=mTree(id,j,jrQSecs(id));tree.addEventListener("click",onTree);tree.classList.add("cbtree");w.append(tree);return [w]};
  const readNodes=pg=>{const w=el("div",{class:"learn"});w.style.setProperty("--p",`var(--c-${f.r})`);
    const s=el("section",{style:"border-top:0;margin-top:0;padding-top:0"},el("h3",{},el("span",{class:"dot"}),pg.t));[pg.fn()].flat(Infinity).forEach(n=>{if(n)s.append(n)});w.append(s);return [w]};
  const nodesOf=i=>{const pg=pages[i];return pg?(pg.k==="country"?countryNodes():readNodes(pg)):[]};
  const mk=(sp,side)=>el("div",{class:"bkpage "+(side?"r":"l")},...nodesOf(sp*2+side));
  const bookEl=el("div",{class:"bkpages cbpages"});
  const prev=el("button",{class:"chip bkprev",onclick:()=>moveTo(cur-1)},"‹ Previous"),next=el("button",{class:"chip bknext",onclick:()=>moveTo(cur+1)},"Next ›"),ind=el("span",{class:"cbind"});
  const fill=kept=>{
    cbTimers.forEach(clearTimeout);cbTimers=[];cbPos[id]=cur;
    if(!kept){bookEl.querySelectorAll(".bkpage").forEach(p=>p.remove());bookEl.prepend(mk(cur,1));bookEl.prepend(mk(cur,0))}
    bkCorners(bookEl,String(cur*2+1),pages[cur*2+1]?String(cur*2+2):"");
    prev.disabled=cur===0;next.disabled=cur>=N-1;first.disabled=cur===0;
    [cur*2,cur*2+1].forEach(i=>{const pg=pages[i];if(pg&&"gcfhn".includes(pg.k)&&pg.k!=="country"&&!(jrObj(id).s||[]).includes(pg.k))cbTimers.push(setTimeout(()=>{jrMark(id,"s",pg.k);if(cur===0){const l=bookEl.querySelector(".bkpage.l");if(l)l.replaceWith(mk(0,0))}},1500))});   // a page that stays open for a moment counts as read
  };
  const moveTo=to=>{
    if(to<0||to>=N||to===cur||bookEl.dataset.busy)return;
    bookEl.dataset.busy="1";sndPage();const dir=to>cur?1:-1;
    leafTurn(bookEl,dir,()=>mk(to,0),()=>mk(to,1),kept=>{cur=to;fill(kept);delete bookEl.dataset.busy});
  };
  const first=el("button",{class:"chip",onclick:()=>moveTo(0)},"Return");
  const ctl=el("div",{class:"bkctl"},prev,first,next);
  sh.append(closeBtn(),bkTabsBar("mastery",k=>{sndPage();cbTimers.forEach(clearTimeout);renderBook(k,BKpos[k]||0)}),el("div",{class:"bkcover"},bookEl,ctl));
  fill();
  openModal("book");bkFit();
  // the riffle: a handful of blank leaves whip across the spine and settle on this country
  if(opts.riffle&&!reduced&&innerWidth>=720){
    const blank=cls=>el("div",{class:"cbleafface "+cls});
    const stage=el("div",{class:"cbstage rf"},el("div",{class:"rfhalf l"}),el("div",{class:"rfhalf r"}));
    for(let i=0;i<5;i++){const lf=el("div",{class:"rfleaf"},blank("f"),blank("b"));lf.style.animationDelay=(i*.14)+"s";stage.append(lf)}
    bookEl.append(stage);setTimeout(()=>stage.remove(),1700);
  }
  const key=e=>{if(!document.body.contains(bookEl)){document.removeEventListener("keydown",key);return}if(!modal.classList.contains("on")||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==="ArrowRight")moveTo(cur+1);else if(e.key==="ArrowLeft")moveTo(cur-1)};
  document.addEventListener("keydown",key);
}function renderMastery(id,from,riffle){mqFrom=from||null;openCountryBook(id,from,{riffle:!!riffle})}
function showExamQ(){
  const q=mq.qs[mq.i],sh=$("sheet"),id=mq.id;sh.innerHTML="";
  sh.append(closeBtn(),el("button",{class:"chip sback",onclick:()=>renderMastery(id,mqFrom)},"\u2039 Back"),el("h2",{style:"font-size:22px"},mq.title),el("small",{style:"color:var(--ink-faint)"},mq.qs.length>1?`Question ${mq.i+1} of ${mq.qs.length} \u00B7 type your answer`:"Type your answer"));
  sh.append(el("p",{class:"mq"},q.q));
  const inp=el("input",{type:"text",placeholder:q.year?"A year, e.g. 1776":"Type your answer","aria-label":"Your answer",autocomplete:"off",autocapitalize:"off",spellcheck:"false",enterkeyhint:"go"});
  const form=el("form",{class:"silform",style:"margin-top:6px"},inp,el("button",{class:"btn primary",type:"submit"},"Check")),nx=el("div",{});
  let locked=false;
  const exNum=t=>{let s=String(t).toLowerCase().replace(/,/g,"").replace(/km²|km2|sq\.?\s*km|\bkm\b|sq\.?\s*mi(les?)?|\bmiles?\b/g,"");const m=s.match(/-?\d+(\.\d+)?/);if(!m)return null;let v=parseFloat(m[0]);if(/billion|bn/.test(s))v*=1e9;else if(/million|\d\s*m\b/.test(s))v*=1e6;else if(/thousand|k\b/.test(s))v*=1e3;return v};
  const judge=txt=>q.ids?q.ids.some(o=>silCheck(o,txt)):q.year?exYear(txt)===+q.accept[0]:q.num?(()=>{const v=exNum(txt);return v!=null&&Math.abs(v-q.num)<=q.num*q.tol})():exMatch(txt,q.accept);
  const settle=(txt,skip)=>{
    if(locked)return;locked=true;inp.disabled=true;form.querySelector("button").disabled=true;
    const ok=!skip&&judge(txt);
    if(ok){mq.right++;sndHit(FACTS[id].r,false)}else sndMiss();
    mq.rev.push({q:q.q,ok,said:txt,show:q.show});
    const msg=el("p",{class:"mwhy",style:ok?"":"color:var(--hot)"},ok?"Correct.":(q.year?`Not quite. It was ${q.show}.`:q.num?`Not quite. It is ${q.show}.`:q.open?`Not on our list. Accepted: ${q.show}.`:`Not quite. The answer is ${q.show}.`));
    nx.append(msg);
    if(!ok&&q.open&&!skip){const ov=el("button",{class:"chip",type:"button",onclick:()=>{ov.remove();mq.right++;mq.rev[mq.rev.length-1].ok=true;msg.textContent="Counted.";msg.style.color=""}},"My answer was also right");nx.append(ov)}
    nx.append(el("div",{class:"row",style:"margin-top:10px"},el("button",{class:"btn primary",onclick:()=>{mq.i++;if(mq.i<mq.qs.length)showQ();else qDone()}},mq.i+1<mq.qs.length?"Next":"Finish")));
    setTimeout(()=>{const b=nx.querySelector(".btn.primary");if(b)b.focus({preventScroll:true})},30);
  };  form.onsubmit=e=>{e.preventDefault();if(inp.value.trim())settle(inp.value)};
  sh.append(form,el("div",{class:"row",style:"margin-top:8px"},el("button",{class:"chip",type:"button",onclick:()=>settle("",true)},"I don\u2019t know")),nx);
  openModal();setTimeout(()=>{try{inp.focus({preventScroll:true})}catch(e){}},80);
}
function showQ(){
  if(mq.exam)return showExamQ();
  const q=mq.qs[mq.i],sh=$("sheet"),id=mq.id;sh.innerHTML="";
  sh.append(closeBtn(),el("button",{class:"chip sback",onclick:()=>renderMastery(id,mqFrom)},"\u2039 Back"),el("h2",{style:"font-size:22px"},mq.title),el("small",{style:"color:var(--ink-faint)"},`Question ${mq.i+1} of ${mq.qs.length}`));
  const lines=q.q.split("\n");
  sh.append(el("p",{class:"mq"},lines[0],lines[1]?el("br"):"",lines[1]||""));
  const box=el("div",{class:"mopts"+(q.flags?" fl":"")}),nx=el("div",{},);
  q.opts.forEach((o,k)=>box.append(el("button",{class:"mopt",onclick:e=>{
    [...box.children].forEach((b,i)=>{b.disabled=true;if(i===q.ans)b.classList.add("ok")});
    if(k===q.ans){mq.right++;sndHit(FACTS[id].r,false)}else{e.currentTarget.classList.add("no");sndMiss()}
    nx.append(el("p",{class:"mwhy"},q.why||""),el("div",{class:"row",style:"margin-top:10px"},el("button",{class:"btn primary",onclick:()=>{mq.i++;if(mq.i<mq.qs.length)showQ();else qDone()}},mq.i+1<mq.qs.length?"Next":"Finish")));
  }},q.flags?el("img",{src:o,alt:""}):o)));
  sh.append(box,nx);openModal();
}
function qDone(){
  const n=mq.qs.length,exam=!!mq.exam,need=exam?n:(n>=5?4:n),pass=mq.right>=need,sh=$("sheet"),id=mq.id,key=mq.key;sh.innerHTML="";
  const single=key==="cap"||key==="flg";
  if(single){if(pass)jrMark(id,key==="cap"?"c":"f")}
  else if(exam){if(pass)jrMark(id,"g",key)}
  else{if(pass)jrMark(id,"p",key)}
  if(pass)sndFlourish(FACTS[id].r);
  const typedCap=key==="cap";
  sh.append(closeBtn(),el("h2",{},typedCap?(pass?"Capital found":"Not quite"):exam?(pass?"Star earned":"Not quite"):pass?"Passed":"Not quite"),
    el("p",{},typedCap?(pass?`${FACTS[id].cap} is the capital of ${FACTS[id].n}.`:`The capital of ${FACTS[id].n} is ${FACTS[id].cap}. Try again.`):`${mq.right} of ${n} right.`+(exam?(pass?" Star earned.":" You need all "+n+". The questions stay the same."):single?(pass?" Done.":` You need ${need} to pass.`):pass?" Passed. Next: the typed exam for the star.":` You need ${need} to pass.`)));
  if(exam&&!typedCap)sh.append(el("div",{class:"exrev"},mq.rev.map(r=>el("p",{class:"exr"+(r.ok?" ok":"")},el("b",{},(r.ok?"\u2713 ":"\u2717 ")+r.q),el("br"),r.ok?"":("You said: "+(r.said||"(skipped)")+" \u00B7 answer: "+r.show)))));
  sh.append(el("div",{class:"row"},el("button",{class:"btn primary",onclick:()=>renderMastery(id,mqFrom)},"Back to the path"),
    (exam?pass:pass&&single)?"":el("button",{class:"btn",onclick:()=>exam&&!single?mqStartExam(id,key):mqStart(id,key)},"Try again")));
  openModal();
}
let bookScroll=null;
const BK={tab:"atlas",spread:0,pages:[],labels:null},BKpos={};   // BKpos remembers the last spread of each tab
/* a real page turn: the page swings right over the spine (or left back over it), its far side showing the other new page, and the next two pages lie open underneath */
function leafTurn(pg,dir,mkL,mkR,done){
  const ms=reduced?1:780,lp=pg.querySelector(".bkpage.l"),rp=pg.querySelector(".bkpage.r");
  if(innerWidth<720||reduced||!lp||!rp){const o=pg.animate([{opacity:1},{opacity:0}],{duration:reduced?1:180,fill:"forwards"});o.onfinish=()=>{if(!pg.isConnected)return;done();o.cancel();pg.animate([{opacity:0},{opacity:1}],{duration:reduced?1:180})};return}   // cancel the held fade-out, or the pages stay invisible
  const fwd=dir>0,leaf=el("div",{class:"turnleaf "+(fwd?"fwd":"back")}),front=el("div",{class:"tlface f"}),back=el("div",{class:"tlface b"});
  front.append((fwd?rp:lp).cloneNode(true));back.append(fwd?mkL():mkR());leaf.append(front,back);
  const far=back.firstChild;   // the new pages are built once: this node becomes the real page at the landing, so nothing is rebuilt
  if(fwd){rp.replaceWith(mkR())}else{lp.replaceWith(mkL())}
  pg.append(leaf);
  const sh=[{boxShadow:"0 0 0 rgba(40,25,10,0)"},{boxShadow:"0 0 28px rgba(40,25,10,.28)",offset:.18},{boxShadow:"0 0 28px rgba(40,25,10,.28)",offset:.84},{boxShadow:"0 0 0 rgba(40,25,10,0)"}];   // and shrinks away as it lands, so the leaf can go without a visible change   // the leaf's shadow grows in as it lifts, so nothing pops on the page beside it
  front.animate(sh,{duration:ms,fill:"forwards"});back.animate(sh,{duration:ms,fill:"forwards"});
  const a=leaf.animate(fwd?[{transform:"rotateY(0deg)"},{transform:"rotateY(-180deg)"}]:[{transform:"rotateY(0deg)"},{transform:"rotateY(180deg)"}],{duration:ms,easing:"cubic-bezier(.45,.05,.25,1)",fill:"forwards"});
  a.onfinish=()=>{
    if(!pg.isConnected){leaf.remove();return}   // a turn that finishes after the book was closed or replaced must not touch the new one
    const old=pg.querySelector(fwd?".bkpage.l":".bkpage.r");if(old)old.replaceWith(far);   // the leaf's far side takes the old page's place and the leaf goes in the same frame
    leaf.remove();sndThump();done(true);
  };
}
const BOOK_TABS=[["atlas","Atlas","#6FA27E"],["stamps","Stamps","#D9825F"],["exp","Expeditions","#6C8FD6"],["mastery","Mastery","#C9A24B"]];
function masteryPageList(){
  const ids=playable.map(f=>f.id).sort((a,b)=>FACTS[a].n.localeCompare(FACTS[b].n));
  const tile=id=>el("button",{class:"mtile l"+jrLevel(id),title:FACTS[id].n,onclick:()=>{sndTick();renderMastery(id,"book",true)}},FLAGS[id]?el("img",{src:FLAGS[id],alt:""}):el("span",{},FACTS[id].f||""),el("span",{class:"mn"},FACTS[id].n),el("i",{class:"mlv"},jrLevel(id)?jrGlyph(id).trim():""));
  const st=ids.filter(id=>jrLevel(id)>=2).length,ms=ids.filter(id=>jrLevel(id)===3).length,pages=[],labels=[];
  const first=18,per=24;let i=0;
  const head=[el("h2",{},"Mastery"),el("p",{style:"margin:2px 0 8px;color:var(--ink-soft);font-size:14px"},`${st} studied, ${ms} mastered. Tap a flag to open its path.`)];
  let take=ids.slice(0,first);i=first;pages.push([...head,el("div",{class:"mgrid"},take.map(tile))]);labels.push(take);
  while(i<ids.length){take=ids.slice(i,i+per);i+=per;pages.push([el("div",{style:"height:6px"}),el("div",{class:"mgrid"},take.map(tile))]);labels.push(take)}
  return {pages,labels:labels.map(t=>t.length?FACTS[t[0]].n.charAt(0)+"–"+FACTS[t[t.length-1]].n.charAt(0):"")};
}
function atlasPageList(){
  const [L]=atlasPages(),F=S.found,pages=[L],labels=["Overview"];
  REGIONS.forEach(r=>{
    const ids=playable.filter(f=>inReg(f.id,r)).map(f=>f.id).sort((a,b)=>FACTS[a].n.localeCompare(FACTS[b].n));
    const n=ids.filter(id=>F.has(id)).length,st=ids.filter(id=>jrLevel(id)>=2).length,ms=ids.filter(id=>jrLevel(id)===3).length;
    pages.push([el("h2",{style:"display:flex;align-items:center;gap:10px"},el("span",{class:"swatch",style:`background:var(--c-${r});width:14px;height:14px`}),r==="Americas"?"The Americas":r),
      el("p",{style:"margin:2px 0 12px;color:var(--ink-soft);font-size:14px"},`${n} of ${ids.length} found · ${st} studied · ${ms}★`),
      ids.some(id=>F.has(id))?el("div",{class:"gallery"},ids.filter(id=>F.has(id)).map(id=>paintThumb(id,()=>{closeModal();if(S.mode!=="wander")setMode("wander");openCountry(id)}))):null,
      el("div",{class:"nchips"},ids.map(id=>el("button",{class:F.has(id)?"got":"dim",title:["Not found yet","Found","Studied","Mastered"][jrLevel(id)],onclick:()=>{closeModal();if(S.mode!=="wander")setMode("wander");openCountry(id)}},jrGlyph(id)+FACTS[id].n)))]);
    labels.push(r);
  });
  return {pages,labels};
}
function stampPageList(){
  const got=ACH.filter(a=>S.ach[a.id]).length,half=Math.ceil(ACH.length/2);
  const grid=list=>el("div",{class:"stamps bkstamps"},list.map(a=>el("div",{class:"stamp"+(S.ach[a.id]?" got":""),title:a.d},el("div",{class:"ring"},a.i),el("b",{style:"display:block;font-weight:500"},a.n),a.d)));
  return {pages:[[el("h2",{},"Stamps"),el("h3",{style:"margin-top:10px"},`${got} of ${ACH.length} stamps`),grid(ACH.slice(0,half))],[el("div",{style:"height:50px"}),grid(ACH.slice(half))]],labels:["",""]};
}
function expPageList(){
  const go=e=>{expSel=e.id;sndTick();const pi=1+EXPS.indexOf(e);bkGo(Math.floor(pi/2))};
  const list=[el("h2",{},"Expeditions"),el("p",{style:"margin:2px 0 14px;color:var(--ink-soft);font-size:14px"},"Themed expeditions. Each country you find counts toward every expedition it is in.")];
  EXPS.forEach(e=>{const ids=expIds(e),n=ids.filter(id=>S.found.has(id)).length;
    list.push(el("button",{class:"expcard"+(e.id===expSel?" on":""),onclick:()=>go(e)},el("b",{},e.name),el("small",{},`${n} of ${ids.length}`+(n===ids.length?" ✓":"")),el("div",{class:"ebar"},el("span",{style:`width:${ids.length?n/ids.length*100:0}%`}))))});
  const pages=[list],labels=["Contents"];
  EXPS.forEach(sel=>{
    const ids=expIds(sel).sort((a,b)=>FACTS[a].n.localeCompare(FACTS[b].n)),n=ids.filter(id=>S.found.has(id)).length,next=ids.find(id=>!S.found.has(id));
    const R=[el("h2",{},sel.name),el("p",{style:"margin:4px 0 12px;color:var(--ink-soft);font-size:14.5px"},sel.blurb),
      el("h3",{style:"margin:0 0 6px"},n===ids.length?"Complete":`${n} of ${ids.length} places`),
      el("div",{class:"ebar",style:"margin:0 0 14px"},el("span",{style:`width:${ids.length?n/ids.length*100:0}%`})),
      el("div",{class:"nchips"},ids.map(id=>el("button",{class:S.found.has(id)?"got":"dim",onclick:()=>{closeModal();if(S.mode!=="wander")setMode("wander");openCountry(id)}},jrGlyph(id)+FACTS[id].n)))];
    if(next)R.push(el("div",{class:"row",style:"margin-top:14px"},el("button",{class:"btn primary",onclick:()=>{closeModal();if(S.mode!=="wander")setMode("wander");openCountry(next)}},"Visit the next place")));
    pages.push(R);labels.push(sel.name);
  });
  return {pages,labels};
}
const bkBuild=tab=>{const r=({atlas:atlasPageList,stamps:stampPageList,exp:expPageList,mastery:masteryPageList})[tab]();BK.pages=r.pages;BK.labels=r.labels;BK.tab=tab};
const bkSpreads=()=>Math.max(1,Math.ceil(BK.pages.length/2));
const bkTabsBar=(active,onPick)=>el("div",{class:"bk-tabs",role:"tablist"},BOOK_TABS.map(([k,l,c])=>{const b=el("button",{class:"bk-tab",role:"tab","aria-selected":String(k===active),style:"--tabc:"+c,onclick:()=>onPick(k)},l);b.dataset.k=k;return b}));
const bkPage=(t,side)=>el("div",{class:"bkpage "+(side?"r":"l")},...(t.pages[t.spread*2+side]||[]));
function bkCorners(pg,a,b){
  pg.querySelectorAll(".pgl,.pgr").forEach(x=>x.remove());
  pg.append(el("span",{class:"pgl"},a||""),el("span",{class:"pgr"},b||""));
}
function bkFill(kept){
  const sh=$("sheet"),pg=sh.querySelector(".bkpages");if(!pg)return;
  if(!kept){pg.querySelectorAll(".bkpage").forEach(p=>p.remove());
  pg.append(bkPage(BK,0),bkPage(BK,1))}
  const n=bkSpreads(),ind=sh.querySelector(".cbind"),prev=sh.querySelector(".bkprev"),next=sh.querySelector(".bknext");
  BKpos[BK.tab]=BK.spread;
  bkCorners(pg,String(BK.spread*2+1),BK.pages[BK.spread*2+1]?String(BK.spread*2+2):"");
  if(prev){prev.disabled=BK.spread===0;prev.style.visibility=n>1?"visible":"hidden"}
  if(next){next.disabled=BK.spread>=n-1;next.style.visibility=n>1?"visible":"hidden"}
  sh.querySelectorAll(".bk-tab").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.k===BK.tab)));
  requestAnimationFrame(()=>drawBookMarks(sh.querySelector(".bkmarks"),BK.tab));
}
function bkTarget(tab,spread){const r=({atlas:atlasPageList,stamps:stampPageList,exp:expPageList,mastery:masteryPageList})[tab]();return {tab,spread:Math.max(0,Math.min(spread||0,Math.ceil(r.pages.length/2)-1)),pages:r.pages,labels:r.labels}}
function bkMove(t,dir){
  const pg=$("sheet").querySelector(".bkpages");if(!pg||pg.dataset.busy)return;
  pg.dataset.busy="1";sndPage();
  $("sheet").querySelectorAll(".bk-tab").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.k===t.tab)));
  leafTurn(pg,dir,()=>bkPage(t,0),()=>bkPage(t,1),kept=>{BK.tab=t.tab;BK.spread=t.spread;BK.pages=t.pages;BK.labels=t.labels;bkFill(kept);delete pg.dataset.busy});
}
function bkGo(sp){if(sp===BK.spread||sp<0||sp>=bkSpreads())return;bkMove({tab:BK.tab,spread:sp,pages:BK.pages,labels:BK.labels},sp>BK.spread?1:-1)}
function bkSwitch(k){
  if(k===BK.tab)return;const dir=BOOK_TABS.findIndex(t=>t[0]===k)>BOOK_TABS.findIndex(t=>t[0]===BK.tab)?1:-1;
  bkMove(bkTarget(k,BKpos[k]||0),dir);
}
function renderBook(tab,spread){
  tab=tab||"atlas";const sh=$("sheet");sh.innerHTML="";
  bkBuild(tab);BK.spread=Math.max(0,Math.min(spread==null?(BKpos[tab]||0):spread,bkSpreads()-1));
  const prev=el("button",{class:"chip bkprev",onclick:()=>bkGo(BK.spread-1)},"‹ Previous"),next=el("button",{class:"chip bknext",onclick:()=>bkGo(BK.spread+1)},"Next ›");
  const ctl=el("div",{class:"bkctl"},prev,el("span"),next);
  sh.append(closeBtn(),bkTabsBar(tab,bkSwitch),el("div",{class:"bkcover"},el("div",{class:"bkpages"},el("canvas",{class:"bkmarks","aria-hidden":"true"})),ctl));
  openModal("book");
  bkFill();bkFit();
  const pagesEl=sh.querySelector(".bkpages");pagesEl.addEventListener("toggle",()=>requestAnimationFrame(()=>drawBookMarks(sh.querySelector(".bkmarks"),BK.tab)),true);
}document.addEventListener("keydown",e=>{
  if((e.key!=="ArrowRight"&&e.key!=="ArrowLeft")||e.altKey||e.ctrlKey||e.metaKey||!modal.classList.contains("on")||!document.querySelector("#sheet .bkpages:not(.cbpages)"))return;
  const a=document.activeElement;if(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT"))return;
  bkGo(BK.spread+(e.key==="ArrowRight"?1:-1));
});
function atlasPages(){
  const tot=total(),F=S.found,nFound=playable.filter(f=>F.has(f.id)).length,got=ACH.filter(a=>S.ach[a.id]).length;
  const bar=el("div",{class:"bar",style:"width:100%;margin:2px 0 14px"});
  REGIONS.forEach(r=>{const n=playable.filter(f=>F.has(f.id)&&FACTS[f.id].r===r).length;bar.append(el("span",{style:`width:${n/tot*100}%;background:var(--c-${r})`}))});
  const dl=el("dl",{class:"kv"}),add=(k,v)=>dl.append(el("dt",{},k),el("dd",{},String(v)));
  add("Countries studied",playable.filter(f=>jrLevel(f.id)>=2).length);
  add("Countries mastered",playable.filter(f=>jrLevel(f.id)===3).length);
  add("Country pages opened",S.learned.size);
  add("Flags recognised",S.counts.flag||0);
  add("Capitals recognised",S.counts.capital||0);
  add("Silhouettes named",S.counts.sil||0);
  add("Daily challenges completed",Object.keys(S.daily.results).length);
  add("Daily streak",S.daily.streak||0);
  add("Neighbour chains",(S.counts.chain||0)+((S.counts.chainPar||0)?` (${S.counts.chainPar} shortest)`:""));
  add("Best first-try streak",S.bestStreak||0);
  add("Expeditions completed",`${EXPS.filter(e=>S.expDone[e.id]).length} of ${EXPS.length}`);
  add("Stamps",`${got} of ${ACH.length}`);
  return [[el("h2",{},"Atlas"),el("h3",{style:"margin-top:10px"},`${nFound} ${nFound===1?"place":"places"} in your world`,el("small",{style:"font:12.5px var(--sans);color:var(--ink-faint);margin-left:8px"},`${tot-nFound} still to find`)),bar,dl]];
}function setSound(v){
  S.sound=v;save();
  if(S.sound){if(AC("mus")){if(S.mode==="speed"&&R.phase==="run")startMusic()}sndTick();audioGesture()}
  else{stopMusic();applyVol()}
}
/* ---- full screen (the browser's own exclusive full screen; Esc leaves it) ---- */
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
const fsCan=()=>!!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
function fsToggle(on){
  const root=document.documentElement;
  try{
    if(on===undefined)on=!fsEl();
    if(on&&!fsEl()){const p=(root.requestFullscreen||root.webkitRequestFullscreen).call(root,{navigationUI:"hide"});if(p&&p.catch)p.catch(()=>toast("⚠️","Full screen was blocked","Your browser did not allow it. Try again from a click.",3200))}
    else if(!on&&fsEl())(document.exitFullscreen||document.webkitExitFullscreen).call(document);
  }catch(e){}
}
["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>{size();const i=document.querySelector("#sheet input[aria-label='Full screen']");if(i)i.checked=!!fsEl()}));
/* B switches borders off and on while exploring */
document.addEventListener("keydown",e=>{
  if(e.code!=="KeyB"||e.ctrlKey||e.metaKey||e.altKey||introState!=="done"||S.mode!=="wander"||modal.classList.contains("on"))return;
  const a=document.activeElement;if(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT"))return;
  S.nbx=!S.nbx;save();applyNb();sndTick();toast(String.fromCodePoint(0x25A6),S.nbx?"Borders off":"Borders on","Press B to switch. Settings has the same option.",1800);
});
/* keyboard: R reveals, S skips (while typing an answer, hold Alt: Alt+R, Alt+S) */
document.addEventListener("keydown",e=>{
  const k=e.code==="KeyR"?"r":e.code==="KeyS"?"s":"";if(!k||e.ctrlKey||e.metaKey||introState!=="done")return;
  if(modal.classList.contains("on"))return;
  const a=document.activeElement,typing=!!(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT"));
  if(typing!==e.altKey)return;
  const vis=el=>el&&!el.hidden&&el.offsetParent!==null;
  if(S.mode==="speed"){
    if(k==="s"&&R.phase==="run"){e.preventDefault();speedSkip()}
    return;
  }
  if(S.mode!=="find"||S.qIdle)return;
  e.preventDefault();
  if(k==="r"){
    if(vis($("silShow")))$("silShow").click();
    else if(vis($("showBtn")))$("showBtn").click();
  }else{
    if(S.done&&vis($("nextBtn")))$("nextBtn").click();
    else if(C.active)return;
    else if(!S.done&&!D.active){sndTick();nextRound()}
    else if(!S.done&&vis($("silShow")))$("silShow").click();
  }
});
document.addEventListener("keydown",e=>{
  if((e.key==="f"||e.key==="F")&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&fsCan()&&introState==="done"){
    const a=document.activeElement,t=a&&a.tagName;if(t==="INPUT"||t==="TEXTAREA"||t==="SELECT")return;
    fsToggle();
  }
});
function renderSettings(){
  const sh=sheetHead("Settings");
  const card=(title,...rows)=>el("div",{class:"qcard"},el("h3",{},title),...rows);
  sh.append(
    card("Look",opt("Theme","Auto follows your device.",themeSeg()),
      fsCan()?opt("Full screen","Hide the browser bars. Esc exits; F toggles.",toggle(!!fsEl(),v=>fsToggle(v),"Full screen")):"",opt("Visual effects","Lite trims textures and effects for slower devices. Auto uses Lite on phones and tablets.",fxSeg())),
    card("Play",opt("Auto next","Move on automatically after an answer. Tap or press Enter to skip ahead; hovering the card pauses.",autoSeg()),opt("Distance","For distances, areas and density.",unitSeg()),
      opt("Borderless in Quiz and Race","Hide borders while you play. Coastlines stay.",toggle(S.nb,v=>{S.nb=v;save();applyNb();sndTick()},"Borderless in Quiz and Race")),
      opt("Borderless in Explore","Hide borders while exploring. Press B to toggle.",toggle(S.nbx,v=>{S.nbx=v;save();applyNb();sndTick()},"Borderless in Explore"))));
  const vol=el("input",{type:"range",min:"0",max:"1",step:".05","aria-label":"Master volume"});vol.value=S.vol;
  vol.oninput=()=>{S.vol=+vol.value;applyVol();save()};
  sh.append(card("Sound",opt("Sound","Master switch for all sound.",toggle(S.sound,v=>setSound(v),"Sound")),
    opt("Master volume","",vol),
    opt("Sound effects","Chimes, drops, paper rustles.",toggle(S.sfx,v=>{S.sfx=v;save();if(v)sndTick()},"Sound effects")),
    opt("Music","The beat in Race mode.",toggle(S.music,v=>{S.music=v;save();if(v){if(AC("mus")&&S.mode==="speed"&&R.phase==="run")startMusic()}else{stopMusic()}},"Music")),
    navigator.vibrate?opt("Vibration","Short buzzes for hits, misses and Hot & cold.",toggle(S.vib,v=>{S.vib=v;save();if(v)buzz(24)},"Vibration")):null));
  sh.append(fold("Advanced",el("div",{style:"padding-bottom:10px"},opt("Globe engine","Fast uses the GPU. Compatible uses a 2D canvas. Classic is the original look. Changing it reloads the page.",engineSeg()))));
  sh.append(el("div",{class:"qcard"},el("h3",{},"Your save"),
    el("div",{class:"crow"},el("div",{class:"t"},el("b",{},"Export save"),el("small",{},"Download your progress as a backup file.")),el("button",{class:"btn",onclick:exportSave},"Export")),
    el("div",{class:"crow"},el("div",{class:"t"},el("b",{},"Import save"),el("small",{},"Restore from an exported file. Replaces current progress.")),el("button",{class:"btn",onclick:()=>{const i=el("input",{type:"file",accept:".json,application/json",style:"display:none"});i.onchange=()=>{if(i.files&&i.files[0])importSave(i.files[0])};document.body.append(i);i.click();setTimeout(()=>i.remove(),60000)}},"Import"))));
  sh.append(el("div",{class:"qcard danger"},el("h3",{},"Erase"),
    el("div",{class:"crow"},el("div",{class:"t"},el("b",{},"Erase all paint"),el("small",{},"Clear all painted countries and weak spots. Stamps, records and settings stay.")),el("button",{class:"btn danger",onclick:askReset},"Erase paint")),
    el("div",{class:"crow"},el("div",{class:"t"},el("b",{},"Erase all data"),el("small",{},"Delete all progress and settings on this device.")),el("button",{class:"btn danger",onclick:askEraseAll},"Erase all"))));
  sh.append(el("div",{class:"sheetfoot"},el("span",{class:"grow"}),el("button",{class:"btn primary",onclick:closeModal},"Done")));
  openModal();
}/* records now live with their game: Quiz records in the Quiz sheet, Race records in the Race sheet */
function quizRecordsBlock(){
  const days=Object.keys(S.daily.results).sort(),times=days.map(d=>S.daily.results[d].time).filter(t=>t>0);
  const kv=[["Daily streak",`${S.daily.streak||0} day${S.daily.streak===1?"":"s"}`],["Dailies played",String(days.length)],["Best daily time",times.length?fmtT(Math.min(...times)):"none yet"],
    ["Best first-try streak",String(S.bestStreak)],["Countries painted",`${S.found.size} of ${playable.length}`],
    ["Flags named",String(S.counts.flag||0)],["Capitals named",String(S.counts.capital||0)],["Silhouettes named",String(S.counts.sil||0)]];
  const dl=el("dl",{class:"kv"});kv.forEach(([k,v])=>dl.append(el("dt",{},k),el("dd",{},v)));
  const box=el("div",{style:"padding-bottom:12px"},dl);
  if(days.length){
    const t=el("table",{class:"tbl"},el("tr",{},el("th",{},"Recent dailies"),el("th",{class:"t"},"Time")));
    days.slice(-5).reverse().forEach(d=>{const r=S.daily.results[d];t.append(el("tr",{},el("td",{},d+"  "+r.marks.join("")),el("td",{class:"t"},r.time?fmtT(r.time):"-")))});
    box.append(t);
  }
  return box;
}
function raceRecordsBlock(cur,cv){
  const rk=r=>(cv==="country"?r:r+"|"+cv)+(S.nb?"|nb":""),box=el("div",{style:"padding-bottom:12px"});
  const tb=el("table",{class:"tbl"},el("tr",{},el("th",{},"Region"),el("th",{class:"t"},"Best"),el("th",{class:"t"},"Runs")));
  ALLR.forEach(r=>{const x=REC[rk(r)];tb.append(el("tr",{style:r===cur?"font-weight:600":""},el("td",{},r),el("td",{class:"t"},x&&x.best?fmtT(x.best):"-"),el("td",{class:"t"},x?x.runs.length:0)))});
  box.append(tb);
  {const en=REC[rk(cur)];if(en&&Array.isArray(en.ended)&&en.ended.length)box.append(el("p",{style:"font-size:12.5px;color:var(--ink-faint);margin:4px 0 0"},"Ended races here: "+en.ended.length+" (not counted as best times)."))}
  const oldN=Object.entries(OLD).filter(([k,x])=>x&&x.best);
  if(oldN.length&&cv==="country")box.append(el("p",{style:"font-size:12.5px;color:var(--ink-faint)"},"Times from the earlier country lists are kept apart. Best then: "+oldN.map(([k,x])=>k+" "+fmtT(x.best,0)).join(", ")+"."));
  const x=REC[rk(cur)];
  box.append(el("p",{style:"margin:10px 0 4px;font-weight:500"},(cur==="World"?"Earth":cur)+", recent runs"));
  if(!x||!x.runs.length)box.append(el("p",{},"No races here yet. Set a time."));
  else{
    const runs=x.runs.slice(-12),svgEl=el("div",{class:"spark"});box.append(svgEl);
    const w=480,h=70,s=d3.select(svgEl).append("svg").attr("viewBox",`0 0 ${w} ${h}`).attr("width","100%").attr("height",70);
    const xs=d3.scaleLinear([0,Math.max(1,runs.length-1)],[8,w-8]),ys=d3.scaleLinear(d3.extent(runs,d=>d.t).map((v,i,a)=>a[0]===a[1]?(i?v+1000:v-1000):v),[h-10,10]);
    s.append("path").datum(runs).attr("fill","none").attr("stroke","var(--accent)").attr("stroke-width",2).attr("d",d3.line().x((d,i)=>xs(i)).y(d=>ys(d.t)).curve(d3.curveMonotoneX));
    s.selectAll("circle").data(runs).join("circle").attr("cx",(d,i)=>xs(i)).attr("cy",d=>ys(d.t)).attr("r",d=>d.t===x.best?5:3).attr("fill",d=>d.t===x.best?"var(--hot)":"var(--accent)");
    const lt=el("table",{class:"tbl"},el("tr",{},el("th",{},"Date"),el("th",{class:"t"},"Time"),el("th",{class:"t"},"Penalty")));
    runs.slice().reverse().slice(0,6).forEach(r=>lt.append(el("tr",{},el("td",{},r.date),el("td",{class:"t"},fmtT(r.t)),el("td",{class:"t"},r.pen?"+"+r.pen/1000+"s":"-"))));
    box.append(lt);
  }
  return box;
}
/* ---------- mode switching & buttons ---------- */
$("showBtn").onclick=()=>{if(US.on&&S.mode==="find"){if(!S.done)usSuccess(true);return}if(C.active){chainReveal();return}if(!S.done){if(hintOk()){hintStep();return}success(true)}};
$("nextBtn").onclick=()=>{if(C.active&&C.done){sndTick();chainStop();quizIdle();return}if(C.active){chainUndo();return}sndTick();if(S.qIdle)showQuizCompact();else nextRound()};
$("restartBtn").onclick=()=>{if(S.mode!=="speed")return;sndTick();abortRace();startRace()};
$("skipBtn").onclick=()=>{
  if(R.phase==="run")speedSkip();
  else if(R.phase==="done"||R.phase==="idle")speedEnter(true);
};
const MODE_ACC={wander:"#6FA27E",find:"#E06F58",speed:"#2D86FF",hot:"#E0802F"},MODE_NAME={wander:"Explore",find:"Quiz",speed:"Race",hot:"Hot & cold"};
const MODE_DESC={wander:"Discover the world at your own pace.",find:"Can you name the country?",speed:"How many can you find before time runs out?",hot:"Find the hidden country by following the temperature."};
function syncModeDesc(m){
  const d=$("modeDesc");if(d)d.textContent=MODE_DESC[m]||"";
  const x=$("exitBtn");if(x)x.hidden=m==="wander";
  [["Wander","wander"],["Find","find"],["Speed","speed"],["Hot","hot"]].forEach(([k,mm])=>{const b=$("mode"+k);if(b){b.title=MODE_NAME[mm]+": "+MODE_DESC[mm];b.setAttribute("aria-label",MODE_NAME[mm]+". "+MODE_DESC[mm])}});
}
const cap=m=>m==="find"?"Find":m==="speed"?"Speed":m==="hot"?"Hot":"Wander";
function placeDock(){const b=$("mode"+cap(S.mode)),p=$("dockPill");if(!b||!p)return;p.style.width=b.offsetWidth+"px";p.style.transform=`translateX(${b.offsetLeft}px)`}
function sndMode(m){
  const c=AC();if(!c)return;const t=c.currentTime;
  if(m==="wander")[523.25,659.25,783.99].forEach((f,i)=>pluck(f,t+i*.09,.05,1.6,.5));
  else if(m==="find")[587.33,880].forEach((f,i)=>bell(f,t+i*.12,.035,1.8));
  else if(m==="hot")[392,523.25,698.46].forEach((f,i)=>pluck(f,t+i*.08,.05,1.5,.5));
  else{blip(t,500,1500,.14,.05,.15);blip(t+.1,800,2200,.12,.04,.15)}
}
function modeWash(m){
  placeDock();
  if(reduced)return;
  const dk=$("dock");   // the sliding pill already shows where you are; a soft ring of the mode colour pulses out of the dock, and nothing covers the menu that opens
  dk.animate([{boxShadow:"0 0 0 0 color-mix(in srgb,"+MODE_ACC[m]+" 50%,transparent)"},{boxShadow:"0 0 0 12px color-mix(in srgb,"+MODE_ACC[m]+" 0%,transparent)"}],{duration:560,easing:"cubic-bezier(.2,.8,.2,1)"});
}/* coming back to Explore: the globe turns, slowly, to the part of the world you have painted */
function yourWorld(){
  if(S.mode!=="wander"||!S.found.size)return;
  const pts=[...S.found].filter(id=>FACTS[id]).map(id=>LL(id));if(!pts.length)return;
  const c=pts.length>=40?REGION_VIEW.World:d3.geoCentroid({type:"MultiPoint",coordinates:pts});
  stopDrift();flyTo(c,2400,1);
}function setMode(m,quiet,noIdle){
  if(S.mode===m){if(m==="find"&&!noIdle){sndTick();showQuizCompact()}else if(m==="hot"){sndTick();showHotCompact()}else if(m==="speed"&&R.phase==="idle"){sndTick();showRaceCompact()}return}
  if(S.mode==="speed"&&(R.phase==="run"||R.phase==="count")){if(!confirm("Leave this race? This run won’t be saved."))return;}
  if(D.active&&m!=="find"&&!leaveDailyOk())return;
  // into or out of the night-race look: the whole screen cross-fades instead of snapping (the browser keeps a picture of the old screen)
  if(!quiet&&!reduced&&!themeBusy&&document.startViewTransition&&(S.mode==="speed")!==(m==="speed")){
    let ran=false;const run=()=>{if(ran)return;ran=true;setModeNow(m,quiet,noIdle)};
    const de=document.documentElement;de.classList.add("vtfast");
    try{const vt=document.startViewTransition(()=>{run()});vt.finished.then(()=>de.classList.remove("vtfast"),()=>de.classList.remove("vtfast"));vt.ready.catch(()=>{})}catch(e){de.classList.remove("vtfast")}
    setTimeout(run,250);setTimeout(()=>de.classList.remove("vtfast"),900);   // if the browser never gets round to the cross-fade (a hidden tab, say), the switch still happens
    return;
  }
  setModeNow(m,quiet,noIdle);
}
function setModeNow(m,quiet,noIdle){
  if(tms){tms.cancel=true;tms=null;briefHide();if(tmsTimer){tmsTimer.stop();tmsTimer=null;animating=false;syncZoom()}}
  const from=S.mode;clearAuto();usStop();if(from==="hot")hotStop();else if(HC.size){HC.clear()}
  if(from==="speed")abortRace();
  if(D.active&&m!=="find")D.active=false;
  if(m!=="find"){S.qIdle=false;chainStop();endSession();S.practice=false;if(typeof silHide==="function")silHide()}
  closeModal();
  S.mode=m;
  document.documentElement.dataset.mode=m;syncModeDesc(m);fbHide();cvColors();if(nbApplied!==nbNow())applyNb();
  $("app").classList.toggle("wander",m==="wander");$("app").classList.toggle("speed",m==="speed");
  ["Find","Speed","Wander","Hot"].forEach(k=>$("mode"+k).setAttribute("aria-pressed",String(m===k.toLowerCase())));
  flyR=null;syncChips();
  if(!quiet){sndMode(m);modeWash(m)}else placeDock();

  hideCard();clearMissed();
  sizeIfChanged();paint();updateProgress();
  if(m==="speed"){stopDrift();speedEnter(!quiet)}
  else if(m==="hot"){stopDrift();hotEnter(!quiet)}
  else if(m==="find"){if(noIdle){S.qIdle=false;nextRound()}else quizIdle(!quiet);if(from==="speed")flyTo(REGION_VIEW[S.region],1200,REGION_ZOOM[S.region]);scheduleDrift()}
  else{scheduleDrift();if(from!=="wander"&&!quiet)setTimeout(yourWorld,900)}
}$("modeFind").onclick=()=>setMode("find");
$("modeSpeed").onclick=()=>setMode("speed");
$("modeWander").onclick=()=>setMode("wander");
$("modeHot").onclick=()=>setMode("hot");
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&S.done&&S.mode==="find"&&!S.qIdle&&document.activeElement===document.body&&!modal.classList.contains("on"))nextRound()});
// browsers only allow audio after a gesture; the first touch wakes it up
["pointerdown","keydown","touchend","click"].forEach(ev=>window.addEventListener(ev,audioGesture,true));

/* ---------- reset: wipes painted progress only, after a confirm ---------- */
function askReset(){
  const sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("h2",{},"Erase all paint?"),
    el("p",{},"This clears all painted countries and weak spots. Stamps, records, daily results, reading history and settings stay."),
    el("div",{class:"row"},el("button",{class:"btn",id:"rsCancel",onclick:closeModal},"Cancel"),el("button",{class:"btn danger",id:"rsGo",onclick:doReset},"Erase paint")));
  openModal();setTimeout(()=>{const c=$("rsCancel");if(c)c.focus({preventScroll:true})},60);
}
function exportSave(){
  try{
    save();const pack={app:"mapbloom",v:1,saved:new Date().toISOString(),main:localStorage.getItem(KEY),records:localStorage.getItem(RKEY)};
    if(!pack.main)save(),pack.main=localStorage.getItem(KEY);
    const blob=new Blob([JSON.stringify(pack)],{type:"application/json"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download="mapbloom-save-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
    toast("\u{1F4BE}","Save exported","Keep the file somewhere safe. Import it in Settings to restore.",4200);
  }catch(e){toast("⚠️","Could not export","Your browser blocked the download.",3600)}
}
function importSave(file){
  const rd=new FileReader();
  rd.onload=()=>{
    let pack=null;try{pack=JSON.parse(rd.result)}catch(e){}
    let ok=pack&&pack.app==="mapbloom"&&typeof pack.main==="string";
    if(ok&&pack.main.length>3e6)ok=false;
    if(ok){try{const m=JSON.parse(pack.main);ok=m&&typeof m==="object"&&!Array.isArray(m)&&(m.found==null||Array.isArray(m.found))&&(m.shown==null||Array.isArray(m.shown))&&(m.learned==null||Array.isArray(m.learned))&&(m.returnQ==null||Array.isArray(m.returnQ))}catch(e){ok=false}}
    if(ok&&pack.records){try{const rc=JSON.parse(pack.records);ok=!!rc&&typeof rc==="object"&&!Array.isArray(rc)}catch(e){ok=false}}
    const sh=$("sheet");sh.innerHTML="";
    if(!ok){sh.append(closeBtn(),el("h2",{},"Not a Mapbloom save"),el("p",{},"That is not a Mapbloom save. Nothing changed."),el("div",{class:"sheetfoot"},el("span",{class:"grow"}),el("button",{class:"btn primary",onclick:renderSettings},"Back to Settings")));openModal();return}
    const m=JSON.parse(pack.main),n=(m.found||[]).length;
    sh.append(closeBtn(),el("h2",{},"Replace your progress?"),
      el("p",{},`This save has ${n} painted countr${n===1?"y":"ies"}${pack.saved?", exported "+String(pack.saved).slice(0,10):""}. Importing replaces all progress and settings on this device.`),
      el("div",{class:"row"},el("button",{class:"btn",id:"imCancel",onclick:renderSettings},"Cancel"),el("button",{class:"btn danger",onclick:()=>{
        WIPED=true;
        try{localStorage.setItem(KEY,pack.main);if(pack.records)localStorage.setItem(RKEY,pack.records);else localStorage.removeItem(RKEY)}catch(e){}
        location.reload();
      }},"Replace and reload")));
    openModal();setTimeout(()=>{const c=$("imCancel");if(c)c.focus({preventScroll:true})},60);
  };
  rd.readAsText(file);
}
function askEraseAll(){
  const sh=$("sheet");sh.innerHTML="";
  sh.append(closeBtn(),el("h2",{},"Erase everything?"),
    el("p",{},"This permanently deletes all progress and settings on this device. It cannot be undone."),
    el("div",{class:"row"},el("button",{class:"btn",id:"eaCancel",onclick:closeModal},"Cancel"),el("button",{class:"btn danger",onclick:doEraseAll},"Erase all data")));
  openModal();setTimeout(()=>{const c=$("eaCancel");if(c)c.focus({preventScroll:true})},60);
}
function doEraseAll(){
  WIPED=true;
  try{Object.keys(localStorage).filter(k=>/^(mapbloom|tidewash|slowatlas|mb-)/i.test(k)).forEach(k=>localStorage.removeItem(k));sessionStorage.clear()}catch(e){}
  location.reload();
}
function doReset(){
  closeModal();hideCard();
  const fin=()=>{
    S.found.clear();S.shown.clear();S.returnQ=[];S.weak={};S.recent=[];S.seen={};S.turn=0;S.streak=0;S.practice=false;
    S.done=false;save();paint();updateProgress();if(S.mode==="find")idleView();
    d3.select("#paint").style("opacity",null);
    toast("\u{1F33F}","Fresh canvas","Everything’s blank paper again.");sndPage();
  };
  if(reduced){fin();return}
  sndPage();
  const pg=document.getElementById("paint");if(CANVAS)cvTweenPA(0,700);else{pg.style.transition="opacity .7s ease";pg.style.opacity="0"}
  setTimeout(()=>{fin();pg.style.transition="";GLX.whenIdle(()=>{cvPA=1;render()})},760);
}

