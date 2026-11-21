'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {performance}=require('node:perf_hooks'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),seed=7,seconds=90;
const baselineRef=process.env.WIP24_BASELINE_REF||'907e2cc89ba4fcdbe3eaef91be96250522f21d55';
const html={
  baseline:cp.execFileSync('git',['show',baselineRef+':dist/index.html'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}),
  current:fs.readFileSync(path.join(root,'dist/index.html'),'utf8')
};
const ids=['default','t80u-armor','t80u-observation','t80u-fire'];
const scripts=['battlefield-data','map-spec','vehicle-profiles','mobility','tactical-ai','vehicle-geometry','observation','combat-state','fire-control','sim-core'];
function load(source){
  const get=id=>source.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>'))[1];
  return new Function(scripts.map(get).join('\n')+'\nreturn {C:TacticalCore,Combat:TacticalCombatState};')();
}
function timing(samples){
  const sorted=[...samples].sort((a,b)=>a-b);
  const actual=p=>sorted[Math.floor((sorted.length-1)*p)];
  return {samples:sorted.length,medianMs:actual(.5),p95Ms:actual(.95)};
}
function traces(C,s){
  return s.units.map(u=>({
    id:u.id,position:[u.x,u.y,u.heading,u.turret,u.commander,u.speed],
    path:u.path.map(p=>[p.x,p.y]),observation:C.ownObservation(s,u),mode:C.fireStatus(s,u).mode,
    shots:C.fireStatus(s,u).shotCount??0
  }));
}
function liveRun(C,id,hold=false){
  const s=C.createScenario(seed,{scenarioId:id,recordFireEvents:true,recordObservationEvents:true});
  if(hold)for(const u of s.units)if(C.can(u,'fire'))C.fireMode(s,u,'hold');
  const samples=[],opening=[];
  let firstImpactTick=null;
  for(let i=0;i<seconds/.05;i++){
    const begin=performance.now();C.step(s,.05);samples.push(performance.now()-begin);
    if(!hold&&firstImpactTick===null&&C.combatStats(s).applied>0)firstImpactTick=i;
    if(!hold&&firstImpactTick===null)opening.push(traces(C,s));
  }
  const events=C.combatEvents(s);
  return {core:timing(samples),opening,firstImpactTick,events,
    terminal:{units:traces(C,s),contacts:C.contacts(s),queries:C.observationStats(s)},
    summary:{impacts:events.length,hits:events.filter(e=>e.hit).length,penetrations:events.filter(e=>e.penetrated).length,
      survivors:s.units.filter(u=>u.combat?.status!=='destroyed').length,
      units:s.units.map(u=>({id:u.id,hp:u.combat.hp,destroyedAt:u.combat.destroyedAt,shots:u.fireControl?.shotCount??0})),
      observation:C.observationStats(s)}};
}
function isolatedImpacts({C,Combat},era){
  const p=structuredClone(C.registry.get('T80U_1989'));
  p.combat.armor.turretFront.ke=2000; // Avoid damage, destruction and hit-reaction costs.
  if(!era)delete p.combat.era;
  const combat=Combat.create({profileOf:()=>p,seed}),victim={id:'bench'};
  const event={hit:true,zone:'turretFront',origin:{x:2000,y:0},pose:{x:0,y:0,heading:0,turret:0},
    rangeM:2000,ammoId:'M829A2',ricochetRoll:.99,nearDamageRoll:.99,eraRoll:0};
  const batches=[];
  for(let n=0;n<60;n++){
    let elapsed=0;
    for(let i=0;i<240;i++){
      delete victim.combat;Combat.initUnit(victim,p);
      const begin=performance.now();
      const r=combat.apply({...event,id:'bench-shot-'+(n*240+i+1)},victim,1);
      elapsed+=performance.now()-begin;assert.equal(r.damage,0);
    }
    if(n>=10)batches.push(elapsed/240);
  }
  return timing(batches);
}
async function renderRun(browser,source){
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    let now=100,frame;
    window.wallNow=performance.now.bind(performance);
    performance.now=()=>now;requestAnimationFrame=fn=>{frame=fn;return 1;};
    window.renderSamples=[];
    window.measureFrames=()=>{window.renderSamples=[];for(let i=0;i<900;i++){now+=100;frame(now);}return window.renderSamples;};
  });
  const probe='    draw(now);';
  assert.equal(source.split(probe).length,2);
  const body=source.replace(probe,'    const drawAt=window.wallNow();\n'+probe+'\n    window.renderSamples.push(window.wallNow()-drawAt);');
  await page.route('http://tactical-benchmark.test/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body}));
  await page.goto('http://tactical-benchmark.test/');
  const result={};
  for(const id of ids){
    await page.locator('#scenarioSelect').selectOption(id);
    if(id==='default')await page.locator('#reset').click();
    await page.evaluate(()=>window.__TACTICAL__.mapView(750,2750,1.5));
    const samples=await page.evaluate(()=>window.measureFrames());
    assert.equal(samples.length,900);
    const time=await page.evaluate(()=>window.__TACTICAL__.snapshot().time);
    assert(Math.abs(time-seconds)<1e-6);
    result[id]=timing(samples);
  }
  assert.deepEqual(errors,[]);await page.close();return result;
}

(async()=>{
  const versions={baseline:load(html.baseline),current:load(html.current)},cases={};
  const gameFixture={};
  assert.equal(versions.baseline.C.MAP.mapHash,versions.current.C.MAP.mapHash);
  for(const profileId of versions.current.C.registry.ids()){
    const a=versions.baseline.C.registry.get(profileId),b=versions.current.C.registry.get(profileId);
    for(const field of ['model','mobility','sensors','weapons','fireControl','ammunition','exposure','navigation','capabilities'])
      assert.deepEqual(b[field],a[field],profileId+'.'+field);
  }
  for(const id of ids){
    const a=liveRun(versions.baseline.C,id),b=liveRun(versions.current.C,id);
    const holdA=liveRun(versions.baseline.C,id,true),holdB=liveRun(versions.current.C,id,true);
    const sharedOpeningTicks=Math.min(a.opening.length,b.opening.length);
    assert.deepEqual(b.opening.slice(0,sharedOpeningTicks),a.opening.slice(0,sharedOpeningTicks),id+' before either first impact');
    assert.deepEqual(holdB.terminal,holdA.terminal,id+' hold controls');
    assert.equal(holdB.summary.impacts,0);
    if(id==='t80u-observation')assert.equal(b.summary.impacts,0);
    const separateGeometry=id==='t80u-fire';
    if(separateGeometry){
      const key=r=>[r.id,r.hit,r.zone,r.ricochet,r.ricochetRoll];
      const firstOld=a.events.find(r=>r.ammoId==='M829A2'),firstNew=b.events.find(r=>r.ammoId==='M829A2');
      assert.deepEqual(key(firstNew),key(firstOld));assert.equal(firstNew.eraRoll,firstOld.eraRoll);
      gameFixture.firstM829A2ImpactSeconds={baseline:firstOld.time,current:firstNew.time};
      gameFixture.armorHistory=b.events.filter(r=>r.ammoId==='M829A2'&&r.hit);
      gameFixture.firstReturnFire=b.events.find(r=>r.ammoId==='3BM42')?.time??null;
    }
    cases[id]={baseline:{...a.summary,core:a.core},current:{...b.summary,core:b.core},
      firstImpactTick:{baseline:a.firstImpactTick,current:b.firstImpactTick},sharedOpeningTicks,openingEqual:true,holdTerminalEqual:true,
      combatPoseObsEqual:JSON.stringify(a.terminal)===JSON.stringify(b.terminal)};
  }
  const isolated={};
  for(const name of ['baseline','current'])isolated[name]={withoutERA:isolatedImpacts(versions[name],false),coveredERA:isolatedImpacts(versions[name],true)};
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',
    headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  let view;
  try{view={version:browser.version(),viewport:[1440,900,1],baseline:await renderRun(browser,html.baseline),current:await renderRun(browser,html.current)};}
  finally{await browser.close();}
  const report={baselineRef,seed,seconds,cpu:os.cpus()[0].model,node:process.version,dataAndProcedureMatch:true,cases,
    isolated:{scope:'50 timed batches of 240 impacts per version/fixture. Mean ms/impact per batch. Fresh coverage per hit, fixture HP and base armor prevent damage.',...isolated},
    retainedCoverage:{zonesPerEquippedVehicle:7,numberPayloadBytes:56,objectOverheadExcluded:true,unequippedVehiclePayloadBytes:0},
    render:{scope:'One browser, fixed camera and 900 manual 100ms frames per case. JavaScript draw wall time, excludes tick, UI update, compositor and physical-device FPS.',...view},
    gameFixture};
  fs.writeFileSync(path.join(root,'tests/releases/WIP24-performance.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WIP24 core and Chromium comparison completed for four 90s scenarios.');
})().catch(error=>{console.error(error);process.exitCode=1;});
