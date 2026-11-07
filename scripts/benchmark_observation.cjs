/* Observation CPU, not FPS. Actual shipped map; both teams observe.
 * Kinematic fixture trajectories deliberately avoid tactical AI/navigation. */
const {performance}=require('perf_hooks'),fs=require('fs'),os=require('os'),C=require('../tests/load.cjs')();
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)],cases=[];
function make(count){
 const units=Array.from({length:count},(_,i)=>{const p=C.legalNear(200+(i%10)*360,300+Math.floor(i/10)*320);return C.makeTank('B'+String(i).padStart(3,'0'),'fixture',p.x,p.y,(i%8)*Math.PI/4,i%2?'red':'blue');});
 return{time:0,seed:407,units};
}
for(const mode of ['stationary','moving'])for(const count of [50,100]){
 const s=make(count),origins=s.units.map(u=>({x:u.x,y:u.y}));let moved=0,blocked=0;
 function trajectory(){if(mode!=='moving')return;const now=s.time+.05;
  for(const[i,u]of s.units.entries()){
   const base=origins[i],phase=C.hash(i,407)*Math.PI*2,x=base.x+12*(Math.sin(now*.4+phase)-Math.sin(phase)),y=base.y+8*(Math.cos(now*.3+phase)-Math.cos(phase));
   if(C.passable(x,y)){if(x!==u.x||y!==u.y)moved++;u.x=x;u.y=y;}else blocked++;
  }
 }
 for(let i=0;i<20;i++){trajectory();C.step(s,.05);}moved=0;blocked=0;
 const times=[],before=C.observationStats(s);
 for(let i=0;i<100;i++){trajectory();const start=performance.now();C.step(s,.05);times.push(performance.now()-start);}
 const after=C.observationStats(s),reads=[];for(let i=0;i<100;i++){const start=performance.now();C.contacts(s);reads.push(performance.now()-start);}
 const sorted=[...times].sort((a,b)=>a-b);
 cases.push({mode,count,blue:count/2,red:count/2,steps:100,simulatedSeconds:5,medianStepMs:median(times),p95StepMs:sorted[95],maxStepMs:Math.max(...times),medianTeamReadMs:median(reads),queries:after.queries-before.queries,candidatePairs:after.candidates-before.candidates,geometryRequests:after.samples-before.samples,exactRayQueries:after.rayQueries-before.rayQueries,unchangedRayCacheHits:after.rayCacheHits-before.rayCacheHits,movedEndpoints:moved,blockedEndpointUpdates:blocked,origins});
}
const result={version:'0.4-WIP07A',date:'2026-11-07',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,mapHash:C.MAP.meta.mapHash,seed:407,
 fixture:'legalNear grid x=200+(i%10)*360,y=300+floor(i/10)*320; heading=(i%8)*pi/4; alternating teams; both teams sense',
 trajectory:'phase=hash(i,407)*2pi; x=origin.x+12*(sin(t*0.4+phase)-sin(phase)); y=origin.y+8*(cos(t*0.3+phase)-cos(phase)); static passability checked; blocked endpoint stays; generation excluded from timing',
 warmupSteps:20,stepSeconds:.05,queryHz:10,notes:'100 CPU fixed steps after 20 warmup. Includes idle mobility, actual slew, spatial filters, exact LOS, bounded ray reuse, independent evidence, handoffs/own target and team merge. Not whole-game FPS. Moving is deterministic observation fixture, not tactical AI or pathfinding.',cases};
fs.writeFileSync('tests/releases/WIP07A-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,cases:cases.map(({origins,...c})=>c)},null,2));
