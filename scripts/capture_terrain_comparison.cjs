#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),child=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/releases'),baselineCommit='a037774a8348378563d1d3ddb7822a20eab19890';
const current=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
let before=child.execFileSync('git',['show',baselineCommit+':dist/index.html'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
if(!before.includes('mapView:'))before=before.replace('worldToScreen:toScreen\n','worldToScreen:toScreen,mapView:(x,y,zoom)=>{if([x,y,zoom].every(Number.isFinite)){camera.x=x;camera.y=y;camera.zoom=C.clamp(zoom,.1,32);clampCamera();}return{...camera};}\n');
if(!before.includes('mapView:'))throw Error('could not instrument baseline camera');
const zones=[
  {id:'west-forest-ridge',x:800,y:1500,zoom:.8,description:'숲 속 능선'},
  {id:'open-hill',x:1000,y:3400,zoom:.8,description:'개활지 언덕'},
  {id:'rasdorf-slope',x:2800,y:1550,zoom:.8,description:'마을 주변 사면'},
  {id:'south-east-valley',x:3250,y:3250,zoom:.8,description:'남동쪽 낮은 골짜기'},
];
const server=http.createServer((request,response)=>{response.setHeader('content-type','text/html; charset=utf-8');response.end(request.url==='/before'?before:current);});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const records=[];
  async function open(route){const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});await page.goto('http://127.0.0.1:'+server.address().port+route);await page.waitForFunction(()=>window.__TACTICAL__);if(!(await page.evaluate(()=>window.__TACTICAL__.snapshot().paused)))await page.locator('#pause').click();return page;}
  async function capture(page,zone,variant){const camera=await page.evaluate(zone=>window.__TACTICAL__.mapView(zone.x,zone.y,zone.zoom),zone);await page.waitForTimeout(120);const file=path.join(out,`WIP11D-${zone.id}-${variant}.png`);await page.locator('#mapWrap').screenshot({path:file});records.push({zone:zone.id,description:zone.description,variant,camera,file:path.relative(root,file),sha256:hash(file)});}
  try{
    const baseline=await open('/before');for(const zone of zones)await capture(baseline,zone,'before');await baseline.close();
    const page=await open('/current');for(const zone of zones)await capture(page,zone,'normal');await page.locator('#terrainMode').click();for(const zone of zones)await capture(page,zone,'terrain');await page.close();
  }finally{await browser.close();server.close();}
  const report={date:'2026-11-08',baselineCommit,baselineVersion:'0.4-WIP11C',currentVersion:'0.4-WIP11D',viewport:{width:1440,height:900,dpr:1},zones,records,notes:'Before, normal, and terrain variants use the exact recorded camera returned by the same mapView path. Chromium viewport evidence, not a physical-device test.'};
  fs.writeFileSync(path.join(out,'WIP11D-terrain-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({captures:records.length,zones:zones.length},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
