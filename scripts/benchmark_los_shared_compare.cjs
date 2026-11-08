/* WIP11D frozen core and current core run sequentially in fresh processes.
 * Timings are fixed-step CPU measurements, not whole-game FPS. */
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const {run,median}=require('./observation-benchmark-fixture.cjs'),root=path.resolve(__dirname,'..'),reference=require('../tests/helpers/los-wip11d-reference.cjs');
const sourceHash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function loadCurrent(map){
 const source=fs.readFileSync(path.join(root,'src/sim-core.js'),'utf8'),profiles=require('../src/vehicle-profiles.js'),O=require('../src/observation.js');
 return new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalMobility','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(
  map,profiles,require('../src/mobility.js'),O,require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),{exports:{}});
}
if(process.argv[2]==='--worker'){
 const variant=process.argv[3],out=process.argv[4],map=JSON.parse(fs.readFileSync(path.join(root,'data/rasdorf_4km.json'),'utf8'));
 if(global.gc)global.gc();const heapBefore=process.memoryUsage().heapUsed,started=performance.now();
 // Both variants receive the same already-parsed map and module dependencies.
 // Evaluating the current standalone HTML here would include a second encoded
 // battlefield copy in only one variant and make init/heap observations unfair.
 const C=variant==='baseline'?reference.load(map):loadCurrent(map),initMs=performance.now()-started;
 if(global.gc)global.gc();const heapAfterInit=process.memoryUsage().heapUsed,cases=run(C,{captureState:true});
 if(global.gc)global.gc();const heapAfterRun=process.memoryUsage().heapUsed;
 let diagnostics=null;if(C.losDiagnostics){C.losDiagnostics(true);run(C,{steps:100,warmup:20});diagnostics=C.losDiagnostics(false);}
 fs.writeFileSync(out,JSON.stringify({variant,initMs,heapBefore,heapAfterInit,heapAfterRun,summary:C.losAccelerationInfo(),diagnostics,cases}));
}else{
 const trials=Number(process.env.WIP11E_TRIALS||3),dir=fs.mkdtempSync(path.join(os.tmpdir(),'tactical-wip11e-')),runs={baseline:[],optimized:[]};
 try{
  for(let trial=0;trial<trials;trial++)for(const variant of trial%2?['optimized','baseline']:['baseline','optimized']){
   const out=path.join(dir,variant+'-'+trial+'.json'),result=spawnSync(process.execPath,['--expose-gc',__filename,'--worker',variant,out],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
   if(result.status!==0)throw Error(result.stderr||result.stdout||'benchmark worker failed');runs[variant].push(JSON.parse(fs.readFileSync(out,'utf8')));
  }
  const cases=runs.baseline[0].cases.map((base,index)=>{
   for(const variant of ['baseline','optimized'])for(const result of runs[variant]){
    assert.equal(result.cases[index].state,base.state,variant+' state changed for '+base.mode+'/'+base.count);
    for(const key of ['queries','candidatePairs','geometryRequests','exactRayQueries','unchangedRayCacheHits','movedEndpoints','blockedEndpointUpdates','finalStateSHA256'])assert.equal(result.cases[index][key],base[key],key+' changed');
   }
   const summary=variant=>({medianStepMs:median(runs[variant].map(v=>v.cases[index].medianStepMs)),p95StepMs:median(runs[variant].map(v=>v.cases[index].p95StepMs)),maxStepMs:Math.max(...runs[variant].map(v=>v.cases[index].maxStepMs))});
   const baseline=summary('baseline'),optimized=summary('optimized');return{mode:base.mode,count:base.count,baseline,optimized,reductionPercent:100*(1-optimized.medianStepMs/baseline.medianStepMs),p95ReductionPercent:100*(1-optimized.p95StepMs/baseline.p95StepMs),finalStateSHA256:base.finalStateSHA256,finalStatesEqual:true,candidatePairs:base.candidatePairs,exactRayQueries:base.exactRayQueries,unchangedRayCacheHits:base.unchangedRayCacheHits};
  });
  const compact={};for(const variant of ['baseline','optimized'])compact[variant]=runs[variant].map(v=>({...v,cases:v.cases.map(({state,...entry})=>entry)}));
  const report={version:'0.4-WIP11E',date:'2026-11-08',baselineCommit:'a668f9b21340db09fe2459190bb34337ef7d2690',baselineSourceSHA256:reference.sha256,optimizedSourceSHA256:sourceHash(path.join(root,'src/sim-core.js')),node:process.version,cpu:os.cpus()[0]?.model,platform:process.platform,arch:process.arch,mapHash:mapHash(),seed:407,stepSeconds:.05,queryHz:10,warmupSteps:20,measuredSteps:100,trials,fixture:'unchanged observation-benchmark-fixture.cjs; stationary/moving 50/100 units; sequential fresh processes with alternating order; both cores receive the same parsed map and dependencies',notes:'Median and p95 summaries are medians of per-process statistics; maximum is the largest observed step. State JSON and existing counters compare byte-for-byte. Diagnostics run after the timed fixture and are excluded from timings. Heap values follow forced GC but remain process-level observations, not allocation counts or device guarantees.',cases,runs:compact};
  function mapHash(){return JSON.parse(fs.readFileSync(path.join(root,'data/rasdorf_4km.json'),'utf8')).meta.mapHash;}
  fs.writeFileSync(path.join(root,'tests/releases/WIP11E-los-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,runs:undefined},null,2));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
