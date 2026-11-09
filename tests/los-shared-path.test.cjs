const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./load.cjs')(),reference=require('./helpers/los-wip11d-reference.cjs'),B=reference.load(C.MAP),{mapFor}=require('./helpers/observation-core-fixture.cjs');
const loadCurrent=(map,exposePair=false)=>{const fs=require('fs'),path=require('path'),profiles=require('../src/vehicle-profiles.js'),O=require('../src/observation.js');let source=fs.readFileSync(path.resolve(__dirname,'../src/sim-core.js'),'utf8');if(exposePair)source=source.replace('return {registry,','return {__pairedLineOfSight:pairedLineOfSight,registry,');return new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalMobility','TacticalAI','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(map,profiles,require('../src/mobility.js'),require('../src/tactical-ai.js'),O,require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),{exports:{}});};
const strip=ex=>({...ex}),make=(core,id,x,y,h,team)=>core.makeTank(id,id,x,y,h,team,undefined,'hold');

test('WIP11D integrated reference is immutable and current public LOS remains exact',()=>{
 assert.equal(reference.sha256,'8ee5cc9f4374db0afcffaf9ae49df9e6c818a089fd72a7f1319f29c994788ee8');
 for(let i=0;i<12000;i++){
  const o={x:C.hash(i,1701)*4000,y:C.hash(i,1702)*4000},t={x:C.hash(i,1703)*4000,y:C.hash(i,1704)*4000},height=[.4,.8,1.1,2.2,15,40][i%6],eye=[.8,1.4,2.65,12,30][i%5],fast=i%3===0;
  assert.deepEqual(C.lineOfSight(o,t,height,fast,eye),B.lineOfSight(o,t,height,fast,eye),String(i));
 }
});

test('2000 real-map nine-sample exposures exactly match WIP11D and exercise shared groups',()=>{
 C.losDiagnostics(true);let logical=0;
 for(let i=0;i<2000;i++){
  const o=make(C,'A'+i,C.hash(i,1711)*4000,C.hash(i,1712)*4000,i,'blue'),t=make(C,'T'+i,C.hash(i,1713)*4000,C.hash(i,1714)*4000,i*.27,'red');t.turret=i*.39;
  const bo=make(B,'A'+i,o.x,o.y,o.heading,'blue'),bt=make(B,'T'+i,t.x,t.y,t.heading,'red');bt.turret=t.turret;
  const actual=C.exposure(o,t,[.8,1.4,2.65,10][i%4]),expected=B.exposure(bo,bt,[.8,1.4,2.65,10][i%4]);assert.deepEqual(strip(actual),strip(expected),'exposure '+i);logical+=actual.rayQueries;
 }
 const d=C.losDiagnostics(false);assert.equal(logical,18000);assert(d.groups>5000);assert.equal(d.rays,d.groups*2);assert(d.heightReadsAvoided>12000);assert(d.heightSamples>0);
});

test('full, partial and expired caches preserve each independent ray and timestamps',()=>{
 const a=make(C,'A',500,1000,0,'blue'),t=make(C,'T',1500,1300,.3,'red'),ba=make(B,'A',500,1000,0,'blue'),bt=make(B,'T',1500,1300,.3,'red');t.turret=bt.turret=.8;
 const ca={time:1,maxAge:.5,samples:[]},cb={time:1,maxAge:.5,samples:[]};
 const first=C.exposure(a,t,2.65,ca),before=JSON.stringify(first);assert.deepEqual(first,B.exposure(ba,bt,2.65,cb));
 ca.time=cb.time=1.49;assert.deepEqual(C.exposure(a,t,2.65,ca),B.exposure(ba,bt,2.65,cb));
 ca.samples[1].z=cb.samples[1].z=-999;C.losDiagnostics(true);const partial=C.exposure(a,t,2.65,ca),expected=B.exposure(ba,bt,2.65,cb),diag=C.losDiagnostics(false);assert.deepEqual(partial,expected);assert.equal(partial.rayQueries,1);assert.equal(partial.rayCacheHits,8);assert.equal(diag.groups,0);assert.equal(JSON.stringify(first),before);
 ca.time=cb.time=1.5000001;assert.deepEqual(C.exposure(a,t,2.65,ca),B.exposure(ba,bt,2.65,cb));
 ca.time=cb.time=2.1;const expired=C.exposure(a,t,2.65,ca),expiredExpected=B.exposure(ba,bt,2.65,cb);assert.deepEqual(expired,expiredExpected);assert.equal(expired.rayQueries,9);
});

test('movement, independent rotations and eye changes invalidate exactly the WIP11D samples',()=>{
 const a=make(C,'A',500,1000,0,'blue'),t=make(C,'T',1500,1000,0,'red'),ba=make(B,'A',500,1000,0,'blue'),bt=make(B,'T',1500,1000,0,'red'),ca={time:1,maxAge:.5,samples:[]},cb={time:1,maxAge:.5,samples:[]};
 const check=eye=>assert.deepEqual(C.exposure(a,t,eye,ca),B.exposure(ba,bt,eye,cb));check(2.65);
 ca.time=cb.time=1.1;t.heading=bt.heading=.3;check(2.65);ca.time=cb.time=1.2;t.turret=bt.turret=.4;check(2.65);ca.time=cb.time=1.3;t.x=bt.x=1501;check(2.65);ca.time=cb.time=1.4;a.x=ba.x=501;check(2.65);ca.time=cb.time=1.5;check(2.5);
});

test('synthetic flat, ridge, roof and forest paths retain all reasons, depths and nine samples',()=>{
 for(const kind of ['flat','ridge','building','low-wall','forest']){
  const map=mapFor(kind),A=loadCurrent(map),R=reference.load(map);
  for(const [ox,oy,tx,ty,heading,turret,eye] of [[500,1000,1500,1000,0,0,2.65],[1500,1000,500,1000,Math.PI,Math.PI,1.4],[500,900,1500,1100,.4,-.7,.8],[1000,1000,1000,1000,0,0,2.65]]){
   const o=make(A,'A',ox,oy,0,'blue'),t=make(A,'T',tx,ty,heading,'red'),ro=make(R,'A',ox,oy,0,'blue'),rt=make(R,'T',tx,ty,heading,'red');t.turret=rt.turret=turret;
   assert.deepEqual(A.exposure(o,t,eye),R.exposure(ro,rt,eye),kind+JSON.stringify([ox,oy,tx,ty,eye]));
  }
 }
});

test('shared helper independently preserves clear, terrain, one-height roof and forest reasons',()=>{
 for(const kind of ['flat','ridge','forest']){
  const map=mapFor(kind),A=loadCurrent(map,true),R=reference.load(map),o=make(A,'A',500,1000,0,'blue'),ro=make(R,'A',500,1000,0,'blue'),target={x:1500,y:1000};
  for(const eye of [.8,1.4,2.65,15])for(const heights of [[.4,.8],[.8,1.4],[1.4,2.2],[2.2,15]])assert.deepEqual(A.__pairedLineOfSight(o,target,...heights,eye),heights.map(h=>R.lineOfSight(ro,target,h,false,eye)),kind+eye+heights);
 }
 const map=mapFor('flat');map.meta.mapHash=map.navigation.sourceHash='one-height-roof';map.features.buildings=[{id:'one-height',z:1.85,geometry:{type:'Polygon',coordinates:[[[980,900],[1020,900],[1020,1100],[980,1100],[980,900]]]}}];
 const A=loadCurrent(map,true),R=reference.load(map),o=make(A,'A',500,1000,0,'blue'),ro=make(R,'A',500,1000,0,'blue'),target={x:1500,y:1000},pair=A.__pairedLineOfSight(o,target,.8,1.4,2.65);
 assert.deepEqual(pair,[R.lineOfSight(ro,target,.8,false,2.65),R.lineOfSight(ro,target,1.4,false,2.65)]);assert.equal(pair[0].reason,'building');assert.equal(pair[1].reason,'clear');
});
