const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,base,O}=require('./helpers/observation-fixture.cjs');
const near=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('R01 default FOVs and reciprocal scan envelopes, independent phases, smooth endpoint reversals',()=>{
 near(base.sensors.gunner.fov,Math.PI/6);near(base.sensors.commander.scan.amplitude,Math.PI/4);near(base.sensors.gunner.scan.amplitude,Math.PI/12);
 const f=fixture({visible:false}),poses={commander:[],gunner:[]};let previous={commander:0,gunner:0};
 for(let i=0;i<1000;i++){f.step();for(const ch of ['commander','gunner']){const value=ch==='gunner'?f.u.turret:f.u.commander,e=f.p.sensors[ch];assert(Math.abs(angle(value,f.u.heading))<=e.scan.amplitude+1e-8);assert(Math.abs(angle(value,previous[ch]))<=e.scan.rate*.05+1e-8);previous[ch]=value;poses[ch].push(value);}}
 for(const ch of ['commander','gunner']){assert(Math.min(...poses[ch])<-.95*f.p.sensors[ch].scan.amplitude);assert(Math.max(...poses[ch])>.95*f.p.sensors[ch].scan.amplitude);}
 assert.notEqual(f.u.observation.commander.scanPhase,f.u.observation.gunner.scanPhase);
});
test('R02 rotating/moving hull moves scan centre while rates remain bounded',()=>{
 const f=fixture({visible:false});for(let i=0;i<1000;i++){const old=[f.u.turret,f.u.commander];f.u.heading+=.001;f.u.x+=.1;f.step();assert(Math.abs(angle(f.u.turret,old[0]))<=f.p.sensors.gunner.rate*.05+1e-8);assert(Math.abs(angle(f.u.commander,old[1]))<=f.p.sensors.commander.rate*.05+1e-8);assert(Math.abs(angle(f.u.commander,f.u.heading))<=Math.PI/4+.02);assert(Math.abs(angle(f.u.turret,f.u.heading))<=Math.PI/12+.02);}
});
for(const hk of [true,false])test('R03–R05 commander-only suspicion cannot redirect gunner before explicit handoff, HK='+hk,()=>{
 const f=fixture({bearing:1.5}),idle=fixture({bearing:1.5,visible:false});f.p.sensors.hunterKiller=hk;f.guard();idle.guard();let detected=false,identified=false,handed=false;
 for(let i=0;i<180;i++){
  const pre=f.u.observation.designation.status,old=f.u.turret;f.step();idle.step();const c=f.u.observation.contacts['SECRET-ID'];
  if(c?.detected)detected=true;if(c?.identified)identified=true;
  if(f.u.observation.designation.status==='designated'){handed=true;assert(identified);assert(c.enemyConfirmed);assert.equal(c.identifiedBy,'commander');}
  if(!handed){near(f.u.turret,idle.u.turret);assert.equal(f.u.observation.gunner.focus,null);assert(!c?.sources.gunner.current);}
  if(pre==='designated'){assert(Math.abs(angle(f.u.turret,old))>0);assert(Math.abs(angle(f.u.turret,old))<=f.p.sensors.gunner.rate*.05+1e-8);}
 }
 assert(detected&&identified);assert.equal(handed,hk);assert.equal(f.runtime.ownStatus(f.u).acquired,hk);
 assert(!f.events.some(e=>e.type==='focus'&&e.channel==='gunner'&&e.time<(f.events.find(e=>e.type==='designated')?.time??Infinity)));
});
for(const hk of [true,false])test('R06 gunner own identification holds without fake commander handoff, HK='+hk,()=>{
 const f=fixture({bearing:0});f.p.sensors.hunterKiller=hk;f.p.sensors.commander.scan.amplitude=0;f.u.commander=1;f.u.observation.commander.focus=null;
 // Commander has narrower equipment in this fixture and sees no initial target.
 f.p.sensors.commander.fov=.1;f.p.sensors.commander.enabled=false;f.step(8);
 const c=f.u.observation.contacts['SECRET-ID'];assert(c.identified&&c.enemyConfirmed);assert.equal(c.identifiedBy,'gunner');assert(f.runtime.ownStatus(f.u).acquired);assert.equal(f.u.observation.tracking.source,'gunner');assert.equal(f.u.observation.designation.status,'idle');
 assert(!f.events.some(e=>e.type==='designated'));f.p.sensors.commander.enabled=true;f.step(3);assert.equal(f.u.observation.commander.focus,null);assert.equal(f.u.observation.commander.activity,'scan');assert(f.runtime.ownStatus(f.u).acquired);
});
test('R07 acquired gunner keeps target while second identified commander contact is queued',()=>{
 const f=fixture({bearing:0});f.p.sensors.commander.enabled=false;f.step(8);assert(f.runtime.ownStatus(f.u).acquired);
 const held=f.u.observation.tracking.key,second={...f.t,id:'SECOND',name:'SECOND',x:650,y:2500,observation:undefined};O.init(second);f.s.units.push(second);f.p.sensors.commander.enabled=true;f.guard('commander',{x:second.x,y:second.y});
 f.step(15);assert.equal(f.runtime.ownStatus(f.u).targetKey,held);assert(f.u.observation.pending.some(v=>v.target==='SECOND'));assert.equal(f.u.observation.designation.status,'idle');
 const pending=f.u.observation.pending.find(v=>v.target==='SECOND'),pose={...pending.pose};f.p.sensors.commander.enabled=false;second.x+=100;second.y+=200;f.step(2);assert.deepEqual(f.u.observation.pending.find(v=>v.target==='SECOND').pose,pose);f.step(30);assert(!f.u.observation.pending.some(v=>v.target==='SECOND'));
});
test('R08 explicit guard priority survives gunner acquisition and new contacts',()=>{
 const f=fixture({bearing:1.5});f.guard();f.step(10);assert.equal(f.u.observation.commander.mode,'guard');f.guard('gunner',{x:500,y:400});const point={...f.u.observation.gunner.point};f.step(8);assert.deepEqual(f.u.observation.gunner.point,point);assert.equal(f.u.observation.gunner.mode,'guard');assert(!f.runtime.ownStatus(f.u).acquired);
});
test('R09 ambient detection and unfinished identity decay use separate 8-second half-lives',()=>{
 const f=fixture({distance:150});f.p.sensors.gunner.enabled=false;f.p.sensors.hunterKiller=false;f.guard();f.step(1.2);const c=f.u.observation.contacts['SECRET-ID'],initial=c.identityEvidence,detect=c.evidence;assert(!c.identified&&initial>0);f.p.sensors.commander.enabled=false;f.step(8);near(c.identityEvidence/initial,.5,1e-9);assert(c.evidence>detect);assert(!c.identified);f.block(true);const d=c.evidence;f.step(8);near(c.evidence/d,.5,1e-9);
});
test('R10 complete identity knowledge survives short loss independently of current observation',()=>{
 const f=fixture({bearing:1.5});f.guard();f.step(8);const c=f.u.observation.contacts['SECRET-ID'];assert(c.identified);f.block(true);f.step(2);assert(c.identified&&!c.current);assert(c.pose);assert(c.sources.commander.firstSeen!==null);assert.equal(c.identifiedBy,'commander');
});
test('R11–R12 shared manual designation transfers knowledge but never own LOS/evidence/acquisition',()=>{
 const f=fixture();f.guard();f.step(8);const b={...f.u,id:'B',x:3500,y:3500,observation:undefined};O.init(b);f.s.units.push(b);f.step(.2);const contact=f.contacts()[0];assert(f.runtime.direct(b,contact.key));
 const c=b.observation.contacts['SECRET-ID'];assert(c.shared&&c.identified);assert.equal(c.current,false);assert.equal(c.evidence,0);assert.equal(c.identityEvidence,0);assert.equal(c.sources.gunner.detectedAt,null);f.step(2);assert(!f.runtime.ownStatus(b,contact.key).acquired);assert(!c.current);assert(f.contacts()[0].current);
 f.block(true);const pose=f.contacts()[0];f.t.x-=500;f.t.y+=500;f.step(.2);assert(f.contacts()[0].memory);near(f.contacts()[0].x,pose.x);near(b.observation.designation.pose.x,pose.x);
});
test('R13 commander range handoff stays bounded and does not extend gunner range',()=>{
 const f=fixture({distance:2300});f.guard();f.step(12);assert.equal(f.u.observation.designation.reason,'range');assert(!f.runtime.ownStatus(f.u).acquired);f.step(18);assert.equal(f.u.observation.designation.status,'expired');assert.equal(f.p.sensors.gunner.range,2000);
});
test('R22 disabled/linked commander and HK flags remain independent',()=>{
 for(const independent of [true,false])for(const hk of [true,false]){const f=fixture();f.p.sensors.commander.independent=independent;f.p.sensors.commander.enabled=false;f.p.sensors.hunterKiller=hk;f.step(8);assert(f.runtime.ownStatus(f.u).acquired);assert.equal(f.u.observation.tracking.source,'gunner');assert.equal(f.u.observation.designation.status,'idle');near(f.u.commander,f.u.turret);}
});
test('R07 automatic commander resumes scanning after queuing another confirmed target',()=>{
 const f=fixture();f.p.sensors.commander.enabled=false;f.step(8);assert(f.runtime.ownStatus(f.u).acquired);const second={...f.t,id:'SECOND',name:'SECOND',x:f.u.x+1000*Math.cos(.7),y:f.u.y+1000*Math.sin(.7),observation:undefined};O.init(second);f.s.units.push(second);f.p.sensors.commander.enabled=true;
 let queued=false;for(let i=0;i<600;i++){f.step();if(f.u.observation.pending.some(v=>v.target==='SECOND')){queued=true;f.step(.2);assert.notEqual(f.u.observation.commander.focus,'SECOND');assert.equal(f.u.observation.commander.activity,'scan');break;}}
 assert(queued);assert.equal(f.u.observation.tracking.target,'SECRET-ID');assert(f.runtime.ownStatus(f.u).acquired);
});
test('source history and confirmation owner survive channel loss without fake self discovery',()=>{
 const f=fixture({bearing:1.5});f.guard();f.step(8);const c=f.u.observation.contacts['SECRET-ID'];assert.equal(c.detectedBy,'commander');assert.equal(c.identifiedBy,'commander');assert.equal(c.confirmationOwner,'gunner');const when=c.sources.commander.detectedAt;f.block(true);f.step(.2);assert.equal(c.sources.commander.detectedAt,when);assert(!c.sources.commander.current);assert.equal(c.identifiedBy,'commander');
});
