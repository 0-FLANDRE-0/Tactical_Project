/* Supplementary fixed LOS placements. Separate fresh processes, no rendering. */
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),{spawnSync}=require('child_process'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..'),reference=require('../tests/helpers/los-wip11d-reference.cjs'),{mapFor}=require('../tests/helpers/observation-core-fixture.cjs');
function current(map){const profiles=require('../src/vehicle-profiles.js'),O=require('../src/observation.js'),source=fs.readFileSync(path.join(root,'src/sim-core.js'),'utf8');return new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalMobility','TacticalAI','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(map,profiles,require('../src/mobility.js'),require('../src/tactical-ai.js'),O,require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),{exports:{}});}
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
if(process.argv[2]==='--worker'){
 const variant=process.argv[3],out=process.argv[4],real=JSON.parse(fs.readFileSync(path.join(root,'data/rasdorf_4km.json'),'utf8'));
 const definitions=[
  ['real-west-slope',real,[550,2750,-.45],[1150,2330,2.4,2.4],2.65],
  ['real-town',real,[2300,1450,.1],[3300,1800,2.6,-2.4],2.65],
  ['synthetic-forest',mapFor('forest'),[500,1000,0],[1500,1000,Math.PI,Math.PI],1.4],
  ['synthetic-ridge-tangent',mapFor('ridge'),[500,1000,0],[1500,1000,Math.PI,Math.PI],2.65],
  ['synthetic-early-building',mapFor('building'),[500,1000,0],[1500,1000,Math.PI,Math.PI],2.65]
 ];
 const cases=[];for(const[name,map,observer,target,eye]of definitions){const C=variant==='baseline'?reference.load(map):current(map),u=C.makeTank('A','A',...observer,'blue',undefined,'hold'),t=C.makeTank('T','T',target[0],target[1],target[2],'red',undefined,'hold');t.turret=target[3];for(let i=0;i<500;i++)C.exposure(u,t,eye);const times=[];for(let round=0;round<7;round++){const start=performance.now();for(let i=0;i<2000;i++)C.exposure(u,t,eye);times.push(performance.now()-start);}cases.push({name,exposuresPerRound:2000,rounds:7,medianMs:median(times),p95Ms:[...times].sort((a,b)=>a-b)[6],minMs:Math.min(...times),maxMs:Math.max(...times),sample:C.exposure(u,t,eye)});}
 fs.writeFileSync(out,JSON.stringify({variant,cases}));
}else{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tactical-wip11e-scenes-')),runs={baseline:[],optimized:[]};try{
  for(let trial=0;trial<3;trial++)for(const variant of trial%2?['optimized','baseline']:['baseline','optimized']){const out=path.join(dir,variant+trial+'.json'),result=spawnSync(process.execPath,[__filename,'--worker',variant,out],{cwd:root,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||result.stdout);runs[variant].push(JSON.parse(fs.readFileSync(out,'utf8')));}
  const cases=runs.baseline[0].cases.map((base,index)=>{for(const variant of ['baseline','optimized'])for(const run of runs[variant])assert.deepEqual(run.cases[index].sample,base.sample);const summarize=variant=>({medianMs:median(runs[variant].map(r=>r.cases[index].medianMs)),p95Ms:median(runs[variant].map(r=>r.cases[index].p95Ms)),maxMs:Math.max(...runs[variant].map(r=>r.cases[index].maxMs))}),baseline=summarize('baseline'),optimized=summarize('optimized');return{name:base.name,exposuresPerRound:base.exposuresPerRound,roundsPerProcess:base.rounds,baseline,optimized,reductionPercent:100*(1-optimized.medianMs/baseline.medianMs),resultsEqual:true};});
  const report={version:'0.4-WIP11E',date:'2026-11-08',node:process.version,cpu:os.cpus()[0]?.model,trials:3,notes:'Supplementary fixed placements; 500 warmup exposures, then seven rounds of 2,000 uncached nine-ray exposures per fresh process. Baseline/current process order alternates. CPU time, not simulation step or FPS.',cases,runs};fs.writeFileSync(path.join(root,'tests/releases/WIP11E-los-scenes.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,runs:undefined},null,2));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
