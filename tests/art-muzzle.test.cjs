const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const G=require('../src/vehicle-geometry.js'),A=require('../src/m1a2-art.js'),P=require('../src/vehicle-profiles.js'),model=P.M1A2.model;
const source=fs.readFileSync(path.join(__dirname,'../data/vehicles/references/M1_Abrams_TopView.html'),'utf8');
const reference=new Function('module',source.match(/<script>([\s\S]*?)<\/script>/)[1]+'\nreturn AbramsTopView;')({exports:{}});
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`),point=(a,b)=>{close(a.x,b[0]);close(a.y,b[1]);};
test('imported M1A2 hull/turret/CITV vectors match the checksum-pinned attachment exactly',()=>{
 const manifest=require('../data/vehicles/references/top_view_import.json');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),manifest.sha256);
 assert.deepEqual(JSON.parse(JSON.stringify(A.geometry)),reference.layers('M1A2'));assert(!('VARIANTS' in A));
});
test('profile keeps art origin, fixed hull ring axis and actual drawn muzzle separate',()=>{
 close(model.turretOrigin,reference.MODEL.turretOrigin);assert.deepEqual(model.turretPivot,reference.MODEL.turretPivot);assert.deepEqual(model.muzzleLocal,[5.717,0]);assert(Object.isFrozen(model.turretPivot));assert(Object.isFrozen(model.muzzleLocal));assert(!('turretCenter' in model));
});
test('side and rear traverse rotate the muzzle around the hull-mounted ring, not the hull centre',()=>{
 const u={x:100,y:200,heading:0,turret:0};point(G.muzzleWorld(u,model),[105.867,200]);u.turret=Math.PI/2;point(G.muzzleWorld(u,model),[100.66,205.207]);u.turret=Math.PI;point(G.muzzleWorld(u,model),[95.453,200]);u.heading=Math.PI/2;u.turret=0;point(G.muzzleWorld(u,model),[105.207,200.66]);
});
test('lateral pivot offsets and commander rotation do not corrupt the muzzle frame',()=>{
 const p={...model,turretPivot:[.66,.2]},u={x:0,y:0,heading:0,turret:Math.PI/2,commander:1};point(G.muzzleWorld(u,p),[.86,5.407]);const before=G.muzzleWorld(u,p);u.commander=-2;assert.deepEqual(G.muzzleWorld(u,p),before);
});
test('SVG export uses the new ring pivot and keeps the existing world-radian API',()=>{
 const svg=A.toSVG({heading:Math.PI/2,turretHeading:Math.PI,commanderHeading:0});assert(svg.includes('translate(0.66 0) rotate(90) translate(-0.51 0)'));assert(svg.includes('rotate(-180 0.424 -0.673)'));assert(svg.includes('class="race"'));assert(A.toSVG().includes(reference.layers('M1A2').hull[0].d));
});
test('registry rejects malformed pivot/muzzle data before any vehicle is created',()=>{
 for(const change of [p=>p.model.turretPivot=[NaN,0],p=>p.model.muzzleLocal=[1],p=>p.model.turretOrigin=Infinity,p=>p.model.turretRingDiameter=Infinity]){const p=structuredClone(P.M1A2);change(p);assert.throws(()=>P.registry.create([p]));}
});

test('public contact arrays are detached and remembered geometry does not follow a hidden profile change',()=>{
 const f=require('./helpers/observation-core-fixture.cjs').fixture('flat',{target:{x:1000,y:1000}});f.step(160);const c=f.contact();assert(c?.current);c.model.turretPivot[0]=999;c.model.muzzleLocal[0]=999;assert.deepEqual(f.contact().model.turretPivot,[.66,0]);assert.deepEqual(f.contact().model.muzzleLocal,[5.717,0]);
 f.t.x=3900;f.t.y=3900;f.t.profileOverride=structuredClone(P.M1A2);f.t.profileOverride.model.turretPivot[0]=1.2;f.t.profileOverride.model.muzzleLocal[0]=9;f.step(10);const memory=f.contact();assert(memory.memory);assert.equal(memory.x,1000);assert.deepEqual(memory.model.turretPivot,[.66,0]);assert.deepEqual(memory.model.muzzleLocal,[5.717,0]);
});
