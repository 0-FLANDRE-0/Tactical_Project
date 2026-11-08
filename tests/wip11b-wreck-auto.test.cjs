const test=require('node:test'),assert=require('node:assert/strict');
const {core,fixture}=require('./helpers/observation-core-fixture.cjs');

function until(step,predicate,limit=1600){for(let i=0;i<limit;i++){step();if(predicate())return i+1;}throw Error('condition timeout');}
function manualReady(seed=17){
  const f=fixture('flat',{target:{x:1000,y:1000},seed});f.step(160);const key=f.contact().key;
  assert(f.C.designate(f.s,f.u,key));f.step(80);assert(f.C.fireStatus(f.s,f.u,key).canFire);return{...f,key};
}
function multi(kind='flat'){
  const C=core(kind),u=C.makeTank('A','BLUE',500,1000,0,'blue',undefined,'hold'),a=C.makeTank('T1','TARGET A',kind==='low-wall'?1500:1000,1000,Math.PI,'red',undefined,'hold'),b=C.makeTank('T2','TARGET B',900,1335,Math.PI,'red',undefined,'hold');
  const s={time:0,seed:21,units:[u,a,b],recordFireEvents:true,recordObservationEvents:true},step=()=>C.step(s,.05);
  u.observation.autoAssignAfter=999;C.guard(s,u,'commander',{x:b.x,y:b.y});
  until(step,()=>u.observation.contacts.T1?.identified&&u.observation.contacts.T2?.identified);
  u.observation.autoAssignAfter=0;const aKey=u.observation.contacts.T1.key,bKey=u.observation.contacts.T2.key;
  assert(C.designate(s,u,aKey));until(step,()=>C.ownObservation(s,u,aKey).acquired);return{C,s,u,a,b,step,aKey,bKey};
}
function discoveryQueue(){
  const C=core('flat'),u=C.makeTank('U','OBSERVER',500,1000,0,'blue',undefined,'hold'),second=C.makeTank('A_SECOND','SECOND FOUND',100,1000,Math.PI,'red',undefined,'hold'),first=C.makeTank('Z_FIRST','FIRST FOUND',900,1000,Math.PI,'red',undefined,'hold');
  u.profileOverride=structuredClone(C.PROFILE);u.profileOverride.sensors.gunner.range=100;u.observation.autoAssignAfter=999;
  const s={time:0,seed:73,units:[u,second,first],recordObservationEvents:true,recordFireEvents:true},step=()=>C.step(s,.05);
  u.commander=0;C.guard(s,u,'commander',{x:first.x,y:first.y});until(step,()=>u.observation.contacts.Z_FIRST?.detected&&!u.observation.contacts.Z_FIRST?.identified);
  u.commander=Math.PI;C.guard(s,u,'commander',{x:second.x,y:second.y});until(step,()=>u.observation.contacts.A_SECOND?.identified);
  u.commander=0;C.guard(s,u,'commander',{x:first.x,y:first.y});until(step,()=>u.observation.contacts.Z_FIRST?.identified);
  return{C,s,u,first,second,step,firstContact:u.observation.contacts.Z_FIRST,secondContact:u.observation.contacts.A_SECOND};
}

test('W01/W04 observed wreck is permanent, detached and unique beyond contact memory',()=>{
  const f=manualReady(5);f.t.combat.hp=1;assert(f.C.requestFire(f.s,f.u,f.key).ok);f.step();
  until(()=>f.step(),()=>f.t.combat.status==='destroyed');const first=f.C.contacts(f.s).filter(c=>c.wreck);assert.equal(first.length,1);
  const pose={x:first[0].x,y:first[0].y,heading:first[0].heading};first[0].x=-1;
  f.u.turret+=Math.PI;f.u.commander+=Math.PI;f.C.guard(f.s,f.u,'gunner',{x:0,y:1000});f.C.guard(f.s,f.u,'commander',{x:0,y:1000});f.step(900);
  const later=f.C.contacts(f.s).filter(c=>c.wreck);assert.equal(later.length,1);assert.deepEqual({x:later[0].x,y:later[0].y,heading:later[0].heading},pose);
  assert.equal(f.C.designate(f.s,f.u,f.key),false);
});

test('W02/W03 unseen destruction stays private, expires as memory, then is identified as a permanent wreck',()=>{
  const f=manualReady(3);f.t.combat.hp=1;assert(f.C.requestFire(f.s,f.u,f.key).ok);f.step();const shot=f.C.fireEvents(f.s).find(e=>e.type==='fired');
  f.u.turret+=Math.PI;f.u.commander+=Math.PI;f.C.guard(f.s,f.u,'gunner',{x:0,y:1000});f.C.guard(f.s,f.u,'commander',{x:0,y:1000});
  until(()=>f.step(),()=>f.s.time>shot.impactAt+.05);assert.equal(f.t.combat.status,'destroyed');assert(!f.C.contacts(f.s).some(c=>c.wreck));
  f.step(700);assert(!f.C.contacts(f.s).some(c=>c.key===f.key));
  f.C.guard(f.s,f.u,'gunner',{x:f.t.x,y:f.t.y});f.C.guard(f.s,f.u,'commander',{x:f.t.x,y:f.t.y});
  until(()=>f.step(),()=>f.C.contacts(f.s).some(c=>c.wreck));const wreck=f.C.contacts(f.s).find(c=>c.wreck);assert.equal(wreck.key,f.key);
  f.u.turret+=Math.PI;f.u.commander+=Math.PI;f.step(800);assert.equal(f.C.contacts(f.s).filter(c=>c.wreck).length,1);
});

test('W05 identical public memory accepts designation regardless of hidden alive/destroyed state',()=>{
  function run(destroyed){const f=fixture('flat',{target:{x:1000,y:1000},seed:33});f.step(170);const before=f.C.contacts(f.s)[0];assert(before?.memory===false);f.u.turret+=Math.PI;f.u.commander+=Math.PI;f.C.guard(f.s,f.u,'gunner',{x:0,y:1000});f.C.guard(f.s,f.u,'commander',{x:0,y:1000});f.step(4);if(destroyed){f.t.combat.hp=0;f.t.combat.status='destroyed';f.t.state='격파';}const publicContact=f.C.contacts(f.s)[0],accepted=f.C.designate(f.s,f.u,publicContact.key);return{publicContact,accepted,own:f.C.ownObservation(f.s,f.u,publicContact.key)};}
  const alive=run(false),dead=run(true);assert.deepEqual(dead.publicContact,alive.publicContact);assert.equal(alive.accepted,true);assert.equal(dead.accepted,true);assert.equal(dead.own.status,alive.own.status);
});

test('W06/W08 wreck keeps collision and rejects actions while a fresh scenario inherits no state',()=>{
  const f=manualReady(7);f.t.combat.hp=0;f.t.combat.status='destroyed';f.t.state='격파';
  assert(!f.C.passable(f.t.x,f.t.y,f.s.units,f.u));assert.equal(f.C.issueMove(f.t,{x:f.t.x+20,y:f.t.y},false,f.s.units).ok,false);assert.equal(f.C.guard(f.s,f.t,'gunner',{x:0,y:0}),false);assert.equal(f.C.fireMode(f.s,f.t,'auto'),false);
  const fresh=fixture('flat',{target:{x:1000,y:1000},seed:7});assert.equal(fresh.t.combat.status,'alive');assert.equal(fresh.C.fireStatus(fresh.s,fresh.t).mode,'hold');assert.equal(fresh.C.contacts(fresh.s).length,0);assert.equal(fresh.C.fireEvents(fresh.s).length,0);
});

test('E01 scenario explicitly enables symmetric per-unit auto without mutating the shared profile',()=>{
  const C=core('flat'),profileBefore=JSON.stringify(C.PROFILE),s=C.createScenario(19);
  assert(s.units.every(u=>C.fireStatus(s,u).mode==='auto'));assert.equal(JSON.stringify(C.PROFILE),profileBefore);
  assert(C.fireMode(s,s.units[0],'hold'));assert.equal(C.fireStatus(s,s.units[0]).mode,'hold');assert(s.units.slice(1).every(u=>C.fireStatus(s,u).mode==='auto'));
});

test('E18 normal creation and replacement scenarios default auto while manual fixtures explicitly request hold',()=>{
  const C=core('flat'),normal=C.makeTank('N','NORMAL',500,500,0),normalScenario={time:0,seed:1,units:[normal]},held=C.makeTank('H','HELD FIXTURE',600,500,0,'blue',undefined,'hold');
  assert.equal(C.fireStatus(normalScenario,normal).mode,'auto');assert.equal(held.fireControl.fireMode,'hold');C.fireMode(normalScenario,normal,'hold');assert.equal(normal.fireControl.fireMode,'hold');
  const reset=C.createScenario(1);assert(reset.units.every(u=>C.fireStatus(reset,u).mode==='auto'));
});

test('E02/E10 both teams use actual sensing, acquisition, aim and shared auto fire path',()=>{
  const C=core('flat'),u=C.makeTank('A','BLUE',500,1000,0,'blue'),t=C.makeTank('T','RED',1000,1000,Math.PI,'red'),s={time:0,seed:17,units:[u,t],recordFireEvents:true};
  until(()=>C.step(s,.05),()=>C.fireEvents(s,'blue').some(e=>e.type==='impact')&&C.fireEvents(s,'red').some(e=>e.type==='impact'));
  for(const [unit,team,target]of[[u,'blue',t],[t,'red',u]]){const fired=C.fireEvents(s,team).find(e=>e.type==='fired');assert.equal(fired.source,'auto');assert(unit.observation.contacts[target.id].identified);assert(unit.fireControl.shotCount>0);assert(target.combat.hp<target.combat.maxHp);}
});

test('E03/E04 auto cannot fire from team knowledge without own gunner range and fresh acquisition',()=>{
  const C=core('flat'),scout=C.makeTank('S','SCOUT',500,1000,0,'blue',undefined,'hold'),receiver=C.makeTank('R','RECEIVER',500,1020,0,'blue',undefined,'hold'),target=C.makeTank('T','TARGET',1000,1000,Math.PI,'red',undefined,'hold');
  receiver.profileOverride=structuredClone(C.PROFILE);receiver.profileOverride.sensors.commander.enabled=false;receiver.profileOverride.sensors.gunner.range=100;
  const s={time:0,seed:13,units:[scout,receiver,target],recordFireEvents:true};C.fireMode(s,receiver,'auto');C.guard(s,scout,'commander',{x:target.x,y:target.y});
  until(()=>C.step(s,.05),()=>C.contacts(s,'blue').some(c=>c.identified));const contact=C.contacts(s,'blue').find(c=>c.identified);assert(C.designate(s,receiver,contact.key));
  for(let i=0;i<500;i++)C.step(s,.05);assert.equal(receiver.fireControl.shotCount,0);assert(!C.ownObservation(s,receiver,contact.key).acquired);
});

test('E05 hold blocks automatic fire but preserves the manual one-shot gate',()=>{
  const f=manualReady(9);assert.equal(f.C.fireStatus(f.s,f.u).mode,'hold');f.step(80);assert.equal(f.C.fireEvents(f.s).length,0);
  const ammo=f.C.fireStatus(f.s,f.u).ammo;assert(f.C.requestFire(f.s,f.u,f.key).ok);f.step();assert.equal(f.C.fireEvents(f.s).filter(e=>e.type==='fired').length,1);assert.equal(f.C.fireStatus(f.s,f.u).ammo,ammo-1);
});

test('E06/E07 manual request wins an auto overlap and hold preserves its in-flight round',()=>{
  const f=manualReady(11),ammo=f.C.fireStatus(f.s,f.u).ammo;f.C.fireMode(f.s,f.u,'auto');assert(f.C.requestFire(f.s,f.u,f.key).ok);f.step();
  const fired=f.C.fireEvents(f.s).filter(e=>e.type==='fired');assert.equal(fired.length,1);assert.equal(fired[0].source,'manual');assert.equal(f.C.fireStatus(f.s,f.u).ammo,ammo-1);
  f.C.fireMode(f.s,f.u,'hold');assert.equal(f.C.fireStatus(f.s,f.u).inFlight.length,1);until(()=>f.step(),()=>f.C.fireEvents(f.s).some(e=>e.type==='impact'));assert.equal(f.C.combatEvents(f.s).length,1);
});

test('E08 confirmed kill clears A and existing observation path acquires and auto-engages B',()=>{
  const m=multi('flat');m.a.combat.hp=1;m.C.fireMode(m.s,m.u,'auto');
  until(m.step,()=>m.a.combat.status==='destroyed');assert(m.C.contacts(m.s).some(c=>c.key===m.aKey&&c.wreck));
  until(m.step,()=>m.C.fireEvents(m.s).some(e=>e.type==='fired'&&e.targetKey===m.bKey));assert.equal(m.C.ownObservation(m.s,m.u).targetKey,m.bKey);
});

test('E09 unseen destruction never appears in public combat, contacts or reasons before wreck identification',()=>{
  const f=manualReady(15);f.t.combat.hp=1;assert(f.C.requestFire(f.s,f.u,f.key).ok);f.step();const shot=f.C.fireEvents(f.s).find(e=>e.type==='fired');f.u.turret+=Math.PI;f.u.commander+=Math.PI;f.C.guard(f.s,f.u,'gunner',{x:0,y:1000});f.C.guard(f.s,f.u,'commander',{x:0,y:1000});until(()=>f.step(),()=>f.s.time>shot.impactAt+.05);
  const impact=f.C.fireEvents(f.s).find(e=>e.type==='impact');assert.equal(impact.result,'unobserved');assert.equal(impact.combat,null);assert(!f.C.contacts(f.s).some(c=>c.wreck));assert(!JSON.stringify({events:f.C.fireEvents(f.s),contacts:f.C.contacts(f.s),own:f.C.ownObservation(f.s,f.u)}).includes('destroyed'));
});

test('E11 fixed-step grouping and repeated UI-style reads do not change auto results',()=>{
  function run(group){const C=core('flat'),u=C.makeTank('A','BLUE',500,1000,0,'blue',undefined,'hold'),t=C.makeTank('T','RED',1000,1000,Math.PI,'red',undefined,'hold'),s={time:0,seed:41,units:[u,t],recordFireEvents:true};C.fireMode(s,u,'auto');for(let i=0;i<320;i+=group)for(let j=0;j<group;j++){C.step(s,.05);for(let n=0;n<(group===1?0:5);n++){C.contacts(s);C.fireStatus(s,u);C.combatView(t);}}return{hp:t.combat.hp,status:t.combat.status,ammo:u.fireControl.ammo,events:C.fireEvents(s),records:C.combatEvents(s)};}
  assert.deepEqual(run(1),run(2));
});

test('E12 simultaneous common-path flights resolve in stable order even when both targets are destroyed',()=>{
  function run(){
    const C=core('flat'),a=C.makeTank('A','A',500,1000,0,'blue',undefined,'hold'),ta=C.makeTank('TA','TA',1000,1000,Math.PI,'red',undefined,'hold'),b=C.makeTank('B','B',3000,3000,Math.PI,'red',undefined,'hold'),tb=C.makeTank('TB','TB',2500,3000,0,'blue',undefined,'hold'),s={time:0,seed:17,units:[a,ta,b,tb],recordFireEvents:true},step=()=>C.step(s,.05);
    C.guard(s,a,'commander',{x:ta.x,y:ta.y});C.guard(s,a,'gunner',{x:ta.x,y:ta.y});C.guard(s,b,'commander',{x:tb.x,y:tb.y});C.guard(s,b,'gunner',{x:tb.x,y:tb.y});
    until(step,()=>a.observation.contacts.TA?.identified&&b.observation.contacts.TB?.identified);assert(C.designate(s,a,a.observation.contacts.TA.key));assert(C.designate(s,b,b.observation.contacts.TB.key));until(step,()=>C.fireStatus(s,a).canFire&&C.fireStatus(s,b).canFire);
    assert(C.requestFire(s,a,a.observation.contacts.TA.key).ok);assert(C.requestFire(s,b,b.observation.contacts.TB.key).ok);step();ta.combat.hp=1;tb.combat.hp=1;
    until(step,()=>ta.combat.status==='destroyed'&&tb.combat.status==='destroyed');while(C.fireStatus(s,a).inFlight.length||C.fireStatus(s,b).inFlight.length)step();
    return{status:[ta.combat.status,tb.combat.status],events:[...C.fireEvents(s,'blue'),...C.fireEvents(s,'red')].sort((x,y)=>x.time-y.time||x.id.localeCompare(y.id)).map(e=>[e.type,e.id,e.result??null])};
  }
  assert.deepEqual(run(),run());
});

test('E13/E16 gunner loss beyond existing grace hands A to commander B without oscillation',()=>{
  const m=multi('flat');m.a.x=1000;m.a.y=500;
  until(m.step,()=>m.C.ownObservation(m.s,m.u).targetKey===m.bKey);const switchedAt=m.s.time;
  until(m.step,()=>m.C.ownObservation(m.s,m.u,m.bKey).acquired);m.a.x=1000;m.a.y=1000;for(let i=0;i<80;i++)m.step();
  assert.equal(m.C.ownObservation(m.s,m.u).targetKey,m.bKey);assert(m.s.time-switchedAt>0);m.C.fireMode(m.s,m.u,'auto');until(m.step,()=>m.C.fireEvents(m.s).some(e=>e.type==='fired'&&e.targetKey===m.bKey));
});

test('E14/E15/E17 actual weapon-line block switches to valid commander B and never fires at blocked A',()=>{
  const held=multi('low-wall');until(held.step,()=>held.C.ownObservation(held.s,held.u).targetKey===held.bKey);assert.equal(held.C.fireStatus(held.s,held.u).mode,'hold');assert.equal(held.C.fireEvents(held.s).length,0);
  const m=multi('low-wall');m.C.fireMode(m.s,m.u,'auto');
  until(m.step,()=>m.C.ownObservation(m.s,m.u).targetKey===m.bKey);assert.equal(m.C.fireEvents(m.s).filter(e=>e.targetKey===m.aKey).length,0);
  until(m.step,()=>m.C.fireEvents(m.s).some(e=>e.type==='fired'&&e.targetKey===m.bKey));const target=m.C.ownObservation(m.s,m.u).targetKey;
  for(let i=0;i<80;i++)m.step();assert.equal(m.C.ownObservation(m.s,m.u).targetKey,target);
  const lone=fixture('low-wall',{target:{x:1500,y:1000},seed:17});lone.step(240);const key=lone.contact().key;assert(lone.C.designate(lone.s,lone.u,key));lone.step(80);lone.C.fireMode(lone.s,lone.u,'auto');lone.step(80);assert.equal(lone.C.fireEvents(lone.s).length,0);assert.equal(lone.C.ownObservation(lone.s,lone.u).targetKey,key);
});

test('E19 player designation replaces A with D and keeps default auto through acquisition and fire',()=>{
  const m=multi('flat');m.C.fireMode(m.s,m.u,'auto');until(m.step,()=>m.C.fireEvents(m.s).some(e=>e.type==='fired'&&e.targetKey===m.aKey));
  assert(m.C.designate(m.s,m.u,m.bKey));assert.equal(m.C.fireStatus(m.s,m.u).mode,'auto');assert.equal(m.C.ownObservation(m.s,m.u).targetKey,m.bKey);
  until(m.step,()=>m.C.fireEvents(m.s).some(e=>e.type==='fired'&&e.targetKey===m.bKey&&e.source==='auto'));
});

test('E20/E21 commander candidates use first discovery time despite reversed IDs, array order and identification order',()=>{
  const q=discoveryQueue(),first=q.firstContact,second=q.secondContact;
  assert(first.commanderDiscoveredAt<second.commanderDiscoveredAt);assert(first.identifiedAt>second.identifiedAt);
  assert.deepEqual(q.u.observation.pending.map(v=>v.target),['Z_FIRST','A_SECOND']);assert(q.u.observation.pending[0].discoveredAt<q.u.observation.pending[1].discoveredAt);
  q.u.profileOverride.sensors.gunner.range=2000;q.u.observation.autoAssignAfter=0;q.step();assert.equal(q.C.ownObservation(q.s,q.u).targetKey,first.key);assert.equal(q.C.ownObservation(q.s,q.u).source,'commander');
  const C=core('flat'),u=C.makeTank('U_TIE','TIE OBSERVER',500,1000,0,'blue',undefined,'hold'),z=C.makeTank('Z_TIE','Z TARGET',900,900,Math.PI,'red',undefined,'hold'),a=C.makeTank('A_TIE','A TARGET',900,1100,Math.PI,'red',undefined,'hold'),m=C.makeTank('M_TIE','SORT TRIGGER',100,1000,0,'red',undefined,'hold'),s={time:0,seed:99,units:[u,z,a,m]},step=()=>C.step(s,.05);
  u.profileOverride=structuredClone(C.PROFILE);u.profileOverride.sensors.gunner.range=100;u.observation.autoAssignAfter=999;C.guard(s,u,'commander',{x:900,y:1000});until(step,()=>u.observation.pending.length===2);
  for(const id of['Z_TIE','A_TIE'])u.observation.contacts[id].commanderDiscoveredAt=0;for(const entry of u.observation.pending)entry.discoveredAt=0;u.observation.pending.reverse();C.guard(s,u,'commander',{x:m.x,y:m.y});until(step,()=>u.observation.pending.length===3);
  assert.deepEqual(u.observation.pending.slice(0,2).map(v=>v.key),u.observation.pending.slice(0,2).map(v=>v.key).toSorted());
});

test('E22 reobservation preserves discovery order without duplicates and confirmed wreck advances to the next candidate',()=>{
  const q=discoveryQueue(),discovered=q.firstContact.commanderDiscoveredAt,revision=q.u.observation.candidateRevision;
  q.u.commander=Math.PI/2;q.C.guard(q.s,q.u,'commander',{x:500,y:1500});for(let i=0;i<20;i++)q.step();q.u.commander=0;q.C.guard(q.s,q.u,'commander',{x:q.first.x,y:q.first.y});for(let i=0;i<40;i++)q.step();
  assert.equal(q.firstContact.commanderDiscoveredAt,discovered);assert.equal(q.u.observation.pending.filter(v=>v.target==='Z_FIRST').length,1);assert(q.u.observation.candidateRevision>=revision);
  q.first.combat.hp=0;q.first.combat.status='destroyed';q.first.state='격파';until(q.step,()=>q.firstContact.wreckConfirmed);assert(!q.u.observation.pending.some(v=>v.target==='Z_FIRST'));assert(q.C.contacts(q.s).some(c=>c.key===q.firstContact.key&&c.wreck));
  q.u.profileOverride.sensors.gunner.range=2000;q.u.observation.autoAssignAfter=0;until(q.step,()=>q.C.ownObservation(q.s,q.u).targetKey===q.secondContact.key);assert.equal(q.C.ownObservation(q.s,q.u).source,'commander');
});

test('E23 a late commander candidate reuses the cached blocked line and retargets in auto and hold',()=>{
  function run(mode){
    const C=core('low-wall'),u=C.makeTank('U','SHOOTER',500,1000,0,'blue',undefined,mode),a=C.makeTank('A','BLOCKED A',1500,1000,Math.PI,'red',undefined,'hold'),b=C.makeTank('B','LATE B',900,1335,Math.PI,'red',undefined,'hold');
    u.profileOverride=structuredClone(C.PROFILE);u.profileOverride.sensors.commander.enabled=false;const s={time:0,seed:89,units:[u,a,b],recordFireEvents:true,recordObservationEvents:true},step=()=>C.step(s,.05);
    until(step,()=>C.ownObservation(s,u).targetKey===u.observation.contacts.A?.key&&C.ownObservation(s,u).acquired);until(step,()=>u.fireControl.lineProbeBlocked);const blockedQueries=u.fireControl.lineProbeQueries;for(let i=0;i<80;i++)step();assert.equal(u.fireControl.lineProbeQueries,blockedQueries);
    const aKey=u.observation.contacts.A.key;assert.equal(C.ownObservation(s,u).targetKey,aKey);assert.equal(C.fireEvents(s).length,0);
    u.profileOverride.sensors.commander.enabled=true;u.commander=Math.atan2(b.y-u.y,b.x-u.x);C.guard(s,u,'commander',{x:b.x,y:b.y});until(step,()=>u.observation.contacts.B?.identified);
    const bKey=u.observation.contacts.B.key;until(step,()=>C.ownObservation(s,u).targetKey===bKey);assert.equal(C.ownObservation(s,u).source,'commander');assert.equal(u.fireControl.lineProbeQueries,blockedQueries);
    if(mode==='hold'){for(let i=0;i<80;i++)step();assert.equal(C.fireEvents(s).length,0);}else until(step,()=>C.fireEvents(s).some(e=>e.type==='fired'&&e.targetKey===bKey&&e.source==='auto'));
    return{mode,aKey,bKey,candidateRevision:u.observation.candidateRevision};
  }
  assert.equal(run('hold').mode,'hold');assert.equal(run('auto').mode,'auto');
});
