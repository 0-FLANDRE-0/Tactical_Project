/* Actual system Chromium over the built standalone HTML. Scenario injection
 * selects ordinary placements and seeds; it does not force hits or reactions. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('node:http');

(async()=>{
 const htmlPath=path.resolve(__dirname,'../dist/index.html'),out=path.join(__dirname,'releases');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');if(!['/burst','/fault'].includes(url.pathname)){res.statusCode=404;res.end();return;}
  const seed=Number(url.searchParams.get('seed')||7),mode=url.pathname.slice(1);let html=fs.readFileSync(htmlPath,'utf8');
  html=html.replace('<script id="app-code">',`<script>
   TacticalCore.createScenario=()=>{
    const C=TacticalCore,seed=${seed};let s;
    if('${mode}'==='burst'){
     const A=C.makeTank('A','BLUE AUTO',550,2750,-.61,'blue',undefined,'auto'),T=C.makeTank('T','RED AUTO',1150,2330,2.4,'red',undefined,'auto');
     A.combat.hp=A.combat.maxHp=100000;T.combat.hp=T.combat.maxHp=100000;s={time:0,seed,units:[A,T],recordFireEvents:true};
     for(const u of [A,T])for(const ch of ['commander','gunner'])C.guard(s,u,ch,{x:u===A?T.x:A.x,y:u===A?T.y:A.y});
    }else{
     const A=C.makeTank('A','REACTION SHOOTER',550,2750,-.61,'red',undefined,'auto'),T=C.makeTank('T','REACTION TARGET',1150,2330,2.4,'blue',undefined,'hold');s={time:0,seed,units:[T,A],recordFireEvents:true};
     for(const u of [A,T])for(const ch of ['commander','gunner'])C.guard(s,u,ch,{x:u===A?T.x:A.x,y:u===A?T.y:A.y});
    }
    window.__browserScenario=s;return s;
   };
   </script><script id="app-code">`);res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],timeout:20000});
 const checks=[],evidence={browser:await browser.version(),standalone:'dist/index.html',forcedOutcomeControls:false};
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
 async function pageAt(url){const page=await browser.newPage({viewport:{width:1440,height:900}});await page.addInitScript(()=>{let now=100,frame=null;performance.now=()=>now;requestAnimationFrame=fn=>{frame=fn;return 1};window.__advance=(seconds=.1)=>{now+=seconds*1000;frame?.(now)}});await page.goto(url);await page.waitForFunction(()=>window.__TACTICAL__&&window.__browserScenario);return page;}
 const frames=(page,n)=>page.evaluate(n=>{for(let i=0;i<n;i++)window.__advance()},n);
 try{
  await check('both teams auto-reload and continue firing with conserved ammunition and friendly reload UI',async()=>{
   const page=await pageAt(base+'/burst');let loadingText='';
   for(let i=0;i<450;i++){await frames(page,1);const state=await page.evaluate(()=>{const s=window.__browserScenario,[A,T]=s.units;return{a:A.fireControl.shotCount,t:T.fireControl.shotCount,loading:!A.fireControl.loaded}});if(state.loading&&!loadingText)loadingText=await page.locator('#readinessState').textContent();if(Math.min(state.a,state.t)>=4)break;}
   const result=await page.evaluate(()=>{const C=TacticalCore,s=window.__browserScenario,A=s.units.find(u=>u.id==='A'),T=s.units.find(u=>u.id==='T'),times=team=>C.fireEvents(s,team).filter(e=>e.type==='fired').map(e=>e.time);return{time:s.time,a:{shots:A.fireControl.shotCount,ammo:A.fireControl.ammo,burst:A.fireControl.burstShots,fatigue:A.fireControl.fatigueSeconds,times:times('blue')},t:{shots:T.fireControl.shotCount,ammo:T.fireControl.ammo,burst:T.fireControl.burstShots,fatigue:T.fireControl.fatigueSeconds,times:times('red')}}});
   for(const unit of [result.a,result.t]){assert(unit.shots>=4);assert.equal(unit.ammo,42-unit.shots);assert(unit.burst>=4);assert(unit.fatigue>=.35-1e-9);for(let i=1;i<unit.times.length;i++)assert(unit.times[i]-unit.times[i-1]>=5.95);}
   assert(loadingText.includes('장전')&&loadingText.includes('예상'));evidence.burst={...result,loadingText};await page.screenshot({path:path.join(out,'WIP15-browser-reload.png')});await page.close();
  });
  const cases=[{seed:26,kind:'fireControl',label:'사통'},{seed:79,kind:'gunner',label:'포수 관측'},{seed:560,kind:'commander',label:'전차장 관측'}];
  for(const entry of cases)await check('seed '+entry.seed+' actual '+entry.kind+' fault interrupts and recovers',async()=>{
   const page=await pageAt(base+'/fault?seed='+entry.seed);let active=null;
   for(let i=0;i<180&&!active;i++){await frames(page,1);active=await page.evaluate(()=>{const s=window.__browserScenario,t=s.units.find(u=>u.id==='T'),fault=t.fireControl?.lastReaction?.fault;return fault?{time:s.time,fault,ammo:t.fireControl.ammo,shotCount:t.fireControl.shotCount,local:t.observation.contacts.A?{commander:t.observation.contacts.A.sources.commander.current,gunner:t.observation.contacts.A.sources.gunner.current}:null}:null})}
   assert(active);assert.equal(active.fault.kind,entry.kind);assert(active.fault.duration>=3&&active.fault.duration<=8);await frames(page,1);const ui=await page.locator('#readinessState').textContent();assert(ui.includes(entry.label));
   if(entry.kind==='gunner'){assert.equal(active.local.gunner,false);assert.equal(active.local.commander,true)}if(entry.kind==='commander'){assert.equal(active.local.commander,false);assert.equal(active.local.gunner,true)}
   await page.evaluate(()=>{const C=TacticalCore,s=window.__browserScenario,A=s.units.find(u=>u.id==='A');C.fireMode(s,A,'hold')});
   const privateView=await page.evaluate(()=>{const snap=window.__TACTICAL__.snapshot();return{friendlyIds:snap.units.map(u=>u.id),contacts:JSON.stringify(snap.contacts),effects:JSON.stringify(snap.effects)}});assert.deepEqual(privateView.friendlyIds,['T']);assert(!privateView.contacts.includes('faultUntil'));assert(!privateView.effects.includes('faultUntil'));
   let recovered=null;for(let i=0;i<130&&!recovered;i++){await frames(page,1);recovered=await page.evaluate(kind=>{const C=TacticalCore,s=window.__browserScenario,t=s.units.find(u=>u.id==='T'),status=C.fireStatus(s,t),local=t.observation.contacts.A;const inactive=!status.faults[kind].active,fresh=kind==='gunner'?!!local?.sources.gunner.current:kind==='commander'?!!local?.sources.commander.current:true;return inactive&&fresh?{time:s.time,loading:status.loading,aim:status.aimProgress}:null},entry.kind)}
   assert(recovered);assert(recovered.time>=active.fault.until);evidence[entry.kind]={seed:entry.seed,active,recovered,ui};await page.screenshot({path:path.join(out,'WIP15-browser-'+entry.kind+'.png')});await page.close();
  });
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 const report={version:'0.4-WIP15',browser:evidence.browser,url:'http://127.0.0.1:<ephemeral>/{burst,fault}',checks,passed:checks.length,failed:0,evidence,scope:'Actual standalone app, automatic reload/continuous fire for both teams, friendly readiness UI, deterministic unforced FCS/gunner/commander temporary faults and fresh-channel recovery.'};fs.writeFileSync(path.join(out,'WIP15-browser.json'),JSON.stringify(report,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
