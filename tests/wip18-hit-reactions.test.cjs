const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),Mobility=require('../src/mobility.js'),Observation=require('../src/observation.js');
const {fixture}=require('./helpers/hit-fixture.cjs');
const Core=require('./load.cjs')();
const profile=Profiles.M1A2_1998,near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
const result=(change={})=>({hit:true,zone:'hullFront',ricochet:false,penetrated:true,nearNonPenetration:false,...change});
const resolve=(occurrence,target=0,duration=0,change={})=>Combat.resolveHitReaction(profile,'M829A2',result(change),{occurrence,target,duration});

test('W18-P01 only M1A2_1998 owns the explicit M829A2 reaction policy and malformed tables reject',()=>{
 assert.equal(Profiles.M1A2.hitReactions,undefined);assert.equal(profile.hitReactions.victimProfileId,'M1A2_1998');assert.equal(Combat.AMMUNITION.M829A2.hitReactionPolicyId,'tank-ke/M829A2');
 assert.deepEqual(profile.hitReactions.policies['tank-ke/M829A2'].rows.penetration.hullFront,{temporaryFault:.05,crewLight:.03,crewSerious:.005});
 for(const mutate of [p=>p.hitReactions.victimProfileId='M1A2',p=>p.hitReactions.policies['tank-ke/M829A2'].rows.penetration.hullFront.crewSerious=.95,p=>p.hitReactions.policies['tank-ke/M829A2'].faultWeights.upper.mobility=.6,p=>delete p.hitReactions.policies['tank-ke/M829A2'].crewWeights.light.hullSide.driver,p=>p.hitReactions.policies['tank-ke/M829A2'].ammoId='OTHER',p=>p.hitReactions.crewEffects.loader.light.reloadEfficiency=-1,p=>p.hitReactions.crewEffects.gunner.serious.sigma=1.01]){
   const p=structuredClone(profile);mutate(p);assert.throws(()=>Profiles.registry.create([p]),/피격 반응/);
 }
});

test('W18-P02 cumulative half-open category, zone target and near-penetration boundaries are exact',()=>{
 assert.equal(resolve(.049999).category,'temporaryFault');assert.equal(resolve(.05).category,'crewLight');assert.equal(resolve(.079999).category,'crewLight');assert.equal(resolve(.08).category,'crewSerious');assert.equal(resolve(.084999).category,'crewSerious');assert.equal(resolve(.085),null);
 assert.equal(resolve(.05,.699,0,{zone:'hullFront'}).target,'driver');assert.equal(resolve(.05,.7,0,{zone:'hullFront'}).target,'commander');
 assert.equal(resolve(.01,.499,0,{zone:'upper'}).target,'mobility');assert.equal(resolve(.01,.5,0,{zone:'upper'}).target,'turretDrive');
 assert.equal(resolve(.014999,0,0,{penetrated:false,nearNonPenetration:true}).category,'temporaryFault');assert.equal(resolve(.015,0,0,{penetrated:false,nearNonPenetration:true}),null);
 assert.equal(resolve(0,0,0,{ricochet:true,penetrated:false}),null);assert.equal(resolve(0,0,0,{penetrated:false}),null);assert.equal(Combat.resolveHitReaction(Profiles.M1A2,'M829A2',result(),{occurrence:0,target:0,duration:0}),null);
});

test('W18-S01 temporary faults extend by max, different faults coexist and crew severity never falls',()=>{
 const u={id:'U'};Combat.initUnit(u,profile);
 let applied=Combat.applyResolvedHitReaction(u,profile,resolve(0,0,1),1);near(applied.until,11);assert(applied.changed);
 applied=Combat.applyResolvedHitReaction(u,profile,resolve(0,0,0),2);near(applied.until,11);assert(!applied.changed);
 applied=Combat.applyResolvedHitReaction(u,profile,resolve(0,0,1),6);near(applied.until,16);assert(applied.changed);
 Combat.applyResolvedHitReaction(u,profile,resolve(0,.999,0,{zone:'upper'}),6);assert.equal(u.hitReactions.faultUntil.turretDrive,12);
 const light=resolve(.05,.1),serious=resolve(.08,.1);assert.equal(light.target,'driver');Combat.applyResolvedHitReaction(u,profile,light,7);assert.equal(u.hitReactions.crew.driver,'light');assert(!Combat.applyResolvedHitReaction(u,profile,light,8).changed);Combat.applyResolvedHitReaction(u,profile,serious,9);assert.equal(u.hitReactions.crew.driver,'serious');
 let m=Combat.hitReactionModifiers(u,profile,10);near(m.drivePower,.65);near(m.hullTurn,.75);near(m.turretRate,.60);m=Combat.hitReactionModifiers(u,profile,17);near(m.drivePower,.65);near(m.turretRate,1);
});

test('W18-S02 runtime applies at most one post-HP outcome, protects duplicates and skips misses or destroyed targets',()=>{
 const p=structuredClone(profile),row=p.hitReactions.policies['tank-ke/M829A2'].rows.penetration.hullRear;Object.assign(row,{temporaryFault:1,crewLight:0,crewSerious:0});
 const event={id:'A-shot-1',hit:true,zone:'hullRear',side:null,origin:{x:-1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,ammoId:'M829A2',ricochetRoll:.999999,nearDamageRoll:.999999},u={id:'T'};
 const runtime=Combat.create({profileOf:()=>p,seed:18}),first=runtime.apply(event,u,1);assert(first.applied&&first.hitReaction);assert.equal(['mobility','turretDrive'].filter(k=>u.hitReactions.faultUntil[k]>0).length,1);assert.equal(runtime.apply(event,u,2).reason,'duplicate');assert.equal(runtime.stats().reactionOutcomes,1);
 const miss=runtime.apply({...event,id:'A-shot-2',hit:false,zone:null},u,2);assert.equal(miss.hitReaction,null);assert.equal(runtime.stats().reactionEligible,1);
 const deadProfile=structuredClone(p);deadProfile.combat.maxHp=1;const dead={id:'D'},deadRuntime=Combat.create({profileOf:()=>deadProfile,seed:18}),kill=deadRuntime.apply({...event,id:'B-shot-1'},dead,1);assert(kill.destroyed);assert.equal(kill.hitReaction,null);assert.equal(deadRuntime.stats().reactionEligible,0);
});

test('W18-M01 driver and mobility effects change power/turn in both directions but never braking or speed caps',()=>{
 const run=(direction,power)=>{const s=Mobility.create();for(let i=0;i<120;i++)Mobility.step(s,{direction,targetSpeed:10,powerMultiplier:power},profile,.05);return s;};
 const forward=run(1,1),impaired=run(1,.65),reverse=run(-1,.65);assert(impaired.velocity>0&&impaired.velocity<forward.velocity);assert(reverse.velocity<0&&Math.abs(reverse.velocity)<profile.mobility.reverseSpeed);near(Mobility.turnRate(0,profile,.75),profile.mobility.pivotRate*.75);
 const brakeA=run(1,1),brakeB=structuredClone(brakeA);Mobility.step(brakeA,{direction:0,targetSpeed:0,powerMultiplier:1},profile,.05);Mobility.step(brakeB,{direction:0,targetSpeed:0,powerMultiplier:.65},profile,.05);near(brakeA.velocity,brakeB.velocity);
});

test('W18-O01 turret fault and commander injury independently scale actual automatic/guard slew',()=>{
 const make=(mods,ch)=>{const u={id:'U',x:0,y:0,heading:0,turret:0,commander:0,team:'blue',hitReactionModifiers:mods};Observation.init(u);Observation.guard(u,ch,{x:0,y:100},0,0);const runtime=Observation.create({profileOf:()=>profile,exposure:()=>({visible:false,samples:[]})});runtime.advance([u],.1,.1,[u]);return u;};
 const turret=make({turretRate:.6,commanderRate:1},'gunner'),turretBase=make({turretRate:1,commanderRate:1},'gunner'),commander=make({turretRate:1,commanderRate:.65},'commander'),commanderBase=make({turretRate:1,commanderRate:1},'commander');near(turret.turret,profile.mobility.turretRate*.6*.1);near(commander.commander,profile.sensors.commander.rate*.65*.1);near(turret.commander,turretBase.commander);near(commander.turret,commanderBase.turret);
});

test('W18-F01 gunner and loader injuries stack by severity with WIP15 and preserve reload progress',()=>{
 const f=fixture();f.u.hitReactionModifiers={gunnerAimRate:.65,gunnerSigma:1.30,loaderEfficiency:.65};f.u.fireControl.faultUntil.gunner=10;f.step(.1);let view=f.view();near(view.aimPenalty.aimRateMultiplier,.65);near(view.aimPenalty.errorSigmaMultiplier,1.30);near(view.loading.currentWorkSeconds,5.98/.65);
 for(let i=0;i<60&&!f.view().canFire;i++)f.step();assert(f.fire().ok);f.step();f.step(1);const before=f.view().loading.progress;f.u.hitReactionModifiers.loaderEfficiency=.85;f.step();view=f.view();assert(view.loading.progress>before);near(view.loading.currentWorkSeconds,5.98/.85);
});

test('W18-F02 a launched round keeps its fire-time sigma when the gunner becomes injured in flight',()=>{
 const f=fixture();f.c.pose.x=1900;f.step(1.2);assert(f.fire().ok);f.step();const before=f.runtime.debugRecords().length;f.u.hitReactionModifiers={gunnerAimRate:.65,gunnerSigma:1.30,loaderEfficiency:1};f.land();assert.equal(before,0);const record=f.runtime.debugRecords()[0];near(record.sigmaAtFire.multiplier,1);assert.equal(record.aimPenaltyAtFire.active,false);
});

test('W18-C01 actual core movement consumes driver state and reset creates clean crew/fault state',()=>{
 const run=injured=>{const s=Core.createScenario(1818),u=s.units.find(v=>v.id==='A11'),goal=Core.legalNear(u.x+350,u.y-80,s.units);Core.issueMove(u,goal,false,s.units);if(injured)Combat.applyResolvedHitReaction(u,Core.profileOf(u),{category:'crewSerious',target:'driver',severity:'serious'},0);for(let i=0;i<160;i++)Core.step(s,.05);return{s,u};};
 const normal=run(false),injured=run(true);assert(injured.u.distanceTravelled<normal.u.distanceTravelled);assert(injured.u.speed<normal.u.speed);assert.equal(injured.u.hitReactionModifiers.drivePower,.65);assert.equal(injured.u.hitReactionModifiers.hullTurn,.75);
 const reset=Core.createScenario(1818);for(const u of reset.units){const view=Core.combatView(u).reactions;assert(Object.values(view.crew).every(v=>v==='normal'));assert(Object.values(view.faults).every(v=>!v.active));}
});

test('W18-C02 public contacts never carry private crew, fault, timer, roll or reaction target data',()=>{
 const A=Core.makeTank('A','A',1000,1000,0,'blue'),T=Core.makeTank('T','T',1120,1000,Math.PI,'red'),s={time:0,seed:18,units:[A,T]};
 Combat.applyResolvedHitReaction(T,Core.profileOf(T),{category:'crewSerious',target:'gunner',severity:'serious'},0);Combat.applyResolvedHitReaction(T,Core.profileOf(T),{category:'temporaryFault',target:'turretDrive',duration:10},0);
 for(const u of [A,T])for(const ch of ['commander','gunner'])Core.guard(s,u,ch,{x:u===A?T.x:A.x,y:1000});for(let i=0;i<100;i++)Core.step(s,.05);
 const text=JSON.stringify(Core.contacts(s,'blue'));assert(!/hitReactions|crewSerious|faultUntil|turretDrive|occurrence|targetRoll|durationRoll/.test(text));assert(Core.contacts(s,'blue').some(c=>c.identified));
});
