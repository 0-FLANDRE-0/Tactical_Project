const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const MapSpec=require('../src/map-spec.js'),{makeMap,derived,loadCore}=require('./helpers/variable-map-fixture.cjs');

test('map contract rejects malformed or oversized metadata before runtime allocation',()=>{
 const base=makeMap({width:64,height:192,pattern:false});
 for(const edit of [m=>m.meta.width='64',m=>m.meta.height=-1,m=>m.meta.width=66,m=>m.heightmap.columns++,m=>m.terrain.rows++,m=>m.terrain.data='',m=>m.navigation.edges='',m=>m.meta.width=8016]){const map=structuredClone(base);edit(map);assert.throws(()=>MapSpec.validate(map));}
});

test('derived cache identity includes both independent axes and every grid',()=>{
 const map=makeMap({width:64,height:192,pattern:false}),spec=MapSpec.validate(map),bundle=derived(map);assert(MapSpec.validateDerived(spec,bundle.contours,'contour'));
 const wrong=structuredClone(bundle.contours);wrong.mapSpec.surfaceRows++;assert.throws(()=>MapSpec.validateDerived(spec,wrong,'contour'),/dimensions/);
 assert.equal(MapSpec.validateDerived(spec,null,'optional',{optional:true}),false);
});

test('asymmetric rectangle keeps x/y height, surface, building bucket and roof indices independent',()=>{
 const map=makeMap({width:64,height:192,building:true}),C=loadCore(map);
 assert.deepEqual(C.WORLD,{w:64,h:192,step:2,nav:16});assert.notEqual(C.heightAt(1,181),C.heightAt(61,1));
 assert.equal(C.surfaceCode(53,185),2);assert.equal(C.surfaceCode(5,5),0);
 assert.equal(C.buildingAt(35,157)?.id,'rect-south-building');
 const blocked=C.lineOfSight({x:10,y:150,profileId:'M1A2_1998'},{x:60,y:150},1.5,true,2.65);assert.equal(blocked.reason,'building');
});

test('actual-resolution 8x8 core moves, observes, fires and emits impact effects beyond the former 4km edge',()=>{
 const C=loadCore(makeMap()),route=C.planPath({x:5000,y:5200},{x:7600,y:5200});assert(route.ok);assert(route.points.at(-1).x>4000);
 const observer=C.makeTank('A','A',5200,5200,0,'blue',undefined,'hold'),target=C.makeTank('T','T',6200,5200,Math.PI,'red',undefined,'hold'),s={time:0,seed:1700,units:[observer,target],recordFireEvents:true};
 for(const channel of ['commander','gunner'])C.guard(s,observer,channel,{x:target.x,y:target.y});for(let i=0;i<240;i++)C.step(s,.05);
 const contact=C.contacts(s).find(value=>value.label==='T'||value.x===6200);assert(contact);assert(C.designate(s,observer,contact.key));for(let i=0;i<120;i++)C.step(s,.05);
 assert(C.requestFire(s,observer,contact.key).ok);for(let i=0;i<20;i++)C.step(s,.05);
 const events=C.fireEvents(s),effects=C.effectEvents(s),fired=events.find(value=>value.type==='fired'),impact=events.find(value=>value.type==='impact'),flight=effects.find(value=>value.kind==='fire'),impactEffect=effects.find(value=>value.kind==='impact');
 assert(fired&&impact&&flight&&impactEffect);assert(fired.origin.x>4000&&impact.impact.x>4000);assert.equal(impactEffect.flightEffectId,flight.id);assert.equal(observer.fireControl.ammo,41);
 assert(C.heightAt(7021,5017)>0);assert.equal(C.SPEC.heightmap.cells,16000000);
});

test('build selects one matching map bundle and rejects a mixed derived cache',()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'wip17-build-'));try{const map=makeMap({width:64,height:192,pattern:false}),bundle=derived(map),paths={map:path.join(dir,'map.json'),contours:path.join(dir,'contours.json'),terrain:path.join(dir,'terrain.json'),out:path.join(dir,'index.html')};fs.writeFileSync(paths.map,JSON.stringify(map));fs.writeFileSync(paths.contours,JSON.stringify(bundle.contours));fs.writeFileSync(paths.terrain,JSON.stringify(bundle.terrain));
  let result=spawnSync('python3',['build.py','--map',paths.map,'--contours',paths.contours,'--terrain',paths.terrain,'--output',paths.out],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert(fs.readFileSync(paths.out,'utf8').includes('64 × 192 m'));
  bundle.contours.sourceMapHash='wrong';fs.writeFileSync(paths.contours,JSON.stringify(bundle.contours));result=spawnSync('python3',['build.py','--map',paths.map,'--contours',paths.contours,'--terrain',paths.terrain,'--output',paths.out+'.bad'],{cwd:root,encoding:'utf8'});assert.notEqual(result.status,0);assert(!fs.existsSync(paths.out+'.bad'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
