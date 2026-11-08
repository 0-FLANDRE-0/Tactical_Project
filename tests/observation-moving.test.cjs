const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {fixture,core,original}=require('./helpers/observation-core-fixture.cjs');
const near=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
const evidence=[];
test('R14 moving target crosses actual gunner FOV boundaries without stale observation',()=>{
 const f=fixture('flat',{target:{x:1200,y:600}});f.u.profileOverride=structuredClone(f.C.PROFILE);f.u.profileOverride.sensors.commander.enabled=false;f.C.guard(f.s,f.u,'gunner',{x:2000,y:1000});const seen=[];
 f.step(800,(now,u,t)=>{const a=(-25+50*(now/40))*Math.PI/180;t.x=u.x+700*Math.cos(a);t.y=u.y+700*Math.sin(a);});
 // Repeat with trajectory samples to inspect actual channel decisions.
 const g=fixture('flat',{target:{x:1200,y:600}});g.u.profileOverride=structuredClone(g.C.PROFILE);g.u.profileOverride.sensors.commander.enabled=false;g.C.guard(g.s,g.u,'gunner',{x:2000,y:1000});
 for(let i=0;i<800;i++){g.step(1,(now,u,t)=>{const a=(-25+50*(now/40))*Math.PI/180;t.x=u.x+700*Math.cos(a);t.y=u.y+700*Math.sin(a);});if(i%20===0)seen.push({time:g.s.time,angle:Math.atan2(g.t.y-g.u.y,g.t.x-g.u.x)*180/Math.PI,current:g.local()?.sources.gunner.current??false});}
 assert(seen.some(v=>Math.abs(v.angle)<10&&v.current));assert(seen.filter(v=>v.angle>17).every(v=>!v.current));assert(g.contact().memory);assert.deepEqual(f.u.observation,g.u.observation);evidence.push({id:'R14',fixture:'flat',trajectory:'radius 700m, bearing -25 to +25 deg over 40s; fixed gunner guard east',seen});
});
test('R15/R20 real building occludes a moving target, freezes all memory poses, then refreshes on reappearance',()=>{
 const f=fixture('building');f.step(160);assert(f.contact()?.identified);assert(f.C.designate(f.s,f.u,f.contact().key));let frozen=null;const samples=[];
 f.step(240,(now,u,t)=>{t.y=1300-Math.min(300,(now-8)*30);t.heading=.1*now;});assert(!f.local().current);frozen=f.contact();const pose={x:frozen.x,y:frozen.y,heading:frozen.heading,turret:frozen.turret,commander:frozen.commander},aimPose={...f.u.observation.designation.pose};
 f.step(40,(now,u,t)=>{t.y=1000;t.x+=.2;t.heading+=.01;});for(const[k,v]of Object.entries(pose))near(f.contact()[k],v);assert(f.contact().memory);assert.deepEqual(f.u.observation.designation.pose,aimPose);
 f.step(240,(now,u,t)=>{t.y=1000-Math.min(300,(now-22)*30);});assert(f.contact().current);assert.notEqual(f.contact().y,pose.y);assert(f.contact().identified);
 samples.push({hiddenPose:pose,reappeared:{x:f.contact().x,y:f.contact().y}});evidence.push({id:'R15/R20',fixture:'20m roof x980..1020/y900..1100; observer500/1000; target1500/1300 to1500/1000 then1508/700',samples,events:f.events()});
});
test('R15 ridge masks a moving low target and does not accumulate blocked evidence',()=>{
 const f=fixture('ridge',{target:{x:750,y:1000}});f.C.guard(f.s,f.u,'commander',{x:2000,y:1000});f.C.guard(f.s,f.u,'gunner',{x:2000,y:1000});f.step(160);assert(f.contact()?.identified);
 f.step(500,(now,u,t)=>{t.x=750+Math.min(550,(now-8)*22);});assert(!f.local().current);const initial=f.local().evidence,pose={...f.contact()};f.step(40,(now,u,t)=>{t.x+=.3;});assert(f.local().evidence<initial);near(f.contact().x,pose.x);evidence.push({id:'R15-ridge',fixture:'triangular crest centred x1000, height40m; target750 to1300 at22m/s',lastSeen:f.local().lastSeen,events:f.events()});
});
test('R16 moving target forest depth attenuates current quality and blocks beyond optical threshold',()=>{
 const f=fixture('forest',{target:{x:750,y:1000}});f.C.guard(f.s,f.u,'commander',{x:2000,y:1000});f.C.guard(f.s,f.u,'gunner',{x:2000,y:1000});f.step(160);const initial=f.C.exposure(f.u,f.t).forestDepth;assert.equal(initial,0);f.step(90,(now,u,t)=>{t.x=750+(now-8)*20;});const middle=f.C.exposure(f.u,f.t);assert(middle.visible&&middle.forestDepth>.2);f.step(200,(now,u,t)=>{t.x=750+(now-8)*20;});assert(!f.local().current);assert(f.contact().memory);const pose=f.contact().x;f.step(20,(now,u,t)=>{t.x+=1;});near(f.contact().x,pose);evidence.push({id:'R16',fixture:'forest x800..900, density0.9; target750 eastward20m/s',initialDepth:initial,middleDepth:middle.forestDepth,lastSeen:f.local().lastSeen,events:f.events()});
});
test('R17 actual hull/turret rotation and sensor height invalidate affected cached rays',()=>{
 const C=core(),u=C.makeTank('A','A',500,1000,0,'blue',undefined,'hold'),t=C.makeTank('T','T',1500,1000,0,'red',undefined,'hold'),cache={time:1,maxAge:.5,samples:[]};assert.equal(C.exposure(u,t,2.65,cache).rayQueries,9);cache.time=1.1;assert.equal(C.exposure(u,t,2.65,cache).rayCacheHits,9);t.heading+=.3;assert.equal(C.exposure(u,t,2.65,cache).rayQueries,4);t.turret+=.4;assert.equal(C.exposure(u,t,2.65,cache).rayQueries,2);assert.equal(C.exposure(u,t,2.5,cache).rayQueries,9);
});
test('R18 two moving endpoints force current LOS and no unchanged-ray reuse',()=>{
 const f=fixture();f.step(160);const before=f.C.observationStats(f.s);f.step(160,(now,u,t)=>{u.x+=.05;u.y+=.025;t.x+=.1;t.y+=.04;});const after=f.C.observationStats(f.s);assert(after.rayQueries>before.rayQueries);assert.equal(after.rayCacheHits-before.rayCacheHits,0);assert(f.local().current);evidence.push({id:'R18',trajectory:'observer(+1,+0.5)m/s, target(+2,+0.8)m/s for8s',rayQueries:after.rayQueries-before.rayQueries,rayCacheHits:after.rayCacheHits-before.rayCacheHits});
});
test('R19 moving observer keeps the same explicit world guard point',()=>{
 const f=fixture();const point={...f.u.observation.commander.point};f.step(400,(now,u)=>{u.x+=.1;u.y+=.05;});assert.deepEqual(f.u.observation.commander.point,point);near(f.u.commander,Math.atan2(point.y-f.u.y,point.x-f.u.x));
});
test('R21 moving trajectories reproduce at equal fixed steps despite render batching/reads',()=>{
 const a=fixture(),b=fixture(),move=(now,u,t)=>{u.x=500+now;t.y=1300+Math.sin(now*.2)*50;};for(let i=0;i<200;i++){a.step(2,move);a.C.contacts(a.s);a.C.ownObservation(a.s,a.u);b.step(1,move);b.C.contacts(b.s);b.step(1,move);}assert.deepEqual(a.s,b.s);assert.deepEqual(a.C.contacts(a.s),b.C.contacts(b.s));
});
test('R11/R12 actual core team contact is not own observation on a range-limited second observer',()=>{
 const f=fixture();const b=f.C.makeTank('B','B',500,1100,0,'blue',undefined,'hold');b.profileOverride=structuredClone(f.C.PROFILE);b.profileOverride.sensors.commander.enabled=false;b.profileOverride.sensors.gunner.range=100;f.s.units.push(b);f.step(200);const c=f.contact();assert(c?.identified);assert(!f.C.ownObservation(f.s,b,c.key).current);assert(f.C.designate(f.s,b,c.key));f.step(40);assert(!f.C.ownObservation(f.s,b,c.key).acquired);assert.equal(b.observation.contacts.T.evidence,0);b.profileOverride.sensors.gunner.range=2000;f.step(160);assert(f.C.ownObservation(f.s,b,c.key).acquired);assert.equal(b.observation.contacts.T.knowledgeSource,'team');
});
test.after(()=>fs.writeFileSync(path.resolve(__dirname,'releases/WIP10-moving-regressions.json'),JSON.stringify({kind:'actual core/real sample LOS; explicitly synthetic terrain; no UI mock contacts',seed:17,originalMapHash:original.MAP.meta.mapHash,evidence},null,2)+'\n'));
test('R11 actual building blocks B own sensing while scout A supplies the visible team contact',()=>{
 const f=fixture('building',{observer:{x:500,y:1300},target:{x:1500,y:1000}}),b=f.C.makeTank('B','MASKED OBSERVER',500,1000,0,'blue',undefined,'hold');f.s.units.push(b);f.step(200);const c=f.contact();assert(c?.identified&&c.current);assert(!f.C.exposure(b,f.t).visible);assert(!f.C.ownObservation(f.s,b,c.key).current);assert(f.C.designate(f.s,b,c.key));f.step(40);const own=f.C.ownObservation(f.s,b,c.key);assert(!own.current&&!own.acquired);assert.equal(own.reason,'occluded');assert.equal(b.observation.contacts.T.evidence,0);
});
test('R11 reverse-facing B never gains own observation merely from team display',()=>{
 const f=fixture(),b=f.C.makeTank('B','REVERSE OBSERVER',500,900,Math.PI,'blue',undefined,'hold');f.s.units.push(b);f.step(200);const c=f.contact();assert(c?.current&&c.identified);assert(f.C.exposure(b,f.t).visible);assert(!f.C.ownObservation(f.s,b,c.key).current);assert(!b.observation.contacts.T?.detected);assert(!f.C.ownObservation(f.s,b,c.key).acquired);
});
