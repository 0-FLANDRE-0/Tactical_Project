const test=require('node:test'),assert=require('node:assert/strict'),performance=require('node:perf_hooks').performance;
const AI=require('../src/tactical-ai.js'),Profiles=require('../src/vehicle-profiles.js');
const baseProfile=Profiles.M1A2_1998;
function unit(id='R1'){
  return{id,team:'red',x:0,y:0,speed:0,drive:{velocity:0},path:[],goal:null,combat:{status:'alive'},fireControl:{ammo:42,autoSuppressed:false},observation:{contacts:{}}};
}
function contact(u,key='B1'){
  u.observation.contacts[key]={key,current:true,identified:true,enemyConfirmed:true,wreckConfirmed:false,lastSeen:1,pose:{x:100,y:0}};
}
function harness(profile=baseProfile,settings={}){
  const calls={move:[],stop:[],suppress:[],events:[]};
  const runtime=AI.create({profileOf:()=>profile,settings,move:(u,p,reverse)=>{calls.move.push({id:u.id,p:{...p},reverse});u.goal={x:p.x,y:p.y};u.path=[{x:p.x,y:p.y}];return{ok:true,visits:7};},stop:u=>{calls.stop.push(u.id);u.goal=null;u.path=[];u.drive.velocity=0;u.speed=0;},suppressAuto:(u,value)=>{calls.suppress.push(value);u.fireControl.autoSuppressed=value;},onEvent:e=>calls.events.push(e)});
  const tick=(units,seconds,start=0)=>{let now=start;for(let i=0;i<Math.round(seconds/.05);i++){now+=.05;runtime.advance(units,.05,now);}return now;};
  return{runtime,calls,tick};
}
test('mission state is private, versioned and explicit player override prevents stale resume',()=>{
  const u=unit(),h=harness();h.runtime.assign(u,{id:'patrol',type:'patrol',policy:'maintain',loop:true,waypoints:[{x:100,y:0},{x:200,y:0}]},0);
  const s=h.runtime.inspect(u);assert.equal(s.mission.revision,1);assert.equal(s.mission.status,'active');assert(!JSON.stringify(u).includes('patrol'));
  assert(AI.override(u,'manual-move'));assert.equal(h.runtime.inspect(u).mission.status,'cancelled');h.tick([u],3);assert.equal(h.calls.move.length,0);
});
test('move and patrol use the route callback, preserve waypoint order and avoid duplicate requests',()=>{
  const u=unit('R2'),h=harness(baseProfile,{decisionPeriod:.5,pathBudget:1});h.runtime.assign(u,{id:'route',type:'patrol',policy:'maintain',loop:true,waypoints:[{x:20,y:0},{x:40,y:0}]},0);
  let now=h.tick([u],1);assert.equal(h.calls.move.length,1);now=h.tick([u],1,now);assert.equal(h.calls.move.length,1);
  u.x=20;u.goal=null;u.path=[];now=h.tick([u],.6,now);assert.equal(h.runtime.inspect(u).mission.index,1);assert.equal(h.calls.move.length,2);assert.deepEqual(h.calls.move[1].p,{x:40,y:0,reverse:false});
});
test('failed paths respect the shared budget and per-vehicle retry interval',()=>{const units=[unit('F'),unit('F'),unit('F')],calls=[];const runtime=AI.create({profileOf:()=>baseProfile,move:u=>{calls.push(u);return{ok:false,reason:'blocked'};},stop:()=>{},suppressAuto:()=>{},settings:{decisionPeriod:.5,pathBudget:2,pathRetry:2}});for(const u of units)runtime.assign(u,{type:'move',policy:'maintain',waypoints:[{x:100,y:0}]},0);let now=0;while(!calls.length){now+=.05;runtime.advance(units,.05,now);}assert.equal(calls.length,2);const first=now;while(now<first+.55){now+=.05;runtime.advance(units,.05,now);}assert.equal(calls.length,3);while(now<first+1.5){now+=.05;runtime.advance(units,.05,now);}assert.equal(calls.length,3);while(now<first+2.6){now+=.05;runtime.advance(units,.05,now);}assert(calls.length>=5&&calls.length<=6);assert(runtime.aggregate(units).pathFailures===calls.length);});
test('maintain keeps moving while halt pauses then resumes the same mission once after observation hold',()=>{
  const moving=unit('M'),halted=unit('H'),h=harness(baseProfile,{decisionPeriod:.5,lossGrace:.5,observationHold:.5});
  for(const [u,policy] of [[moving,'maintain'],[halted,'halt']]){h.runtime.assign(u,{type:'patrol',policy,loop:true,waypoints:[{x:100,y:0},{x:200,y:0}]},0);contact(u);}
  let now=h.tick([moving,halted],1);assert.equal(h.calls.stop.filter(v=>v==='M').length,0);assert.equal(h.calls.stop.filter(v=>v==='H').length,1);assert.equal(h.runtime.inspect(halted).mission.index,0);assert(h.runtime.inspect(halted).behavior==='engaging');
  halted.observation.contacts.B1.current=false;now=h.tick([moving,halted],1.8,now);const state=h.runtime.inspect(halted);assert.equal(state.counters.resumes,1);assert.equal(state.mission.index,0);assert.equal(state.mission.status,'active');assert.equal(h.calls.stop.filter(v=>v==='H').length,1);
  h.tick([moving,halted],1,now);assert.equal(h.runtime.inspect(halted).counters.resumes,1);
});
test('completed mission can engage but contact loss never revives its exhausted waypoint',()=>{const u=unit('DONE'),h=harness(baseProfile,{decisionPeriod:.5,lossGrace:.5,observationHold:.5});h.runtime.assign(u,{type:'move',policy:'halt',waypoints:[{x:0,y:0}]},0);let now=h.tick([u],.6);let state=h.runtime.inspect(u);assert.equal(state.mission.status,'completed');assert.equal(state.mission.index,1);contact(u);now=h.tick([u],1,now);state=h.runtime.inspect(u);assert.equal(state.mission.status,'completed');assert(['braking','engaging'].includes(state.behavior));u.observation.contacts.B1.current=false;h.tick([u],1.8,now);state=h.runtime.inspect(u);assert.equal(state.mission.status,'completed');assert.equal(state.behavior,'completed');assert.equal(state.counters.resumes,0);assert.equal(h.calls.move.length,0);});
test('reassignment clears old fire-control suppression and immediately applies the new policy without changing auto/hold',()=>{const u=unit('REASSIGN'),h=harness();u.fireControl.fireMode='hold';contact(u);h.runtime.assign(u,{type:'move',policy:'halt',waypoints:[{x:100,y:0}]},0);assert(u.fireControl.autoSuppressed);h.runtime.assign(u,{type:'move',policy:'maintain',waypoints:[{x:200,y:0}]},0);assert(!u.fireControl.autoSuppressed);assert.equal(u.fireControl.fireMode,'hold');h.runtime.assign(u,{type:'move',policy:'halt',waypoints:[{x:300,y:0}]},0);assert(u.fireControl.autoSuppressed);h.runtime.assign(u,{type:'move',policy:'auto',stopPreference:'maintain',waypoints:[{x:400,y:0}]},0);assert(!u.fireControl.autoSuppressed);assert.equal(u.fireControl.fireMode,'hold');assert.deepEqual(h.calls.suppress,[true,false,true,false]);});
test('auto policy follows vehicle capability and explicit stop preference',()=>{
  const incapable=structuredClone(baseProfile);incapable.fireControl.movement.fireOnMove=false;
  for(const [profile,preference,expected] of [[baseProfile,'maintain',0],[baseProfile,'halt',1],[incapable,'maintain',1]]){
    const u=unit('auto-'+expected+'-'+preference),h=harness(profile,{decisionPeriod:.5});h.runtime.assign(u,{type:'move',policy:'auto',stopPreference:preference,waypoints:[{x:100,y:0}]},0);contact(u);h.tick([u],1);assert.equal(h.calls.stop.length,expected);
  }
});
test('AI decisions depend on own contact copies, not hidden target coordinates, HP or commands',()=>{
  const run=hidden=>{const u=unit('privacy'),h=harness(baseProfile,{decisionPeriod:.5});h.runtime.assign(u,{type:'move',policy:'halt',waypoints:[{x:100,y:0}]},0);contact(u);const target={x:hidden.x,y:hidden.y,hp:hidden.hp,goal:hidden.goal};h.tick([u],2);return{state:h.runtime.inspect(u),calls:h.calls,target};};
  const a=run({x:10,y:20,hp:1,goal:{x:7,y:8}}),b=run({x:3900,y:3700,hp:9999,goal:null});delete a.target;delete b.target;assert.deepEqual(a,b);
});
test('destroyed units cancel mission and distributed phases keep a 100-unit decision batch lightweight',()=>{
  const units=Array.from({length:100},(_,i)=>unit('P'+i)),h=harness(baseProfile,{decisionPeriod:.75,pathBudget:0});for(const u of units)h.runtime.assign(u,{type:'move',policy:'maintain',waypoints:[{x:100,y:0}]},0);
  const phases=new Set(units.map(u=>h.runtime.inspect(u).nextThinkAt.toFixed(2)));assert(phases.size>5);
  for(let warm=0;warm<20;warm++)h.runtime.advance(units,.05,.05*warm);
  const samples=[];for(let i=0;i<101;i++){const start=performance.now();h.runtime.advance(units,.05,2+i*.75);if(i)samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);assert(samples[49]<1,`median ${samples[49].toFixed(3)}ms`);
  units[0].combat.status='destroyed';h.runtime.advance(units,.05,100);assert.equal(h.runtime.inspect(units[0]).mission.status,'destroyed');
});
