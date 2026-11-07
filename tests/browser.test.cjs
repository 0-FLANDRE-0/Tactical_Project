/* Actual system Chromium, real DOM/canvas/embedded Worker, local HTTP serving the standalone HTML (file:// blocked by browser policy).
 * Touch gestures on real Android remain a separate device check. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],timeout:20000});
 const server=require('node:http').createServer((req,res)=>{
  if(req.url!=='/'&&req.url!=='/?scenario=team'){res.statusCode=404;res.end();return;}
  let html=fs.readFileSync(path.resolve(__dirname,'../dist/index.html'),'utf8');
  if(req.url.includes('scenario=team'))html=html.replace('<script id="app-code">',`<script>
   TacticalCore.createScenario=()=>{
    const C=TacticalCore,A=C.makeTank('A11','SCOUT',550,2750,-.61),B=C.makeTank('A12','RECEIVER',550,2770,-.61),T=C.makeTank('T01','TEAM TARGET',1150,2330,2.4,'red');
    B.profileOverride=structuredClone(C.PROFILE);B.profileOverride.sensors.commander.enabled=false;B.profileOverride.sensors.gunner.range=100;
    const s={time:0,seed:7,units:[A,B,T]};C.guard(s,A,'commander',{x:T.x,y:T.y});window.__browserScenario=s;return s;
   };
   </script><script id="app-code">`);
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
 let fileURL='not checked';const probe=await browser.newPage();try{await probe.goto('file://'+path.resolve(__dirname,'../dist/index.html'),{timeout:5000});fileURL='loaded';}catch(e){fileURL=String(e).includes('ERR_BLOCKED_BY_ADMINISTRATOR')?'ERR_BLOCKED_BY_ADMINISTRATOR':String(e);}finally{await probe.close();}
 const checks=[],errors=[],out=path.join(__dirname,'releases');let page;
 const check=(name,fn)=>Promise.resolve().then(fn).then(()=>{checks.push(name);console.log('PASS '+name);});
 try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{let now=100,frame=null;performance.now=()=>now;requestAnimationFrame=fn=>{frame=fn;return 1;};window.__advance=(seconds=.1)=>{now+=seconds*1000;frame?.(now);};});
  await page.goto(url);await page.waitForFunction(()=>window.__TACTICAL__);
  const frames=async n=>page.evaluate(n=>{for(let i=0;i<n;i++)window.__advance();},n);
  await check('single HTML starts offline with actual canvas',async()=>{await frames(1);assert.equal(await page.title(),'TACTICAL — 라스도르프 4×4km v0.4 WIP07A');assert.equal(await page.locator('#loading').count(),0);assert(await page.locator('#map').evaluate(c=>c.width>0));});
  await check('guard world point input, actual turret pose and pause',async()=>{
    await page.locator('#lookChannel').selectOption('gunner');await page.locator('#lookDirection').click();
    const point=await page.evaluate(()=>window.__TACTICAL__.worldToScreen(1600,3100)),box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+point.x,box.y+point.y);
    let s=await page.evaluate(()=>window.__TACTICAL__.snapshot());assert.equal(s.units[0].observation.gunner.mode,'guard');assert(!s.units[0].path.length);
    await frames(10);s=await page.evaluate(()=>window.__TACTICAL__.snapshot());assert.notEqual(s.units[0].turret,-.45);
    await page.locator('#pause').click();const before=s.time;await frames(10);assert.equal((await page.evaluate(()=>window.__TACTICAL__.snapshot())).time,before);
  });
  await check('terrain hold runs real embedded Worker and composes sectors',async()=>{
    await page.evaluate(()=>{window.__arcs=[];window.__poses=[];const arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.arc=function(...args){window.__arcs.push(args);return arc.apply(this,args);};const draw=M1A2Art.draw;M1A2Art.draw=(g,u,...args)=>{window.__poses.push({id:u.id,turret:u.turret,commander:u.commander});return draw(g,u,...args);};});
    await page.keyboard.down('v');await frames(1);await page.waitForFunction(()=>document.querySelector('#sightNote').textContent.includes('지형 가능 영역'),{},{timeout:20000,polling:50});await frames(1);
    assert.equal(await page.locator('#map').getAttribute('data-view'),'sight');
    const geometry=await page.evaluate(()=>{const s=window.__TACTICAL__.snapshot(),u=s.units.find(v=>v.id===s.selected),z=s.camera.zoom;return{gunner:window.__arcs.some(a=>Math.abs(a[2]-2000*z)<1e-5&&Math.abs(a[4]-a[3]-Math.PI/6)<1e-8&&Math.abs((a[4]+a[3])/2-u.turret)<1e-8),commander:window.__arcs.some(a=>Math.abs(a[2]-2500*z)<1e-5&&Math.abs(a[4]-a[3]-Math.PI/2)<1e-8&&Math.abs((a[4]+a[3])/2-u.commander)<1e-8),pose:window.__poses.findLast(p=>p.id===s.selected),u};});assert(geometry.gunner&&geometry.commander);assert.equal(geometry.pose.turret,geometry.u.turret);assert.equal(geometry.pose.commander,geometry.u.commander);await page.screenshot({path:path.join(out,'WIP07A-desktop.png')});await page.keyboard.up('v');
  });
  await check('silhouette reuses artwork but contains only black opaque pixels',async()=>{
    const r=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=600;const g=c.getContext('2d');g.translate(300,300);M1A2Art.draw(g,{heading:.2,turret:1,commander:-1,team:'red'},32,TacticalCore.PROFILE.model,{silhouette:true});const data=g.getImageData(0,0,600,600).data;let opaque=0,bad=0,colors={};for(let i=0;i<data.length;i+=4)if(data[i+3]===255){opaque++;if(data[i]!==0||data[i+1]!==0||data[i+2]!==0){bad++;const key=[data[i],data[i+1],data[i+2]].join(',');colors[key]=(colors[key]||0)+1;}}return{opaque,bad,colors};});assert(r.opaque>10000);assert.equal(r.bad,0,JSON.stringify(r));
  });
  await check('unidentified marker, click and panel hide ID/type/exposure; render never calls LOS',async()=>{
    await page.evaluate(()=>{window.__savedContacts=TacticalCore.contacts;window.__mockContact={key:'test-contact',x:2100,y:3100,heading:.2,turret:1,commander:2,model:{...TacticalCore.PROFILE.model},team:'red',identified:false,current:true,memory:false,age:0,label:'미식별 표적'};TacticalCore.contacts=()=>[{...window.__mockContact}];TacticalCore.exposure=()=>{throw Error('render LOS query');};});
    await frames(2);const p=await page.evaluate(()=>window.__TACTICAL__.worldToScreen(2100,3100)),box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+p.x,box.y+p.y);await frames(2);
    assert.equal(await page.locator('#targetTitle').textContent(),'미식별 표적');assert.equal(await page.locator('#targetExposure').evaluate(e=>getComputedStyle(e).display),'none');assert.equal(await page.locator('#hullValue').textContent(),'—');assert(!(await page.locator('#targetPanel').textContent()).includes('M1A2'));
    await page.screenshot({path:path.join(out,'WIP07A-silhouette-panel.png')});
  });
  await check('identified and remembered contacts update panel permissions then expire selection',async()=>{
    await page.evaluate(()=>Object.assign(window.__mockContact,{identified:true,label:'KNOWN',name:'KNOWN',type:'M1A2 Abrams',exposure:{hull:.5,turret:1}}));await frames(2);assert.equal(await page.locator('#hullValue').textContent(),'50%');
    await page.evaluate(()=>Object.assign(window.__mockContact,{current:false,memory:true,age:4}));await frames(2);assert((await page.locator('#targetDetails').textContent()).includes('마지막 관측'));assert.equal(await page.locator('#targetExposure').evaluate(e=>getComputedStyle(e).display),'none');
    await page.screenshot({path:path.join(out,'WIP07A-memory.png')});await page.evaluate(()=>{TacticalCore.contacts=()=>[];});await frames(2);assert(!(await page.locator('#targetPanel').getAttribute('class')).includes('visible'));
    await page.evaluate(()=>{TacticalCore.contacts=window.__savedContacts;});
  });
  for(const viewport of [{width:844,height:390},{width:390,height:844}])await check('mobile viewport '+viewport.width+'×'+viewport.height+' has no horizontal overflow and controls stay in map',async()=>{
    await page.setViewportSize(viewport);await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await frames(2);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const a=await page.locator('.look-panel').boundingBox(),b=await page.locator('#map').boundingBox();assert(a.x>=b.x&&a.x+a.width<=b.x+b.width+1);assert(a.y+a.height<=b.y+b.height);
    await page.screenshot({path:path.join(out,'WIP07A-'+viewport.width+'x'+viewport.height+'.png')});
  });
  await check('reduced-motion and normal views keep same actual observation state',async()=>{const before=await page.evaluate(()=>window.__TACTICAL__.snapshot().units);await page.emulateMedia({reducedMotion:'reduce'});await frames(2);assert.deepEqual(await page.evaluate(()=>window.__TACTICAL__.snapshot().units),before);});
  await check('actual core team contact stays distinct from selected vehicle observation and direct acquisition',async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(url+'?scenario=team');await page.waitForFunction(()=>window.__TACTICAL__);
    await frames(80);const contact=await page.evaluate(()=>window.__TACTICAL__.snapshot().contacts.find(c=>c.identified));assert(contact,'Actual scout must identify the contact');
    await page.evaluate(()=>window.__TACTICAL__.select('A12'));await frames(2);const p=await page.evaluate(c=>window.__TACTICAL__.worldToScreen(c.x,c.y),contact),box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+p.x,box.y+p.y);await frames(2);
    let own=await page.evaluate(key=>window.__TACTICAL__.own(key),contact.key);assert(!own.current&&!own.acquired);assert((await page.locator('#targetOwnStatus').textContent()).includes('자체 관측 없음'));
    await page.locator('#designateTarget').click();await frames(10);own=await page.evaluate(key=>window.__TACTICAL__.own(key),contact.key);assert(!own.acquired);assert.equal(own.reason,'range');await page.screenshot({path:path.join(out,'WIP07A-team-not-own.png')});
    await page.evaluate(()=>window.__browserScenario.units[1].profileOverride.sensors.gunner.range=2000);await frames(50);own=await page.evaluate(key=>window.__TACTICAL__.own(key),contact.key);assert(own.current&&own.acquired);assert.equal(own.source,'manual');assert((await page.locator('#targetOwnStatus').textContent()).includes('포수 확보'));
    await page.locator('#cancelDesignation').click();await frames(2);assert.equal((await page.evaluate(key=>window.__TACTICAL__.own(key),contact.key)).status,'cancelled');
  });
  await check('actual browser command cancellation and automatic return respect separate guard orders',async()=>{
    await page.locator('#lookChannel').selectOption('gunner');await page.locator('#lookDirection').click();const p=await page.evaluate(()=>window.__TACTICAL__.worldToScreen(1600,3100)),box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+p.x,box.y+p.y);await frames(2);
    assert.equal((await page.evaluate(()=>window.__TACTICAL__.snapshot())).units[1].observation.gunner.mode,'guard');await page.locator('#lookDirection').click();await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>window.__TACTICAL__.snapshot())).units[1].observation.gunner.mode,'guard');await page.locator('#lookResume').click();await frames(2);assert.equal((await page.evaluate(()=>window.__TACTICAL__.snapshot())).units[1].observation.gunner.mode,'auto');
  });
  await check('no application page errors',()=>assert.deepEqual(errors,[]));
  fs.writeFileSync(path.join(out,'WIP07A-browser.json'),JSON.stringify({browser:await browser.version(),url:'http://127.0.0.1:<ephemeral>/ (standalone dist/index.html)',fileURL,checks,passed:checks.length,failed:0,errors,notes:'Actual headless Chromium. Deterministic RAF harness drives real DOM/canvas. One controlled contact injected only for UI privacy checks. Additional team-sharing test runs actual core on the original map with deterministic scenario/profile setup; no contact injection. Not Android hardware or real thermal/ballistic validation.'},null,2)+'\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
