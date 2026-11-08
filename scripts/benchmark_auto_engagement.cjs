/* Active auto-engagement fixed-step CPU fixture. This is not whole-game FPS or
 * a real-world fire-control benchmark. Rendering and pathfinding are excluded. */
const fs=require('fs'),os=require('os'),{performance}=require('perf_hooks'),C=require('../tests/load.cjs')();
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function run(count){
  const units=[];
  for(let i=0;i<count;i++){
    const p=C.legalNear(200+(i%10)*360,300+Math.floor(i/10)*320,units),u=C.makeTank('U'+String(i).padStart(3,'0'),'AUTO FIXTURE',p.x,p.y,(i%2?Math.PI:0),i%2?'red':'blue');
    units.push(u);
  }
  const s={time:0,seed:911,units,recordFireEvents:true,recordObservationEvents:true};for(const u of units)C.fireMode(s,u,'auto');
  const warmupSteps=20,steps=600;for(let i=0;i<warmupSteps;i++)C.step(s,.05);
  const times=[];for(let i=0;i<steps;i++){const start=performance.now();C.step(s,.05);times.push(performance.now()-start);}
  const sorted=[...times].sort((a,b)=>a-b),shots=units.reduce((n,u)=>n+u.fireControl.shotCount,0),stats=C.combatStats(s),records=C.combatEvents(s),byTime=new Map();
  for(const r of records)byTime.set(r.time,(byTime.get(r.time)||0)+1);
  if(!shots||!stats.applied||!stats.destroyed)throw Error('active auto fixture did not exercise fire, damage and destruction');
  return{count,blue:count/2,red:count/2,warmupSteps,steps,simulatedSeconds:steps*.05,medianStepMs:median(times),p95StepMs:sorted[Math.min(steps-1,Math.floor(steps*.95))],maxStepMs:Math.max(...times),
    autoShots:shots,resolvedImpacts:stats.applied,inFlight:units.reduce((n,u)=>n+C.fireStatus(s,u).inFlight.length,0),destroyed:stats.destroyed,alive:units.filter(u=>u.combat.status==='alive').length,confirmedWrecksBlue:C.contacts(s,'blue').filter(c=>c.wreck).length,confirmedWrecksRed:C.contacts(s,'red').filter(c=>c.wreck).length,
    retargetEvents:(s.observationEvents||[]).filter(e=>e.type==='target-switched'||e.type==='designated').length,multiImpactFixedSteps:[...byTime.values()].filter(v=>v>1).length,
    boundedLogs:{observation:(s.observationEvents||[]).length,combatRecords:records.length,blueFireEvents:C.fireEvents(s,'blue').length,redFireEvents:C.fireEvents(s,'red').length}};
}
const result={version:'0.4-WIP11E',date:'2026-11-08',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,mapHash:C.MAP.meta.mapHash,seed:911,
  fixture:'50/100 stationary M1A2_1998 in a legalNear 10-column grid, alternating teams/headings, every unit explicitly auto; 20 warmup + 600 timed fixed 0.05s steps',
  notes:'Includes observation, handoff/acquisition, aim, automatic request, flight/impact, damage, destruction and retarget state. Excludes rendering, pathfinding and whole-game FPS.',cases:[run(50),run(100)]};
fs.writeFileSync('tests/releases/WIP11E-auto-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
