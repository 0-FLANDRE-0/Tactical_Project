const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./load.cjs')();
const {core:syntheticCore}=require('./helpers/observation-core-fixture.cjs');

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

function blockedFixture(targets=[['A',1500,1000]]){
  const core=syntheticCore('low-wall'),u=core.makeTank('BLOCK-AI-'+targets.length,'BLOCK AI',500,1000,0,'blue',undefined,'auto'),enemies=targets.map(([id,x,y])=>core.makeTank(id,id,x,y,Math.PI,'red',undefined,'hold'));
  for(const enemy of enemies)enemy.combat.hp=enemy.combat.maxHp=100000;
  const s={time:0,seed:16,units:[u,...enemies],recordAIEvents:true,recordObservationEvents:true,recordFireEvents:true};core.guard(s,u,'commander',{x:1500,y:1000});core.guard(s,u,'gunner',{x:1500,y:1000});core.assignMission(s,u,{id:'blocked-patrol',type:'patrol',policy:'halt',loop:true,waypoints:[{x:700,y:1000},{x:500,y:1000}]});
  const step=()=>core.step(s,.05),until=(predicate,limit=1200)=>{for(let i=0;i<limit;i++){step();if(predicate())return;}throw Error('blocked fixture timeout');};return{C:core,s,u,enemies,step,until};
}
function manualRangeFixture(farX=2600){
  const core=syntheticCore('flat'),u=core.makeTank('MANUAL-AI-'+farX,'MANUAL AI',500,1000,0,'blue',undefined,'auto'),a=core.makeTank('A','AUTO A',1200,1000,Math.PI,'red',undefined,'hold'),b=core.makeTank('B','MANUAL B',farX,1000,Math.PI,'red',undefined,'hold');
  for(const enemy of[a,b])enemy.combat.hp=enemy.combat.maxHp=100000;
  const s={time:0,seed:16,units:[u,a,b],recordAIEvents:true,recordObservationEvents:true,recordFireEvents:true};core.guard(s,u,'commander',{x:b.x,y:b.y});core.guard(s,u,'gunner',{x:a.x,y:a.y});core.assignMission(s,u,{id:'manual-patrol',type:'patrol',policy:'halt',loop:true,waypoints:[{x:700,y:1000},{x:500,y:1000}]});
  const step=()=>core.step(s,.05),until=(predicate,limit=1200)=>{for(let i=0;i<limit;i++){step();if(predicate())return;}throw Error('manual range fixture timeout');};until(()=>{const ai=core.aiStatus(s,u);return ai.mission.status==='paused'&&u.observation.contacts.B?.identified&&core.ownObservation(s,u,ai.autoTargetKey).acquired;});return{C:core,s,u,a,b,step,until};
}

test('W16-C07 actual persistent single and multiple fire-line blocks resume once without command loops',()=>{
  for(const targets of[[['A',1500,1000]],[['A',1500,960],['B',1500,1040]]]){
    const f=blockedFixture(targets),before=f.C.aiStatus(f.s,f.u);f.until(()=>f.C.aiStatus(f.s,f.u).counters.resumes===1);let ai=f.C.aiStatus(f.s,f.u),events=f.C.aiEventLog(f.s),counts={stops:ai.counters.stops,resumes:ai.counters.resumes,commands:ai.counters.targetCommands,paths:ai.counters.pathRequests};
    assert.equal(ai.mission.id,before.mission.id);assert.deepEqual(ai.mission.waypoints,before.mission.waypoints);assert.equal(ai.mission.status,'active');assert.equal(counts.stops,1);assert.equal(counts.resumes,1);assert.equal(counts.paths,2);assert(Object.values(ai.blockedCandidates).every(v=>v.abandoned));assert.equal(events.filter(e=>e.type==='mission-resume').length,1);
    for(let i=0;i<400;i++)f.step();ai=f.C.aiStatus(f.s,f.u);assert.equal(ai.counters.stops,counts.stops);assert.equal(ai.counters.resumes,counts.resumes);assert.equal(ai.counters.targetCommands,counts.commands);
  }
});

test('W16-C08 material line change and a new unblocked alternative recover without an extra stop',()=>{
  const changed=blockedFixture();changed.until(()=>changed.C.aiStatus(changed.s,changed.u).counters.blockedTargets===1);changed.enemies[0].y=1300;changed.until(()=>changed.C.fireEvents(changed.s).some(e=>e.type==='fired'));let ai=changed.C.aiStatus(changed.s,changed.u);assert.equal(ai.autoTargetId,'A');assert.equal(ai.counters.stops,1);assert.equal(ai.counters.resumes,0);assert(!Object.hasOwn(ai.blockedCandidates,'A'));
  const alternative=blockedFixture([['A',1500,1000],['B',900,1335]]);alternative.u.profileOverride=structuredClone(alternative.C.PROFILE);alternative.u.profileOverride.sensors.commander.enabled=false;alternative.C.guard(alternative.s,alternative.u,'gunner',{x:1500,y:1000});alternative.until(()=>alternative.C.aiStatus(alternative.s,alternative.u).counters.blockedTargets===1);alternative.u.profileOverride.sensors.commander.enabled=true;alternative.C.guard(alternative.s,alternative.u,'commander',{x:900,y:1335});alternative.until(()=>alternative.C.aiStatus(alternative.s,alternative.u).autoTargetId==='B');ai=alternative.C.aiStatus(alternative.s,alternative.u);assert.equal(ai.counters.stops,1);assert.equal(ai.counters.resumes,0);assert.equal(alternative.C.ownObservation(alternative.s,alternative.u).source,'ai');
});

test('W16-C09 out-of-range manual ownership resumes movement, then reentry and cancellation reconnect normally',()=>{
  const f=manualRangeFixture(),before=f.C.aiStatus(f.s,f.u),manualKey=f.u.observation.contacts.B.key,commands=before.counters.targetCommands;assert(f.C.designate(f.s,f.u,manualKey));f.until(()=>f.C.aiStatus(f.s,f.u).counters.resumes===1);let ai=f.C.aiStatus(f.s,f.u),own=f.C.ownObservation(f.s,f.u,manualKey);
  assert.equal(own.source,'manual');assert.equal(own.status,'waiting');assert.equal(own.reason,'range');assert.equal(ai.mission.id,before.mission.id);assert.deepEqual(ai.mission.waypoints,before.mission.waypoints);assert.equal(ai.mission.status,'active');assert.equal(ai.counters.stops,1);assert.equal(ai.counters.targetCommands,commands);assert.equal(f.C.aiEventLog(f.s).filter(e=>e.type==='target-command-rejected').length,0);
  f.b.x=f.u.x+1700;f.until(()=>f.C.ownObservation(f.s,f.u,manualKey).acquired&&f.C.aiStatus(f.s,f.u).mission.status==='paused');ai=f.C.aiStatus(f.s,f.u);own=f.C.ownObservation(f.s,f.u,manualKey);assert.equal(own.source,'manual');assert.equal(ai.counters.stops,2);assert.equal(ai.autoTargetId,null);
  assert(f.C.cancelDesignation(f.s,f.u));f.until(()=>f.C.ownObservation(f.s,f.u).source==='ai');ai=f.C.aiStatus(f.s,f.u);assert.equal(ai.autoTargetId,'A');assert.equal(ai.mission.status,'paused');assert.equal(ai.counters.stops,2);
});

test('W16-C10 naturally expired out-of-range manual order returns to automatic ownership',()=>{
  const f=manualRangeFixture(2850),manualKey=f.u.observation.contacts.B.key;assert(f.C.designate(f.s,f.u,manualKey));f.until(()=>f.C.aiStatus(f.s,f.u).counters.resumes===1);assert.equal(f.C.ownObservation(f.s,f.u,manualKey).source,'manual');f.until(()=>f.C.ownObservation(f.s,f.u).source==='ai');const ai=f.C.aiStatus(f.s,f.u);assert.equal(ai.autoTargetId,'A');assert.equal(ai.mission.status,'paused');assert.equal(ai.counters.resumes,1);assert.equal(ai.counters.stops,2);assert((f.s.observationEvents||[]).some(e=>e.type==='target-expired'&&e.source==='manual'));
});

test('W16-C11 actual forward and backward ridge crossings reopen abandoned lines and fire automatically',()=>{
  for(const reverse of [false,true]){
    const core=syntheticCore('fire-ridge'),u=core.makeTank('U'+reverse,'RIDGE AI',reverse?1500:500,1000,0,'blue',undefined,'auto'),target=core.makeTank('T','RIDGE TARGET',reverse?500:1500,1000,reverse?0:Math.PI,'red',undefined,'hold');target.combat.hp=target.combat.maxHp=100000;const goal={x:reverse?880:1120,y:1000,reverse};
    const s={time:0,seed:16,units:[u,target],recordAIEvents:true,recordObservationEvents:true,recordFireEvents:true};for(const ch of ['commander','gunner'])core.guard(s,u,ch,{x:target.x,y:target.y});core.assignMission(s,u,{id:reverse?'ridge-reverse':'ridge-forward',type:'move',policy:'maintain',waypoints:[goal]});u.goal={x:goal.x,y:goal.y};u.path=[{x:goal.x,y:goal.y}];u.reverse=reverse;u.drive.requestedDirection=reverse?-1:1;
    let fired=null;for(let i=0;i<1800&&!fired;i++){core.step(s,.05);fired=core.fireEvents(s,'blue').find(e=>e.type==='fired');}
    assert(fired);const atFire=core.aiStatus(s,u),own=core.ownObservation(s,u,fired.targetKey),events=core.aiEventLog(s),x=u.x,height=core.heightAt(u.x,u.y),velocity=u.drive.velocity;assert.equal(fired.source,'auto');assert.equal(own.source,'ai');assert.equal(own.status,'acquired');assert(atFire.counters.blockedTargets>=2);assert.equal(atFire.counters.stops,0);assert.equal(atFire.counters.resumes,0);assert(atFire.blockedCandidates.T.abandoned&&atFire.blockedCandidates.T.probePending);assert(events.some(e=>e.type==='target-commanded')&&events.some(e=>e.type==='target-blocked'));assert(Math.abs(x-1000)<12);assert(height>1);assert.equal(u.y,1000);assert(reverse?velocity<0:velocity>0);for(let i=0;i<20;i++)core.step(s,.05);assert(!Object.hasOwn(core.aiStatus(s,u).blockedCandidates,'T'));
  }
});
