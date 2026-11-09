const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../src/fire-control.js'),Combat=require('../src/combat-state.js'),Profiles=require('../src/vehicle-profiles.js');
const {fixture}=require('./helpers/hit-fixture.cjs');
const near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
const conserve=view=>assert.equal(view.loading.chamber+view.loading.stored,view.ammo);
function waitUntil(f,predicate,limit=400){for(let i=0;i<limit&&!predicate();i++)f.step();assert(predicate(),'condition timeout');}
function shoot(f){waitUntil(f,()=>f.view().canFire);const at=f.time();assert(f.fire().ok);f.step();return at+.05;}

test('W15-R01 base reload is 5.98 seconds, preserves 42 total rounds and stops at the last round',()=>{
 const f=fixture();f.step(1.2);conserve(f.view());assert(f.fire().ok);f.step();let v=f.view();assert.equal(v.ammo,41);assert(!v.loading.loaded);assert.equal(v.loading.progress,0);conserve(v);
 f.step(5.95);v=f.view();assert(!v.loading.loaded);assert(v.loading.progress<1);f.step(.05);v=f.view();assert(v.loading.loaded);assert.equal(v.loading.progress,1);conserve(v);near(f.time(),7.25);
 const last=fixture();last.u.fireControl.ammo=1;last.step(1.2);assert(last.fire().ok);last.step();last.step(20);v=last.view();assert.equal(v.ammo,0);assert(!v.loading.loaded);assert.equal(v.loading.estimatedSeconds,null);assert.equal(v.loading.chamber+v.loading.stored,0);assert.equal(v.shotCount,1);
});

test('W15-R02 fatigue starts with the reload after shot four and loaded waiting clears the burst',()=>{
 const f=fixture();const fired=[];for(let i=0;i<4;i++)fired.push(shoot(f));
 let v=f.view();assert.equal(v.loading.burstShots,4);near(v.loading.fatigueSeconds,.35);near(v.loading.currentWorkSeconds,6.33);
 f.step(2);v=f.view();assert.equal(v.loading.burstShots,4);assert(!v.loading.loaded);assert(v.loading.progress>0);
 waitUntil(f,()=>f.view().loading.loaded);const readyAt=f.time();f.step(6);v=f.view();assert.equal(v.loading.burstShots,0);near(v.loading.fatigueSeconds,0);assert(v.loading.loaded);assert(f.time()>=readyAt+6-1e-9);
 for(let i=1;i<4;i++)near(fired[i]-fired[i-1],6,.051);
});

test('W15-R03 impact classes add increasing shock without rewinding reload and 14 seconds caps work',()=>{
 const f=fixture(),s=f.u.fireControl,base={applied:true,hit:true,zone:'hullFront',computedDamage:0,destroyed:false,id:'x'};
 f.runtime.react(f.u,{...base,id:'normal',penetrated:false,nearNonPenetration:false},0);near(s.shockSeconds,.25);
 f.runtime.react(f.u,{...base,id:'near',penetrated:false,nearNonPenetration:true},0);near(s.shockSeconds,1.25);
 f.runtime.react(f.u,{...base,id:'pen',penetrated:true,nearNonPenetration:false,computedDamage:405},0);near(s.shockSeconds,3.75);
 f.step(1.2);assert(f.fire().ok);f.step();f.step(1);const before=f.view().loading.progress;
 f.runtime.react(f.u,{...base,id:'during',penetrated:true,computedDamage:405},f.time());assert.equal(f.view().loading.progress,before);
 s.fatigueSeconds=5;s.shockSeconds=5;near(F.reloadSeconds(f.profile,s),14);
 waitUntil(f,()=>f.view().loading.loaded,300);assert(f.view().loading.loaded);
});

test('W15-D01 near non-penetration uses the configured strict chance and piecewise damage table',()=>{
 const p=structuredClone(Profiles.M1A2_1998),ammo=Combat.AMMUNITION.M829A2,pen=Combat.penetrationAt(ammo,1000,0).value;
 const evaluate=(deficit,roll=0)=>{p.combat.armor.hullFront.ke=pen+deficit;return Combat.evaluate({hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,profile:p,ammoId:'M829A2',ricochetRoll:.999999,nearDamageRoll:roll});};
 assert(evaluate(0).penetrated);near(evaluate(.0001).damage,119.9992,1e-3);near(evaluate(5).damage,80);near(evaluate(7.5).damage,57.5);near(evaluate(10).damage,35);assert.equal(evaluate(15).damage,0);
 assert.equal(evaluate(5,.3).damage,0);assert.equal(evaluate(5,.299999).damage,80);
 const ricochet={...evaluate(5),...Combat.evaluate({hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:80*Math.PI/180,turret:0},rangeM:1000,profile:p,ammoId:'M829A2',ricochetRoll:0,nearDamageRoll:0})};assert(ricochet.ricochet);assert.equal(ricochet.damage,0);
});

test('W15-D02 near non-penetration can destroy once while duplicate impact changes nothing',()=>{
 const p=structuredClone(Profiles.M1A2_1998),pen=Combat.penetrationAt(Combat.AMMUNITION.M829A2,1000,0).value;p.combat.maxHp=50;p.combat.armor.hullFront.ke=pen+5;
 const u={id:'T'},runtime=Combat.create({profileOf:()=>p}),event={id:'S-shot-1',hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,ammoId:'M829A2',ricochetRoll:.999999,nearDamageRoll:0};
 const first=runtime.apply(event,u,1);assert(first.destroyed);assert.equal(first.computedDamage,80);assert.equal(first.damage,50);assert(F.faultChance(p,first.computedDamage)>F.faultChance(p,first.damage));assert.equal(u.combat.hp,0);assert.equal(runtime.apply(event,u,2).reason,'duplicate');assert.equal(runtime.stats().destroyed,1);
});

test('W15-F01 temporary fault probability, kind and duration boundaries follow the profile',()=>{
 const p=Profiles.M1A2_1998;near(F.faultChance(p,0),.02);near(F.faultChance(p,202.5),.11);near(F.faultChance(p,405),.20);near(F.faultChance(p,999),.20);near(F.faultDuration(p,0),3);near(F.faultDuration(p,1),8);
 assert.equal(F.faultKind(p,0),'fireControl');assert.equal(F.faultKind(p,.499999),'fireControl');assert.equal(F.faultKind(p,.5),'commander');assert.equal(F.faultKind(p,.75),'gunner');
});

test('W15-F02 only turret hits schedule one bounded fault and repeated kinds never add durations',()=>{
 const f=fixture(),record=(id,zone='turretFront',damage=0)=>({id,applied:true,hit:true,zone,computedDamage:damage,penetrated:false,nearNonPenetration:false,destroyed:false});
 assert.equal(f.runtime.react(f.u,record('hull','hullFront'),1,{occurrence:0,kind:0,duration:1}).fault,null);
 assert.equal(f.runtime.react(f.u,record('upper','upper'),1,{occurrence:0,kind:0,duration:1}).fault,null);
 let r=f.runtime.react(f.u,record('a'),1,{occurrence:0,kind:0,duration:1});assert.equal(r.fault.kind,'fireControl');near(r.fault.until,9);
 r=f.runtime.react(f.u,record('b'),2,{occurrence:0,kind:0,duration:0});near(r.fault.until,9);assert(r.fault.until-2<=8);
 r=f.runtime.react(f.u,record('c'),2,{occurrence:0,kind:.5,duration:0});assert.equal(r.fault.kind,'commander');near(f.u.fireControl.faultUntil.commander,5);
 f.u.combat={status:'destroyed'};assert.equal(f.runtime.react(f.u,record('dead'),3,{occurrence:0,kind:1,duration:1}).fault,null);
});

test('W15-F03 FCS and gunner faults block queued fire without spending a round while reload keeps moving',()=>{
 const f=fixture();f.step(1.2);const before=f.view();assert(f.fire().ok);
 f.runtime.react(f.u,{id:'fcs',applied:true,hit:true,zone:'turretFront',computedDamage:0,penetrated:false,nearNonPenetration:false,destroyed:false},f.time(),{occurrence:0,kind:0,duration:0});
 f.step();let v=f.view();assert.equal(v.ammo,before.ammo);assert.equal(v.shotCount,0);assert.equal(f.u.fireControl.lastRejection,'fcs-fault');
 f.u.fireControl.faultUntil.fireControl=0;f.step();assert(f.fire().ok);f.step();v=f.view();assert.equal(v.ammo,41);const progress=v.loading.progress;
 f.runtime.react(f.u,{id:'gunner',applied:true,hit:true,zone:'turretFront',computedDamage:0,penetrated:false,nearNonPenetration:false,destroyed:false},f.time(),{occurrence:0,kind:.99,duration:0});
 f.step(1);v=f.view();assert.equal(v.reason,'gunner-fault');assert(v.loading.progress>progress);assert.equal(v.aimProgress,0);
});
