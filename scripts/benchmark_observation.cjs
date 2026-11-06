/* CPU fixture, not FPS. Real shipped map + exact nine-sample LOS, all units
 * stationary on a reproducible grid. Both teams observe; terrain not modified. */
const {performance}=require('perf_hooks'),fs=require('fs'),C=require('../tests/load.cjs')();
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const cases=[];
for(const count of [50,100]){
 const make=()=>{const units=Array.from({length:count},(_,i)=>C.makeTank('B'+String(i).padStart(3,'0'),'fixture',200+(i%10)*360,300+Math.floor(i/10)*320,(i%8)*Math.PI/4,i%2?'red':'blue'));return{time:0,seed:407,units};};
 const s=make();for(let i=0;i<20;i++)C.step(s,.05);
 const times=[],before=C.observationStats(s);for(let i=0;i<100;i++){const start=performance.now();C.step(s,.05);times.push(performance.now()-start);}
 const after=C.observationStats(s),reads=[];for(let i=0;i<100;i++){const start=performance.now();C.contacts(s);reads.push(performance.now()-start);}
 const sorted=[...times].sort((a,b)=>a-b);
 cases.push({count,blue:count/2,red:count/2,steps:100,simulatedSeconds:5,medianStepMs:median(times),p95StepMs:sorted[95],maxStepMs:Math.max(...times),medianTeamReadMs:median(reads),queries:after.queries-before.queries,candidatePairs:after.candidates-before.candidates,geometryRequests:after.samples-before.samples,exactRayQueries:after.rayQueries-before.rayQueries,unchangedRayCacheHits:after.rayCacheHits-before.rayCacheHits});
}
const result={node:process.version,platform:process.platform,arch:process.arch,mapHash:C.MAP.meta.mapHash,seed:407,fixture:'grid: x=200+(i%10)*360; y=300+floor(i/10)*320; heading=(i%8)*pi/4; teams alternate; stationary; both teams sense',warmupSteps:20,stepSeconds:.05,queryHz:10,notes:'One run of 100 timed fixed steps after 20 warmup. Includes control, spatial filtering, exact terrain LOS, evidence, team merge and mobility idle. Contacts read is detached snapshot creation. Not comparable to old per-frame display loop numbers; not FPS or mobile performance.',cases};
fs.writeFileSync('tests/releases/WIP07-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
