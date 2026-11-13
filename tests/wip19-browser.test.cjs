const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('node:path'),http=require('node:http');

(async()=>{
  const htmlPath=path.resolve(__dirname,'../dist/index.html'),out=path.join(__dirname,'releases');
  fs.mkdirSync(out,{recursive:true});
  const server=http.createServer((req,res)=>{
    let html=fs.readFileSync(htmlPath,'utf8');
    html=html.replace('<script id="app-code">',`<script>
TacticalCore.createScenario=()=>{const C=TacticalCore,A=C.makeTank('A11','ALPHA 11',1000,1000,0,'blue',undefined,'hold'),B=C.makeTank('A12','ALPHA 12',850,1150,0,'blue',undefined,'hold'),T=C.makeTank('T01','TARGET 01',1300,1000,Math.PI,'red',undefined,'hold'),s={time:0,seed:19,units:[A,B,T],recordFireEvents:true};for(const u of [A,T])for(const ch of ['commander','gunner'])C.guard(s,u,ch,{x:u===A?T.x:A.x,y:1000});window.__browserScenario=s;return s;};
</script><script id="app-code">`);
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],timeout:20000});
  const checks=[],evidence={browser:await browser.version(),standalone:'dist/index.html'};
  const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
  async function pageAt(viewport={width:1440,height:900},options={}){
    const page=await browser.newPage({viewport,...options});
    await page.addInitScript(()=>{let now=100,frame=null;performance.now=()=>now;requestAnimationFrame=fn=>{frame=fn;return 1};window.__advance=(seconds=.1)=>{now+=seconds*1000;frame?.(now)}});
    await page.goto(url);await page.waitForFunction(()=>window.__TACTICAL__&&window.__browserScenario);return page;
  }
  const frames=(page,n,seconds=.1)=>page.evaluate(({n,seconds})=>{for(let i=0;i<n;i++)window.__advance(seconds)},{n,seconds});
  try{
    await check('desktop command deck owns every moved control and removes the old roster/spec art DOM',async()=>{
      const page=await pageAt();
      const dom=await page.evaluate(()=>({
        mapToolsInMap:document.querySelectorAll('#mapWrap>.map-tools').length,
        mapToolsInSide:document.querySelectorAll('.sidebar .map-tools').length,
        old:document.querySelectorAll('#roster,.dock,.tank-profile,.vehicle-specs').length,
        ids:['terrainMode','zoomIn','zoomOut','fit','move','reverse','stop','sight','guardMenu','contours','fireMode','cancelDesignation','fire','ammoSelect'].map(id=>document.querySelectorAll('#'+id).length),
        layout:['.command-panel','.selected-scroll'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})
      }));
      assert.equal(dom.mapToolsInMap,0);assert.equal(dom.mapToolsInSide,1);assert.equal(dom.old,0);assert(dom.ids.every(n=>n===1));assert(dom.layout[0].y<dom.layout[1].y);assert(dom.layout.every(v=>v.width>250&&v.height>0));
      await page.evaluate(()=>document.querySelector('#app').classList.add('focus-mode'));assert.notEqual(await page.locator('.sidebar').evaluate(e=>getComputedStyle(e).display),'none');
      evidence.desktop=dom;await page.screenshot({path:path.join(out,'WIP19-desktop.png')});await page.close();
    });

    await check('actual loaded A2 shot freezes its ammo while the selected A1 becomes the next completed load',async()=>{
      const page=await pageAt();await frames(page,90);
      const contact=await page.evaluate(()=>window.__TACTICAL__.snapshot().contacts.find(c=>c.current&&c.identified));assert(contact);
      const point=await page.evaluate(c=>window.__TACTICAL__.worldToScreen(c.x,c.y),contact),box=await page.locator('#map').boundingBox();
      await page.mouse.click(box.x+point.x,box.y+point.y);await page.locator('#designateTarget').click();await page.locator('#ammoSelect').selectOption('M829A1');
      for(let i=0;i<80;i++){const acquired=await page.evaluate(()=>{const s=window.__browserScenario,u=s.units.find(v=>v.id==='A11'),key=window.__TACTICAL__.snapshot().targetId;return TacticalCore.ownObservation(s,u,key).acquired});if(acquired)break;await frames(page,1);}
      assert(await page.evaluate(()=>{const s=window.__browserScenario,u=s.units.find(v=>v.id==='A11'),key=window.__TACTICAL__.snapshot().targetId;return TacticalCore.ownObservation(s,u,key).acquired}));
      await frames(page,2);
      const fireUi=await page.evaluate(()=>({disabled:document.querySelector('#fire').disabled,snapshot:window.__TACTICAL__.snapshot().firing,targetId:window.__TACTICAL__.snapshot().targetId}));
      assert(!fireUi.disabled,JSON.stringify(fireUi));
      const requestState=await page.evaluate(()=>{const C=TacticalCore,s=window.__browserScenario,u=s.units.find(v=>v.id==='A11'),key=window.__TACTICAL__.snapshot().targetId;return{request:C.requestFire(s,u,key),key,own:C.ownObservation(s,u,key),fire:C.fireStatus(s,u,key),designation:u.observation.designation}});
      assert(requestState.request.ok,JSON.stringify(requestState));
      let state;
      for(let i=0;i<10;i++){await frames(page,1);state=await page.evaluate(()=>window.__TACTICAL__.snapshot());if(state.shots.some(e=>e.type==='fired'))break;}
      const fired=state.shots.find(e=>e.type==='fired');assert(fired,JSON.stringify({firing:state.firing,targetId:state.targetId,shots:state.shots}));assert.equal(fired.ammoId,'M829A2');assert.equal(fired.ammoRemaining,41);assert.equal(state.firing.ammunition.preference,'M829A1');assert.equal(state.firing.ammunition.total,41);
      await frames(page,65);state=await page.evaluate(()=>window.__TACTICAL__.snapshot());assert.equal(state.firing.ammunition.loadedAmmoId,'M829A1');assert.equal(state.firing.ammunition.total,41);assert((await page.locator('#ammoLoaded').textContent()).includes('M829A1'));
      evidence.actualFire={fired,loaded:state.firing.ammunition.loadedAmmoId,inventory:state.firing.ammunition};await page.screenshot({path:path.join(out,'WIP19-ammunition.png')});await page.close();
    });

    await check('friendly overhead status is active-only, capped and never exposes crew injury',async()=>{
      const page=await pageAt();
      const status=await page.evaluate(()=>{const C=TacticalCore,s=window.__browserScenario,u=s.units[0],p=C.profileOf(u);TacticalCombatState.applyResolvedHitReaction(u,p,{category:'crewSerious',target:'loader',severity:'serious'},s.time);u.fireControl.faultUntil.fireControl=s.time+2;u.fireControl.ammunition.task={purpose:'replenish',ammoId:'M829A2',source:'semiReady',reserved:true,stage:'replenish',progress:.5,startedAt:s.time,paused:true};window.__advance(.1);return window.__TACTICAL__.snapshot().units[0].activeStatus;});
      assert(status.length<=2);assert(status.some(v=>v.includes('사통 이상')));assert(!status.join(' ').includes('장전수'));assert(!status.join(' ').includes('중상'));evidence.activeStatus=status;await page.close();
    });

    await check('844x390 and DPR2 keep every map command readable, non-overlapping and touch-accessible above scrolling info',async()=>{
      evidence.landscape={};for(const dpr of[1,2]){const page=await pageAt({width:844,height:390},{deviceScaleFactor:dpr,hasTouch:true});await frames(page,2);
        const layout=await page.evaluate(()=>{const side=document.querySelector('.sidebar').getBoundingClientRect(),command=document.querySelector('.command-panel').getBoundingClientRect(),info=document.querySelector('.selected-scroll'),r=info.getBoundingClientRect(),group=document.querySelector('.map-command-group').getBoundingClientRect(),tools=document.querySelector('.map-command-group .map-tools').getBoundingClientRect(),buttons=[...document.querySelectorAll('.map-command-group button')].map(button=>{const b=button.getBoundingClientRect();return{id:button.id,x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom,clientWidth:button.clientWidth,clientHeight:button.clientHeight,scrollWidth:button.scrollWidth,scrollHeight:button.scrollHeight,pointer:getComputedStyle(button).pointerEvents}});return{side:{x:side.x,y:side.y,width:side.width,height:side.height},command:{y:command.y,height:command.height},info:{y:r.y,height:r.height,scrollHeight:info.scrollHeight,overflow:getComputedStyle(info).overflowY},group:{x:group.x,y:group.y,width:group.width,height:group.height},tools:{x:tools.x,y:tools.y,width:tools.width,height:tools.height},buttons,portrait:window.__TACTICAL__.snapshot().portraitBlocked}});
        assert(!layout.portrait);assert(layout.side.width>=275);assert(layout.info.y>=layout.command.y+layout.command.height-1);assert(layout.info.height>0);assert(['auto','scroll'].includes(layout.info.overflow));assert.equal(layout.buttons.length,5);assert(layout.group.width>270);for(const [index,button]of layout.buttons.entries()){assert(button.width>=40&&button.height>=24,JSON.stringify(button));assert(button.scrollWidth<=button.clientWidth&&button.scrollHeight<=button.clientHeight,JSON.stringify(button));assert.equal(button.pointer,'auto');assert(button.x>=layout.tools.x-1&&button.right<=layout.tools.x+layout.tools.width+1);if(index)assert(button.x>=layout.buttons[index-1].right-1,JSON.stringify(layout.buttons));}
        const centre=id=>{const button=layout.buttons.find(v=>v.id===id);return{x:button.x+button.width/2,y:button.y+button.height/2}};let zoom=await page.evaluate(()=>window.__TACTICAL__.mapView().zoom);for(const id of['terrainMode','zoomIn','zoomOut','fit','contours']){const point=centre(id);await page.touchscreen.tap(point.x,point.y);}const touched=await page.evaluate(()=>({terrain:document.querySelector('#terrainMode').getAttribute('aria-pressed'),contours:document.querySelector('#contours').getAttribute('aria-pressed'),zoom:window.__TACTICAL__.mapView().zoom}));assert.equal(touched.terrain,'true');assert.equal(touched.contours,'false');assert(Number.isFinite(touched.zoom)&&touched.zoom>0);assert(Number.isFinite(zoom)&&zoom>0);evidence.landscape['dpr'+dpr]={...layout,touched};await page.screenshot({path:path.join(out,dpr===2?'WIP19-844x390-dpr2.png':'WIP19-844x390.png')});await page.close();}
    });

    await check('390x844 portrait blocks commands and public snapshots keep enemy inventory private',async()=>{
      const page=await pageAt({width:390,height:844});await frames(page,2);
      const result=await page.evaluate(()=>{const snapshot=window.__TACTICAL__.snapshot(),text=JSON.stringify({contacts:snapshot.contacts,shots:snapshot.shots,effects:snapshot.effects});return{portrait:snapshot.portraitBlocked,paused:snapshot.paused,aria:document.querySelector('#orientationBlock').getAttribute('aria-hidden'),privateLeak:/ammunition|sections|loadedAmmoId|preference/.test(text)}});
      assert(result.portrait&&result.paused);assert.equal(result.aria,'false');assert.equal(result.privateLeak,false);evidence.portrait=result;await page.close();
    });
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
  const report={version:'0.4-WIP19',browser:evidence.browser,url:'http://127.0.0.1:<ephemeral>',checks,passed:checks.length,failed:0,evidence,scope:'Actual standalone Chromium: moved command DOM, real observation/designation/fire/flight/reload, active-only friendly status, 844x390 DPR1/2 map-command overflow/overlap/touch access, 390x844 layout and enemy inventory privacy.'};
  fs.writeFileSync(path.join(out,'WIP19-browser.json'),JSON.stringify(report,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1});
