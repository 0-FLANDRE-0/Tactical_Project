const test=require('node:test'),assert=require('node:assert/strict');
const Combat=require('../src/combat-state.js'),Profiles=require('../src/vehicle-profiles.js'),Fire=require('../src/fire-control.js');
const ammo=Combat.AMMUNITION.M829A2,profile=Profiles.M1A2_1998,rad=d=>d*Math.PI/180,near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);

test('W12-01 60–90 degree penetration reaches zero linearly without changing the old anchors',()=>{
  assert.equal(Combat.penetrationAt(ammo,2000,60).value,365);
  near(Combat.penetrationAt(ammo,2000,75).value,182.5);
  assert.equal(Combat.penetrationAt(ammo,2000,90).value,0);
  assert.deepEqual(Combat.penetrationAt(ammo,2000,95),{value:0,rangeClamped:false,angleClamped:true,rangeUsed:2000,angleUsed:90});
});

test('W12-02 M829A2 ricochet anchors interpolate and use the strict roll<chance boundary',()=>{
  for(const [angle,chance] of [[0,0],[78,0],[79,.25],[80,.5],[80.5,.75],[81,1],[89,1]])near(Combat.ricochetChance(ammo,angle),chance);
  const base={hit:true,zone:'turretFront',origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:rad(80)},rangeM:1000,profile,ammoId:'M829A2'};
  const yes=Combat.evaluate({...base,ricochetRoll:.499999}),boundary=Combat.evaluate({...base,ricochetRoll:.5});
  assert.equal(yes.reason,'ricochet');assert(yes.ricochet);assert.equal(yes.damage,0);assert(!yes.penetrated);
  assert(!boundary.ricochet);assert.notEqual(boundary.reason,'ricochet');assert.equal(boundary.ricochetChance,.5);
});

test('W12-03 current hull and turret pose select their own face incidence',()=>{
  const origin={x:1000,y:0},pose={x:0,y:0,heading:0,turret:rad(80)};
  near(Combat.incidenceDeg(origin,pose,'hullFront',null),0);near(Combat.incidenceDeg(origin,pose,'turretFront',null),80);
  near(Combat.incidenceDeg(origin,{...pose,heading:rad(80),turret:0},'hullFront',null),80);
  near(Combat.incidenceDeg({x:0,y:1000},{...pose,turret:0},'hullSide','right'),0);near(Combat.incidenceDeg({x:0,y:-1000},{...pose,turret:0},'hullSide','left'),0);
});

test('W12-04 ricochet applies zero damage exactly once and a duplicate cannot reroll',()=>{
  const target={id:'T',profileId:profile.id,x:0,y:0,heading:rad(80),turret:0};Combat.initUnit(target,profile);
  const runtime=Combat.create({profileOf:()=>profile}),event={id:'A-shot-1',hit:true,zone:'hullFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:rad(80),turret:0},rangeM:1000,ammoId:'M829A2',ricochetRoll:.1};
  const first=runtime.apply(event,target,1),again=runtime.apply({...event,ricochetRoll:.99},target,2);
  assert(first.applied&&first.ricochet);assert.equal(first.damage,0);assert.equal(target.combat.hp,profile.combat.maxHp);assert.equal(again.reason,'duplicate');assert.equal(runtime.stats().applied,1);
});

test('W12-05 real core acquisition, firing and impact can deterministically ricochet without a second flight or damage',()=>{
  const {fixture}=require('./helpers/observation-core-fixture.cjs'),f=fixture('flat',{target:{x:1000,y:1000},seed:25});
  f.t.heading=Math.PI-rad(80);f.t.turret=f.t.heading;f.step(160);const contact=f.contact();assert(f.C.designate(f.s,f.u,contact.key));f.step(80);assert(f.C.fireStatus(f.s,f.u).canFire);
  assert(f.C.requestFire(f.s,f.u,contact.key).ok);f.step();const fired=f.C.fireEvents(f.s).find(e=>e.type==='fired');assert(fired);while(f.s.time<fired.impactAt+.051)f.step();
  const record=f.C.combatEvents(f.s).at(-1),debug=f.C.fireDebugRecords(f.s).at(-1),effects=f.C.effectEvents(f.s);
  assert.equal(debug.zone,'hullFront');near(record.incidenceDeg,80);near(record.ricochetChance,.5);near(record.ricochetRoll,.4249394212383777);assert(record.ricochet);assert.equal(record.damage,0);assert.equal(f.t.combat.hp,1450);
  assert.equal(effects.filter(e=>e.kind==='fire').length,1);assert.equal(effects.filter(e=>e.effectClass==='ricochet').length,1);const before=structuredClone({hp:f.t.combat.hp,records:f.C.combatEvents(f.s),shots:f.C.fireEvents(f.s)});f.step(100);assert.deepEqual({hp:f.t.combat.hp,records:f.C.combatEvents(f.s),shots:f.C.fireEvents(f.s)},before);
});

test('W12-06 hidden enemy firing still emits detached minimal effects while detailed events remain team-filtered',()=>{
  const {fixture}=require('./helpers/hit-fixture.cjs'),f=fixture(19);f.u.team='red';f.observed(false);f.step(1.2);assert(f.fire().ok);f.step();
  assert.equal(f.runtime.events('blue').length,0);assert.equal(f.runtime.events('red').filter(e=>e.type==='fired').length,1);assert.equal(f.runtime.effects().filter(e=>e.kind==='fire').length,1);f.land();
  const effects=f.runtime.effects(),text=JSON.stringify(effects),forbidden=['team','shooterId','targetId','targetKey','profile','ammo','damage','hp','zone','side'];
  for(const key of forbidden)assert(!text.includes('"'+key+'"'),key);assert(effects.some(e=>e.kind==='impact'));
  const detached=f.runtime.effects();detached[0].origin.x=-999;assert.notEqual(f.runtime.effects()[0].origin.x,-999);
  const miss=fixture(52);miss.u.team='red';miss.observed(false);miss.step(1.2);assert(miss.fire().ok);miss.step();miss.land();assert(miss.runtime.effects().some(e=>e.kind==='impact'&&e.effectClass==='miss-ground'));
});

test('W12-07 public effect reads and visual frame batching do not change deterministic game results',()=>{
  const {fixture}=require('./helpers/hit-fixture.cjs');
  function run(reads){const f=fixture(27);for(let shot=0;shot<3;shot++){f.step(7);assert(f.fire().ok);f.step();for(let i=0;i<reads;i++)f.runtime.effects(-Infinity);f.land();}return{unit:f.u,events:f.runtime.events('blue'),debug:f.runtime.debugRecords()};}
  assert.deepEqual(run(0),run(250));
});

test('W12-08 renderer decodes the owned atlas, bounds particles and clears on reset',()=>{
  const Original=global.Image;global.Image=class{set src(value){this.value=value;this.naturalWidth=256;this.naturalHeight=64;this.onload?.();}};
  try{
    const Effects=require('../src/effects.js'),renderer=Effects.create({source:'data:image/png;base64,test',particleLimit:64,seenLimit:80});
    const events=[];for(let i=0;i<150;i++)events.push({id:'fx-'+i,kind:'impact',time:0,expiresAt:3,position:{x:i,y:i},effectClass:i%3?'non-penetration':'ricochet',outgoingHeading:0,visualSeed:i});renderer.sync(events);
    const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...a){calls.push(a);},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},set globalAlpha(v){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}};
    renderer.draw(ctx,.1,(x,y)=>({x,y}),1,{quality:.5,reducedMotion:false});const stats=renderer.stats();assert(stats.ready&&!stats.error);assert(stats.particles<=64);assert(stats.seen<=80);assert(stats.dropped>0);assert(calls.length>0);renderer.reset();assert.equal(renderer.stats().particles,0);assert.equal(renderer.stats().seen,0);
  }finally{global.Image=Original;}
});

test('W12-09 ricochet reflection changes only the display direction',()=>{
  const pose={heading:rad(80),turret:0},out=Fire.reflectedHeading(0,pose,'hullFront',null);near(Math.atan2(Math.sin(out-rad(-20)),Math.cos(out-rad(-20))),0);
});

test('W12-10 resolved impact retargets its linked display tracer to the exact impact position',()=>{
  const Original=global.Image;global.Image=class{set src(value){this.value=value;this.naturalWidth=256;this.naturalHeight=64;this.onload?.();}};
  try{
    const Effects=require('../src/effects.js'),renderer=Effects.create({source:'data:image/png;base64,test'}),fire={id:'fx-1',kind:'fire',time:0,expiresAt:1.35,origin:{x:0,y:0},heading:0,distanceM:1000,duration:1,visualSeed:1},impact={id:'fx-2',kind:'impact',time:1,expiresAt:4.2,position:{x:980,y:108,z:0},effectClass:'miss-ground',flightEffectId:'fx-1',outgoingHeading:null,visualSeed:2};
    renderer.sync([fire],0);renderer.sync([fire,impact],1);
    const lines=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){},beginPath(){},arc(){},fill(){},moveTo(x,y){this.from={x,y};},lineTo(x,y){lines.push({from:this.from,to:{x,y}});},stroke(){},set globalAlpha(v){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}};
    renderer.draw(ctx,1,(x,y)=>({x,y}),1);const stats=renderer.stats();assert.equal(lines.length,1);near(lines[0].to.x,impact.position.x);near(lines[0].to.y,impact.position.y);assert.equal(stats.linkedFlights,1);assert.equal(stats.unlinkedImpacts,0);assert.equal(stats.lastFlightErrorM,0);
  }finally{global.Image=Original;}
});

test('W12-11 default 384 budget keeps all 80 muzzle flashes and tracers across two 0.05 second frames',()=>{
  const Original=global.Image;global.Image=class{set src(value){this.value=value;this.naturalWidth=256;this.naturalHeight=64;this.onload?.();}};
  try{
    const Effects=require('../src/effects.js'),renderer=Effects.create({source:'data:image/png;base64,test'}),events=[];
    for(let i=0;i<80;i++)events.push({id:'fx-'+i,kind:'fire',time:i<40?0:.05,expiresAt:1.5,origin:{x:i,y:0},heading:0,distanceM:1000,duration:1,visualSeed:i});
    renderer.sync(events.slice(0,40),.05);renderer.sync(events,.1);renderer.advance(.1);const stats=renderer.stats();
    assert.equal(stats.particles,384);assert.equal(stats.coreParticles,160);assert.equal(stats.byKind.muzzle,80);assert.equal(stats.byKind.tracer,80);assert.equal(stats.droppedCore,0);assert.equal(stats.droppedAux,16);assert.equal(stats.auxParticles,224);
  }finally{global.Image=Original;}
});

test('W12-12 delayed 2x frame reconnects an expired seed-70-style tracer before the terminal canvas draw',()=>{
  const Original=global.Image;global.Image=class{set src(value){this.value=value;this.naturalWidth=256;this.naturalHeight=64;this.onload?.();}};
  try{
    const Effects=require('../src/effects.js'),renderer=Effects.create({source:'data:image/png;base64,test'}),fire={id:'fx-1',kind:'fire',time:15,expiresAt:15.85,origin:{x:0,y:0},heading:0,distanceM:1000,duration:.5,visualSeed:70},impact={id:'fx-2',kind:'impact',time:15.55,expiresAt:18.75,position:{x:980,y:108,z:0},effectClass:'miss-ground',flightEffectId:'fx-1',outgoingHeading:null,visualSeed:71};
    renderer.sync([fire],15.45);renderer.advance(15.65);assert.equal(renderer.stats().byKind.tracer,undefined);assert.equal(renderer.stats().pendingFlightLinks,1);
    renderer.sync([fire,impact],15.65);const lines=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){},beginPath(){},arc(){},fill(){},moveTo(x,y){this.from={x,y};},lineTo(x,y){lines.push({from:this.from,to:{x,y}});},stroke(){},set globalAlpha(v){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}};renderer.draw(ctx,15.65,(x,y)=>({x,y}),1);
    const stats=renderer.stats();assert.equal(lines.length,1);near(lines[0].to.x,impact.position.x);near(lines[0].to.y,impact.position.y);assert.equal(stats.linkedFlights,1);assert.equal(stats.unlinkedImpacts,0);assert.equal(stats.pendingFlightLinks,0);assert.equal(stats.lastFlightErrorM,0);
  }finally{global.Image=Original;}
});
