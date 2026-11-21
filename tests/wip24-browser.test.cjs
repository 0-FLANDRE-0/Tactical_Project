'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',
    headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const dist=path.resolve(__dirname,'../dist/index.html'),out=path.join(__dirname,'releases');
  const errors=[],evidence={browser:browser.version(),viewports:[]};
  const open=async(viewport,dpr=1,friendly=false)=>{
    const page=await browser.newPage({viewport,deviceScaleFactor:dpr,hasTouch:viewport.width<=844});
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      let now=100,frame;
      performance.now=()=>now;
      requestAnimationFrame=fn=>{frame=fn;return 1;};
      window.advance=(n,ms)=>{for(let i=0;i<n;i++){now+=ms;frame(now);}};
    });
    await page.route('http://tactical-wip24.test/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:
      fs.readFileSync(dist,'utf8').replace('<script id="app-code">',`<script>{
        const create=TacticalCore.createScenario;
        TacticalCore.createScenario=(seed,options)=>{
          const s=create(options?.scenarioId==='t80u-fire'?8:seed,{...options,recordObservationEvents:true,recordFireEvents:true});
          if(${friendly}&&s.id==='t80u-fire')for(const u of s.units)u.team=u.profileId==='T80U_1989'?'blue':'red';
          window.wip24Scenario=s;return s;
        };
      }</script><script id="app-code">`)}));
    await page.goto('http://tactical-wip24.test/');
    await page.locator('#scenarioSelect').selectOption('t80u-fire',{force:true});
    return page;
  };
  const advance=(page,n,ms=50)=>page.evaluate(([n,ms])=>window.advance(n,ms),[n,ms]);
  const state=page=>page.evaluate(()=>{
    const C=TacticalCore,s=window.wip24Scenario,[m,t]=s.units,snap=window.__TACTICAL__.snapshot();
    const era=document.querySelector('#eraSummary'),canvas=document.querySelector('#map'),box=canvas.getBoundingClientRect();
    return {version:snap.version??window.__TACTICAL__.version,time:s.time,hp:t.combat.hp,selected:snap.selected,
      coverage:{...t.combat.eraCoverage},privateHits:C.combatEvents(s).filter(r=>r.ammoId==='M829A2'&&r.hit),
      publicEvents:C.fireEvents(s),contacts:snap.contacts,effects:snap.effects,
      eraText:era.textContent,eraHidden:era.hidden,portrait:snap.portraitBlocked,drivePose:[t.x,t.y,t.heading],
      shooterPose:[m.x,m.y,m.heading],queryStats:C.observationStats(s),dpr:devicePixelRatio,
      canvasScale:canvas.width/box.width,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  try{
    const page=await open({width:1440,height:900});
    await advance(page,124); // In flight before the 6.35s impact.
    await page.evaluate(()=>window.__TACTICAL__.mapView(950,2750,12));
    await advance(page,6);
    const covered=await state(page);
    assert.equal(covered.version,'0.4-WIP24');assert.equal(covered.eraHidden,true);
    assert(covered.contacts.some(c=>c.identified&&c.current&&c.artId==='T80U'));
    assert(covered.effects.some(e=>e.kind==='impact'));
    assert.equal(covered.hp,1400-covered.privateHits[0].damage);
    assert(Math.abs(covered.coverage.turretFront-.80)<1e-9);
    await page.screenshot({path:path.join(out,'WIP24-covered-impact.png')});

    await page.locator('#pause').click();
    await advance(page,30,100);assert.deepEqual(await state(page),covered);
    await page.locator('#pause').click();
    await advance(page,120);
    const gap=await state(page),[first,second]=gap.privateHits;
    assert.equal(first.zone,second.zone);assert(first.eraApplied&&first.penetrated);
    assert(!second.eraApplied&&second.penetrated&&second.damage>first.damage);
    assert.equal(gap.hp,covered.hp-second.damage);
    const onCanvas=await page.evaluate(()=>{
      const A=window.__TACTICAL__,u=window.wip24Scenario.units[1],p=A.worldToScreen(u.x,u.y);
      const box=document.querySelector('#map').getBoundingClientRect();return{x:box.left+p.x,y:box.top+p.y};
    });
    await page.mouse.click(onCanvas.x,onCanvas.y);await advance(page,1,0);
    assert(await page.locator('#targetPanel').isVisible());assert.equal(await page.locator('#eraSummary').isVisible(),false);
    assert(!/잔여 피복|Kontakt-5/.test(await page.locator('#targetPanel').innerText()));
    const publicData=JSON.stringify([gap.publicEvents,gap.contacts,gap.effects]);
    for(const key of ['coverageBefore','coverageAfter','eraRoll','eraBonus','antiEraReduction','eraCoverage'])assert(!publicData.includes(key));
    await page.screenshot({path:path.join(out,'WIP24-gap-penetration.png')});
    evidence.fight={seed:8,shooterPose:gap.shooterPose,targetPose:gap.drivePose,covered:first,gap:second};

    const beforeReset=await state(page);
    await page.locator('#reset').click();
    const reset=await state(page);assert.equal(reset.time,0);assert.equal(reset.hp,1400);assert.equal(reset.coverage.turretFront,.95);
    await page.locator('#speed').click();
    await advance(page,125,50);
    const faster=await state(page);
    assert(Math.abs(faster.time-beforeReset.time)<1e-9);
    assert.deepEqual(faster.privateHits,beforeReset.privateHits);assert.deepEqual(faster.coverage,beforeReset.coverage);
    await page.close();

    for(const [width,height,dpr] of [[1440,900,1],[844,390,1],[844,390,2],[390,844,2]]){
      const friendly=await open({width,height},dpr,true);
      const started=await state(friendly);
      assert.equal(started.selected,'U01');assert.match(started.eraText,/포탑 전 95%/);
      assert.equal(started.portrait,width<height);
      if(width<height){
        await advance(friendly,40);assert.equal((await state(friendly)).time,started.time);
        await friendly.setViewportSize({width:844,height:390});
        await friendly.waitForFunction(()=>!window.__TACTICAL__.snapshot().portraitBlocked,null,{polling:50});
      }
      await friendly.evaluate(()=>window.__TACTICAL__.mapView(950,2750,12));
      await advance(friendly,140);
      const final=await state(friendly);
      assert.equal(final.eraHidden,false);assert.match(final.eraText,/포탑 전 80%/);
      assert(Math.abs(final.canvasScale-dpr)<.03);assert(final.overflow<=0);
      await friendly.locator('#eraSummary').scrollIntoViewIfNeeded();
      assert(await friendly.locator('#eraSummary').isVisible());
      evidence.viewports.push({width,height,dpr,portraitRestored:width<height,initial:started.eraText,after:final.eraText});
      if(width>=height)await friendly.screenshot({path:path.join(out,`WIP24-friendly-${width}-dpr${dpr}.png`)});
      await friendly.locator('#scenarioSelect').selectOption('default');
      assert.equal(await friendly.locator('#eraSummary').isVisible(),false);
      await friendly.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'WIP24-browser-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log('PASS WIP24 Chromium coverage, impact, public redaction, pause, 2×, reset and friendly ERA across four viewports');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
