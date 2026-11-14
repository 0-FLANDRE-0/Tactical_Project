#!/usr/bin/env node
'use strict';
const path=require('path'),fs=require('fs'),http=require('http'),{performance}=require('perf_hooks'),{chromium}=require('playwright');
const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;},root=path.resolve(arg('--root')||path.join(__dirname,'..')),scenario=arg('--scenario')||'default',output=arg('--output');
const percentile=(values,p)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))];};
function coreBenchmark(){
 const C=require(path.join(root,'tests/load.cjs'))(),options=scenario==='default'?{}:{scenarioId:scenario},s=C.createScenario(7,options);for(let i=0;i<100;i++)C.step(s,.05);
 const samples=[];for(let i=0;i<800;i++){const started=performance.now();C.step(s,.05);samples.push(performance.now()-started);}const stats=C.observationStats(s);
 return{scenario,steps:samples.length,medianMs:percentile(samples,.5),p95Ms:percentile(samples,.95),observation:{queries:stats.queries,candidates:stats.candidates,samples:stats.samples,rayQueries:stats.rayQueries,rayCacheHits:stats.rayCacheHits}};
}
function impactBenchmark(){
 const Combat=require(path.join(root,'src/combat-state.js')),Profiles=require(path.join(root,'src/vehicle-profiles.js')),hasT80=Profiles.registry.has('T80U_1989'),rounds=20000;
 const run=(profile,era)=>{const values=[];for(let batch=0;batch<20;batch++){const start=performance.now();for(let i=0;i<rounds/20;i++)Combat.evaluate({hit:true,zone:'hullFront',side:null,origin:{x:2000,y:0},pose:{x:0,y:0,heading:0,turret:0},rangeM:2000,profile,ammoId:'M829A2',ricochetRoll:.999999,nearDamageRoll:.999999,...(era?{eraRoll:(i%100)/100}:{})});values.push((performance.now()-start)/(rounds/20));}return{medianUs:percentile(values,.5)*1000,p95Us:percentile(values,.95)*1000};};
 return{rounds,plain:run(Profiles.M1A2_1998,false),era:hasT80?run(Profiles.T80U_1989,true):null};
}
async function browserBenchmark(){
 let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');html=html.replace('<script id="app-code">',`<script>{const original=TacticalCore.createScenario;TacticalCore.createScenario=(...args)=>{const value=original(...args);window.__benchmarkScenario=value;return value;};}</script><script id="app-code">`);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.__TACTICAL__&&window.__benchmarkScenario);if(scenario!=='default'){if(!await page.locator('#scenarioSelect').count())throw Error('scenario selector unavailable');await page.locator('#scenarioSelect').selectOption(scenario);}await page.waitForTimeout(500);
  const result=await page.evaluate(async()=>{const intervals=[];let previous;await new Promise(resolve=>{const frame=now=>{if(previous!==undefined)intervals.push(now-previous);previous=now;if(intervals.length>=180)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});document.querySelector('#pause').click();const before=TacticalCore.observationStats(window.__benchmarkScenario);await new Promise(resolve=>{let n=0;const frame=()=>{if(++n>=60)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});const after=TacticalCore.observationStats(window.__benchmarkScenario);return{intervals,before,after,canvas:{width:document.querySelector('#map').width,height:document.querySelector('#map').height,dpr:devicePixelRatio}};});
  return{scenario,frames:result.intervals.length,medianIntervalMs:percentile(result.intervals,.5),p95IntervalMs:percentile(result.intervals,.95),pausedRenderLosStable:JSON.stringify(result.before)===JSON.stringify(result.after),canvas:result.canvas};
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
(async()=>{const result={root,core:coreBenchmark(),impact:impactBenchmark(),browser:await browserBenchmark()},json=JSON.stringify(result,null,2)+'\n';if(output)fs.writeFileSync(path.resolve(output),json);process.stdout.write(json);})().catch(error=>{console.error(error);process.exitCode=1;});
