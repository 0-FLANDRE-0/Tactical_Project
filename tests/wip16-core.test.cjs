const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./load.cjs')();

function fixture(policy='maintain',fireMode='hold'){
  const ai=C.makeTank('A','RED AI',550,2750,-.61,'red',undefined,fireMode),b=C.makeTank('B','BLUE B',1150,2330,2.5,'blue',undefined,'hold'),d=C.makeTank('D','BLUE D',1250,2280,2.5,'blue',undefined,'hold');
  b.combat.hp=b.combat.maxHp=100000;d.combat.hp=d.combat.maxHp=100000;
  const s={time:0,seed:16,units:[ai,b,d],recordAIEvents:true,recordObservationEvents:true,recordFireEvents:true};
  for(const ch of ['commander','gunner'])assert(C.guard(s,ai,ch,{x:1200,y:2300}));
  C.assignMission(s,ai,{id:'A-patrol',type:'patrol',policy,loop:true,waypoints:[{x:850,y:2720},{x:550,y:2750}]});return{s,ai,b,d};
}
function run(s,seconds){for(let i=0;i<Math.round(seconds/.05);i++)C.step(s,.05);}

test('W16-C01 actual 2-target observation drives one AI-owned handoff and the same fire-control target',()=>{
  const f=fixture('maintain');run(f.s,8);const ai=C.aiStatus(f.s,f.ai),own=C.ownObservation(f.s,f.ai,ai.autoTargetKey),fire=C.fireStatus(f.s,f.ai,ai.autoTargetKey),events=C.aiEventLog(f.s);
  assert(['B','D'].includes(ai.autoTargetId));assert.equal(own.targetKey,ai.autoTargetKey);assert.equal(own.source,'ai');assert(own.acquired);assert.equal(fire.targetKey,ai.autoTargetKey);assert(fire.aimProgress>0);assert.equal(ai.counters.targetCommands,1);assert.equal(events.filter(e=>e.type==='target-commanded').length,1);assert(f.ai.distanceTravelled>0);assert.equal(ai.counters.stops,0);
});

test('W16-C02 halt policy brakes once, keeps the selected handoff, then resumes its original waypoint once after actual loss',()=>{
  const f=fixture('halt');run(f.s,10);let ai=C.aiStatus(f.s,f.ai),own=C.ownObservation(f.s,f.ai,ai.autoTargetKey);assert.equal(ai.mission.status,'paused');assert.equal(ai.counters.stops,1);assert.equal(ai.behavior,'engaging');assert(Math.abs(f.ai.drive.velocity)<.1);assert(own.acquired);const index=ai.mission.index,target=ai.autoTargetId;
  for(const hidden of [f.b,f.d]){hidden.x=3900;hidden.y=100;}run(f.s,6);ai=C.aiStatus(f.s,f.ai);const events=C.aiEventLog(f.s);assert.equal(ai.mission.index,index);assert.equal(ai.mission.status,'active');assert.equal(ai.counters.resumes,1);assert.equal(events.filter(e=>e.type==='mission-resume').length,1);assert.equal(ai.autoTargetId,null);assert(!f.ai.fireControl.autoSuppressed);run(f.s,2);assert.equal(C.aiStatus(f.s,f.ai).counters.resumes,1);
});

test('W16-C03 direct player designation immediately owns the real handoff and cancellation restores AI source',()=>{
  const f=fixture('maintain');run(f.s,8);let ai=C.aiStatus(f.s,f.ai);const automatic=ai.autoTargetId,manual=automatic==='B'?'D':'B',contact=f.ai.observation.contacts[manual];assert(contact?.current&&contact.identified);assert(C.designate(f.s,f.ai,contact.key));C.step(f.s,.05);let own=C.ownObservation(f.s,f.ai,contact.key);assert.equal(own.source,'manual');assert.equal(own.targetKey,contact.key);assert.equal(C.aiStatus(f.s,f.ai).autoTargetId,automatic);
  assert(C.cancelDesignation(f.s,f.ai));C.step(f.s,.05);ai=C.aiStatus(f.s,f.ai);own=C.ownObservation(f.s,f.ai,ai.autoTargetKey);assert.equal(ai.autoTargetId,automatic);assert.equal(own.source,'ai');assert.equal(own.targetKey,ai.autoTargetKey);
});

test('W16-C04 reloading and observation faults preserve engagement while zero total ammunition releases a halt mission',()=>{
  const f=fixture('halt');run(f.s,10);let ai=C.aiStatus(f.s,f.ai),target=ai.autoTargetId,key=ai.autoTargetKey;assert(ai.mission.status==='paused'&&target);f.ai.fireControl.loaded=false;f.ai.fireControl.reloadProgress=.2;f.ai.fireControl.faultUntil.commander=f.s.time+7;run(f.s,3);ai=C.aiStatus(f.s,f.ai);assert.equal(ai.autoTargetId,target);assert.equal(ai.mission.status,'paused');assert(C.ownObservation(f.s,f.ai,key).acquired);assert(C.fireStatus(f.s,f.ai).aimPenalty.active);
  f.ai.fireControl.ammo=0;f.ai.fireControl.loaded=false;run(f.s,1);ai=C.aiStatus(f.s,f.ai);assert.equal(ai.autoTargetId,null);assert.equal(ai.mission.status,'active');assert.equal(ai.counters.resumes,1);assert(!f.ai.fireControl.autoSuppressed);
});

test('W16-C05 hidden enemy state changes do not affect selection and AI state stays out of public JSON snapshots',()=>{
  const runHidden=hidden=>{const f=fixture('maintain');f.b.combat.hp=hidden.hp;f.b.fireControl.ammo=hidden.ammo;f.b.fireControl.faultUntil.gunner=hidden.fault;f.b.goal=hidden.goal;run(f.s,5);const ai=C.aiStatus(f.s,f.ai),publicState=JSON.stringify({units:f.s.units.filter(u=>u.team==='red').map(u=>({id:u.id,x:u.x,y:u.y})),contacts:C.contacts(f.s,'red')});return{target:ai.autoTargetId,key:ai.autoTargetKey,commands:ai.counters.targetCommands,leaks:/autoTargetId|targetSelectedAt|blockedCandidates/.test(publicState)};};
  const a=runHidden({hp:1,ammo:0,fault:999,goal:{x:1,y:1}}),b=runHidden({hp:99999,ammo:42,fault:0,goal:null});assert.deepEqual(a,b);assert(!a.leaks);
});

test('W16-C06 fixed-step target decisions ignore pause, render batching and status read frequency',()=>{
  const simulate=(batch,reads)=>{const f=fixture('maintain');const paused=JSON.stringify(C.aiStatus(f.s,f.ai));for(let i=0;i<20;i++)for(let r=0;r<reads;r++)C.aiStatus(f.s,f.ai);assert.equal(JSON.stringify(C.aiStatus(f.s,f.ai)),paused);let steps=0;while(steps<200){for(let j=0;j<Math.min(batch,200-steps);j++){C.step(f.s,.05);steps++;}for(let r=0;r<reads;r++){C.aiStatus(f.s,f.ai);C.ownObservation(f.s,f.ai);C.fireStatus(f.s,f.ai);}}const ai=C.aiStatus(f.s,f.ai);return{time:f.s.time,target:ai.autoTargetId,key:ai.autoTargetKey,selectedAt:ai.targetSelectedAt,counters:ai.counters,events:C.aiEventLog(f.s)};};
  assert.deepEqual(simulate(1,0),simulate(4,7));
});
