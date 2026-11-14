'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=process.env.T80U_REVIEW_DIR||'/tmp/t80u-art-review';fs.mkdirSync(out,{recursive:true});
const errors=[],checks=[];let browser;
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'dist/qa/T80U_TopView.html')));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});
 page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('http://127.0.0.1:'+server.address().port);
 assert.equal(await page.locator('#view [data-part]').count(),4);assert.ok(await page.locator('#view path').count()>400);checks.push('offline document loads and all four transform layers render');
 await page.screenshot({path:path.join(out,'model.png'),fullPage:true});
 // Test the actual DOM transform hierarchy, separately from the numeric helper.
 const retained=await page.evaluate(()=>{const path=document.querySelector('#view path');T80ULab.setPose({turret:70});return document.querySelector('#view path')===path;});assert.ok(retained);checks.push('rotation reuses geometry DOM instead of rebuilding paths each frame');
 const matrixResult=await page.evaluate(()=>{
  const poses=[{heading:31,turret:113,commander:-79,mg:52},{heading:-180,turret:179,commander:180,mg:-179},{heading:0,turret:90,commander:90,mg:90}];let error=0;
  for(const pose of poses){T80ULab.setPose(pose);const inverse=document.querySelector('#view').getScreenCTM().inverse(),land=T80UTopView.landmarks(pose);
   for(const [key,part,point] of [['muzzle','turret',T80UTopView.MODEL.muzzlePx],['commanderPivot','commander',T80UTopView.MODEL.commanderPivotPx],['mgPivot','mg',T80UTopView.MODEL.mgPivotPx]]){
    const matrix=inverse.multiply(document.querySelector(`[data-part="${part}"]`).getScreenCTM());const p=new DOMPoint(...point).matrixTransform(matrix);error=Math.max(error,Math.hypot(p.x-land[key][0],p.y-land[key][1]));
   }
  }return error;
 });assert.ok(matrixResult<1e-6,String(matrixResult));checks.push('DOM nested rotation matrices match independent world landmarks');
 await page.screenshot({path:path.join(out,'rotated.png'),fullPage:true});
 await page.click('#reset');await page.click('#reference');assert.ok((await page.evaluate(()=>T80ULab.getState())).reference);await page.locator('#opacity').fill('40');await page.locator('#opacity').dispatchEvent('input');assert.equal(await page.locator('#model').getAttribute('opacity'),'0.4');
 const image=await page.locator('#view image').getAttribute('href');assert.ok(image.startsWith('data:image/jpeg;base64,'));await page.screenshot({path:path.join(out,'overlay.png'),fullPage:true});checks.push('embedded reference overlay with adjustable opacity');
 await page.click('#reset');await page.selectOption('#aimPart','commander');const box=await page.locator('#stage').boundingBox();await page.mouse.click(box.x+box.width*.82,box.y+box.height*.45);
 await page.waitForFunction(()=>Math.abs(T80ULab.getState().commander)>10);assert.equal((await page.evaluate(()=>T80ULab.getState())).turret,0);checks.push('pointer aim rotates selected station without changing turret');
 await page.click('#reset');await page.click('#sweep');await page.waitForFunction(()=>Math.abs(T80ULab.getState().turret)>2);await page.click('#sweep');const stopped=await page.evaluate(()=>T80ULab.getState().turret);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>T80ULab.getState().turret),stopped);checks.push('automatic rotation starts and stops');
 for(const [selector,name] of [['#exportSvg','T80U_top_view.svg'],['#exportPng','T80U_top_view.png']]){
  const promise=page.waitForEvent('download');await page.click(selector);const d=await promise;assert.equal(d.suggestedFilename(),name);await d.saveAs(path.join(out,name));assert.ok(fs.statSync(path.join(out,name)).size>2000);
 }checks.push('SVG and PNG export produce downloadable files');
 const comparisons=await page.evaluate(async()=>{
  const results=[];for(const pose of [{heading:-90},{heading:27,turret:-93,commander:76,mg:135},{heading:179,turret:180,commander:90,mg:-90,lod:1,palette:'line'}]){
   const c=document.createElement('canvas');c.width=c.height=660;const ctx=c.getContext('2d');T80UTopView.draw(ctx,pose,{x:330,y:330,pixelsPerMetre:50});const a=ctx.getImageData(0,0,660,660).data;
   const img=new Image(),url=URL.createObjectURL(new Blob([T80UTopView.toSVG(pose)],{type:'image/svg+xml'}));await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});ctx.clearRect(0,0,660,660);ctx.drawImage(img,0,0,660,660);const b=ctx.getImageData(0,0,660,660).data;URL.revokeObjectURL(url);
   let error=0,visible=0;for(let i=0;i<a.length;i+=4){if(a[i+3]||b[i+3]){visible++;for(let k=0;k<4;k++)error+=Math.abs(a[i+k]-b[i+k]);}}results.push(error/(visible*4));
  }return results;
 });comparisons.forEach(v=>assert.ok(v<4,'Canvas/SVG pixel delta '+v));checks.push('Canvas and SVG agree at three combined poses/LOD settings');
 await page.setViewportSize({width:390,height:844});await page.click('#reset');await page.selectOption('#palette','sand');await page.locator('#turret').fill('90');await page.locator('#turret').dispatchEvent('input');assert.equal(await page.evaluate(()=>T80ULab.getState().turret),90);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});checks.push('390px mobile layout and controls without horizontal overflow');
 assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith('http://127.0.0.1:')||u.startsWith('data:')||u.startsWith('blob:')));checks.push('no console exceptions or external runtime dependencies');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,domTransformMaxError:matrixResult,canvasSvgMeanChannelDifferences:comparisons,errors},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,checks,comparisons,output:out},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
