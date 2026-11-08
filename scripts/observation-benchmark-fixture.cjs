// Shared deterministic fixture for isolated before/after processes. Kinematic
// endpoint generation is excluded from the CPU step timer, as in WIP07A.
const {performance}=require('perf_hooks'),crypto=require('crypto');
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function run(C,{captureState=false,steps=100,warmup=20}={}){
 const cases=[];
 for(const mode of ['stationary','moving'])for(const count of [50,100]){
  const units=Array.from({length:count},(_,i)=>{const p=C.legalNear(200+(i%10)*360,300+Math.floor(i/10)*320);return C.makeTank('B'+String(i).padStart(3,'0'),'fixture',p.x,p.y,(i%8)*Math.PI/4,i%2?'red':'blue',undefined,'hold');});
  const s={time:0,seed:407,units},origins=units.map(u=>({x:u.x,y:u.y}));let moved=0,blocked=0;
  function trajectory(){if(mode!=='moving')return;const now=s.time+.05;
   for(const[i,u]of units.entries()){
    const base=origins[i],phase=C.hash(i,407)*Math.PI*2,x=base.x+12*(Math.sin(now*.4+phase)-Math.sin(phase)),y=base.y+8*(Math.cos(now*.3+phase)-Math.cos(phase));
    if(C.passable(x,y)){if(x!==u.x||y!==u.y)moved++;u.x=x;u.y=y;}else blocked++;
   }
  }
  for(let i=0;i<warmup;i++){trajectory();C.step(s,.05);}moved=0;blocked=0;
  const times=[],before=C.observationStats(s);
  for(let i=0;i<steps;i++){trajectory();const start=performance.now();C.step(s,.05);times.push(performance.now()-start);}
  const after=C.observationStats(s),reads=[];
  for(let i=0;i<100;i++){const start=performance.now();C.contacts(s);reads.push(performance.now()-start);}
  const sorted=[...times].sort((a,b)=>a-b),state=JSON.stringify({scenario:s,contacts:C.contacts(s),stats:C.observationStats(s)});
  cases.push({mode,count,blue:count/2,red:count/2,steps,simulatedSeconds:steps*.05,medianStepMs:median(times),p95StepMs:sorted[Math.min(steps-1,Math.floor(steps*.95))],maxStepMs:Math.max(...times),medianTeamReadMs:median(reads),queries:after.queries-before.queries,candidatePairs:after.candidates-before.candidates,geometryRequests:after.samples-before.samples,exactRayQueries:after.rayQueries-before.rayQueries,unchangedRayCacheHits:after.rayCacheHits-before.rayCacheHits,movedEndpoints:moved,blockedEndpointUpdates:blocked,origins,finalStateSHA256:crypto.createHash('sha256').update(state).digest('hex'),...(captureState?{state}:{} )});
 }
 return cases;
}
module.exports={run,median};
