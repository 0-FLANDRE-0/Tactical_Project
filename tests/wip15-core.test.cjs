const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./load.cjs')();

function prepared(seed){
  const shooter=C.makeTank('A','REACTION SHOOTER',550,2750,-.61,'red',undefined,'hold');
  const target=C.makeTank('T','REACTION TARGET',1150,2330,2.4,'blue',undefined,'hold');
  const s={time:0,seed,units:[shooter,target],recordFireEvents:true};
  for(const u of [shooter,target])for(const ch of ['commander','gunner'])C.guard(s,u,ch,{x:u===shooter?target.x:shooter.x,y:u===shooter?target.y:shooter.y});
  for(let i=0;i<220;i++)C.step(s,.05);
  const targetContact=C.contacts(s,'red')[0],shooterContact=C.contacts(s,'blue')[0];
  assert(targetContact?.identified&&shooterContact?.identified);
  assert(C.designate(s,shooter,targetContact.key));assert(C.designate(s,target,shooterContact.key));
  for(let i=0;i<100;i++)C.step(s,.05);
  assert(C.fireStatus(s,shooter,targetContact.key).canFire);assert(C.fireStatus(s,target,shooterContact.key).canFire);
  return{s,shooter,target,targetContact,shooterContact};
}

function impactNext(f){
  assert(C.requestFire(f.s,f.shooter,f.targetContact.key).ok);C.step(f.s,.05);
  const fired=C.fireEvents(f.s,'red').find(e=>e.type==='fired');assert(fired);
  while(f.s.time+.05<fired.impactAt-1e-9)C.step(f.s,.05);
  const before=C.fireStatus(f.s,f.target,f.shooterContact.key),aim=before.aimProgress,ammo=before.ammo;
  assert(C.requestFire(f.s,f.target,f.shooterContact.key).ok);
  C.step(f.s,.05);
  const impact=C.fireEvents(f.s,'red').find(e=>e.type==='impact'&&e.id===fired.id);assert.equal(impact.zone,'turretFront');
  return{impact,aim,ammo};
}

test('W15-C01 actual impact applies FCS fault before a queued same-tick shot and preserves aim/reload',()=>{
  const f=prepared(26),before=impactNext(f),status=C.fireStatus(f.s,f.target,f.shooterContact.key);
  assert(status.faults.fireControl.active);assert.equal(status.reason,'fcs-fault');assert.equal(status.ammo,before.ammo);assert.equal(f.target.fireControl.shotCount,0);assert.equal(f.target.fireControl.lastRejection,'fcs-fault');assert.equal(status.aimProgress,before.aim);assert.equal(C.fireEvents(f.s,'blue').length,0);
  const until=f.target.fireControl.faultUntil.fireControl;while(f.s.time<=until+.05)C.step(f.s,.05);
  assert(!C.fireStatus(f.s,f.target).faults.fireControl.active);assert(C.fireStatus(f.s,f.target).aimProgress>=before.aim);
});

test('W15-C02 actual gunner fault clears current acquisition, keeps commander sensing and reacquires fresh after recovery',()=>{
  const f=prepared(79);impactNext(f);let own=C.ownObservation(f.s,f.target,f.shooterContact.key),local=f.target.observation.contacts.A;
  assert(C.fireStatus(f.s,f.target).faults.gunner.active);assert(!local.sources.gunner.current);assert(local.sources.commander.current);assert(!own.acquired);
  const until=f.target.fireControl.faultUntil.gunner;while(f.s.time<until-.05)C.step(f.s,.05);assert(!f.target.observation.contacts.A.sources.gunner.current);
  for(let i=0;i<80&&!C.ownObservation(f.s,f.target,f.shooterContact.key).acquired;i++)C.step(f.s,.05);
  own=C.ownObservation(f.s,f.target,f.shooterContact.key);assert(own.gunnerCurrent);assert(own.acquired);
});

test('W15-C03 actual commander fault interrupts only commander and resumes from new observation samples',()=>{
  const f=prepared(560);impactNext(f);let local=f.target.observation.contacts.A;
  assert(C.fireStatus(f.s,f.target).faults.commander.active);assert(!local.sources.commander.current);assert(local.sources.gunner.current);
  const until=f.target.fireControl.faultUntil.commander;while(f.s.time<until-.05)C.step(f.s,.05);assert(!f.target.observation.contacts.A.sources.commander.current);
  for(let i=0;i<20&&!f.target.observation.contacts.A.sources.commander.current;i++)C.step(f.s,.05);
  local=f.target.observation.contacts.A;assert(local.sources.commander.current);assert(local.sources.gunner.current);
});
