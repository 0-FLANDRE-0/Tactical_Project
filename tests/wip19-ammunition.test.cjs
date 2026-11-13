const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),F=require('../src/fire-control.js');
const {fixture}=require('./helpers/hit-fixture.cjs');
const profile=Profiles.M1A2_1998,near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);

test('W19-D01 three ammunition records keep independent KE/CE, velocity, penetration, damage and policy data',()=>{
 assert.deepEqual(Combat.ammunitionRegistry.ids(),['M829A2','M829A1','M830']);
 const a1=Combat.AMMUNITION.M829A1,heat=Combat.AMMUNITION.M830;
 assert.equal(a1.kind,'KE');assert.equal(a1.muzzleVelocity,1575);assert.equal(a1.baseDamage,380);near(Combat.penetrationAt(a1,1000,30).value,490.0753768844221);near(Combat.penetrationAt(a1,1500,60).value,330.0251256281407);
 assert.equal(heat.kind,'CE');assert.equal(heat.muzzleVelocity,1140);assert.equal(heat.baseDamage,435);near(Combat.penetrationAt(heat,10,30).value,415);near(Combat.penetrationAt(heat,2000,30).value,415);near(Combat.penetrationAt(heat,1000,75).value,120);near(Combat.ricochetChance(heat,72),.5);
 assert.equal(a1.hitReactionPolicyId,'tank-ke/M829A1');assert.equal(heat.hitReactionPolicyId,'tank-heat/M830');assert.deepEqual(profile.hitReactions.policies['tank-ke/M829A1'].rows.penetration,profile.hitReactions.policies['tank-ke/M829A2'].rows.penetration);assert(Object.values(profile.hitReactions.policies['tank-heat/M830'].rows.nearNonPenetration).every(row=>Object.values(row).every(v=>v===0)));
});

test('W19-D02 M830 uses CE protection, fixed penetration damage and no KE near-nonpenetration path',()=>{
 const common={hit:true,zone:'hullFront',side:null,origin:{x:-1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,profile,ammoId:'M830',ricochetRoll:.999999,nearDamageRoll:0};
 const penetrated=Combat.evaluate(common);assert.equal(penetrated.protection,720);assert.equal(penetrated.penetrated,false);assert.equal(penetrated.damage,0);assert.equal(penetrated.nearNonPenetration,false);
 const rear=Combat.evaluate({...common,zone:'hullRear'});assert.equal(rear.protection,40);assert(rear.penetrated);assert.equal(rear.multiplier,1);assert.equal(rear.damage,435);
});

test('W19-D03 impact uses the attacker-frozen ammo even when the victim has another loaded/default round',()=>{
 const target={id:'VICTIM'},runtime=Combat.create({profileOf:()=>profile,seed:19});Combat.initUnit(target,profile);target.combat.ammoId='M830';
 const record=runtime.apply({id:'A-shot-1',hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,ammoId:'M829A1',ricochetRoll:.999999,nearDamageRoll:.999999},target,1);
 assert.equal(record.ammoId,'M829A1');assert.equal(record.protection,390);assert(record.penetrated);assert.notEqual(record.baseDamage,Combat.AMMUNITION.M830.baseDamage);
});

test('W19-V01 malformed capacity, unknown rounds and missing active effect policies fail during load validation',()=>{
 const badCapacity=structuredClone(profile);badCapacity.ammunition.sections.ready.capacity--;assert.throws(()=>Profiles.registry.create([badCapacity]),/용량/);
 const unknown=structuredClone(profile);unknown.ammunition.supported.push('UNBOUND');assert.throws(()=>Combat.validateAmmunitionBindings(unknown),/레지스트리 연결/);
 const missingPolicy=structuredClone(profile);delete missingPolicy.hitReactions.policies['tank-heat/M830'];assert.throws(()=>Combat.validateAmmunitionBindings(missingPolicy),/효과 정책 연결/);
 assert.equal(Combat.validateAmmunitionBindings(Profiles.M1A2),'legacy');assert.equal(Combat.validateAmmunitionBindings(profile),'active');
});

test('W19-I01 initial chamber, compartment capacities and per-ammo totals equal the 42-round profile',()=>{
 const f=fixture(19,profile),v=f.view(),a=v.ammunition;assert(a.managed);assert.equal(a.loadedAmmoId,'M829A2');assert.equal(a.preference,'auto');assert.equal(a.total,42);assert.deepEqual(a.totals,{M829A2:18,M829A1:12,M830:12});
 assert.deepEqual(Object.fromEntries(Object.entries(a.sections).map(([id,s])=>[id,[s.total,s.capacity]])),{ready:[17,17],semiReady:[18,18],reserve:[6,6]});assert.equal(a.task,null);assert.equal(v.ammo,42);
});

test('W19-L01 next-ammo selection leaves the chamber alone, freezes the task and conserves all non-fired rounds',()=>{
 const f=fixture(19,profile);assert(f.runtime.setAmmoPreference(f.u,'M829A1'));f.step(1.2);assert(f.fire().ok);f.step();let v=f.view();assert.equal(f.runtime.events('blue')[0].ammoId,'M829A2');assert.equal(v.ammo,41);assert.equal(v.ammunition.loadedAmmoId,null);
 f.step();v=f.view();assert.equal(v.ammunition.task.ammoId,'M829A1');assert.equal(v.ammunition.task.source,'ready');assert.equal(v.ammunition.total,41);assert(f.runtime.setAmmoPreference(f.u,'M830'));f.step();assert.equal(f.view().ammunition.task.ammoId,'M829A1');f.step(6);v=f.view();assert.equal(v.ammunition.loadedAmmoId,'M829A1');assert.equal(v.ammunition.preference,'M830');assert.equal(v.ammunition.total,41);assert.equal(v.ammunition.sections.ready.counts.M829A1,3);
});

test('W19-L02 semi-ready and reserve preparation are separate from reload and loader efficiency applies once',()=>{
 const f=fixture(19,profile),a=f.u.fireControl.ammunition;a.sections.ready.M829A1=0;a.sections.ready.M829A2+=4;a.sections.semiReady.M829A1=6;assert(f.runtime.setAmmoPreference(f.u,'M829A1'));f.step(1.2);assert(f.fire().ok);f.step();f.step();let task=f.view().ammunition.task;assert.equal(task.stage,'prepare');assert.equal(task.source,'semiReady');near(task.remaining,2.95,1e-8);
 f.u.hitReactionModifiers={loaderEfficiency:.5,gunnerAimRate:1,gunnerSigma:1};const before=task.progress;f.step();task=f.view().ammunition.task;near(task.progress-before,.05/6,1e-9);assert.equal(task.stage,'prepare');f.step(6);task=f.view().ammunition.task;assert.equal(task.stage,'reload');assert(task.progress>0);assert(f.view().loading.currentWorkSeconds<=14);
});

test('W19-R01 automatic replenishment reserves one round, pauses without loss and resumes to the ready target',()=>{
 const f=fixture(19,profile),a=f.u.fireControl.ammunition;f.c.enemyConfirmed=false;a.sections.ready.M829A2--;a.sections.semiReady.M829A2++;a.lastShotAt=0;for(let i=0;i<200;i++)f.step();let v=f.view();assert.equal(v.ammunition.task.purpose,'replenish');assert.equal(v.ammunition.task.ammoId,'M829A2');assert.equal(v.ammunition.total,42);
 f.step();const progress=f.view().ammunition.task.progress;f.u.drive={velocity:1};f.step(.5);v=f.view();assert(v.ammunition.task.paused);near(v.ammunition.task.progress,progress);assert.equal(v.ammunition.total,42);
 f.u.drive.velocity=0;f.step(4.1);v=f.view();assert.equal(v.ammunition.sections.ready.counts.M829A2,7);assert.equal(v.ammunition.total,42);assert.equal(v.ammunition.task,null);
});

test('W19-R02 observed threat pauses replenishment and an actual empty chamber cancels it before loading',()=>{
 const f=fixture(19,profile),a=f.u.fireControl.ammunition;f.c.enemyConfirmed=false;a.sections.ready.M829A2--;a.sections.semiReady.M829A2++;a.lastShotAt=0;for(let i=0;i<201;i++)f.step();assert.equal(f.view().ammunition.task.purpose,'replenish');
 f.u.observation.contacts.THREAT={enemyConfirmed:true,sources:{commander:{current:true}}};f.step();assert(f.view().ammunition.task.paused);delete f.u.observation.contacts.THREAT;a.loadedAmmoId=null;const totalBefore=f.view().ammunition.total;f.step();const task=f.view().ammunition.task;assert.equal(task.purpose,'load');assert.equal(task.source,'ready');assert.equal(f.view().ammunition.total,totalBefore);assert.equal(a.sections.semiReady.M829A2,9);
});

test('W19-A01 manual unavailable preference never falls back and exposes non-engageable state without deleting the choice',()=>{
 const f=fixture(19,profile),a=f.u.fireControl.ammunition;for(const section of Object.values(a.sections)){section.M829A2+=section.M830;section.M830=0;}assert(f.runtime.setAmmoPreference(f.u,'M830'));a.loadedAmmoId=null;const v=f.view();assert.equal(v.ammunition.preference,'M830');assert.equal(v.ammunition.total,41);assert.equal(v.ammunition.engageable,false);f.step();assert.equal(f.view().reason,'selected-ammo-unavailable');assert.equal(f.view().ammunition.task,null);
});

test('W19-F01 fired projectile freezes actual loaded ammunition and preference changes cannot alter flight or impact',()=>{
 const f=fixture(19,profile);f.step(1.2);assert(f.fire().ok);f.step();const fired=f.runtime.events('blue')[0];assert.equal(fired.ammoId,'M829A2');near(fired.tof,1000/(1680*.94),.01);f.runtime.setAmmoPreference(f.u,'M830');f.land();const record=f.runtime.debugRecords()[0],impact=f.runtime.events('blue').find(e=>e.type==='impact');assert.equal(record.ammoId,'M829A2');assert.equal(impact.ammoId,'M829A2');assert.equal(f.u.fireControl.lastShot.ammoRemaining,41);assert.equal(impact.ammoRemaining,41);
});

test('W19-F02 every chambered round uses its own velocity through the real fire, flight and impact route',()=>{
 for(const ammoId of profile.ammunition.supported){const f=fixture(29,profile),a=f.u.fireControl.ammunition;if(ammoId!=='M829A2'){a.sections.ready.M829A2++;a.sections.ready[ammoId]--;a.loadedAmmoId=ammoId;}f.step(1.2);assert(f.fire().ok);f.step();const fired=f.runtime.events('blue')[0],ammo=Combat.AMMUNITION[ammoId];assert.equal(fired.ammoId,ammoId);near(fired.tof,1000/(ammo.muzzleVelocity*.94),.01);f.land();assert.equal(f.runtime.debugRecords()[0].ammoId,ammoId);assert.equal(f.runtime.events('blue').find(e=>e.type==='impact').ammoId,ammoId);assert.equal(f.view().ammunition.total,41);}
});

test('W19-I02 only a real shot reduces inventory; last round, task cancellation and destruction conserve exact counts',()=>{
 const last=fixture(39,profile),la=last.u.fireControl.ammunition;la.loadedAmmoId='M830';for(const counts of Object.values(la.sections))for(const id of profile.ammunition.supported)counts[id]=0;last.step(1.2);assert(last.fire().ok);last.step();assert.equal(last.view().ammunition.total,0);assert.equal(last.view().ammunition.task,null);assert.equal(last.view().reason,'out-of-ammo');
 const destroyed=fixture(40,profile),da=destroyed.u.fireControl.ammunition;destroyed.c.enemyConfirmed=false;da.sections.ready.M829A2--;da.sections.semiReady.M829A2++;da.lastShotAt=0;destroyed.step(10.1);assert.equal(destroyed.view().ammunition.task?.purpose,'replenish');const before=destroyed.view().ammunition.totals;destroyed.u.combat={status:'destroyed'};destroyed.step();assert.equal(destroyed.view().ammunition.task,null);assert.deepEqual(destroyed.view().ammunition.totals,before);assert.equal(destroyed.view().ammunition.total,42);
});

test('W19-T01 fixed-tick progress is deterministic and status reads cannot advance or change ammunition work',()=>{
 const a=fixture(49,profile),b=fixture(49,profile);for(const f of [a,b]){const state=f.u.fireControl.ammunition;state.sections.ready.M829A2--;state.sections.semiReady.M829A2++;state.lastShotAt=0;f.c.enemyConfirmed=false;}
 for(let i=0;i<260;i++){a.step();for(let read=0;read<20;read++)a.view();b.step();}
 assert.deepEqual(a.view().ammunition,b.view().ammunition);assert.equal(a.runtime.events('blue').length,0);assert.equal(b.runtime.effects().length,0);
});
