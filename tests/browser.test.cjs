/* Actual system Chromium, real DOM/canvas/embedded Worker, local HTTP serving the standalone HTML (file:// blocked by browser policy).
 * Touch gestures on real Android remain a separate device check. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],timeout:20000});
 const server=require('node:http').createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.resolve(__dirname,'../dist/index.html')));}else{res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
 const checks=[],errors=[],out=path.join(__dirname,'releases');let page;
 const check=(name,fn)=>Promise.resolve().then(fn).then(()=>{checks.push(name);console.log('PASS '+name);});
 try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{let now=100,frame=null;performance.now=()=>now;requestAnimationFrame=fn=>{frame=fn;return 1;};window.__advance=(seconds=.1)=>{now+=seconds*1000;frame?.(now);};});
  await page.goto(url);await page.waitForFunction(()=>window.__TACTICAL__);
  const frames=async n=>page.evaluate(n=>{for(let i=0;i<n;i++)window.__advance();},n);
  await check('single HTML starts offline with actual canvas',async()=>{await frames(1);assert.equal(await page.title(),'TACTICAL — 라스도르프 4×4km v0.4 WIP07');assert.equal(await page.locator('#loading').count(),0);assert(await page.locator('#map').evaluate(c=>c.width>0));});
  await check('guard world point input, actual turret pose and pause',async()=>{
    await page.locator('#lookChannel').selectOption('gunner');await page.locator('#lookDirection').click();
    const point=await page.evaluate(()=>window.__TACTICAL__.worldToScreen(1600,3100)),box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+point.x,box.y+point.y);
    let s=await page.evaluate(()=>window.__TACTICAL__.snapshot());assert.equal(s.units[0].observation.gunner.mode,'guard');assert(!s.units[0].path.length);
    await frames(10);s=await page.evaluate(()=>window.__TACTICAL__.snapshot());assert.notEqual(s.units[0].turret,-.45);
    await page.locator('#pause').click();const before=s.time;await frames(10);assert.equal((await page.evaluate(()=>window.__TACTICAL__.snapshot())).time,before);
  });
  await check('terrain hold runs real embedded Worker and composes sectors',async()=>{
    await page.keyboard.down('v');await frames(1);await page.waitForFunction(()=>document.querySelector('#sightNote').textContent.includes('지형 가능 영역'),{},{timeout:20000,polling:50});await frames(1);
    assert.equal(await page.locator('#map').getAttribute('data-view'),'sight');await page.screenshot({path:path.join(out,'WIP07-desktop.png')});await page.keyboard.up('v');
  });
  await check('silhouette reuses artwork but contains only black opaque pixels',async()=>{
    const r=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=600;const g=c.getContext('2d');g.translate(300,300);M1A2Art.draw(g,{heading:.2,turret:1,commander:-1,team:'red'},32,TacticalCore.PROFILE.model,{silhouette:true});const data=g.getImageData(0,0,600,600).data;let opaque=0,bad=0,colors={};for(let i=0;i<data.length;i+=4)if(data[i+3]===255){opaque++;if(data[i]!==0||data[i+1]!==0||data[i+2]!==0){bad++;const key=[data[i],data[i+1],data[i+2]].join(',');colors[key]=(colors[key]||0)+1;}}return{opaque,bad,colors};});assert(r.opaque>10000);assert.equal(r.bad,0,JSON.stringify(r));
  });
  await check('unidentified marker, click and panel hide ID/type/exposure; render never calls LOS',async()=>{
    await page.evaluate(()=>{window.__savedContacts=TacticalCore.contacts;window.__mockContact={key:'test-contact',x:2100,y:3100,heading:.2,turret:1,commander:2,model:{...TacticalCore.PROFILE.model},team:'red',identified:false,current:true,memory:false,age:0,label:'미식별 표적'};TacticalCore.contacts=()=>[{...window.__mockContact}];TacticalCore.exposure=()=>{throw Error('render LOS query');};});
    await frames(2);const p=await page.evaluate(()=>window.__TACTICAL__.worldToScreen(2100,3100)),box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+p.x,box.y+p.y);await frames(2);
    assert.equal(await page.locator('#targetTitle').textContent(),'미식별 표적');assert.equal(await page.locator('#targetExposure').evaluate(e=>getComputedStyle(e).display),'none');assert.equal(await page.locator('#hullValue').textContent(),'—');assert(!(await page.locator('#targetPanel').textContent()).includes('M1A2'));
    await page.screenshot({path:path.join(out,'WIP07-silhouette-panel.png')});
  });
  await check('identified and remembered contacts update panel permissions then expire selection',async()=>{
    await page.evaluate(()=>Object.assign(window.__mockContact,{identified:true,label:'KNOWN',name:'KNOWN',type:'M1A2 Abrams',exposure:{hull:.5,turret:1}}));await frames(2);assert.equal(await page.locator('#hullValue').textContent(),'50%');
    await page.evaluate(()=>Object.assign(window.__mockContact,{current:false,memory:true,age:4}));await frames(2);assert((await page.locator('#targetDetails').textContent()).includes('마지막 관측'));assert.equal(await page.locator('#targetExposure').evaluate(e=>getComputedStyle(e).display),'none');
    await page.screenshot({path:path.join(out,'WIP07-memory.png')});await page.evaluate(()=>{TacticalCore.contacts=()=>[];});await frames(2);assert(!(await page.locator('#targetPanel').getAttribute('class')).includes('visible'));
    await page.evaluate(()=>{TacticalCore.contacts=window.__savedContacts;});
  });
  for(const viewport of [{width:844,height:390},{width:390,height:844}])await check('mobile viewport '+viewport.width+'×'+viewport.height+' has no horizontal overflow and controls stay in map',async()=>{
    await page.setViewportSize(viewport);await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await frames(2);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const a=await page.locator('.look-panel').boundingBox(),b=await page.locator('#map').boundingBox();assert(a.x>=b.x&&a.x+a.width<=b.x+b.width+1);assert(a.y+a.height<=b.y+b.height);
    await page.screenshot({path:path.join(out,'WIP07-'+viewport.width+'x'+viewport.height+'.png')});
  });
  await check('reduced-motion and normal views keep same actual observation state',async()=>{const before=await page.evaluate(()=>window.__TACTICAL__.snapshot().units);await page.emulateMedia({reducedMotion:'reduce'});await frames(2);assert.deepEqual(await page.evaluate(()=>window.__TACTICAL__.snapshot().units),before);});
  await check('no application page errors',()=>assert.deepEqual(errors,[]));
  fs.writeFileSync(path.join(out,'WIP07-browser.json'),JSON.stringify({browser:await browser.version(),url:'http://127.0.0.1:<ephemeral>/ (standalone dist/index.html)',fileURL:'blocked by administrator policy; not verified',checks,passed:checks.length,failed:0,errors,notes:'Actual headless Chromium. Deterministic RAF harness drives real DOM/canvas. One controlled contact injected to test UI permissions. Not Android hardware or real thermal/ballistic validation.'},null,2)+'\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
