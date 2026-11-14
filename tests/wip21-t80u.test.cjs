'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),Geometry=require('../src/vehicle-geometry.js'),T80UArt=require('../src/t80u-art-adapter.js');
const targetProfile=Profiles.T80U_1989;
const near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
const impact=(id='A',change={})=>({id,hit:true,zone:'hullFront',side:null,origin:{x:2000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:2000,ammoId:'M829A2',ricochetRoll:.999999,nearDamageRoll:.999999,...change});

test('WIP21 target-only registry entry has no fabricated operating capability',()=>{
 assert.equal(targetProfile.artId,'T80U');assert.equal(targetProfile.combat.maxHp,1400);
 assert.equal(targetProfile.crew,3);assert.deepEqual(targetProfile.crewRoles,['commander','gunner','driver']);assert(!targetProfile.crewRoles.includes('loader'));
 assert.deepEqual(targetProfile.capabilities,{target:true,mobility:false,observation:false,fire:false,ai:false});
 for(const field of ['mobility','sensors','fireControl','weapons','ammunition','ammoIncidents','hitReactions'])assert.equal(targetProfile[field],undefined,field);
 assert.deepEqual(Profiles.registry.ids(),['M1A2','M1A2_1998','T80U_1989']);
 const documented=JSON.parse(fs.readFileSync(require.resolve('../data/vehicles/T80U_1989.json'),'utf8')).profile;
 assert.equal(documented.model.hullLength,targetProfile.model.hullLength);assert.deepEqual(documented.combat.armor,targetProfile.combat.armor);
});

test('WIP21 target validation stays strict without weakening full vehicles or inheriting K5',()=>{
 assert.equal(Profiles.M1A2.combat,undefined);assert.equal(Profiles.M1A2_1998.combat.era,undefined);
 const clone=()=>structuredClone(targetProfile);for(const mutate of [p=>p.combat.era.zones.upper.coverage=1.01,p=>p.combat.era.zones.upper.coverage=-.01,p=>p.combat.armor.hullFront.ke=NaN,p=>delete p.target.presented,p=>p.artId='M1A2_UNKNOWN',p=>p.capabilities.fire=true,p=>p.crewRoles[2]='loader']){const p=clone();p.id='T80U_TEST';mutate(p);assert.throws(()=>Profiles.registry.create([p]));}
 const operational=structuredClone(Profiles.M1A2);delete operational.fireControl;operational.id='M1_TEST';assert.throws(()=>Profiles.registry.create([operational]),/필드 누락/);
});

test('WIP21 corrected art adapter converts absolute radians to relative degrees and keeps source landmarks',()=>{
 const u={x:10,y:20,heading:.4,turret:1.1,commander:.75,team:'red'},pose=T80UArt.sourcePose(u,6);
 near(pose.heading,.4*180/Math.PI);near(pose.turret,.7*180/Math.PI);near(pose.commander,-.35*180/Math.PI);assert.equal(pose.mg,0);assert.equal(pose.mgMounted,false);assert.equal(pose.lod,3);
 const sourceMuzzle=T80UArt.landmarks(u).muzzle,gameMuzzle=Geometry.muzzleWorld(u,targetProfile.model);
 near(gameMuzzle.x-u.x,sourceMuzzle[0]);near(gameMuzzle.y-u.y,sourceMuzzle[1]);
 near(targetProfile.model.hullLength,7.012);near(targetProfile.model.width,450*(7.012/874));near(targetProfile.model.overallLength,757*(7.012/874)+7.012/2);near(targetProfile.model.turretPivot[0],-3*(7.012/874));near(targetProfile.model.muzzleLocal[0],757*(7.012/874));
});

test('WIP21 ERA uses one independent strict coverage roll after ricochet and adds protection once',()=>{
 const evaluate=(zone,eraRoll,change={})=>Combat.evaluate({...impact('pure',{zone,eraRoll}),profile:targetProfile,...change});
 let r=evaluate('hullFront',.9);assert.equal(r.eraApplied,false);assert.equal(r.protection,500);assert.equal(r.penetrated,true);
 r=evaluate('hullFront',.899999);assert.equal(r.eraApplied,true);assert.equal(r.protection,715);assert.equal(r.penetrated,false);
 r=evaluate('turretFront',.95);assert.equal(r.protection,575);assert.equal(r.penetrated,true);
 r=evaluate('turretFront',.949999);assert.equal(r.protection,790);assert.equal(r.penetrated,false);
 r=Combat.evaluate({...impact('heat',{zone:'hullSide',side:'right',origin:{x:0,y:2000},rangeM:1000,ammoId:'M830',eraRoll:.5}),profile:targetProfile});assert.equal(r.protection,120);assert(r.penetrated);
 r=Combat.evaluate({...impact('heat2',{zone:'hullSide',side:'right',origin:{x:0,y:2000},rangeM:1000,ammoId:'M830',eraRoll:.499999}),profile:targetProfile});assert.equal(r.protection,680);assert(!r.penetrated);assert.equal(r.damage,0);
 const ricochet=Combat.evaluate({...impact('rico',{zone:'hullFront',origin:{x:0,y:2000},ricochetRoll:0}),profile:targetProfile});assert(ricochet.ricochet);assert.equal(ricochet.eraRoll,null);assert.equal(ricochet.eraEligible,false);
 const rear=Combat.evaluate({...impact('rear',{zone:'hullRear',origin:{x:-2000,y:0}}),profile:targetProfile});assert.equal(rear.eraRoll,null);assert.equal(rear.eraEligible,false);
 const full=structuredClone(targetProfile);full.combat.era.zones.upper.coverage=1;r=Combat.evaluate({...impact('full',{zone:'upper',eraRoll:.999999}),profile:full});assert(r.eraApplied);assert.equal(r.protection,260);
 const upperBoundary=Combat.evaluate({...impact('upper',{zone:'upper',eraRoll:.45}),profile:targetProfile});assert.equal(upperBoundary.eraApplied,false);assert.equal(upperBoundary.protection,45);
 const a1=Combat.evaluate({...impact('a1',{zone:'turretSide',origin:{x:0,y:2000},side:'right',ammoId:'M829A1',rangeM:1000,eraRoll:.1}),profile:targetProfile});assert.equal(a1.kind,'KE');assert.equal(a1.protection,520);
 const independent=evaluate('turretFront',.99,{pose:{x:0,y:0,heading:0,turret:Math.PI/2},origin:{x:0,y:2000}});near(independent.incidenceDeg,0);assert.equal(independent.protection,575);
 const miss=Combat.evaluate({...impact('miss',{hit:false,zone:null,eraRoll:undefined}),profile:targetProfile});assert.equal(miss.reason,'miss');assert.equal(miss.eraRoll,undefined);
});

test('WIP21 runtime derives ERA from seed and event ID without victim-ammo fallback or public leakage',()=>{
 const make=()=>({id:'T80',profileId:'T80U_1989',x:0,y:0,heading:0,turret:0});
 const a=make(),b=make(),ra=Combat.create({profileOf:()=>targetProfile,seed:70}),rb=Combat.create({profileOf:()=>targetProfile,seed:70});
 Combat.initUnit(a,targetProfile);Combat.initUnit(b,targetProfile);
 const x=ra.apply(impact('S-shot-1'),a,1),y=rb.apply(impact('S-shot-1'),b,1);assert.equal(x.eraRoll,y.eraRoll);assert.equal(x.eraApplied,y.eraApplied);assert.equal(x.hpAfter,y.hpAfter);const before=ra.stats();assert.equal(ra.apply(impact('S-shot-1',{eraRoll:x.eraApplied?.99:.01}),a,1).reason,'duplicate');assert.deepEqual(ra.stats(),before);
 assert.throws(()=>ra.apply({...impact('S-shot-2'),ammoId:null},a,2),/공격 탄약/);
 const rear=ra.apply(impact('S-shot-3',{zone:'hullRear',origin:{x:-2000,y:0}}),a,3);assert.equal(rear.eraRoll,null);
 const publicView=Combat.publicRecord(x);assert(!Object.hasOwn(publicView,'eraRoll'));assert(!Object.hasOwn(publicView,'eraApplied'));assert.equal(publicView.protection,null);assert.equal(publicView.protectionDeficit,null);
 const publicRear=Combat.publicRecord(rear);assert.equal(publicRear.protection,null);assert.equal(publicRear.protectionDeficit,null);
 const rico=ra.apply(impact('S-shot-4',{origin:{x:0,y:2000},ricochetRoll:0}),a,4);assert(rico.ricochet);assert.equal(Combat.publicRecord(rico).protection,null);
 const profileBefore=JSON.stringify(targetProfile),c=make();let destroyed=0;const rc=Combat.create({profileOf:()=>targetProfile,seed:70,onDestroyed:()=>destroyed++});Combat.initUnit(c,targetProfile);c.combat.hp=1;const lethal=rc.apply(impact('K-shot-1',{eraRoll:.99}),c,5);assert(lethal.destroyed);assert.equal(lethal.hpAfter,0);assert.equal(destroyed,1);assert.equal(rc.apply(impact('K-shot-1',{eraRoll:.01}),c,5).reason,'duplicate');assert.equal(rc.apply(impact('K-shot-2',{eraRoll:.99}),c,6).reason,'target-destroyed');assert.equal(destroyed,1);assert.equal(JSON.stringify(targetProfile),profileBefore);
});

test('WIP21 armour scenario keeps default combat intact and rejects all target-only commands',()=>{
 const C=require('./load.cjs')(),normal=C.createScenario(),trial=C.createScenario(7,{scenarioId:'t80u-armor'});assert.throws(()=>C.createScenario(7,{scenarioId:'unknown'}),/지원하지 않는 시나리오/);
 assert.equal(normal.id,'default');assert.deepEqual(normal.units.map(u=>u.profileId),Array(5).fill('M1A2_1998'));
 const blue=trial.units.find(u=>u.team==='blue'),targets=trial.units.filter(u=>u.profileId==='T80U_1989');assert.equal(targets.length,3);assert(targets.some(u=>Math.abs(u.turret-u.heading)>.2));
 const before=targets.map(u=>[u.x,u.y,u.heading,u.turret]);for(let i=0;i<40;i++)C.step(trial,.05);assert.deepEqual(targets.map(u=>[u.x,u.y,u.heading,u.turret]),before);
 const t=targets[0];assert.equal(t.drive,undefined);assert.equal(t.fireControl,undefined);assert.equal(t.observation,undefined);assert.equal(t.hitReactions,undefined);assert.equal(t.hitReactionModifiers,undefined);assert.equal(C.issueMove(t,{x:100,y:100},false,trial.units).ok,false);assert.equal(C.stop(t),false);assert.equal(C.assignMission(trial,t,{id:'bad',type:'move',waypoints:[{x:1,y:1}]}),null);assert.equal(C.requestFire(trial,t,'x').reason,'disabled');assert.equal(C.designate(trial,t,'x'),false);assert.equal(C.fireMode(trial,t,'auto'),false);assert.equal(C.passable(t.x,t.y,trial.units,blue),false);
});

test('WIP21 unidentified, memory and wreck copies retain art pose without profile identity or hidden movement',()=>{
 const C=require('./load.cjs')(),s=C.createScenario(7,{scenarioId:'t80u-armor'});let first=null;
 for(let i=0;i<200&&!first;i++){C.step(s,.05);first=C.contacts(s).find(c=>!c.identified);}
 assert(first,'expected a detected-before-identified contact');assert.equal(first.artId,'T80U');assert.equal(first.type,undefined);assert.equal(first.name,undefined);assert.equal(first.profileId,undefined);assert(first.model?.muzzleLocal);
 const world=s.units.find(u=>u.id==='U01');for(let i=0;i<200;i++)C.step(s,.05);const live=C.contacts(s).find(c=>c.key===Object.values(s.units[0].observation.contacts).find(c=>c.pose?.x===world.x&&c.pose?.y===world.y)?.key);assert(live?.identified);
 const remembered={x:live.x,y:live.y,heading:live.heading,turret:live.turret};world.x=3900;world.y=3900;world.heading+=1;world.turret-=1;for(let i=0;i<8;i++)C.step(s,.05);const memory=C.contacts(s).find(c=>c.key===live.key);assert(memory?.memory);assert.deepEqual({x:memory.x,y:memory.y,heading:memory.heading,turret:memory.turret},remembered);
});

test('WIP21 an observed destroyed T-80U becomes one fixed-art blocking wreck',()=>{
 const C=require('./load.cjs')(),s=C.createScenario(7,{scenarioId:'t80u-armor'}),target=s.units.find(u=>u.id==='U01');for(let i=0;i<240;i++)C.step(s,.05);
 const contact=C.contacts(s).find(c=>c.identified&&c.x===target.x&&c.y===target.y);assert(contact);target.combat.hp=0;target.combat.status='destroyed';target.combat.destroyedAt=s.time;for(let i=0;i<30;i++)C.step(s,.05);
 const wreck=C.contacts(s).find(c=>c.key===contact.key);assert(wreck?.wreck);assert.equal(wreck.artId,'T80U');assert.equal(wreck.type,'T-80U');const fixed={x:wreck.x,y:wreck.y,heading:wreck.heading,turret:wreck.turret};assert.equal(C.passable(fixed.x,fixed.y,s.units,s.units[0]),false);target.x+=100;target.y+=100;target.heading+=1;target.turret-=1;for(let i=0;i<20;i++)C.step(s,.05);const after=C.contacts(s).find(c=>c.key===contact.key);assert.deepEqual({x:after.x,y:after.y,heading:after.heading,turret:after.turret},fixed);
});
