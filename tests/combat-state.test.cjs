const test=require('node:test'),assert=require('node:assert/strict');
const Combat=require('../src/combat-state.js'),Profiles=require('../src/vehicle-profiles.js');
const profile=Profiles.M1A2_1998,ammo=Combat.AMMUNITION.M829A2,near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
const target=(id='T')=>({id,profileId:profile.id,x:0,y:0,heading:0,turret:0});
const event=(id='S1',change={})=>({id,hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000,ammoId:'M829A2',ricochetRoll:.999999,...change});

test('V01 active symmetric profile and ammunition use the confirmed game data',()=>{
 assert.equal(profile.id,'M1A2_1998');assert.equal(profile.combat.maxHp,1450);assert.equal(profile.weapons.mainGun.ammunitionId,'M829A2');assert.equal(ammo.baseDamage,405);assert.equal(ammo.muzzleVelocity,1680);
 assert(Object.isFrozen(profile.combat.armor));assert(Object.isFrozen(ammo.penetration.values));
});

test('V02 invalid IDs and malformed profile fields reject before partial runtime mutation',()=>{
 assert.throws(()=>Combat.ammunitionRegistry.get('UNKNOWN'),/등록되지/);
 for(const mutate of [p=>delete p.combat,p=>p.combat.maxHp=NaN,p=>delete p.combat.armor.hullFront,p=>p.weapons.mainGun.ammunitionId='UNKNOWN']){
  const p=structuredClone(profile),u=target();mutate(p);assert.throws(()=>Combat.initUnit(u,p));assert.equal(u.combat,undefined);
 }
 const runtime=Combat.create({profileOf:()=>profile}),u=target();Combat.initUnit(u,profile);assert.throws(()=>runtime.apply(event('',{}),u));assert.equal(u.combat.hp,1450);assert.equal(runtime.stats().applied,0);
});

test('V03 penetration table, game curve anchors and WIP12 high-angle interpolation are stable',()=>{
 assert.deepEqual(Combat.penetrationAt(ammo,10,0),{value:675,rangeClamped:false,angleClamped:false,rangeUsed:10,angleUsed:0});
 assert.equal(Combat.penetrationAt(ammo,2000,60).value,365);
 near(Combat.penetrationAt(ammo,1005,15).value,(675+570+635+535)/4);
 const anchors=[[0,.65],[.071429,1.05],[.142857,1.08],[.714286,.65],[.857143,.35],[.93,.20]];for(const [x,y]of anchors)near(Combat.multiplierAt(ammo,x),y);
 near(Combat.multiplierAt(ammo,(.142857+.714286)/2),(1.08+.65)/2);assert.equal(Combat.multiplierAt(ammo,2),.20);
 const low=Combat.penetrationAt(ammo,1,0),high=Combat.penetrationAt(ammo,5000,80),parallel=Combat.penetrationAt(ammo,2000,90),beyond=Combat.penetrationAt(ammo,2000,95);assert.equal(low.value,675);assert(low.rangeClamped);near(high.value,365/3);assert(high.rangeClamped&&!high.angleClamped);assert.equal(parallel.value,0);assert.equal(beyond.value,0);assert(beyond.angleClamped&&beyond.angleUsed===90);
});

test('V04 each unit owns HP state while immutable profiles and ammunition stay shared',()=>{
 const a=target('A'),b=target('B'),runtime=Combat.create({profileOf:()=>profile});Combat.initUnit(a,profile);Combat.initUnit(b,profile);runtime.apply(event('one'),a,1);
 assert(a.combat.hp<1450);assert.equal(b.combat.hp,1450);assert.notEqual(a.combat,b.combat);assert.equal(profile.combat.maxHp,1450);assert.equal(ammo.baseDamage,405);
});

test('V06/V07 exact-once, miss, non-penetration and destroyed target paths do not corrupt HP',()=>{
 const u=target(),runtime=Combat.create({profileOf:()=>profile});Combat.initUnit(u,profile);
 const miss=runtime.apply(event('miss',{hit:false,zone:null}),u,1);assert.equal(miss.damage,0);assert.equal(u.combat.hp,1450);
 const nonpen=runtime.apply(event('front',{zone:'turretFront'}),u,2);assert.equal(nonpen.reason,'non-penetration');assert.equal(nonpen.damage,0);assert.equal(u.combat.hp,1450);
 const rear={zone:'hullRear',origin:{x:-1000,y:0}},hit=runtime.apply(event('hit',rear),u,3),hp=u.combat.hp;assert(hit.damage>0);
 assert.equal(runtime.apply(event('hit',rear),u,4).reason,'duplicate');assert.equal(u.combat.hp,hp);
 u.combat.hp=1;const kill=runtime.apply(event('kill',rear),u,5);assert(kill.destroyed);assert.equal(u.combat.hp,0);const after=runtime.apply(event('late',rear),u,6);assert.equal(after.reason,'target-destroyed');assert.equal(u.combat.hp,0);assert.equal(runtime.stats().destroyed,1);
});

test('V11 same-time impacts remain caller-ordered and records stay bounded',()=>{
 const u=target(),runtime=Combat.create({profileOf:()=>profile,recordLimit:3});Combat.initUnit(u,profile);u.combat.hp=700;
 const rear={zone:'hullRear',origin:{x:-1000,y:0}},a=runtime.apply(event('A',rear),u,10),b=runtime.apply(event('B',rear),u,10),c=runtime.apply(event('C',rear),u,10),d=runtime.apply(event('D',rear),u,10);
 assert(a.applied&&b.applied&&c.applied&&d.applied);near(b.hpBefore,a.hpAfter);near(c.hpBefore,b.hpAfter);near(d.hpBefore,c.hpAfter);assert.deepEqual(runtime.records().map(r=>r.id),['B','C','D']);assert.equal(runtime.stats().records,3);
});
