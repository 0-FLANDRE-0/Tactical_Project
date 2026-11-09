/* Fixed-step fire/readiness state cost only. Excludes LOS, observation,
 * pathfinding, mobility, effects and rendering. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{performance}=require('node:perf_hooks');
const root=path.resolve(process.env.TACTICAL_BENCH_ROOT||path.join(__dirname,'..'));
const F=require(path.join(root,'src/fire-control.js')),P=require(path.join(root,'src/vehicle-profiles.js')).M1A2_1998;
const percentile=(values,p)=>values[Math.min(values.length-1,Math.floor(values.length*p))];
function measure(count){
 const samples=[];for(let round=0;round<40;round++){
  const units=Array.from({length:count},(_,i)=>({id:'U'+i,team:i%2?'red':'blue',x:i,y:0,heading:0,turret:0,speed:0})),runtime=F.create({profileOf:()=>P,freshSight:()=>null,seed:7});
  for(const[i,u]of units.entries()){const s=F.init(u,P,'hold');if(P.fireControl.readiness&&i%3===0){s.loaded=false;s.ammo=41;s.reloadProgress=(i%9)/10;s.fatigueSeconds=i%2?2:5;s.shockSeconds=i%4?1:5;}}
  for(let i=0;i<20;i++)runtime.step(units,.05,(i+1)*.05);
  const start=performance.now();for(let i=20;i<220;i++)runtime.step(units,.05,(i+1)*.05);samples.push(performance.now()-start);
 }
 samples.sort((a,b)=>a-b);return{vehicles:count,simulationSeconds:10,ticks:200,rounds:40,medianMs:percentile(samples,.5),p95Ms:percentile(samples,.95),perTickMedianMs:percentile(samples,.5)/200,perTickP95Ms:percentile(samples,.95)/200};
}
const report={version:P.fireControl.readiness?'0.4-WIP15':'0.4-WIP14-main-baseline',node:process.version,cpu:os.cpus()[0]?.model,fixture:'50/100 independent fire-control states; one third begin reloading when the profile supports readiness; 1s warmup + 10s/200 fixed ticks; 40 rounds',scope:'Fire-control/readiness state only; no LOS, observation, pathfinding, mobility, effects or render.',results:[measure(50),measure(100)]};
if(!process.argv.includes('--stdout')){const out=path.join(root,'tests/releases/WIP15-readiness-benchmark.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
