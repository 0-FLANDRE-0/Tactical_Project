const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),Fire=require('../src/fire-control.js'),Effects=require('../src/effects.js');
const {fixture}=require('./helpers/hit-fixture.cjs');
const {core:syntheticCore}=require('./helpers/observation-core-fixture.cjs');
const profile=Profiles.M1A2_1998,ids=profile.ammunition.supported,near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
const inventory=(counts={M829A2:7,M829A1:4,M830:6},section='ready')=>({sections:{ready:{counts:{M829A2:0,M829A1:0,M830:0}},semiReady:{counts:{M829A2:0,M829A1:0,M830:0}},reserve:{counts:{M829A2:0,M829A1:0,M830:0}}},total:Object.values(counts).reduce((a,b)=>a+b,0)});
function owned(counts={M829A2:7,M829A1:4,M830:6},section='ready'){const value=inventory(counts,section);value.sections[section].counts={...counts};return value;}
function forced(outcome='ammoLoss',section='ready'){
 const p=structuredClone(profile);for(const zone of Combat.ZONES)p.ammoIncidents.rows[zone]={ready:0,semiReady:0,reserve:0,none:0},p.ammoIncidents.rows[zone][section]=1;
 for(const policy of Object.values(p.ammoIncidents.policies))policy.baseChance=1;
 for(const rule of Object.values(p.ammoIncidents.compartments)){rule.transferFactor=1;rule.outcomes={ammoLoss:0,isolatedFire:0,fatal:0};rule.outcomes[outcome]=1;}
 return p;
}
const impact=(id='S-shot-1',ammoId='M829A2')=>({id,hit:true,zone:'turretRear',side:null,origin:{x:-1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,ammoId,ricochetRoll:.999999,nearDamageRoll:.999999});
function connected(p=profile,u={id:'TARGET',team:'red',x:0,y:0,heading:0,turret:0,speed:0}){
 const fire=Fire.create({profileOf:()=>p,freshSight:()=>({visible:false})});Fire.init(u,p,'hold');
 const combat=Combat.create({profileOf:()=>p,seed:20,ammoInventory:target=>fire.ammoIncidentSnapshot(target),onAmmoIncident:(target,event,now,snapshot)=>fire.applyAmmoIncident(target,event,now,snapshot)});
 return{u,fire,combat,view:()=>fire.view(u)};
}

test('W20-P01 only M1A2_1998 owns a strictly bound seven-row incident table',()=>{
 assert.equal(Profiles.M1A2.ammoIncidents,undefined);assert.equal(Combat.validateAmmoIncidentBindings(Profiles.M1A2),'not-participant');assert.equal(Combat.validateAmmoIncidentBindings(profile),'active');
 assert.equal(profile.ammoIncidents.victimProfileId,'M1A2_1998');assert.deepEqual(profile.ammoIncidents.storedAmmoResponse,{M829A2:1,M829A1:1,M830:1});assert.deepEqual(Object.keys(profile.ammoIncidents.rows),Combat.ZONES);
 for(const ammoId of ids){const ammo=Combat.AMMUNITION[ammoId],policy=profile.ammoIncidents.policies[ammo.ammoIncidentPolicyId];assert.equal(policy.ammoId,ammoId);assert.equal(policy.baseChance,ammoId==='M830'?.4:.3);}
 const disabled=structuredClone(profile);disabled.id='TEST_INCIDENT_DISABLED';disabled.hitReactions={enabled:false};disabled.ammoIncidents={enabled:false};const registry=Profiles.registry.create([disabled]).registry;assert.equal(Combat.validateAmmoIncidentBindings(registry.get(disabled.id)),'disabled');
 for(const mutate of [p=>p.ammoIncidents.enabled=null,p=>p.ammoIncidents.victimProfileId='M1A2',p=>delete p.ammoIncidents.rows.upper,p=>p.ammoIncidents.rows.hullFront.none=.7,p=>p.ammoIncidents.compartments.ready.capacity=16,p=>p.ammoIncidents.compartments.reserve.outcomes.fatal=.06,p=>p.ammoIncidents.policies['tank-ammo-incident/M829A2'].baseChance=2,p=>delete p.ammoIncidents.storedAmmoResponse.M830]){const p=structuredClone(profile);mutate(p);assert.throws(()=>Profiles.registry.create([p]),/탄약고 사고/);}
 const unbound=structuredClone(profile);unbound.ammoIncidents.policies['unbound/M829A2']=unbound.ammoIncidents.policies['tank-ammo-incident/M829A2'];delete unbound.ammoIncidents.policies['tank-ammo-incident/M829A2'];assert.throws(()=>Combat.validateAmmoIncidentBindings(unbound),/정책 ID 연결/);
});

test('W20-P02 compartment, occurrence and result boundaries are half-open and use fill/transfer factors',()=>{
 const result={hit:true,penetrated:true,ricochet:false,zone:'turretRear'},full=owned(),rolls=(compartment,occurrence,resultRoll=0)=>({compartment,occurrence,result:resultRoll});
 let value=Combat.resolveAmmoIncident(profile,'M829A2',result,full,rolls(.399999,.149999,.699999));assert(value.confirmed);assert.equal(value.section,'ready');assert.equal(value.outcome,'ammoLoss');near(value.chance,.15);near(value.fillRatio,1);near(value.responseFactor,1);
 value=Combat.resolveAmmoIncident(profile,'M829A2',result,owned(profile.ammunition.initial.sections.semiReady,'semiReady'),rolls(.4,.194999,.65));assert(value.confirmed);assert.equal(value.section,'semiReady');assert.equal(value.outcome,'isolatedFire');near(value.chance,.195);
 value=Combat.resolveAmmoIncident(profile,'M829A2',result,full,rolls(.65,0,0));assert.equal(value.section,'none');assert.equal(value.reason,'no-compartment');
 value=Combat.resolveAmmoIncident(profile,'M829A2',result,full,rolls(.399,.15,0));assert(!value.confirmed);assert.equal(value.reason,'occurrence-failed');
 const heat=Combat.resolveAmmoIncident(profile,'M830',result,full,rolls(.399,.199999,.98));assert(heat.confirmed);assert.equal(heat.outcome,'fatal');near(heat.chance,.2);
 const half=owned({M829A2:3,M829A1:2,M830:3});value=Combat.resolveAmmoIncident(profile,'M829A2',result,half,rolls(.399,.0705,0));near(value.fillRatio,8/17);near(value.chance,.3*(8/17)*.5);
});

test('W20-I01 partial loss uses deterministic proportional integers and preserves chamber/other compartments',()=>{
 assert.deepEqual(Fire.proportionalLoss({M829A2:7,M829A1:4,M830:6},5,ids),{M829A2:2,M829A1:1,M830:2});
 const x=connected(forced('ammoLoss','ready')),record=x.combat.apply(impact(),x.u,1),view=x.view();assert(record.applied&&record.ammoIncident.confirmed);assert.equal(record.ammoIncident.outcome,'ammoLoss');assert.equal(record.normalDamage,record.damage);assert.equal(record.incidentDamage,0);
 assert.equal(view.ammunition.loadedAmmoId,'M829A2');assert.deepEqual(view.ammunition.sections.ready.counts,{M829A2:5,M829A1:3,M830:4});assert.deepEqual(view.ammunition.sections.semiReady.counts,profile.ammunition.initial.sections.semiReady);assert.equal(view.ammunition.total,37);assert.deepEqual(view.ammunition.incident.lostTotals,{M829A2:2,M829A1:1,M830:2});
 near(record.hpBefore-record.hpAfter,record.damage);assert.equal(x.combat.apply(impact(),x.u,2).reason,'duplicate');assert.equal(x.view().ammunition.total,37);
});

test('W20-I02 available storage is removed before a same-compartment reservation and an empty compartment cannot extend safety',()=>{
 const x=connected(),a=x.u.fireControl.ammunition;a.sections.reserve={M829A2:0,M829A1:0,M830:0};a.task={purpose:'load',ammoId:'M830',source:'reserve',reserved:true,stage:'prepare',progress:.4,startedAt:0,paused:false};
 const snap=x.fire.ammoIncidentSnapshot(x.u);assert.equal(snap.sections.reserve.counts.M830,1);const applied=x.fire.applyAmmoIncident(x.u,{confirmed:true,impactId:'reserved',section:'reserve',outcome:'ammoLoss'},1,snap);assert.equal(applied.lostCount,1);assert.equal(a.task,null);assert.equal(x.view().ammunition.total,36);
 const empty=x.fire.ammoIncidentSnapshot(x.u),until=a.incident.safetyUntil;assert.equal(x.fire.applyAmmoIncident(x.u,{confirmed:true,impactId:'empty',section:'reserve',outcome:'isolatedFire'},2,empty),null);assert.equal(a.incident.safetyUntil,until);
});

test('W20-I03 isolated fire freezes valid work and all fire resources for max(existing, now+8)',()=>{
 const f=fixture(20,profile),a=f.u.fireControl.ammunition;a.sections.semiReady.M829A2--;a.task={purpose:'replenish',ammoId:'M829A2',source:'semiReady',reserved:true,stage:'replenish',progress:.35,startedAt:0,paused:false};
 const applied=f.runtime.applyAmmoIncident(f.u,{confirmed:true,impactId:'fire-1',section:'ready',outcome:'isolatedFire'},f.time(),f.runtime.ammoIncidentSnapshot(f.u));assert.equal(applied.lostCount,17);let v=f.view();assert(v.ammunition.incident.active);near(v.ammunition.incident.remaining,8);assert.equal(v.ammunition.task.progress,.35);assert.equal(v.ammunition.total,25);
 f.step(1.2);v=f.view();assert.equal(v.reason,'ammo-safety');assert(v.aimProgress>0);assert(v.ammunition.task.paused);assert.equal(v.ammunition.task.pauseReason,'ammo-safety');assert.equal(v.ammunition.task.progress,.35);const before={shots:v.shotCount,events:f.runtime.events('blue').length,effects:f.runtime.effects().length,ammo:v.ammo};assert.equal(f.fire().reason,'ammo-safety');f.step(2.8);v=f.view();assert(v.aimProgress>=1-1e-9);assert.deepEqual({shots:v.shotCount,events:f.runtime.events('blue').length,effects:f.runtime.effects().length,ammo:v.ammo},before);
 f.runtime.applyAmmoIncident(f.u,{confirmed:true,impactId:'fire-2',section:'reserve',outcome:'isolatedFire'},f.time(),f.runtime.ammoIncidentSnapshot(f.u));near(f.view().ammunition.incident.safetyUntil,12);f.c.enemyConfirmed=false;f.step(7.9);assert(f.view().ammunition.incident.active);f.step(.1);assert(!f.view().ammunition.incident.active);assert(f.view().ammunition.task.progress>.35);
});

test('W20-I04 fatal incident clears chamber/storage/reservation and records only the remaining HP as additional damage',()=>{
 const x=connected(forced('fatal','ready'));const record=x.combat.apply(impact(),x.u,1),view=x.view();assert(record.destroyed);assert.equal(record.hpAfter,0);assert.equal(record.incidentDamage,record.normalHpAfter);assert.equal(record.damage,record.normalDamage+record.incidentDamage);assert.equal(record.hpBefore-record.hpAfter,record.damage);assert.equal(view.ammunition.total,0);assert.equal(view.ammunition.loadedAmmoId,null);assert.equal(view.ammunition.task,null);assert.deepEqual(view.ammunition.incident.lostTotals,{M829A2:18,M829A1:12,M830:12});
 assert.equal(x.combat.stats().destroyed,1);assert.equal(x.combat.stats().incidentOutcomes,1);
});

test('W20-E01 misses, ricochets, non-penetrations, normal HP kills, none and empty selections never create an incident',()=>{
 const p=forced('fatal','ready'),cases=[{name:'miss',event:{...impact('A-shot-1'),hit:false,zone:null}},{name:'nonpen',event:impact('A-shot-2'),mutate:q=>q.combat.armor.turretRear.ke=9999},{name:'normal-kill',event:impact('A-shot-3'),mutate:q=>q.combat.maxHp=1}];
 for(const c of cases){const q=structuredClone(p);c.mutate?.(q);const x=connected(q,{id:c.name,team:'red',x:0,y:0,heading:0,turret:0,speed:0}),before=x.view().ammunition.total,r=x.combat.apply(c.event,x.u,1);assert.equal(r.ammoIncident,null,c.name);assert.equal(x.view().ammunition.total,before,c.name);}
 const none=structuredClone(p);for(const zone of Combat.ZONES)none.ammoIncidents.rows[zone]={ready:0,semiReady:0,reserve:0,none:1};let x=connected(none),r=x.combat.apply(impact('B-shot-1'),x.u,1);assert.equal(r.ammoIncident.reason,'no-compartment');assert.equal(x.view().ammunition.total,42);
 const empty=structuredClone(p);x=connected(empty);for(const id of ids){x.u.fireControl.ammunition.sections.ready[id]=0;x.u.fireControl.ammunition.sections.semiReady[id]+=profile.ammunition.initial.sections.ready[id];}r=x.combat.apply(impact('B-shot-2'),x.u,1);assert.equal(r.ammoIncident.reason,'empty-compartment');assert.equal(x.view().ammunition.total,42);
});

test('W20-R01 incident RNG is seed/time/read-count stable and public records/effects omit inventory internals',()=>{
 const run=reads=>{const x=connected(profile,{id:'RNG',team:'red',x:0,y:0,heading:0,turret:0,speed:0});for(let i=0;i<reads;i++)x.view();const r=x.combat.apply(impact('SEED-shot-1'),x.u,99);return{incident:r.ammoIncident,view:x.view()};},a=run(0),b=run(100);assert.deepEqual(a.incident,b.incident);assert.deepEqual(a.view.ammunition,b.view.ammunition);
 const publicText=JSON.stringify(Combat.publicRecord({...a.incident,hit:true,damage:1,hpBefore:2,hpAfter:1,maxHp:2,ammoIncident:a.incident}));assert(!/ammoIncident|section|ownedRounds|fillRatio|occurrenceRoll|storedAmmoResponse|lostTotals/.test(publicText));
 const renderer=Effects.create({particleLimit:64});renderer.sync([{id:'public-fx',kind:'ammo-incident',time:1,expiresAt:4,position:{x:10,y:20,z:1},effectClass:'isolated-fire',visualSeed:3}],1);const stats=renderer.stats();assert(stats.particles>0);assert(stats.coreParticles>=2);assert.equal(stats.droppedCore,0);
});

test('W20-O01 same-tick records consume the latest inventory exactly once and keep deterministic order',()=>{
 const x=connected(forced('ammoLoss','ready')),first=x.combat.apply(impact('ORDER-shot-1'),x.u,5),second=x.combat.apply(impact('ORDER-shot-2'),x.u,5),records=x.combat.records();
 assert.equal(first.ammoIncident.applied.lostCount,5);assert.equal(second.ammoIncident.applied.lostCount,3);assert.equal(x.view().ammunition.total,34);assert.deepEqual(records.map(r=>r.id),['ORDER-shot-1','ORDER-shot-2']);assert.deepEqual(x.view().ammunition.incident.lostTotals,{M829A2:3,M829A1:2,M830:3});
});

test('W20-F01 an in-flight round survives fatal inventory clearing and the 42-round conservation equation holds',()=>{
 const f=fixture(24,profile);f.step(1.2);assert(f.fire().ok);f.step();assert.equal(f.view().inFlight.length,1);assert.equal(f.view().ammunition.total,41);
 const fatal=f.runtime.applyAmmoIncident(f.u,{confirmed:true,impactId:'fatal-flight',section:'ready',outcome:'fatal'},f.time(),f.runtime.ammoIncidentSnapshot(f.u));assert.equal(fatal.lostCount,41);assert.equal(f.view().ammunition.total,0);assert.equal(1+fatal.lostCount+f.view().ammunition.total,42);f.u.combat={status:'destroyed'};f.land();assert.equal(f.runtime.events('blue').filter(e=>e.type==='impact').length,1);
 const reset=fixture(24,profile).view();assert.equal(reset.ammunition.total,42);assert.equal(reset.ammunition.incident.active,false);assert.equal(reset.ammunition.incident.last,null);assert.deepEqual(reset.ammunition.incident.lostTotals,{M829A2:0,M829A1:0,M830:0});
});

test('W20-A01 halt AI treats safety lockout as temporary readiness, keeps one mission/target and resumes fire',()=>{
 const C=syntheticCore('flat'),u=C.makeTank('SAFE','SAFETY AI',500,1000,0,'blue',undefined,'auto'),target=C.makeTank('TARGET','TARGET',1200,1000,Math.PI,'red',undefined,'hold');target.combat.hp=target.combat.maxHp=100000;
 const s={time:0,seed:25,units:[u,target],recordAIEvents:true,recordObservationEvents:true,recordFireEvents:true};for(const channel of['commander','gunner'])assert(C.guard(s,u,channel,{x:target.x,y:target.y}));C.assignMission(s,u,{id:'safety-halt',type:'patrol',policy:'halt',loop:true,waypoints:[{x:750,y:1000},{x:500,y:1000}]});
 let ai;for(let i=0;i<800;i++){C.step(s,.05);ai=C.aiStatus(s,u);if(ai.mission.status==='paused'&&ai.behavior==='engaging'&&C.ownObservation(s,u,ai.autoTargetKey).acquired)break;}assert.equal(ai.mission.status,'paused');const fire=C.fireStatus(s,u),shots=fire.shotCount,counters=structuredClone(ai.counters),mission=structuredClone(ai.mission),targetId=ai.autoTargetId,distance=u.distanceTravelled;
 u.fireControl.ammunition.incident.safetyUntil=s.time+2;for(let i=0;i<39;i++)C.step(s,.05);ai=C.aiStatus(s,u);let locked=C.fireStatus(s,u);assert.equal(locked.reason,'ammo-safety');assert.equal(locked.shotCount,shots);assert.equal(locked.ammunition.engageable,true);assert.equal(ai.mission.status,'paused');assert.equal(ai.autoTargetId,targetId);assert.deepEqual(ai.mission.waypoints,mission.waypoints);assert.equal(ai.counters.resumes,counters.resumes);assert.equal(ai.counters.pathRequests,counters.pathRequests);assert.equal(u.distanceTravelled,distance);
 for(let i=0;i<240&&C.fireStatus(s,u).shotCount===shots;i++)C.step(s,.05);locked=C.fireStatus(s,u);assert(locked.shotCount>shots);assert.equal(C.aiStatus(s,u).mission.status,'paused');
});
