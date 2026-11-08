const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const C=require('./load.cjs')(),P=C.PROFILE,Client=require('../src/visibility-client.js');
let passed=0;const evidence=[];
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const close=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
test('manufacturer dimensions and US customary conversions are consistent',()=>{
 close(P.model.overallLength,9.8298);close(P.model.width,3.6576);close(P.model.roofHeight,2.3749);close(P.model.groundClearance,.4826);
 close(P.model.hullLength/2+P.model.barrelTip,P.model.overallLength);close(P.massKg,63085.6268196,.001);assert.equal(P.engineHp,1500);
 assert(Object.isFrozen(P.mobility));assert.equal(C.VEHICLE.radius,4.62);assert(C.VEHICLE.radius>Math.hypot(P.model.hullLength/2,P.model.width/2));
});
test('road, cross-country and reverse speed caps are independent',()=>{
 close(C.mobilityLimit('road',0,0)*3.6,67.592448);close(C.mobilityLimit('grass',0,0)*3.6,48.28032);close(C.mobilityLimit('road',0,0,true)*3.6,40.2336);
 assert(C.mobilityLimit('forest',0,0)<C.mobilityLimit('grass',0,0));assert(C.mobilityLimit('forest',0,0,true)<=6.5);
});
test('published grade speed anchors and directional grade limits are respected',()=>{
 close(C.mobilityLimit('road',.1,0),17*.44704);close(C.mobilityLimit('road',.6,0),4.1*.44704);
 assert(C.gradePassable(.59,.39));assert(!C.gradePassable(.61,0));assert(!C.gradePassable(0,.41));
 assert.equal(C.mobilityLimit('grass',0,.41),0);assert(C.mobilityLimit('road',0,.35)<C.mobilityLimit('road',0,0));
});
// Real movement integrator on a deliberately flat synthetic battlefield. This
// isolates the published speed/acceleration conditions from actual DEM grades.
const flatMap=structuredClone(C.MAP);
flatMap.heightmap.data=Buffer.alloc(4000000).toString('base64');
flatMap.terrain.data=Buffer.alloc(1000000,7).toString('base64');
flatMap.features={roads:[],forests:[],fields:[],water:[],waterways:[],trees:[],labels:[],buildings:[]};delete flatMap.navigation;
const holder={exports:{}},profiles=require('../src/vehicle-profiles.js');
const flat=new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',fs.readFileSync(path.join(__dirname,'../src/sim-core.js'),'utf8')+'\nreturn module.exports;')(flatMap,profiles,require('../src/observation.js'),require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),holder);
test('actual integrator reaches 20 mph in 7.2 seconds on level road',()=>{
 const u=flat.makeTank('TEST','TEST',500,1000,0,'blue',undefined,'hold'),s={time:0,units:[u]};assert(flat.issueMove(u,{x:3500,y:1000},false,s.units).ok);
 for(let i=0;i<144;i++)flat.step(s,.05);close(u.speed,20*.44704,.02);
 evidence.push({test:'0-20mph',seconds:s.time,speedMps:u.speed});
 for(let i=0;i<2000;i++)flat.step(s,.05);close(u.speed,42*.44704,.001);assert(u.path.length);evidence.push({test:'road cap',speedKmh:u.speed*3.6});
});
test('actual integrator reaches reverse cap without turning hull around',()=>{
 const u=flat.makeTank('TEST','TEST',3500,1000,0,'blue',undefined,'hold'),s={time:0,units:[u]};assert(flat.issueMove(u,{x:500,y:1000},true,s.units).ok);
 for(let i=0;i<1400;i++)flat.step(s,.05);close(u.speed,25*.44704,.001);close(u.heading,0,.001);assert(u.x<3500);evidence.push({test:'reverse cap',speedKmh:u.speed*3.6});
});
test('CITV eye height drives LOS while weapon reference is not a visibility cut-off',()=>{
 assert.equal(P.sensors.eyeHeight,2.65);assert.equal(C.VEHICLE.eye,2.65);
 assert(P.weapons.mainGun.referenceEngagementRange<P.sensors.observationLimit);assert(P.weapons.mainGun.enabled);
 assert(flat.lineOfSight({x:500,y:1000},{x:3900,y:1000}).visible);assert.equal(flat.lineOfSight({x:500,y:1000},{x:4600,y:1000}).reason,'range');
 assert(P.exposure.hullHeights.every(v=>v<P.exposure.turretHeight));assert(P.exposure.turretHeight<P.model.roofHeight);
});
async function asyncTests(){
 let worker;
 class FakeWorker{constructor(){worker=this;}postMessage(v){this.request=v;}terminate(){this.terminated=true;}reply(v){this.onmessage({data:v});}}
 const platform={Worker:FakeWorker,Blob:class{},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}};
 const client=new Client({}, {compute:(_,o)=>({origin:o,fallback:true})},()=>'',platform);
 const first=client.request({x:1,y:2}),oldId=worker.request.id;client.cancel();assert.equal(await first,null);
 const second=client.request({x:3,y:4}),newId=worker.request.id;worker.reply({id:oldId,result:{wrong:true}});assert(client.pending);
 worker.reply({id:newId,result:{origin:{x:3,y:4}}});assert.deepEqual(await second,{origin:{x:3,y:4}});assert(!client.pending);passed++;console.log('PASS cancelled worker responses cannot replace current selection');
 const third=client.request({x:5,y:6});worker.onerror();assert((await third).fallback);assert(worker.terminated);assert(!client.pending);passed++;console.log('PASS worker failure falls back once and clears the pending request');
 // Execute the actual embedded worker bundle using a Node adapter. This checks
 // offline source ordering, profile availability and structured-clone results.
 const {Worker}=require('worker_threads'),sources=new Map();let serial=0;
 const nodePlatform={Blob:class{constructor(parts){this.code=parts.join('');}},URL:{createObjectURL:b=>{const id='blob:'+(++serial);sources.set(id,b.code);return id;},revokeObjectURL:id=>sources.delete(id)},Worker:class{
   constructor(url){this.worker=new Worker("const {parentPort}=require('worker_threads');const self={postMessage:v=>parentPort.postMessage(v)};parentPort.on('message',v=>self.onmessage({data:v}));\n"+sources.get(url),{eval:true});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.(e));}
   postMessage(v){this.worker.postMessage(v);}terminate(){this.worker.terminate();}
 }};
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),get=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>'))[1];
 const actual=new Client(C,require('../src/visibility.js'),()=>['battlefield-data','vehicle-profiles','vehicle-geometry','observation','fire-control','sim-core','visibility-code'].map(get).join('\n'),nodePlatform);
 try{const result=await actual.request({x:550,y:2750,profileId:'M1A2_1998'});assert.equal(result.range,4000);assert(result.loops.length>10);assert.deepEqual(result.origin,{x:550,y:2750});assert(actual.worker,'Real worker must execute without fallback');passed++;console.log('PASS shipped worker bundle loads active M1A2_1998 and computes 4km visibility offline');}
 finally{actual.worker?.terminate();actual.releaseURL();}
 const report={version:'0.4-WIP11E',passed,failed:0,evidence};fs.writeFileSync(path.join(__dirname,'vehicle-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
asyncTests().catch(error=>{console.error(error);process.exitCode=1;});
