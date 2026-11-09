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

test('W15-C02 actual gunner fault preserves gunner-only acquisition, fires a queued shot with penalty and adds no retry wait',()=>{
  const f=prepared(79),away=Math.atan2(f.shooter.y-f.target.y,f.shooter.x-f.target.x)+Math.PI;
  assert(C.guard(f.s,f.target,'commander',{x:f.target.x+1000*Math.cos(away),y:f.target.y+1000*Math.sin(away)}));
  for(let i=0;i<100&&f.target.observation.contacts.A.sources.commander.current;i++)C.step(f.s,.05);
  assert(!f.target.observation.contacts.A.sources.commander.current);assert(f.target.observation.contacts.A.sources.gunner.current);assert(C.ownObservation(f.s,f.target,f.shooterContact.key).acquired);
  const before=impactNext(f),status=C.fireStatus(f.s,f.target,f.shooterContact.key),own=C.ownObservation(f.s,f.target,f.shooterContact.key),local=f.target.observation.contacts.A,blue=C.fireEvents(f.s,'blue').find(e=>e.type==='fired');
  assert(status.faults.gunner.active);assert(local.sources.gunner.current);assert(!local.sources.commander.current);assert(own.acquired);assert.equal(own.status,'acquired');assert(status.aimPenalty.active);assert.equal(status.ammo,before.ammo-1);assert(blue);assert(blue.hitChanceAtFire>0);
  const until=f.target.fireControl.faultUntil.gunner;while(f.s.time<=until+.05)C.step(f.s,.05);
  const recovered=C.ownObservation(f.s,f.target,f.shooterContact.key);assert(recovered.gunnerCurrent);assert(recovered.acquired);assert.equal(recovered.status,'acquired');assert(!['expired','stale'].includes(recovered.status));assert(!C.fireStatus(f.s,f.target).aimPenalty.active);assert(!(f.target.observation.gunner.cooldowns.A>f.s.time));
});

test('W15-C03 actual commander fault keeps both optical channels, target command and aim penalty until timer recovery',()=>{
  const f=prepared(560),before=impactNext(f),status=C.fireStatus(f.s,f.target,f.shooterContact.key),local=f.target.observation.contacts.A,own=C.ownObservation(f.s,f.target,f.shooterContact.key);
  assert(status.faults.commander.active);assert(local.sources.commander.current);assert(local.sources.gunner.current);assert(own.acquired);assert(status.aimPenalty.active);assert.equal(status.ammo,before.ammo-1);
  const until=f.target.fireControl.faultUntil.commander;while(f.s.time<=until+.05)C.step(f.s,.05);
  assert(f.target.observation.contacts.A.sources.commander.current);assert(f.target.observation.contacts.A.sources.gunner.current);assert(C.ownObservation(f.s,f.target,f.shooterContact.key).acquired);assert(!C.fireStatus(f.s,f.target).aimPenalty.active);
});
