const fs=require('fs'),path=require('path'),{performance}=require('node:perf_hooks');
const AI=require('../src/tactical-ai.js'),profile=require('../src/vehicle-profiles.js').M1A2_1998;
const percentile=(v,p)=>v[Math.min(v.length-1,Math.floor(v.length*p))];
function measure(count){
  const units=Array.from({length:count},(_,i)=>({id:'AI-'+i,x:0,y:0,speed:4,drive:{velocity:4},goal:{x:500,y:0},path:[{x:500,y:0}],combat:{status:'alive'},fireControl:{ammo:42},observation:{contacts:{}}}));
  const runtime=AI.create({profileOf:()=>profile,move:()=>{throw Error('pathfinding excluded from pure benchmark');},stop:()=>{},suppressAuto:()=>{},settings:{pathBudget:0}});
  for(const u of units)runtime.assign(u,{type:'move',policy:'maintain',waypoints:[{x:500,y:0}]},0);
  let now=0;for(let i=0;i<100;i++){now+=.75;runtime.advance(units,.75,now);}
  const samples=[];for(let i=0;i<1000;i++){now+=.75;const start=performance.now();runtime.advance(units,.75,now);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);
  const stats=runtime.aggregate(units);return{vehicles:count,repetitions:samples.length,medianMs:percentile(samples,.5),p95Ms:percentile(samples,.95),maxMs:samples.at(-1),decisions:stats.decisions,pathfindingIncluded:false,losIncluded:false,physicsIncluded:false,renderIncluded:false};
}
const report={version:'0.4-WIP14',runtime:process.version,clock:'performance.now',fixedInput:true,target:'100 vehicles median <= 1ms',results:[measure(50),measure(100)]};
const out=path.join(__dirname,'../tests/releases/WIP14-ai-benchmark.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
