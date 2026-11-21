'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Combat=require('../src/combat-state.js'),Fire=require('../src/fire-control.js');
const load=require('./load.cjs');
const {types,families,coverageAfter}=Profiles.eraPolicy;
const t80=Profiles.T80U_1989,m1=Profiles.M1A2_1998;
const near=(value,expected)=>assert(Math.abs(value-expected)<1e-9,`${value} != ${expected}`);
const event=(id,overrides={})=>({id,hit:true,zone:'turretFront',origin:{x:2000,y:0},
  pose:{x:0,y:0,heading:0,turret:0},rangeM:2000,ammoId:'M829A2',ricochetRoll:.99,nearDamageRoll:.99,eraRoll:0,...overrides});
const unit=(id='U')=>({id,profileId:t80.id,team:'red'});

test('WIP24 game data exports the six new nodes, angle interpolation and both seven-zone profiles',()=>{
  const ammo=Combat.AMMUNITION.M829A2;
  for(const [distance,values] of [[10,[630,530,365]],[1005,[615,517.5,355]],[2000,[600,505,345]]]){
    for(const [index,angle] of [0,30,60].entries())near(Combat.penetrationAt(ammo,distance,angle).value,values[index]);
    near(Combat.penetrationAt(ammo,distance,45).value,(values[1]+values[2])/2);
  }
  for(const [profile,hp,values] of [
    [m1,1450,[[390,720],[90,130],[40,40],[720,1150],[340,630],[55,55],[40,40]]],
    [t80,1400,[[500,690],[75,85],[40,40],[530,730],[305,390],[70,70],[45,45]]]
  ]){
    assert.equal(profile.combat.maxHp,hp);
    assert.deepEqual(Combat.ZONES.map(zone=>Object.values(profile.combat.armor[zone])),values);
  }
  const side=t80.combat.era.zones.hullSide;
  assert.deepEqual([side.coverage,side.ke+t80.combat.armor.hullSide.ke,side.ce+t80.combat.armor.hullSide.ce],[.5,195,545]);
  for(const era of Object.values(t80.combat.era.zones))assert.deepEqual([era.ke,era.ce],era.coverage>0?[120,460]:[0,0]);
  assert.equal(Combat.AMMUNITION.M830.eraFamily,'HEAT');
  for(const id of ['M829A1','M829A2','3BM42'])assert.equal(Combat.AMMUNITION[id].eraFamily,'APFSDS');
  for(const id of Combat.ammunitionRegistry.ids())assert.deepEqual(require('../data/ammunition/'+id+'.json').ammunition,Combat.AMMUNITION[id]);
  assert.deepEqual(require('../data/vehicles/era-policies.json').types,types);
  assert.deepEqual(require('../data/vehicles/era-policies.json').families,families);
  assert.deepEqual(require('../data/vehicles/T80U_1989.json').profile.combat,t80.combat);
});

test('WIP24 revised M829A1 nodes and A1/A2 velocity curves drive game flight time',()=>{
  const rangesM=[10,500,1000,1500,2000],a1=Combat.AMMUNITION.M829A1;
  assert.deepEqual(a1.penetration.rangesM,rangesM);
  for(const [i,row] of [[600,505,350],[587,494,343],[576,485,336],[565,476,330],[555,467,325]].entries()){
    for(const [j,angle] of [0,30,60].entries())near(Combat.penetrationAt(a1,rangesM[i],angle).value,row[j]);
  }
  near(Combat.penetrationAt(a1,255,45).value,(505+350+494+343)/4);
  for(const [id,speeds] of [['M829A1',[1575,1541,1506,1473,1440]],['M829A2',[1680,1651,1622,1594,1566]]]){
    const ammo=Combat.AMMUNITION[id],settings={...ammo,velocityRetention:.94};
    assert.deepEqual(ammo.flightSpeed,{rangesM,valuesMps:speeds});
    const approximateTime=limit=>{
      const step=limit/20000;
      let time=0;
      for(let i=0;i<20000;i++){
        const at=(i+.5)*step,j=rangesM.findIndex(v=>v>=at);
        const speed=j<=0?speeds[j<0?speeds.length-1:0]:
          speeds[j-1]+(speeds[j]-speeds[j-1])*(at-rangesM[j-1])/(rangesM[j]-rangesM[j-1]);
        time+=step/speed;
      }
      return time;
    };
    near(Fire.flightTime(0,settings),0);near(Fire.flightTime(10,settings),10/speeds[0]);
    for(const range of [255,500,1234,2000,2010])near(Fire.flightTime(range,settings),approximateTime(range));
    assert.equal(Fire.flightTime(1000,{...settings,velocityRetention:.5}),Fire.flightTime(1000,settings));
  }
  for(const id of ['M830','3BM42']){
    const ammo=Combat.AMMUNITION[id];assert.equal(ammo.flightSpeed,undefined);
    near(Fire.flightTime(1000,{...ammo,velocityRetention:.94}),1000/(ammo.muzzleVelocity*.94));
  }
});

test('WIP24 Kontakt policies use the specified percentage points for covered and gap hits, including aliases',()=>{
  assert.deepEqual(types['Kontakt-1'].defaultBonus,{ke:5,ce:380});
  for(const [type,rows] of [
    ['Kontakt-1',[[.20,.10],[.08,0],[.35,.175],[.35,.175]]],
    ['Kontakt-5',[[.25,.125],[.15,0],[.35,.175],[.35,.175]]]
  ]){
    for(const [i,aliases] of [['HEAT','ATGM'],['APFSDS','APDS'],['HEP','HESH'],['HE','HE-FRAG']].entries()){
      for(const family of aliases){
        near(coverageAfter(type,family,.8,true),.8-rows[i][0]);
        near(coverageAfter(type,family,.8,false),.8-rows[i][1]);
        near(coverageAfter(type,family,.05,true),0);
      }
    }
  }
  for(const args of [['__proto__','HE',.5,true],['Kontakt-5','unknown',.5,true],['Kontakt-5','APDS',NaN,true],['Kontakt-5','APDS',-1,true],['Kontakt-5','APDS',1.01,true],['Kontakt-5','APDS',.5,'gap']])assert.throws(()=>coverageAfter(...args));
  for(const mutate of [p=>p.combat.era.type='bogus',p=>p.combat.era.zones.upper.ce=-1,p=>p.combat.era.zones.upper.coverage=Infinity,p=>{p.combat.era.zones.unknown=p.combat.era.zones.upper;delete p.combat.era.zones.upper;}]){
    const copy=structuredClone(t80);mutate(copy);assert.throws(()=>Profiles.registry.create([copy]));assert.throws(()=>Combat.validateProfile(copy));
  }
  assert(Object.isFrozen(types['Kontakt-5'].loss.APFSDS));
});

test('WIP24 only the M829A2–K5 game binding reduces the added KE and it uses coverage before the hit',()=>{
  const a2=Combat.AMMUNITION.M829A2;
  for(const [zone,protection] of Object.entries({hullFront:573.8,hullSide:148.8,turretFront:603.8,turretSide:378.8,upper:118.8})){
    const r=Combat.evaluate({...event('preview',{zone,side:zone.endsWith('Side')?'right':null,
      origin:zone.endsWith('Side')?{x:0,y:2000}:{x:2000,y:0}}),profile:t80});
    near(r.protection,protection);near(r.coverageLoss,.15);assert.equal(r.antiEraReduction,.385);
    near(r.eraBonusBefore,120);
  }
  for(const [rangeM,penetrated] of [[1700,true],[1800,false],[2000,false]]){
    const r=Combat.evaluate({...event('preview',{rangeM}),profile:t80});assert.equal(r.penetrated,penetrated);
  }
  for(const ammoId of ['M829A1','3BM42','M830']){
    const r=Combat.evaluate({...event('preview',{ammoId}),profile:t80});
    assert.equal(r.protection,ammoId==='M830'?1190:650);assert.equal(r.antiEraReduction,null);
  }
  const k1=structuredClone(t80);k1.combat.era.type='Kontakt-1';
  Object.assign(k1.combat.era.zones.turretFront,types['Kontakt-1'].defaultBonus);
  const r=Combat.evaluate({...event('preview'),profile:k1});assert.equal(r.protection,535);near(r.coverageLoss,.08);assert.equal(r.antiEraReduction,null);
  for(const mutation of [p=>p.eraFamily='KE',p=>p.antiEra.unknown=p.antiEra['Kontakt-5'],p=>p.antiEra['Kontakt-5'].kind='CE',...[-.1,1.1,Infinity,NaN].map(value=>p=>p.antiEra['Kontakt-5'].reduction=value)]){
    const copy=structuredClone(a2);mutation(copy);assert.throws(()=>Combat.validateAmmoEraPolicy(copy));
  }
});

test('WIP24 same-time hits consume exactly once, in order, with independent units and zones',()=>{
  const runtime=Combat.create({profileOf:()=>t80,idLimit:4,recordLimit:4}),a=unit(),b=unit('V');
  const initial=JSON.stringify(t80.combat.era);
  Combat.initUnit(a,t80);Combat.initUnit(b,t80);
  const first=runtime.apply(event('A-shot-1'),a,1);
  near(first.protection,603.8);near(first.coverageBefore,.95);near(first.coverageAfter,.80);
  assert(!first.penetrated);assert.equal(first.damage,0);
  const gap=runtime.apply(event('A-shot-2',{eraRoll:first.coverageAfter}),a,1);
  assert.equal(gap.eraApplied,false);assert(gap.penetrated);near(gap.coverageAfter,.80);near(gap.protection,530);
  for(const [i,before,after] of [[3,.80,.65],[4,.65,.50],[5,.50,.35],[6,.35,.20],[7,.20,.05],[8,.05,0]]){
    const r=runtime.apply(event('A-shot-'+i),a,1);near(r.coverageBefore,before);near(r.coverageAfter,after);assert.equal(r.damage,0);
  }
  const zero=runtime.apply(event('A-shot-9',{eraRoll:undefined}),a,1);assert.equal(zero.eraRoll,null);assert.equal(zero.antiEraReduction,null);assert.equal(zero.coverageLoss,0);
  assert.equal(Combat.initUnit(a,t80).eraCoverage.turretFront,0);
  near(a.combat.eraCoverage.hullFront,.9);near(b.combat.eraCoverage.turretFront,.95);assert.equal(JSON.stringify(t80.combat.era),initial);
  for(let i=10;i<7000;i++)runtime.apply(event('A-shot-'+i,{hit:false}),a,2);
  assert.equal(runtime.apply(event('A-shot-3'),a,3).reason,'duplicate');assert.equal(runtime.stats().records,4);assert.equal(runtime.stats().sequenceShooters,1);
  assert.equal(a.combat.eraCoverage.turretFront,0);
  const records=runtime.records();records[0].hit=true;assert.equal(runtime.records()[0].hit,false);
});

test('WIP24 HEAT gap loss, bounded depletion, ricochet and rejection preserve HP/effect boundaries',()=>{
  const runtime=Combat.create({profileOf:()=>t80}),a=unit(),b=unit('V');
  function heat(id,overrides){return event('heat-'+id,{ammoId:'M830',...overrides});}
  for(const [id,after] of [[1,.70],[2,.45],[3,.20],[4,0]]){
    const r=runtime.apply(heat(id),a);near(r.coverageAfter,after);assert.equal(r.damage,0);assert(!r.penetrated);
  }
  const gap=runtime.apply(heat('gap',{eraRoll:.95}),b);near(gap.coverageAfter,.825);assert.equal(gap.damage,0);
  const ricochet=runtime.apply(heat(5,{origin:{x:0,y:2000},ricochetRoll:0,eraRoll:undefined}),b);
  assert(ricochet.ricochet);assert.equal(ricochet.eraRoll,null);assert.equal(ricochet.coverageLoss,0);
  assert.throws(()=>runtime.apply(heat(6,{zone:'invalid'}),b));
  assert.throws(()=>runtime.apply(heat(6,{eraRoll:NaN}),b));
  assert.equal(runtime.apply(heat(6),null).reason,'target-unavailable');
  b.combat.hp=1;
  const kill=runtime.apply(event('kill',{zone:'hullSide',side:'right',origin:{x:0,y:2000}}),b);assert(kill.destroyed);
  near(b.combat.eraCoverage.hullSide,.35);assert.equal(runtime.apply(heat(7),b).reason,'target-destroyed');
  near(b.combat.eraCoverage.turretFront,.825);assert.equal(a.combat.hp,1400);
  assert.equal(Combat.initUnit({id:'M'},m1).eraCoverage,undefined);
  for(const key of ['protection','protectionDeficit','residualRatio','multiplier'])assert.equal(Combat.publicRecord(kill)[key],null);
  for(const key of ['eraType','coverageBefore','coverageAfter','coverageLoss','eraRoll','eraApplied','eraBonusBefore','eraBonus','antiEraReduction'])assert(!Object.hasOwn(Combat.publicRecord(kill),key));
});

test('WIP24 an airborne round owns its launch ammo; the hit uses coverage after earlier hits',()=>{
  const core=load(),s=core.createScenario(7,{scenarioId:'t80u-fire',recordFireEvents:true}),[shooter,target]=s.units;
  for(let i=0;i<140&&!core.fireStatus(s,shooter).inFlight.length;i++)core.step(s,.05);
  assert.equal(core.fireStatus(s,shooter).inFlight.length,1);
  assert(core.ammoPreference(s,shooter,'M830'));
  const earlier=Combat.create({profileOf:()=>t80});
  for(let i=1;i<=7;i++)earlier.apply(event('fixture-shot-'+i),target,s.time);
  assert.equal(target.combat.eraCoverage.turretFront,0);
  for(let i=0;i<20&&!core.combatEvents(s).length;i++)core.step(s,.05);
  const [r]=core.combatEvents(s);assert.equal(r.ammoId,'M829A2');assert.equal(r.zone,'turretFront');
  assert.equal(r.coverageBefore,0);assert.equal(r.eraRoll,null);assert.equal(r.antiEraReduction,null);assert(r.damage>0);
});

test('WIP24 real Rasdorf fight shows seeded coverage loss, gap penetration, terminal cleanup and reset',()=>{
  const core=load(),opts={scenarioId:'t80u-fire',recordFireEvents:true,recordObservationEvents:true};
  const run=withReads=>{
    const s=core.createScenario(8,opts),[m,t]=s.units;
    for(let i=0;i<1800;i++){
      core.step(s,.05);
      if(withReads&&i%4===0){
        assert.equal(core.eraView(t),null);assert(Object.isFrozen(core.eraView(t,'red').coverage));
        const q=core.observationStats(s);core.combatEvents(s);core.contacts(s);core.combatView(m);
        assert.deepEqual(core.observationStats(s),q);
      }
    }
    return s;
  };
  const a=run(false),b=run(true);
  assert.deepEqual(core.combatEvents(a),core.combatEvents(b));
  const [first,second]=core.combatEvents(a).filter(r=>r.ammoId==='M829A2');
  near(first.time,6.35);assert.equal(first.zone,'turretFront');assert(first.eraApplied&&first.penetrated);near(first.coverageAfter,.80);
  near(second.time,12.35);assert.equal(second.zone,first.zone);assert(!second.eraApplied);assert(second.penetrated&&second.damage>first.damage);
  const [m,t]=a.units;assert.equal(m.combat.status,'alive');assert.equal(t.combat.status,'destroyed');
  const shots=core.fireEvents(a,'red').filter(e=>e.type==='fired');
  assert(shots.length>0&&shots.length<13);
  assert.equal(core.fireStatus(a,t).ammunition.total+shots.length,13);
  for(let i=1;i<shots.length;i++)near(shots[i].time-shots[i-1].time,6);
  assert.equal(core.fireStatus(a,t).ammunition.task,null);
  for(const key of ['coverageBefore','coverageAfter','eraCoverage','eraRoll','eraBonus','antiEraReduction']){
    assert(!JSON.stringify([core.contacts(a),core.fireEvents(a,'blue'),core.effectEvents(a)]).includes(key));
  }
  const fresh=core.createScenario(7,opts);assert.equal(fresh.units[1].combat.eraCoverage.turretFront,.95);
  assert.notDeepEqual(t.combat.eraCoverage,fresh.units[1].combat.eraCoverage);
});
