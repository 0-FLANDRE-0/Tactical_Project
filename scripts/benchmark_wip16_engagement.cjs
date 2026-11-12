const fs=require('fs'),path=require('path'),{performance}=require('node:perf_hooks');
const root=process.env.BENCH_ROOT||path.resolve(__dirname,'..'),AI=require(path.join(root,'src/tactical-ai.js')),profile=require(path.join(root,'src/vehicle-profiles.js')).M1A2_1998;
const percentile=(v,p)=>v[Math.min(v.length-1,Math.floor(v.length*p))];
function contact(id,x,identifiedAt){return{key:'contact-'+id,current:true,identified:true,enemyConfirmed:true,wreckConfirmed:false,lastSeen:1,identifiedAt,pose:{x,y:0,heading:0,turret:0},sources:{gunner:{current:id==='C0'}}};}
function measure(count){
  const commands=[];
  const units=Array.from({length:count},(_,i)=>({id:'AI-'+i,x:0,y:0,heading:0,turret:0,speed:4,drive:{velocity:4},goal:{x:500,y:0},path:[{x:500,y:0}],combat:{status:'alive'},fireControl:{ammo:42,autoSuppressed:false},observation:{contacts:{C0:contact('C0',400,1),C1:contact('C1',800,2),C2:contact('C2',1200,3),C3:contact('C3',1600,4)},designation:{status:'idle'},tracking:{status:'idle'}}}));
  const active=d=>d&&['designated','waiting','acquiring','acquired'].includes(d.status);
  const runtime=AI.create({profileOf:()=>profile,move:()=>{throw Error('pathfinding excluded from pure benchmark');},stop:()=>{},suppressAuto:()=>{},settings:{pathBudget:0},
    selectTarget:(u,id,now)=>{const c=u.observation.contacts[id];u.observation.designation={status:'designated',source:'ai',target:id,key:c.key,pose:{...c.pose},startedAt:now};commands.push({unit:u.id,id,now});return true;},clearTarget:()=>true,targetStatus:u=>[u.observation.designation,u.observation.tracking].find(active)||null});
  for(const u of units)runtime.assign(u,{type:'move',policy:'maintain',waypoints:[{x:500,y:0}]},0);
  let now=0;for(let i=0;i<100;i++){now+=.75;runtime.advance(units,.75,now);}
  const before=runtime.aggregate(units),samples=[];
  for(let i=0;i<1000;i++){
    if(i===20)for(const u of units){u.observation.contacts.C0.pose.x=1950;u.observation.contacts.C1.pose.x=50;}
    now+=.75;const start=performance.now();runtime.advance(units,.75,now);samples.push(performance.now()-start);
  }
  samples.sort((a,b)=>a-b);const stats=runtime.aggregate(units),decisions=stats.decisions-before.decisions;
  return{vehicles:count,candidatesPerVehicle:4,warmupDecisionsPerVehicle:100,measuredDecisionsPerVehicle:1000,repetitions:samples.length,simulationDecisionPeriodSeconds:.75,medianMs:percentile(samples,.5),p95Ms:percentile(samples,.95),maxMs:samples.at(-1),decisions,expectedDecisions:count*1000,allVehiclesEvaluated:decisions===count*1000,targetSelections:stats.targetSelections??null,targetSwitches:stats.targetSwitches??null,targetCommands:stats.targetCommands??commands.length,observedCommands:commands.length,pathfindingIncluded:false,losIncluded:false,physicsIncluded:false,renderIncluded:false};
}
const report={version:process.env.BENCH_VERSION||'0.4-WIP16',ref:process.env.BENCH_REF||null,runtime:process.version,cpu:require('os').cpus()[0]?.model||null,clock:'performance.now',fixture:'50/100 AI vehicles, four own current identified contacts each; 100 warmup decisions and 1000 measured 0.75s decisions; geometry changes after measurement decision 20 to exercise a real switch',target:'100 vehicles median <= 1ms',results:[measure(50),measure(100)]};
if(process.env.BENCH_OUT)fs.writeFileSync(process.env.BENCH_OUT,JSON.stringify(report,null,2)+'\n');else{const out=path.join(__dirname,'../tests/releases/WIP16-engagement-benchmark.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
