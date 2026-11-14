const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),Mobility=require('../src/mobility.js'),Observation=require('../src/observation.js');
const {fixture}=require('./helpers/hit-fixture.cjs');
const Core=require('./load.cjs')();
const profile=Profiles.M1A2_1998,near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
const result=(change={})=>({hit:true,zone:'hullFront',ricochet:false,penetrated:true,nearNonPenetration:false,...change});
const resolve=(occurrence,target=0,duration=0,change={})=>Combat.resolveHitReaction(profile,'M829A2',result(change),{occurrence,target,duration});

test('W18-P01 only M1A2_1998 owns the explicit M829A2 reaction policy and malformed tables reject',()=>{
 assert.equal(Profiles.M1A2.hitReactions,undefined);assert.equal(Combat.validateHitReactionBindings(Profiles.M1A2),'not-participant');assert.equal(profile.hitReactions.enabled,true);assert.equal(Combat.validateHitReactionBindings(profile),'active');assert.equal(profile.hitReactions.victimProfileId,'M1A2_1998');assert.deepEqual(profile.hitReactions.susceptibility,{temporaryFault:1,crewLight:1,crewSerious:1});assert.equal(Combat.AMMUNITION.M829A2.hitReactionPolicyId,'tank-ke/M829A2');
 assert.deepEqual(profile.hitReactions.policies['tank-ke/M829A2'].rows.penetration.hullFront,{temporaryFault:.05,crewLight:.03,crewSerious:.005});
 for(const mutate of [p=>p.hitReactions.enabled=null,p=>p.hitReactions.victimProfileId='M1A2',p=>p.hitReactions.susceptibility.temporaryFault=21,p=>delete p.hitReactions.susceptibility.crewLight,p=>p.hitReactions.policies['tank-ke/M829A2'].rows.penetration.hullFront.crewSerious=.95,p=>p.hitReactions.policies['tank-ke/M829A2'].faultWeights.upper.mobility=.6,p=>delete p.hitReactions.policies['tank-ke/M829A2'].crewWeights.light.hullSide.driver,p=>p.hitReactions.policies['tank-ke/M829A2'].ammoId='OTHER',p=>p.hitReactions.crewEffects.loader.light.reloadEfficiency=-1,p=>p.hitReactions.crewEffects.gunner.serious.sigma=1.01]){
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

test('W18-P03 profile roles own crew state, weights and effects without forcing an absent loader',()=>{
 const p=structuredClone(profile),id='TEST_THREE_CREW';p.id=id;p.name='Test three-crew fixture';p.crew=3;p.hitReactions.victimProfileId=id;p.ammoIncidents.victimProfileId=id;p.hitReactions.roles=['driver','commander','gunner'];delete p.hitReactions.crewEffects.loader;
 for(const policy of Object.values(p.hitReactions.policies))for(const severity of ['light','serious'])for(const zone of Combat.ZONES)policy.crewWeights[severity][zone]={driver:.4,commander:.3,gunner:.3};
 const profiles=Profiles.registry.create([p]),registry=profiles.registry;assert.equal(Combat.validateProfileRegistry(registry),registry);const three=registry.get(id),u={id:'THREE'};Combat.initUnit(u,three);
 assert.deepEqual(Object.keys(u.hitReactions.crew),['driver','commander','gunner']);assert.equal(u.hitReactions.crew.loader,undefined);assert.equal(three.hitReactions.crewEffects.loader,undefined);
 const outcome=Combat.resolveHitReaction(three,'M829A2',result(),{occurrence:.05,target:.999,duration:0});assert.equal(outcome.category,'crewLight');assert.equal(outcome.target,'gunner');Combat.applyResolvedHitReaction(u,three,outcome,0);assert.equal(u.hitReactions.crew.gunner,'light');assert(!Object.hasOwn(u.hitReactions.crew,'loader'));assert.equal(Combat.hitReactionModifiers(u,three,0).loaderEfficiency,1);
 assert.throws(()=>Combat.applyResolvedHitReaction(u,three,{category:'crewLight',target:'loader',severity:'light'},0),/승무원 대상/);
});

test('W18-P04 category susceptibility is independent, final probabilities stay explicit and policy bindings load strictly',()=>{
 const scaled=structuredClone(profile);scaled.hitReactions.susceptibility={temporaryFault:1,crewLight:.5,crewSerious:0};const pick=occurrence=>Combat.resolveHitReaction(scaled,'M829A2',result(),{occurrence,target:0,duration:0});
 assert.equal(pick(.049999).category,'temporaryFault');assert.equal(pick(.05).category,'crewLight');assert.equal(pick(.064999).category,'crewLight');assert.equal(pick(.065),null);near(pick(0).totalChance,.065);
 const temporaryOnly=structuredClone(profile);temporaryOnly.hitReactions.susceptibility.temporaryFault=2;assert.equal(Combat.resolveHitReaction(temporaryOnly,'M829A2',result(),{occurrence:.08,target:0,duration:0}).category,'temporaryFault');
 const disabled=structuredClone(profile);disabled.id='TEST_REACTION_DISABLED';disabled.hitReactions={enabled:false};disabled.ammoIncidents.victimProfileId=disabled.id;const disabledProfiles=Profiles.registry.create([disabled]),disabledRegistry=disabledProfiles.registry;assert.equal(Combat.validateProfileRegistry(disabledRegistry),disabledRegistry);assert.equal(Combat.validateHitReactionBindings(disabledRegistry.get(disabled.id)),'disabled');const unit={id:'OFF'};Combat.initUnit(unit,disabledRegistry.get(disabled.id));assert.equal(unit.hitReactions,undefined);
 const unbound=structuredClone(profile);unbound.id='TEST_UNBOUND_POLICY';unbound.hitReactions.victimProfileId=unbound.id;unbound.ammoIncidents.victimProfileId=unbound.id;unbound.hitReactions.policies={'unbound/M829A2':unbound.hitReactions.policies['tank-ke/M829A2']};const unboundRegistry=Profiles.registry.create([unbound]).registry;assert.throws(()=>Combat.validateProfileRegistry(unboundRegistry),/효과 정책 ID 연결/);assert.throws(()=>Combat.validateProfile(unboundRegistry.get(unbound.id)),/효과 정책 ID 연결/);
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

test('W18-O01 commander injury scales automatic scan and fixed-point slew once while turret fault stays independent',()=>{
 const commanderTurn=(severity,mode)=>{const u={id:'U-'+severity+'-'+mode,x:0,y:0,heading:0,turret:0,commander:0,team:'blue'};Combat.initUnit(u,profile);if(severity!=='normal')Combat.applyResolvedHitReaction(u,profile,{category:severity==='light'?'crewLight':'crewSerious',target:'commander',severity},0);u.hitReactionModifiers=Combat.hitReactionModifiers(u,profile,0);const state=Observation.init(u);state.commander.scanPhase=Math.PI/2;if(mode==='guard')Observation.guard(u,'commander',{x:0,y:100},0,0);const runtime=Observation.create({profileOf:()=>profile,exposure:()=>({visible:false,samples:[]})});runtime.advance([u],.1,.1,[u]);return Math.abs(u.commander);};
 for(const mode of ['auto','guard']){const normal=commanderTurn('normal',mode),light=commanderTurn('light',mode),serious=commanderTurn('serious',mode);near(light/normal,.85);near(serious/normal,.65);near(normal,(mode==='auto'?profile.sensors.commander.scan.rate:profile.sensors.commander.rate)*.1);}
 const turret=(factor)=>{const u={id:'G'+factor,x:0,y:0,heading:0,turret:0,commander:0,team:'blue',hitReactionModifiers:{turretRate:factor,commanderRate:1}};Observation.init(u);Observation.guard(u,'gunner',{x:0,y:100},0,0);const runtime=Observation.create({profileOf:()=>profile,exposure:()=>({visible:false,samples:[]})});runtime.advance([u],.1,.1,[u]);return u;};const impaired=turret(.6),normal=turret(1);near(impaired.turret/normal.turret,.6);near(impaired.commander,normal.commander);
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
