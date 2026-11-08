#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),child=require('child_process'),os=require('os');
const root=path.resolve(__dirname,'..'),baselineCommit='a037774a8348378563d1d3ddb7822a20eab19890';
const instrument=`<script>
window.__mapPerf={rebuilds:[],draws:[]};
{const rebuild=TacticalRenderer.prototype.rebuild,draw=TacticalRenderer.prototype.draw;
 TacticalRenderer.prototype.rebuild=function(...args){const start=performance.now();try{return rebuild.apply(this,args);}finally{window.__mapPerf.rebuilds.push(performance.now()-start);}};
 TacticalRenderer.prototype.draw=function(...args){const count=window.__mapPerf.rebuilds.length,start=performance.now();try{return draw.apply(this,args);}finally{window.__mapPerf.draws.push({ms:performance.now()-start,cache:count===window.__mapPerf.rebuilds.length});}};}
</script><script id="app-code">`;
function prepare(html){
  if(!html.includes('mapView:'))html=html.replace('worldToScreen:toScreen\n','worldToScreen:toScreen,mapView:(x,y,zoom)=>{if([x,y,zoom].every(Number.isFinite)){camera.x=x;camera.y=y;camera.zoom=C.clamp(zoom,.1,32);clampCamera();}return{...camera};}\n');
  if(!html.includes('mapView:'))throw Error('could not instrument camera');
  return html.replace('<script id="app-code">',instrument);
}
const pages={before:prepare(child.execFileSync('git',['show',baselineCommit+':dist/index.html'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024})),current:prepare(fs.readFileSync(path.join(root,'dist/index.html'),'utf8'))};
const server=http.createServer((request,response)=>{response.setHeader('content-type','text/html; charset=utf-8');response.end(request.url.startsWith('/before')?pages.before:pages.current);});
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*p,low=Math.floor(index),high=Math.ceil(index);return sorted[low]+(sorted[high]-sorted[low])*(index-low);};
const summary=values=>({samples:values.length,medianMs:percentile(values,.5),p95Ms:percentile(values,.95),maxMs:Math.max(...values)});
const sequence=Array.from({length:36},(_,i)=>({x:760+(i*431)%2480,y:560+(i*613)%2880,zoom:[.25,.42,.8,1.35,2.2,.65][i%6]}));
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  async function run(route,terrainMode){
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});await page.goto('http://127.0.0.1:'+server.address().port+'/'+route);await page.waitForFunction(()=>window.__TACTICAL__&&window.__mapPerf.rebuilds.length);if(!(await page.evaluate(()=>window.__TACTICAL__.snapshot().paused)))await page.locator('#pause').click();await page.waitForTimeout(100);
    const initial=await page.evaluate(()=>({rebuilds:[...window.__mapPerf.rebuilds],camera:window.__TACTICAL__.snapshot().camera}));
    if(terrainMode)await page.locator('#terrainMode').click();await page.waitForTimeout(80);await page.evaluate(()=>{window.__mapPerf.rebuilds=[];window.__mapPerf.draws=[];});
    const cameras=[];
    for(let i=0;i<sequence.length;i++){
      cameras.push(await page.evaluate(view=>window.__TACTICAL__.mapView(view.x,view.y,view.zoom),sequence[i]));
      await page.waitForFunction(target=>window.__mapPerf.rebuilds.length>=target,i+1);
    }
    const rebuilds=await page.evaluate(()=>[...window.__mapPerf.rebuilds]);
    await page.evaluate(()=>{window.__mapPerf.rebuilds=[];window.__mapPerf.draws=[];});
    await page.evaluate(()=>new Promise(resolve=>{let frames=0;const next=()=>++frames>=120?resolve():requestAnimationFrame(next);requestAnimationFrame(next);}));
    const idle=await page.evaluate(()=>({rebuilds:[...window.__mapPerf.rebuilds],draws:window.__mapPerf.draws.filter(value=>value.cache).map(value=>value.ms),stats:window.__TACTICAL__.rendererStats?.()??null}));
    await page.close();return{initialRebuild:summary(initial.rebuilds),cameraSequence:cameras,rebuild:summary(rebuilds),idle120Frames:{unexpectedRebuilds:idle.rebuilds.length,cacheDraw:summary(idle.draws),rendererStats:idle.stats}};
  }
  try{
    const before=await run('before',false),normal=await run('current',false),terrain=await run('current',true);
    if(JSON.stringify(before.cameraSequence)!==JSON.stringify(normal.cameraSequence)||JSON.stringify(normal.cameraSequence)!==JSON.stringify(terrain.cameraSequence))throw Error('camera sequences differ');
    if(before.idle120Frames.unexpectedRebuilds||normal.idle120Frames.unexpectedRebuilds||terrain.idle120Frames.unexpectedRebuilds)throw Error('static camera rebuilt');
    const report={version:'0.4-WIP11D',date:'2026-11-08',browser:await browser.version(),node:process.version,cpu:os.cpus()[0]?.model,viewport:{width:1440,height:900,dpr:1},baselineCommit,sequence:{rebuilds:sequence.length,cameras:before.cameraSequence},beforeWIP11C:before,wip11dNormal:normal,wip11dTerrain:terrain,notes:'Actual headless Chromium CPU time for the map renderer at an identical fixed camera sequence. Initial build, 36 forced pan/zoom camera rebuilds, and 120 static cache frames are separated. These timings are not whole-game FPS or physical-device results.'};
    fs.writeFileSync(path.join(root,'tests/releases/WIP11D-terrain-benchmark.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({before:before.rebuild,normal:normal.rebuild,terrain:terrain.rebuild,staticRebuilds:[before.idle120Frames.unexpectedRebuilds,normal.idle120Frames.unexpectedRebuilds,terrain.idle120Frames.unexpectedRebuilds]},null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
