const test=require('node:test'),assert=require('node:assert/strict');
const {core}=require('./helpers/observation-core-fixture.cjs');

function until(step,predicate,limit=1800){for(let i=0;i<limit;i++){step();if(predicate())return i+1;}throw Error('condition timeout');}
function guarded(channel,{mode='auto',angle=channel==='commander'?1:.7,duration=0,seed=17}={}){
  const C=core('flat'),u=C.makeTank('U','GUARD',500,1000,0,'blue',undefined,mode),t=C.makeTank('T','TARGET',500+600*Math.cos(angle),1000+600*Math.sin(angle),Math.PI,'red',undefined,'hold');
  u.profileOverride=structuredClone(C.PROFILE);if(channel==='gunner')u.profileOverride.sensors.commander.enabled=false;
  const s={time:0,seed,units:[u,t],recordObservationEvents:true,recordFireEvents:true},step=()=>C.step(s,.05),point={x:t.x,y:t.y};
  assert(C.guard(s,u,channel,point,duration));return{C,s,u,t,step,point};
}

for(const channel of ['commander','gunner'])test(`C01 actual ${channel} guard detects, identifies, acquires, aims and auto-fires`,()=>{
  const f=guarded(channel);until(f.step,()=>f.C.fireEvents(f.s,'blue').some(e=>e.type==='fired'));
  const events=f.s.observationEvents.filter(e=>e.observer==='U'),fired=f.C.fireEvents(f.s,'blue').find(e=>e.type==='fired');
  assert(events.some(e=>e.type==='detected'&&e.channel===channel));assert(events.some(e=>e.type==='identified'&&e.channel===channel));assert(events.some(e=>e.type==='target-acquired'));assert.equal(fired.source,'auto');assert(Number.isFinite(fired.hitChanceAtFire));
  assert.equal(f.u.observation[channel].mode,'guard');assert.deepEqual(f.u.observation[channel].point,f.point);
});

test('C02 gunner mission overrides its base point, then loss returns to the preserved guard',()=>{
  const C=core('flat'),u=C.makeTank('U','GUARD',500,1000,0,'blue',undefined,'hold'),t=C.makeTank('T','TARGET',1200,1160,Math.PI,'red',undefined,'hold');
  u.profileOverride=structuredClone(C.PROFILE);u.profileOverride.sensors.commander.enabled=false;const s={time:0,seed:31,units:[u,t],recordObservationEvents:true},step=()=>C.step(s,.05),point={x:1500,y:1000};
  assert(C.guard(s,u,'gunner',point));until(step,()=>C.ownObservation(s,u).acquired);for(let i=0;i<20;i++)step();assert(Math.abs(u.turret)>.1);assert.deepEqual(u.observation.gunner.point,point);
  t.x=3600;t.y=3600;until(step,()=>C.ownObservation(s,u).status==='lost');for(let i=0;i<80;i++)step();assert.equal(u.observation.gunner.mode,'guard');assert.deepEqual(u.observation.gunner.point,point);assert(Math.abs(u.turret)<.01);
});

test('C03 direct priority, cancel, expiry and release never delete an active guard mission base',()=>{
  const f=guarded('gunner',{mode:'hold',duration:8});until(f.step,()=>f.C.ownObservation(f.s,f.u).acquired);const point={...f.u.observation.gunner.point},key=f.u.observation.contacts.T.key;
  assert(f.C.designate(f.s,f.u,key));assert.deepEqual(f.u.observation.gunner.point,point);assert.equal(f.u.observation.gunner.mode,'guard');assert(f.C.cancelDesignation(f.s,f.u));assert.deepEqual(f.u.observation.gunner.point,point);
  assert(f.C.designate(f.s,f.u,key));until(f.step,()=>f.s.time>=8.05);assert.equal(f.u.observation.gunner.mode,'auto');assert(f.C.ownObservation(f.s,f.u).targetKey===key);
  const g=guarded('gunner',{mode:'hold'});until(g.step,()=>g.C.ownObservation(g.s,g.u).acquired);assert(g.C.resumeObservation(g.s,g.u,'gunner'));assert.equal(g.u.observation.gunner.mode,'auto');assert(g.C.ownObservation(g.s,g.u).acquired);
});

test('C04 hold still completes actual guard sensing, acquisition and aim without automatic fire',()=>{
  const f=guarded('gunner',{mode:'hold'});until(f.step,()=>f.C.fireStatus(f.s,f.u).canFire);for(let i=0;i<120;i++)f.step();
  assert(f.u.observation.contacts.T.detected&&f.u.observation.contacts.T.identified);assert(f.C.ownObservation(f.s,f.u).acquired);assert.equal(f.C.fireStatus(f.s,f.u).mode,'hold');assert.equal(f.C.fireEvents(f.s,'blue').filter(e=>e.type==='fired').length,0);
});

test('C05 unknown contacts hide HP; identified memory freezes HP and reobservation refreshes it',()=>{
  const C=core('flat'),u=C.makeTank('U','OBSERVER',500,1000,0,'blue',undefined,'hold'),t=C.makeTank('T','PRIVATE TARGET',650,1000,Math.PI,'red',undefined,'hold');
  u.profileOverride=structuredClone(C.PROFILE);u.profileOverride.sensors.commander.enabled=false;u.profileOverride.sensors.gunner.enabled=false;const s={time:0,seed:41,units:[u,t]},step=()=>C.step(s,.05);
  until(step,()=>C.contacts(s).length);let contact=C.contacts(s)[0];assert.equal(contact.identified,false);assert(!('combat' in contact));assert(!JSON.stringify(contact).includes(String(t.combat.hp)));
  u.profileOverride.sensors.commander.enabled=true;u.profileOverride.sensors.commander.independent=true;assert(C.guard(s,u,'commander',{x:t.x,y:t.y}));until(step,()=>C.contacts(s)[0]?.identified);contact=C.contacts(s)[0];assert.deepEqual(contact.combat,{hp:t.combat.hp,maxHp:t.combat.maxHp,status:'alive'});const frozen=contact.combat.hp;
  assert(C.guard(s,u,'commander',{x:0,y:1000}));t.x=900;until(step,()=>C.contacts(s)[0]?.memory);t.combat.hp-=321;for(let i=0;i<20;i++)step();contact=C.contacts(s)[0];assert.equal(contact.combat.hp,frozen);assert(!JSON.stringify(contact).includes(String(t.combat.hp)));
  assert(C.guard(s,u,'commander',{x:t.x,y:t.y}));until(step,()=>C.contacts(s)[0]?.current&&C.contacts(s)[0]?.combat.hp===t.combat.hp);contact=C.contacts(s)[0];assert.equal(contact.combat.hp,t.combat.hp);contact.combat.hp=-1;assert.equal(C.contacts(s)[0].combat.hp,t.combat.hp);
});

test('C06 team knowledge keeps the freshest identified HP across observer order and newer ambient poses',()=>{
  const C=core('flat'),fresh=C.makeTank('FRESH','FRESH',500,1000,0,'blue',undefined,'hold'),stale=C.makeTank('STALE','STALE',500,1020,0,'blue',undefined,'hold'),target=C.makeTank('T','TARGET',1000,1000,Math.PI,'red',undefined,'hold');
  const s={time:0,seed:17,units:[fresh,stale,target]},step=()=>C.step(s,.05);
  for(const observer of[fresh,stale])assert(C.guard(s,observer,'commander',target));
  until(step,()=>[fresh,stale].every(u=>u.observation.contacts.T?.known?.combat));
  const oldHp=target.combat.hp;stale.x=3500;stale.y=3500;for(let i=0;i<10;i++)step();
  target.combat.hp=1000;for(let i=0;i<10;i++)step();
  assert.equal(fresh.observation.contacts.T.known.combat.hp,1000);assert.equal(stale.observation.contacts.T.known.combat.hp,oldHp);
  assert.equal(C.contacts(s)[0].combat.hp,1000);
  // A current ambient-only pose still cannot replace newer optical HP knowledge.
  stale.profileOverride=structuredClone(C.PROFILE);stale.profileOverride.sensors.commander.enabled=false;stale.profileOverride.sensors.gunner.enabled=false;
  stale.x=900;stale.y=1000;
  for(const observers of[[fresh,stale],[stale,fresh]]){
    s.units=[...observers,target];for(let i=0;i<10;i++)step();
    assert(stale.observation.contacts.T.current);assert.equal(stale.observation.contacts.T.known.combat.hp,oldHp);
    assert.equal(C.contacts(s)[0].combat.hp,1000);
  }
  // Team memory must also preserve the freshest last-confirmed value.
  fresh.x=3500;fresh.y=3200;stale.x=3500;stale.y=3500;for(let i=0;i<10;i++)step();target.combat.hp=700;
  for(let i=0;i<10;i++)step();const memory=C.contacts(s)[0];assert(memory.memory);assert.equal(memory.combat.hp,1000);
  memory.combat.hp=-1;assert.equal(C.contacts(s)[0].combat.hp,1000);
});
