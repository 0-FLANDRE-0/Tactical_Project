const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const C=require('./load.cjs')(),reference=require('./helpers/los-reference.cjs'),B=reference.load(C.MAP),{mapFor}=require('./helpers/observation-core-fixture.cjs');
const source=fs.readFileSync(path.resolve(__dirname,'../src/sim-core.js'),'utf8'),profiles=require('../src/vehicle-profiles.js'),O=require('../src/observation.js');
const load=map=>new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalMobility','TacticalAI','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(map,profiles,require('../src/mobility.js'),require('../src/tactical-ai.js'),O,require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),{exports:{}});
const report={referenceCommit:'e9f037cc6edca994e3f19297d3e0aa6c491be164',referenceSourceSHA256:reference.sha256,mapHash:C.MAP.meta.mapHash,seed:707,summary:C.losAccelerationInfo(),rays:0,exposures:0,visible:0,positiveForestDepth:0,reasons:{},cases:[]};
function equal(A,B,o,t,h=1.5,fast=false,eye=null){const actual=A.lineOfSight(o,t,h,fast,eye),expected=B.lineOfSight(o,t,h,fast,eye);assert.deepEqual(actual,expected,JSON.stringify({o,t,h,fast,eye}));report.rays++;report.visible+=+actual.visible;report.positiveForestDepth+=+(actual.forestDepth>0);report.reasons[actual.reason]=(report.reasons[actual.reason]||0)+1;return actual;}
function pair(kind,edit=null){const map=mapFor(kind);if(edit)edit(map);return{A:load(map),B:reference.load(map)};}
test('32m bounds are small derived data; baseline oracle is frozen and queries do not mutate map/nav',()=>{
 assert.equal(reference.sha256,'ab70525f12138b068daf00198bd49611d883c940cd8ac8c6fcfeac5a55f2e49c');assert.deepEqual(C.losAccelerationInfo(),{tileMetres:32,tiles:15625,summaryBytes:265625});assert.deepEqual(C.MAP,B.MAP);assert.equal(C.VEHICLE.radius,4.62);assert.equal(C.bakeNavigation().contract,B.bakeNavigation().contract);
});
test('12000 real-map LOS results exactly match baseline, including reason/optical-depth and fast preview',()=>{
 for(let i=0;i<12000;i++){
  const o={x:C.hash(i,707)*4000,y:C.hash(i,708)*4000},t={x:C.hash(i,709)*4000,y:C.hash(i,710)*4000},h=[.8,1.4,2.2,15,60][i%5],eye=[.8,2.65,12,30][i%4];
  equal(C,B,o,t,h,i%3===0,eye);
 }
 report.cases.push('12000 real-map, 8000 precise / 4000 preview, varied eye and target heights');
});
test('1000 real-map nine-point exposure records exactly match at independent hull/turret angles',()=>{
 for(let i=0;i<1000;i++){
  const o=C.makeTank('A','A',C.hash(i,711)*4000,C.hash(i,712)*4000,i,'blue',undefined,'hold'),t=C.makeTank('T','T',C.hash(i,713)*4000,C.hash(i,714)*4000,i*.27,'red',undefined,'hold');t.turret=i*.39;
  const ex=C.exposure(o,t,[2.65,1.4,10][i%3]);assert.deepEqual({...ex,samples:ex.samples.map(({along,z,col,row,...v})=>v)},B.exposure(o,t,[2.65,1.4,10][i%3]),'prior exposure fields '+i);report.exposures++;
 }
 report.cases.push('1000 exposure records (9000 rays), independent poses');
});
test('tile/world boundaries, negative directions, axis/diagonal/zero-length and range requests remain exact',()=>{
 const points=[0,1,31.999999999,32,32.000000001,64,1984,2016,3968,3999,4000];
 for(let i=0;i<points.length;i++)for(let j=0;j<points.length;j++)for(const fast of [false,true]){
  equal(C,B,{x:points[i],y:points[j]},{x:points[j],y:points[i]},2.2,fast);
  equal(C,B,{x:points[i],y:points[j]},{x:points[i],y:2000},1.4,fast);
 }
 for(const[o,t]of [[{x:32,y:32},{x:32,y:32}],[{x:-2,y:1000},{x:500,y:1000}],[{x:3999,y:1},{x:4002,y:1}],[{x:0,y:0},{x:4000,y:4000}],[{x:32,y:3999},{x:32-1e-12,y:0}]])for(const fast of [false,true])equal(C,B,o,t,1.5,fast);
 report.cases.push('tile/world/axis/diagonal/zero-length/outside-map/range boundaries');
});
test('thin roof crossing at 32m boundary is never skipped; courtyard polygon holes retain exact behavior',()=>{
 const {A,B}=pair('flat',map=>{map.features.buildings=[{id:'thin',z:10,geometry:{type:'Polygon',coordinates:[[[31.9,900],[32.1,900],[32.1,1100],[31.9,1100],[31.9,900]]]}},{id:'courtyard',z:10,geometry:{type:'Polygon',coordinates:[[[96,960],[160,960],[160,1040],[96,1040],[96,960]],[[104,968],[152,968],[152,1032],[104,1032],[104,968]]]}}];});
 for(const fast of [false,true])for(const x of [0,.1,1,64,64.1])equal(A,B,{x,y:1000},{x:x<32?64:0,y:1000},1.5,fast);
 assert.equal(equal(A,B,{x:0,y:1000},{x:64,y:1000}).reason,'building');assert(equal(A,B,{x:112,y:1000},{x:144,y:1000}).visible);
 for(const x of [104,112,128,144,152,160])equal(A,B,{x,y:1000},{x:200,y:1000},1.5);
 report.cases.push('thin crossing roof, precise vs preview distinction, courtyard');
});
test('terrain interpolation halo and narrow ridge stay conservative in both ray directions',()=>{
 const {A,B}=pair('ridge');for(let i=0;i<500;i++){
  const x0=850+C.hash(i,11)*200,x1=950+C.hash(i,12)*200,y=31.999999999+(i%5)*32;
  for(const fast of [false,true])equal(A,B,{x:x0,y},{x:x1,y:y+32},[.01,.06,1.5,2.2,40][i%5],fast,[.01,.06,2.65,30][i%4]);
 }
 const flat=pair('flat');for(const z of [-.06000001,-.06,-.05999999,0,.00000001,.06])for(const fast of [false,true])equal(flat.A,flat.B,{x:31.9,y:32},{x:64.1,y:32},z,fast,z);
 report.cases.push('interpolation halo, crest, 0.06m grazing tolerance');
});
test('forest/scrub prefix and canopy boundaries preserve exact optical accumulation',()=>{
 const {A,B}=pair('flat',map=>{const terrain=Buffer.alloc(1000000);for(let y=0;y<1000;y++)for(let x=8;x<32;x++)terrain[y*1000+x]=x<16?4:2;map.terrain.data=terrain.toString('base64');});
 for(const eye of [1.4,14.99999999,15,15.00000001,30])for(const height of [.8,2.2,15,30])for(const fast of [false,true])for(const [x0,x1]of [[0,31.9],[0,64],[0,160],[160,0],[32,128],[128,32],[32,32]])equal(A,B,{x:x0,y:1000},{x:x1,y:1000},height,fast,eye);
 assert(equal(A,B,{x:0,y:1000},{x:64,y:1000},1.5).forestDepth>0);report.cases.push('scrub + forest prefix, 15m canopy boundary, both directions');
});
test.after(()=>fs.writeFileSync(path.resolve(__dirname,'releases/WIP10-los-equivalence.json'),JSON.stringify(report,null,2)+'\n'));
