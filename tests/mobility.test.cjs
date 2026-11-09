const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const profiles=require('../src/vehicle-profiles.js'),Mobility=require('../src/mobility.js'),AI=require('../src/tactical-ai.js'),base=require('./load.cjs')();
const map=structuredClone(base.MAP);map.heightmap.data=Buffer.alloc(4000000).toString('base64');map.terrain.data=Buffer.alloc(1000000,7).toString('base64');map.features={roads:[],forests:[],fields:[],water:[],waterways:[],trees:[],labels:[],buildings:[]};delete map.navigation;
const Core=new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalMobility','TacticalAI','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',fs.readFileSync(path.join(__dirname,'../src/sim-core.js'),'utf8')+'\nreturn module.exports;')(map,profiles,Mobility,require('../src/tactical-ai.js'),require('../src/observation.js'),require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),{exports:{}});
const make=(x=500,heading=0)=>{const u=Core.makeTank('M','MOBILITY',x,1000,heading,'blue',undefined,'hold'),s={time:0,seed:91,units:[u]};return{u,s};};
const tick=(s,n=1)=>{for(let i=0;i<n;i++)Core.step(s,.05);};
function reach(u,s,kmh){for(let i=0;i<4000&&u.speed*3.6<kmh;i++)tick(s);assert(u.speed*3.6>=kmh,`did not reach ${kmh} km/h`);}
const angleDelta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function poseDeviation(before,trace){return{
  maxHeading:Math.max(...trace.map(v=>angleDelta(v.heading,before.heading))),
  maxLateral:Math.max(...trace.map(v=>Math.abs(-(v.x-before.x)*Math.sin(before.heading)+(v.y-before.y)*Math.cos(before.heading))))
};}
function assertStraightTransition(before,trace,label){const pose=poseDeviation(before,trace);assert(pose.maxHeading<1e-10,`${label} heading changed by ${pose.maxHeading}`);assert(pose.maxLateral<1e-8,`${label} drifted laterally by ${pose.maxLateral} m`);return pose;}
function reverseTrace(startKmh){
  const{u,s}=make();assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);reach(u,s,startKmh);
  const before={x:u.x,y:u.y,heading:u.heading,velocity:u.drive.velocity,speed:u.speed};assert(Core.issueMove(u,{x:100,y:1000},true,s.units).ok);
  const trace=[];for(let i=0;i<400;i++){const x=u.x;tick(s);trace.push({t:(i+1)*.05,x:u.x,y:u.y,heading:u.heading,dx:u.x-x,v:u.drive.velocity,mode:u.drive.mode,gear:u.drive.gear});if(u.drive.velocity<-.05)break;}
  return{u,s,before,trace};
}
for(const kmh of [40,60])test(`forward ${kmh} km/h brakes through zero before reverse drive`,()=>{
  const{before,trace}=reverseTrace(kmh);assert(trace[0].dx>0,'first tick must continue forward');assert(trace[0].v>0&&trace[0].v<before.velocity);
  const negative=trace.findIndex(v=>v.v<0);assert(negative>0,'reverse never engaged');assert(trace.slice(0,negative).every(v=>v.v>=0),'velocity crossed without interlock');
  assert(trace.slice(0,negative).some(v=>v.v===0&&v.mode==='direction-wait'),'no stopped settle interval');assert(trace[negative].dx<0);assertStraightTransition(before,trace,`${kmh} km/h forward-to-reverse`);
});
function forwardTrace(startKmh){
  const{u,s}=make(3500);assert(Core.issueMove(u,{x:100,y:1000},true,s.units).ok);reach(u,s,Math.min(startKmh,40));
  // 60 km/h is an explicit overspeed initial condition: the production
  // profile caps reverse at 40.2336 km/h, but the interlock must stay safe if
  // an imported scenario or later profile enters faster than that cap.
  u.drive.velocity=-startKmh/3.6;u.speed=Math.abs(u.drive.velocity);
  const before={x:u.x,y:u.y,heading:u.heading,velocity:u.drive.velocity,speed:u.speed};assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);
  const trace=[];for(let i=0;i<500;i++){const x=u.x;tick(s);trace.push({t:(i+1)*.05,x:u.x,y:u.y,heading:u.heading,dx:u.x-x,v:u.drive.velocity,mode:u.drive.mode,gear:u.drive.gear});if(u.drive.velocity>.05)break;}
  return{u,s,before,trace};
}
for(const kmh of [40,60])test(`reverse ${kmh} km/h brakes through zero before forward drive`,()=>{
  const{before,trace}=forwardTrace(kmh);assert(trace[0].dx<0,'first tick must continue backward');assert(trace[0].v<0&&trace[0].v>before.velocity);
  const positive=trace.findIndex(v=>v.v>0);assert(positive>0,'forward drive never engaged');assert(trace.slice(0,positive).every(v=>v.v<=0),'velocity crossed without interlock');
  assert(trace.slice(0,positive).some(v=>v.v===0&&v.mode==='direction-wait'),'no stopped settle interval');assert(trace[positive].dx>0);assertStraightTransition(before,trace,`${kmh} km/h reverse-to-forward`);
});
test('a new route starts steering only after its requested direction connects',()=>{
  const{u,s}=make();assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);reach(u,s,40);const heading=u.heading;
  assert(Core.issueMove(u,{x:100,y:1200},true,s.units).ok);const waiting=[];for(let i=0;i<300;i++){tick(s);waiting.push(u.heading);if(u.drive.selectedDirection===-1&&!u.drive.pendingDirection)break;}
  assert(waiting.length>1&&waiting.every(v=>angleDelta(v,heading)<1e-10),'interlock steered toward the new route');assert.equal(u.drive.selectedDirection,-1);
  for(let i=0;i<10;i++)tick(s);assert(angleDelta(u.heading,heading)>1e-4,'connected reverse range never started route steering');
});
test('a cancelled range change leaves no stale request',()=>{
  const{u,s}=make(3500);assert(Core.issueMove(u,{x:200,y:1000},true,s.units).ok);reach(u,s,30);assert(u.drive.velocity<0);
  assert(Core.issueMove(u,{x:3900,y:1000},false,s.units).ok);tick(s,4);assert(u.drive.pendingDirection===1);assert(Core.issueMove(u,{x:100,y:1000},true,s.units).ok);tick(s);
  assert.equal(u.drive.pendingDirection,0);assert.equal(u.drive.requestedDirection,-1);tick(s,80);assert(u.drive.velocity<0&&!u.drive.pendingDirection);
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
test('red vehicles use the same drivetrain and ordinary fixtures have no implicit AI mission',()=>{const u=Core.makeTank('R','RED',500,1000,0,'red',undefined,'hold'),s={time:0,seed:9,units:[u]};assert.equal(require('../src/tactical-ai.js').inspect(u),null);assert(Core.issueMove(u,{x:900,y:1000},false,s.units).ok);tick(s,80);assert(u.x>500&&u.drive.velocity>0);});
test('core mission survives an engagement stop while a player command cancels stale AI routing',()=>{const u=Core.makeTank('R','RED',500,1000,0,'red',undefined,'hold'),s={time:0,seed:9,units:[u]};const assigned=Core.assignMission(s,u,{id:'core-patrol',type:'patrol',policy:'maintain',loop:true,waypoints:[{x:900,y:1000},{x:500,y:1000}]});assert.equal(assigned.mission.status,'active');tick(s,40);assert(u.x>500);assert(Core.issueMove(u,{x:700,y:1200},false,s.units).ok);assert.equal(require('../src/tactical-ai.js').inspect(u).mission.status,'cancelled');tick(s,40);assert.equal(require('../src/tactical-ai.js').inspect(u).mission.status,'cancelled');});
test('actual core keeps a completed mission completed through engagement and contact loss',()=>{const u=Core.makeTank('R','RED',500,1000,0,'red',undefined,'hold'),target=Core.makeTank('B','BLUE',700,1000,Math.PI,'blue',undefined,'hold'),s={time:0,seed:31,units:[u,target]};Core.guard(s,u,'commander',{x:target.x,y:target.y});Core.guard(s,u,'gunner',{x:target.x,y:target.y});Core.assignMission(s,u,{id:'done',type:'move',policy:'halt',waypoints:[{x:u.x,y:u.y}]});tick(s,120);let state=AI.inspect(u);assert.equal(state.mission.status,'completed');assert(['braking','engaging'].includes(state.behavior));assert(Object.values(u.observation.contacts).some(c=>c.current&&c.identified));target.x=3500;target.y=3500;tick(s,120);state=AI.inspect(u);assert.equal(state.mission.status,'completed');assert.equal(state.behavior,'completed');assert.equal(state.counters.resumes,0);assert.equal(u.goal,null);assert.deepEqual(u.path,[]);});
test('actual core reassignment clears halt suppression and applies maintain or capable-auto without changing hold mode',()=>{const u=Core.makeTank('R2','RED',500,1000,0,'red',undefined,'hold'),target=Core.makeTank('B2','BLUE',700,1000,Math.PI,'blue',undefined,'hold'),s={time:0,seed:32,units:[u,target]};Core.guard(s,u,'commander',{x:target.x,y:target.y});Core.guard(s,u,'gunner',{x:target.x,y:target.y});tick(s,100);assert(Object.values(u.observation.contacts).some(c=>c.current&&c.identified));Core.assignMission(s,u,{type:'move',policy:'halt',waypoints:[{x:900,y:1000}]});assert(u.fireControl.autoSuppressed);Core.assignMission(s,u,{type:'move',policy:'maintain',waypoints:[{x:950,y:1000}]});assert(!u.fireControl.autoSuppressed);assert.equal(u.fireControl.fireMode,'hold');Core.assignMission(s,u,{type:'move',policy:'halt',waypoints:[{x:1000,y:1000}]});assert(u.fireControl.autoSuppressed);Core.assignMission(s,u,{type:'move',policy:'auto',stopPreference:'maintain',waypoints:[{x:1050,y:1000}]});assert(!u.fireControl.autoSuppressed);assert.equal(u.fireControl.fireMode,'hold');assert.equal(AI.inspect(u).mission.revision,4);});
test('actual core reacquisition keeps the original paused mission resumable after the second loss',()=>{const u=Core.makeTank('R3','RED',500,1000,0,'red',undefined,'hold'),target=Core.makeTank('B3','BLUE',700,1000,Math.PI,'blue',undefined,'hold'),s={time:0,seed:33,units:[u,target]};Core.guard(s,u,'commander',{x:target.x,y:target.y});Core.guard(s,u,'gunner',{x:target.x,y:target.y});Core.assignMission(s,u,{id:'recontact',type:'patrol',policy:'halt',loop:true,waypoints:[{x:900,y:1000},{x:500,y:1000}]});for(let i=0;i<160&&!['braking','engaging'].includes(AI.inspect(u).behavior);i++)tick(s);let state=AI.inspect(u),index=state.mission.index;assert.equal(state.mission.status,'paused');assert.equal(state.resumeStatus,'active');target.x=3500;target.y=3500;for(let i=0;i<60&&AI.inspect(u).behavior!=='observe';i++)tick(s);state=AI.inspect(u);assert.equal(state.behavior,'observe');assert.equal(state.resumeStatus,'active');target.x=700;target.y=1000;for(let i=0;i<80&&!['braking','engaging'].includes(AI.inspect(u).behavior);i++)tick(s);state=AI.inspect(u);assert.equal(state.mission.status,'paused');assert.equal(state.resumeStatus,'active');target.x=3500;target.y=3500;for(let i=0;i<180&&AI.inspect(u).counters.resumes<1;i++)tick(s);state=AI.inspect(u);assert.equal(state.counters.resumes,1);assert.equal(state.mission.status,'active');assert.equal(state.mission.index,index);assert(u.goal||u.path.length);tick(s,40);assert.equal(AI.inspect(u).counters.resumes,1);});
