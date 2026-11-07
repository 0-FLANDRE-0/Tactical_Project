/* Each variant runs in a fresh process; no simultaneous benchmark workers.
 * Median/p95 summaries are medians over three independent process runs. */
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const {run,median}=require('./observation-benchmark-fixture.cjs');
const root=path.resolve(__dirname,'..'),oracle=require('../tests/helpers/los-reference.cjs');
if(process.argv[2]==='--worker'){
 const variant=process.argv[3],out=process.argv[4],started=performance.now();
 const C=variant==='baseline'?oracle.load(JSON.parse(fs.readFileSync(path.join(root,'data/rasdorf_4km.json'),'utf8'))):require('../tests/load.cjs')();
 // Keep the immutable oracle's original terrain/LOS, but run the same new
 // game firing-state work in both variants. This fixture never requests a shot.
 if(variant==='baseline'){
  const F=require('../src/fire-control.js'),step=C.step,runtimes=new WeakMap();
  C.step=(s,dt)=>{step(s,dt);if(!runtimes.has(s))runtimes.set(s,F.create({profileOf:C.profileOf,seed:s.seed??7,freshSight:()=>{throw Error('Unexpected benchmark shot');}}));runtimes.get(s).step(s.units,dt,s.time);};
 }
 const initMs=performance.now()-started,cases=run(C,{captureState:true});
 fs.writeFileSync(out,JSON.stringify({variant,initMs,summary:C.losAccelerationInfo?.()??null,cases}));
}else{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tactical-los-compare-')),runs={baseline:[],optimized:[]};
 try{
  for(let trial=0;trial<3;trial++)for(const variant of trial%2?['optimized','baseline']:['baseline','optimized']){
   const out=path.join(dir,variant+'-'+trial+'.json'),r=spawnSync(process.execPath,[__filename,'--worker',variant,out],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
   if(r.status!==0)throw Error(r.stderr||r.stdout||'Benchmark worker failed');
   runs[variant].push(JSON.parse(fs.readFileSync(out,'utf8')));
  }
  const cases=runs.baseline[0].cases.map((c,index)=>{
   for(const variant of ['baseline','optimized'])for(const r of runs[variant]){
    assert.equal(r.cases[index].state,c.state,variant+' final state changed for '+c.mode+'/'+c.count);
    for(const key of ['queries','candidatePairs','geometryRequests','exactRayQueries','unchangedRayCacheHits','movedEndpoints','blockedEndpointUpdates'])assert.equal(r.cases[index][key],c[key]);
   }
   const summary=variant=>Object.fromEntries(['medianStepMs','p95StepMs','maxStepMs'].map(key=>[key,key==='maxStepMs'?Math.max(...runs[variant].map(r=>r.cases[index][key])):median(runs[variant].map(r=>r.cases[index][key]))]));
   const baseline=summary('baseline'),optimized=summary('optimized');
   return{mode:c.mode,count:c.count,baseline,optimized,reductionPercent:100*(1-optimized.medianStepMs/baseline.medianStepMs),finalStateSHA256:c.finalStateSHA256,finalStatesEqual:true,candidatePairs:c.candidatePairs,exactRayQueries:c.exactRayQueries,unchangedRayCacheHits:c.unchangedRayCacheHits};
  });
  const compact={};for(const variant of ['baseline','optimized'])compact[variant]=runs[variant].map(r=>({...r,cases:r.cases.map(({state,...c})=>c)}));
  const report={version:'0.4-WIP08A',date:'2026-11-07',baselineCommit:'e9f037cc6edca994e3f19297d3e0aa6c491be164',referenceSourceSHA256:oracle.sha256,node:process.version,cpu:os.cpus()[0]?.model,platform:process.platform,arch:process.arch,seed:407,stepSeconds:.05,queryHz:10,warmupSteps:20,measuredSteps:100,trials:3,notes:'Frozen original geometry plus identical current observation and firing-state rules in both variants; no manual shots. Sequential fresh processes, order alternated by trial. Summary median/p95 are medians of the corresponding per-process statistic; maximum is the largest observed step across all trials. Init times use different loading pipelines and are not compared as summary-build cost. State JSON compared byte-for-byte, including observer records, team contacts and query/cache counts. CPU steps, not FPS. Trajectory generation excluded. Fixture is shared with the ordinary benchmark.',cases,runs:compact};
  fs.writeFileSync(path.join(root,'tests/releases/WIP08A-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,runs:undefined},null,2));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
