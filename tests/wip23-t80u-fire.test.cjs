'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),Fire=require('../src/fire-control.js'),Geometry=require('../src/vehicle-geometry.js');
const C=()=>require('./load.cjs')();
const t80=Profiles.T80U_1989,m1=Profiles.M1A2_1998,ammo=Combat.AMMUNITION['3BM42'];
const near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);

test('WIP23 profile owns stationary fire, 3BM42 and automatic-loader data without mobility, AI or human reactions',()=>{
 assert.deepEqual(t80.capabilities,{target:true,mobility:false,observation:true,fire:true,ai:false});assert.equal(t80.mobility,undefined);assert.equal(t80.weapons.mainGun.name,'2A46M-1');assert.equal(t80.weapons.mainGun.ammunitionId,'3BM42');
 const f=t80.fireControl;assert.equal(f.aimSeconds,1.6);near(f.alignmentTolerance,1.5*Math.PI/180);assert.equal(f.maxRange,2000);assert.equal(f.fireHeight,2.05);assert.equal(f.dispersionMrad,.30);assert.equal(f.layStartMrad,1.8);assert.equal(f.layMinMrad,.12);assert.equal(f.layTauSeconds,.8);assert.equal(f.rangeErrorM,8);assert.equal(f.leadResidual,.12);assert.equal(f.velocityRetention,.94);assert.equal(f.movement.fireOnMove,false);assert.equal(f.movement.stationarySpeedMps,.1);assert.equal(f.movement.stationaryHoldSeconds,.35);
 assert.deepEqual(f.readiness,{loading:{type:'automatic'},reloadSeconds:6,reloadMaxSeconds:6});assert.deepEqual(t80.ammunition.supported,['3BM42']);assert.equal(t80.ammunition.initial.loaded,'3BM42');assert.equal(t80.ammunition.initial.sections.ready['3BM42'],12);assert.deepEqual(Object.fromEntries(Object.entries(t80.ammunition.sections).map(([k,v])=>[k,v.capacity])),{ready:27,semiReady:0,reserve:17});assert.deepEqual(t80.ammunition.replenish,{enabled:false});
 assert.equal(t80.ammoIncidents.enabled,false);assert.equal(t80.hitReactions.enabled,false);assert(!t80.crewRoles.includes('loader'));
});

test('WIP23 registry permits observation plus fire without mobility/AI and rejects invalid loader, stock and capability declarations',()=>{
 const clean=()=>{const p=structuredClone(t80);p.id='T80U_TEST';return p;};assert.doesNotThrow(()=>Profiles.registry.create([clean()]));
 for(const mutate of [p=>p.capabilities.mobility=true,p=>p.capabilities.observation=false,p=>p.fireControl.readiness.loading.type='manual',p=>p.fireControl.readiness.loading.type='belt',p=>p.fireControl.readiness.fatigue={},p=>p.ammunition.initial.sections.ready['3BM42']=28,p=>p.ammunition.sections.reserve.capacity=18,p=>p.ammunition.initial.sections.reserve['3BM42']=-1]){const p=clean();mutate(p);assert.throws(()=>Profiles.registry.create([p]));}
 const unknown=clean();unknown.ammunition.supported=['UNBOUND'];unknown.ammunition.autoPriority=['UNBOUND'];unknown.ammunition.initial.loaded='UNBOUND';unknown.ammunition.initial.sections={ready:{UNBOUND:12},semiReady:{UNBOUND:0},reserve:{UNBOUND:0}};const created=Profiles.registry.create([unknown]);assert.throws(()=>Combat.validateAmmunitionBindings(created.registry.get('T80U_TEST')),/레지스트리 연결/);
});

test('WIP23 3BM42 interpolation, ricochet, no-near-damage policy and 125mm curve keep exact anchors',()=>{
 assert.equal(ammo.baseDamage,370);assert.equal(ammo.muzzleVelocity,1700);assert.equal(ammo.kind,'KE');assert.equal(ammo.nearNonPenetration,false);
 for(const [range,values] of [[10,[505,425,280]],[2000,[450,380,250]]])for(const [i,angle] of [0,30,60].entries())near(Combat.penetrationAt(ammo,range,angle).value,values[i]);
 near(Combat.penetrationAt(ammo,1005,15).value,440);near(Combat.penetrationAt(ammo,1005,75).value,132.5);near(Combat.penetrationAt(ammo,2000,90).value,0);near(Combat.penetrationAt(ammo,1,0).value,505);near(Combat.penetrationAt(ammo,3000,0).value,450);
 assert.equal(Combat.ricochetChance(ammo,78),0);assert.equal(Combat.ricochetChance(ammo,79),.25);assert.equal(Combat.ricochetChance(ammo,80),.5);assert.equal(Combat.ricochetChance(ammo,81),1);
 for(const [r,m] of Combat.DAMAGE_MULTIPLIERS['apfsds-125mm'].points)near(Combat.multiplierAt(ammo,r),m);near(Combat.multiplierAt(ammo,.135),1.055);near(Combat.multiplierAt(ammo,1),.25);
 const target=structuredClone(m1);target.combat.armor.hullFront.ke=451;const result=Combat.evaluate({hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:2000,profile:target,ammoId:'3BM42',ricochetRoll:.999999,nearDamageRoll:0});assert.equal(result.penetrated,false);assert.equal(result.protectionDeficit,1);assert.equal(result.nearNonPenetration,false);assert.equal(result.damage,0);
 const a2=Combat.AMMUNITION.M829A2;for(const [r,m] of Combat.DAMAGE_MULTIPLIERS['apfsds-120mm'].points)near(Combat.multiplierAt(a2,r),m);
});

test('WIP23 incoming 3BM42 explicitly connects to M1 reaction and incident policies without becoming M1 stored ammunition',()=>{
 assert.deepEqual(m1.ammunition.supported,['M829A2','M829A1','M830']);assert(!Object.hasOwn(m1.ammoIncidents.storedAmmoResponse,'3BM42'));assert.equal(Combat.validateHitReactionBindings(m1),'active');assert.equal(Combat.validateAmmoIncidentBindings(m1),'active');
 const hit={hit:true,ricochet:false,penetrated:true,nearNonPenetration:false,zone:'turretSide'},reaction=Combat.resolveHitReaction(m1,'3BM42',hit,{occurrence:0,target:0,duration:.5});assert.equal(reaction.policyId,'tank-ke/3BM42');assert.equal(reaction.category,'temporaryFault');
 const inventory={sections:{ready:{counts:{M829A2:7,M829A1:4,M830:6}},semiReady:{counts:{M829A2:8,M829A1:6,M830:4}},reserve:{counts:{M829A2:2,M829A1:2,M830:2}}}},incident=Combat.resolveAmmoIncident(m1,'3BM42',{...hit,zone:'turretRear'},inventory,{compartment:0,occurrence:0,result:0});assert.equal(incident.policyId,'tank-ammo-incident/3BM42');assert.equal(incident.baseChance,.30);assert.equal(incident.confirmed,true);
 const broken=structuredClone(m1);delete broken.hitReactions.policies['tank-ke/3BM42'];assert.throws(()=>Combat.validateHitReactionBindings(broken),/정책/);const brokenIncident=structuredClone(m1);delete brokenIncident.ammoIncidents.policies['tank-ammo-incident/3BM42'];assert.throws(()=>Combat.validateAmmoIncidentBindings(brokenIncident),/정책/);
});

test('WIP23 actual terrain flow detects, acquires, fires all 13 rounds from the T-80U muzzle and reloads at exactly six seconds',()=>{
 const core=C(),s=core.createScenario(7,{scenarioId:'t80u-fire',recordObservationEvents:true,recordFireEvents:true}),u=s.units.find(v=>v.profileId==='T80U_1989'),fixed=[u.x,u.y,u.heading];let maxTotal=0;
 for(let i=0;i<1800;i++){core.step(s,.05);const v=core.fireStatus(s,u);maxTotal=Math.max(maxTotal,v.ammunition.total);assert.equal(v.shotCount+v.ammunition.total,13);}
 const events=core.fireEvents(s,'red'),shots=events.filter(e=>e.type==='fired'),impacts=events.filter(e=>e.type==='impact'),obs=s.observationEvents.filter(e=>e.observer===u.id);assert.equal(shots.length,13);assert.equal(impacts.length,13);assert.equal(maxTotal,13);assert(shots.every(e=>e.ammoId==='3BM42'));for(let i=1;i<shots.length;i++)near(shots[i].time-shots[i-1].time,6,1e-9);
 const first=shots[0],muzzle=Geometry.muzzleWorld(u,t80.model);near(first.origin.x,muzzle.x);near(first.origin.y,muzzle.y);near(first.tof,Math.hypot(950-550,0)/(1700*.94),1e-9);assert(obs.some(e=>e.type==='detected'));assert(obs.some(e=>e.type==='identified'));assert(obs.some(e=>e.type==='target-acquired'));assert(first.time>=obs.find(e=>e.type==='target-acquired').time+1.5);
 assert.deepEqual([u.x,u.y,u.heading],fixed);assert.equal(u.drive,undefined);assert.equal(core.aiStatus(s,u).status,'disabled');assert.equal(u.hitReactions,undefined);assert.equal(u.hitReactionModifiers,undefined);assert.equal(core.fireStatus(s,u).reason,'out-of-ammo');assert.equal(core.fireStatus(s,u).ammunition.incident,null);
});

test('WIP23 automatic loading continues in hold, ignores loader efficiency and cancels cleanly on destruction',()=>{
 const core=C(),s=core.createScenario(7,{scenarioId:'t80u-fire',recordFireEvents:true}),u=s.units.find(v=>v.profileId==='T80U_1989');while(core.fireEvents(s,'red').filter(e=>e.type==='fired').length<1)core.step(s,.05);const firedAt=core.fireEvents(s,'red').find(e=>e.type==='fired').time;assert(core.fireMode(s,u,'hold'));u.hitReactionModifiers={loaderEfficiency:.01,gunnerAimRate:1,gunnerSigma:1};
 for(let i=0;i<119;i++)core.step(s,.05);let v=core.fireStatus(s,u);assert.equal(v.loading.loaded,false);assert.equal(v.ammunition.total,12);core.step(s,.05);v=core.fireStatus(s,u);assert.equal(v.loading.loaded,true);near(u.fireControl.reloadCompletedAt-firedAt,6,1e-9);assert.equal(core.fireEvents(s,'red').filter(e=>e.type==='fired').length,1);
 assert(core.fireMode(s,u,'auto'));while(core.fireEvents(s,'red').filter(e=>e.type==='fired').length<2)core.step(s,.05);for(let i=0;i<20;i++)core.step(s,.05);const before=core.fireEvents(s,'red').filter(e=>e.type==='fired').length,total=core.fireStatus(s,u).ammunition.total;u.combat.hp=0;u.combat.status='destroyed';u.combat.destroyedAt=s.time;core.step(s,.05);v=core.fireStatus(s,u);assert.equal(v.ammunition.task,null);assert.equal(v.ammunition.total,total);for(let i=0;i<200;i++)core.step(s,.05);assert.equal(core.fireEvents(s,'red').filter(e=>e.type==='fired').length,before);
});

test('WIP23 common fire, flight and damage route lets 3BM42 defeat an exposed M1 side without forced hit or damage',()=>{
 const core=C(),s=core.createScenario(7,{scenarioId:'t80u-fire',recordFireEvents:true}),victim=s.units.find(u=>u.team==='blue'),shooter=s.units.find(u=>u.team==='red');victim.heading=Math.PI/2;victim.turret=Math.PI/2;victim.commander=Math.PI/2;assert(core.fireMode(s,victim,'hold'));
 for(let i=0;i<800&&victim.combat.status!=='destroyed';i++)core.step(s,.05);const records=core.combatEvents(s).filter(r=>r.ammoId==='3BM42');assert(records.length>=1);assert(records.some(r=>r.zone.endsWith('Side')&&r.penetrated&&r.damage>0));assert.equal(victim.combat.status,'destroyed');assert.equal(shooter.combat.status,'alive');assert(core.fireDebugRecords(s).some(r=>r.ammoId==='3BM42'&&r.combat?.damage>0));
});

test('WIP23 old scenario masks remain inert and public enemy contacts do not expose ammunition or readiness internals',()=>{
 const core=C(),armor=core.createScenario(7,{scenarioId:'t80u-armor'}),observation=core.createScenario(7,{scenarioId:'t80u-observation'}),fire=core.createScenario(7,{scenarioId:'t80u-fire'});assert(armor.units.filter(u=>u.profileId==='T80U_1989').every(u=>!u.observation&&!u.fireControl));assert.equal(observation.units.find(u=>u.profileId==='T80U_1989').fireControl,undefined);assert(fire.units.find(u=>u.profileId==='T80U_1989').fireControl);
 for(let i=0;i<240;i++)core.step(fire,.05);const json=JSON.stringify(core.contacts(fire,'blue'));for(const secret of ['ammunition','reloadProgress','loadedAmmoId','shotCount','fatigueSeconds','incident'])assert(!json.includes(secret));const rejected=core.issueMove(fire.units.find(u=>u.profileId==='T80U_1989'),{x:100,y:100},false,fire.units);assert.equal(rejected.ok,false);
});
