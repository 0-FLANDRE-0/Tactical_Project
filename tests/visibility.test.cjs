const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const C=require('./load.cjs')(),V=require('../src/visibility.js');
let passed=0;const measurements=[];
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function flat(extra={}){return {WORLD:{w:2000,h:2000},VEHICLE:{eye:2.6,range:600},heightAt:()=>0,forestAt:()=>0,buildings:[],...extra};}
const o={x:700,y:1000};
const see=(r,x,y=1000)=>V.contains(r,x,y);
function building(x0,y0,x1,y1,roof){return {minX:x0,minY:y0,maxX:x1,maxY:y1,roof,rings:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]};}
test('flat terrain is visible in all directions up to the circular range',()=>{
 const r=V.compute(flat(),o);for(let i=0;i<36;i++){const a=i*Math.PI/18;assert(V.contains(r,o.x+Math.cos(a)*580,o.y+Math.sin(a)*580));assert(!V.contains(r,o.x+Math.cos(a)*610,o.y+Math.sin(a)*610));}assert.equal(r.loops.length,1);
});
test('thin buildings cast a continuous straight-sided shadow',()=>{
 const r=V.compute(flat({buildings:[building(800,980,800.4,1020,8)]}),o);
 assert(see(r,780));assert(!see(r,1000));assert(V.contains(r,1000,1120));
});
test('a farther hillside can reappear above a nearer roof',()=>{
 const r=V.compute(flat({buildings:[building(800,970,820,1030,8)],heightAt:x=>x<1050?0:(x-1050)*.8}),o);
 assert(!see(r,950));assert(see(r,1250));assert(r.loops.length>1);
});
test('a terrain crest hides its downslope but a higher ridge reappears',()=>{
 const heightAt=x=>x<780?0:x<820?(x-780)*.5:x<860?(860-x)*.5:x<1050?0:(x-1050)*.9;
 const r=V.compute(flat({heightAt}),o);assert(!see(r,980));assert(see(r,1280));
});
test('forest optical depth blocks a low line after sufficient canopy distance',()=>{
 const r=V.compute(flat({forestAt:(x,y)=>x>=800&&x<1000?.9:0}),o);
 assert(see(r,850));assert(!see(r,1150));
});
test('elevated lines can look over forest canopy',()=>{
 const r=V.compute(flat({forestAt:x=>x>=800&&x<1000?.9:0,heightAt:x=>x<1050?0:(x-1050)*.8}),o);
 assert(see(r,1280));
});
test('building courtyards use even-odd ring geometry',()=>{
 const b=building(800,900,1000,1100,10);b.rings.push([[850,950],[950,950],[950,1050],[850,1050],[850,950]]);
 const intervals=V.rayIntervals(b,{x:700,y:1000},1,0,600);assert.equal(intervals.length,2);assert.deepEqual(intervals.map(v=>[v.enter,v.exit]),[[100,150],[250,300]]);
});
test('world boundary clips visibility without open or invalid rings',()=>{
 const r=V.compute(flat(),{x:10,y:10});assert(!V.contains(r,-20,10));assert(V.contains(r,40,40));
 for(const ring of r.loops){assert(ring.length>=3);for(const p of ring)assert(p.every(Number.isFinite));}
});
for(const pos of [{x:550,y:2750},{x:2800,y:1800},{x:3200,y:2100}])test('vector coverage agrees with direct LOS at '+pos.x+','+pos.y,()=>{
 const o=C.legalNear(pos.x,pos.y),start=performance.now(),r=V.compute(C,o),ms=performance.now()-start;
 let matched=0,total=0;
 for(let i=0;i<3000;i++){
   const a=C.hash(i,1)*Math.PI*2,d=20+C.hash(i,2)*(C.VEHICLE.range-30),p={x:o.x+Math.cos(a)*d,y:o.y+Math.sin(a)*d};
   if(p.x<0||p.y<0||p.x>4000||p.y>4000)continue;
   total++;if(C.lineOfSight(o,p).visible===V.contains(r,p.x,p.y))matched++;
 }
 assert(matched/total>.98);assert(r.rayCount<=1980);assert(ms<2000);
 measurements.push({observer:o,matched,total,agreement:matched/total,computeMs:ms,rayCount:r.rayCount,loops:r.loops.length});
});
test('contours are bound to the gameplay heightmap and stay on their elevation',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/contours.json')));
 assert.equal(data.sourceMapHash,C.MAP.meta.mapHash);assert.equal(data.interval,10);assert.equal(data.sampleSpacing,2);
 let samples=0,maxError=0;
 for(const f of data.lines){assert.equal(f.level%10,0);for(let i=0;i<f.points.length;i+=11){const [x,y]=f.points[i];maxError=Math.max(maxError,Math.abs(C.heightAt(x,y)-f.level));samples++;}}
 assert(samples>2000);assert(maxError<.65);measurements.push({contourSamples:samples,maxElevationError:maxError});
});
const report={version:'0.4-WIP07A',passed,failed:0,measurements};fs.writeFileSync(path.join(__dirname,'visibility-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
