/* Synthetic impact-state CPU load. This is not an FPS, ballistics or tactical
 * AI benchmark; it measures already-resolved impact application only. */
const fs=require('fs'),os=require('os'),{performance}=require('perf_hooks');
const Combat=require('../src/combat-state.js'),Profiles=require('../src/vehicle-profiles.js'),profile=Profiles.M1A2_1998;
const impactCount=10000,rounds=15,times=[];let final=null;
function run(){
 const runtime=Combat.create({profileOf:()=>profile}),targets=Array.from({length:impactCount},(_,i)=>({id:'T'+i,profileId:profile.id,x:0,y:0,heading:i%4*Math.PI/2,turret:i%4*Math.PI/2}));
 for(const u of targets)Combat.initUnit(u,profile);
 const start=performance.now();
 for(let i=0;i<impactCount;i++)runtime.apply({id:'BENCH-shot-'+(i+1),hit:i%5!==0,zone:i%2?'hullFront':'turretFront',side:null,origin:{x:1000,y:0},pose:{x:0,y:0,heading:targets[i].heading,turret:targets[i].turret},rangeM:1000,ammoId:'M829A2',ricochetRoll:((i*7919)%10000+.5)/10000},targets[i],20);
 const ms=performance.now()-start,hp=targets.reduce((sum,u)=>sum+u.combat.hp,0),before=hp;
 for(let i=0;i<impactCount;i++)runtime.apply({id:'BENCH-shot-'+(i+1),hit:true,zone:'hullRear',origin:{x:1000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:1000},targets[i],20);
 if(targets.reduce((sum,u)=>sum+u.combat.hp,0)!==before)throw Error('duplicate impact changed HP');
 const stats=runtime.stats();if(stats.applied!==impactCount||stats.records!==200)throw Error('bounded combat record contract failed');
 return{ms,hp,stats};
}
for(let i=0;i<3;i++)run();for(let i=0;i<rounds;i++){final=run();times.push(final.ms);}times.sort((a,b)=>a-b);
const result={version:'0.4-WIP12',date:'2026-11-09',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
 fixture:'10,000 independent M1A2_1998 targets; 80% hit inputs alternating hullFront/turretFront at 1000m; one deterministic pass plus duplicate replay',impactCount,rounds,warmupRounds:3,
 medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.ceil(times.length*.95)-1],minMs:times[0],maxMs:times.at(-1),boundedRecords:final.stats.records,duplicateHpStable:true,
 notes:'CPU time for resolved game damage/state application including the supplied deterministic ricochet roll. Excludes observation, hit/zone resolution, flight, rendering, pathfinding and whole-game FPS.'};
fs.writeFileSync('tests/releases/WIP12-combat-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
