'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/art/t80u-topview.js');
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-9,`${a} != ${b}`));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
test('source axes: front points +X, vehicle right +Y; uniform drawing scale',()=>{
 close(A.worldPoint([807,741]),[0,0]);close(A.worldPoint([707,641]),[100*A.MODEL.metresPerPixel,100*A.MODEL.metresPerPixel]);
 assert.ok(Math.abs(450*A.MODEL.metresPerPixel-3.628)<.03);
});
test('each rotation keeps its own pivot fixed and moves its children only',()=>{
 const base={heading:37,turret:69,commander:-113,mg:143},q=A.landmarks(base);
 close(q.turretPivot,A.landmarks({...base,turret:-142}).turretPivot);
 close(q.commanderPivot,A.landmarks({...base,commander:44}).commanderPivot);
 close(q.mgPivot,A.landmarks({...base,mg:-75}).mgPivot);
 close(q.muzzle,A.landmarks({...base,commander:15,mg:-3}).muzzle);
 assert.ok(distance(q.commanderPivot,A.landmarks({...base,turret:-142}).commanderPivot)>.3);
 assert.ok(distance(q.mgPivot,A.landmarks({...base,commander:44}).mgPivot)>.3);
});
test('muzzle follows quarter-turn positions rather than orbiting the hull origin',()=>{
 const s=A.MODEL.metresPerPixel,p=A.landmarks({turret:90});
 close(p.turretPivot,[-3*s,0]);close(p.muzzle,[-3*s,760*s]);
 close(A.landmarks({heading:90,turret:90}).muzzle,[-760*s,-3*s]);
});
test('combined parent rotations preserve barrel and local mount radii through wraparound',()=>{
 const zero=A.landmarks({});
 for(const heading of [-180,-90,0,90,179])for(const turret of [-180,-90,0,90,179])for(const commander of [-180,0,90]){
   const p={heading,turret,commander,mg:178},a=A.landmarks(p),b=A.landmarks({...p,heading:heading+360,turret:turret-720,commander:commander+360});
   for(const k of Object.keys(a))close(a[k],b[k]);
   for(const [x,y] of [['muzzle','turretPivot'],['sight','commanderPivot'],['mgMuzzle','mgPivot']])assert.ok(Math.abs(distance(a[x],a[y])-distance(zero[x],zero[y]))<1e-9);
 }
});
test('art module normalizes invalid input and never interpolates caller text into SVG',()=>{
 const p=A.normalize({heading:Infinity,turret:NaN,commander:721,mg:-541,lod:99,palette:'" onload="alert(1)'});
 assert.deepEqual(p,{heading:0,turret:0,commander:1,mg:179,lod:3,palette:'olive',axes:false,mgMounted:true});
 const svg=A.toSVG(p);assert.ok(!/NaN|Infinity|onload|undefined/.test(svg));assert.match(svg,/data-part="commander"/);
});
