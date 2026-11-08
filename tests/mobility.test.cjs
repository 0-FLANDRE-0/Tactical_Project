const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const profiles=require('../src/vehicle-profiles.js'),Mobility=require('../src/mobility.js'),base=require('./load.cjs')();
const map=structuredClone(base.MAP);map.heightmap.data=Buffer.alloc(4000000).toString('base64');map.terrain.data=Buffer.alloc(1000000,7).toString('base64');map.features={roads:[],forests:[],fields:[],water:[],waterways:[],trees:[],labels:[],buildings:[]};delete map.navigation;
const Core=new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalMobility','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',fs.readFileSync(path.join(__dirname,'../src/sim-core.js'),'utf8')+'\nreturn module.exports;')(map,profiles,Mobility,require('../src/observation.js'),require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),{exports:{}});
const make=(x=500,heading=0)=>{const u=Core.makeTank('M','MOBILITY',x,1000,heading,'blue',undefined,'hold'),s={time:0,seed:91,units:[u]};return{u,s};};
const tick=(s,n=1)=>{for(let i=0;i<n;i++)Core.step(s,.05);};
function reach(u,s,kmh){for(let i=0;i<4000&&u.speed*3.6<kmh;i++)tick(s);assert(u.speed*3.6>=kmh,`did not reach ${kmh} km/h`);}
function reverseTrace(startKmh){
  const{u,s}=make();assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);reach(u,s,startKmh);
  const before={x:u.x,velocity:u.drive.velocity,speed:u.speed};assert(Core.issueMove(u,{x:100,y:1000},true,s.units).ok);
  const trace=[];for(let i=0;i<400;i++){const x=u.x;tick(s);trace.push({t:(i+1)*.05,dx:u.x-x,v:u.drive.velocity,mode:u.drive.mode,gear:u.drive.gear});if(u.drive.velocity<-.05)break;}
  return{u,s,before,trace};
}
for(const kmh of [40,60])test(`forward ${kmh} km/h brakes through zero before reverse drive`,()=>{
  const{before,trace}=reverseTrace(kmh);assert(trace[0].dx>0,'first tick must continue forward');assert(trace[0].v>0&&trace[0].v<before.velocity);
  const negative=trace.findIndex(v=>v.v<0);assert(negative>0,'reverse never engaged');assert(trace.slice(0,negative).every(v=>v.v>=0),'velocity crossed without interlock');
  assert(trace.slice(0,negative).some(v=>v.v===0&&v.mode==='direction-wait'),'no stopped settle interval');assert(trace[negative].dx<0);
});
test('reverse-to-forward transition and a cancelled range change leave no stale request',()=>{
  const{u,s}=make(3500);assert(Core.issueMove(u,{x:200,y:1000},true,s.units).ok);reach(u,s,30);assert(u.drive.velocity<0);
  assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);let sawZero=false;for(let i=0;i<300&&u.drive.velocity<=0;i++){tick(s);sawZero||=u.drive.velocity===0;}assert(sawZero&&u.drive.velocity>0);
  reach(u,s,10);assert(Core.issueMove(u,{x:100,y:1000},true,s.units).ok);tick(s,4);assert(u.drive.pendingDirection===-1);assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);tick(s);
  assert.equal(u.drive.pendingDirection,0);assert.equal(u.drive.requestedDirection,1);tick(s,80);assert(u.drive.velocity>0&&!u.drive.pendingDirection);
});
test('stop command and normal arrival use finite braking without a forced speed reset',()=>{
  const a=make();assert(Core.issueMove(a.u,{x:3900,y:1000},false,a.s.units).ok);reach(a.u,a.s,40);const x=a.u.x,v=a.u.drive.velocity;Core.stop(a.u);tick(a.s);
  assert(a.u.x>x&&a.u.drive.velocity>0&&a.u.drive.velocity<v);let stoppedAt=0;for(let i=0;i<300;i++){tick(a.s);if(!a.u.speed){stoppedAt=(i+2)*.05;break;}}assert(stoppedAt>2&&stoppedAt<6);
  const b=make();assert(Core.issueMove(b.u,{x:600,y:1000},false,b.s.units).ok);let priorPath=true,arrivalSpeed=null,arrivalAcceleration=null;
  for(let i=0;i<2000&&priorPath;i++){priorPath=!!b.u.path.length;const before=b.u.speed;tick(b.s);if(priorPath&&!b.u.path.length){arrivalSpeed=before;arrivalAcceleration=b.u.drive.lastAcceleration;}}
  assert.notEqual(arrivalSpeed,null);assert(arrivalSpeed>0&&arrivalSpeed<=profiles.M1A2.mobility.powertrain.arrivalSpeed,'arrival must be decided from a finite low speed');assert(Math.abs(arrivalAcceleration)<=profiles.M1A2.mobility.brakeDeceleration+1e-9);tick(b.s,10);assert.equal(b.u.speed,0);assert(Math.hypot(b.u.x-600,b.u.y-1000)<=1.2);
});
function pure(profile,seconds=8){const d=Mobility.create();for(let i=0;i<seconds/.05;i++)Mobility.step(d,{direction:1,targetSpeed:profile.mobility.roadSpeed},profile,.05);return d;}
test('profile mass and engine output have causal acceleration effects',()=>{
  const normal=structuredClone(profiles.M1A2),heavy=structuredClone(profiles.M1A2),weak=structuredClone(profiles.M1A2);heavy.massKg*=1.35;weak.engineHp*=.65;
  const a=pure(normal,6),b=pure(heavy,6),c=pure(weak,6);assert(a.velocity>b.velocity);assert(a.velocity>c.velocity);assert([a,b,c].every(v=>Number.isFinite(v.velocity)));
});
test('four forward and two reverse automatic ranges shift with hysteresis and no speed jump',()=>{
  const p=profiles.M1A2,d=Mobility.create(),seen=new Set(),speeds=[];for(let i=0;i<900;i++){const before=d.velocity;Mobility.step(d,{direction:1,targetSpeed:p.mobility.roadSpeed},p,.05);seen.add(d.gear);speeds.push(d.velocity);assert(d.velocity+1e-9>=before);}
  assert.deepEqual([...seen],[1,2,3,4]);assert(d.shiftCount===3);assert(speeds.every(Number.isFinite));
  const r=Mobility.create(),reverseSeen=new Set();for(let i=0;i<900;i++){Mobility.step(r,{direction:-1,targetSpeed:p.mobility.reverseSpeed},p,.05);reverseSeen.add(r.gear);}assert.deepEqual([...reverseSeen],[1,2]);assert.equal(r.shiftCount,1);
  const held=d.shiftCount;for(let i=0;i<200;i++)Mobility.step(d,{direction:1,targetSpeed:13},p,.05);assert(d.shiftCount-held<5,'range chatter');
});
test('fixed tick batching is deterministic and steering changes continuously with speed',()=>{
  const p=profiles.M1A2,a=Mobility.create(),b=Mobility.create();for(let frame=0;frame<100;frame++)for(let i=0;i<2;i++)Mobility.step(a,{direction:1,targetSpeed:15},p,.05);for(let frame=0;frame<50;frame++)for(let i=0;i<4;i++)Mobility.step(b,{direction:1,targetSpeed:15},p,.05);
  assert.deepEqual(a,b);assert.equal(Mobility.turnRate(0,p),p.mobility.pivotRate);assert(Mobility.turnRate(18,p)<Mobility.turnRate(4,p));
});
test('destroyed vehicle clears drivetrain and cannot restart',()=>{
  const{u,s}=make();assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);tick(s,40);u.combat.status='destroyed';tick(s);assert.equal(u.speed,0);assert.equal(u.drive.velocity,0);assert.equal(u.drive.gear,0);assert(!Core.issueMove(u,{x:1000,y:1000},false,s.units).ok);
});
