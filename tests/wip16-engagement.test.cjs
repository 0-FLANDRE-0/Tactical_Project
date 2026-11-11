const test=require('node:test'),assert=require('node:assert/strict');
const AI=require('../src/tactical-ai.js'),Profiles=require('../src/vehicle-profiles.js');
const profile=Profiles.M1A2_1998;

function unit(id='AI'){
  return{id,team:'red',x:0,y:0,heading:0,turret:0,speed:0,drive:{velocity:0},path:[],goal:null,combat:{status:'alive'},fireControl:{ammo:42,fireMode:'auto',autoSuppressed:false,aimProgress:.6,lineProbeQueries:0,lineProbeTarget:null,lineProbeBlocked:false,lineProbeResult:null,lineProbeRequest:null},observation:{contacts:{},designation:{status:'idle'},tracking:{status:'idle'}}};
}
function addContact(u,id,{x=1000,y=0,key='contact-'+id,current=true,identified=true,enemyConfirmed=true,wreckConfirmed=false,gunner=false,identifiedAt=1,lastSeen=1}={}){
  u.observation.contacts[id]={key,current,identified,enemyConfirmed,wreckConfirmed,lastSeen,identifiedAt,pose:{x,y,heading:0,turret:0},sources:{gunner:{current:gunner}}};return u.observation.contacts[id];
}
function harness(settings={},options={}){
  const calls={select:[],clear:[],stop:[],move:[],suppress:[],probe:[],events:[]};
  const active=d=>d&&['designated','waiting','acquiring','acquired'].includes(d.status);
  const runtime=AI.create({profileOf:()=>profile,settings,groundHeight:options.groundHeight||(()=>0),
    move:(u,p)=>{calls.move.push({id:u.id,p:{...p}});u.goal={...p};u.path=[{...p}];return{ok:true};},
    stop:u=>{calls.stop.push(u.id);u.goal=null;u.path=[];u.drive.velocity=0;},
    suppressAuto:(u,v)=>{calls.suppress.push(v);u.fireControl.autoSuppressed=v;},
    probeTarget:(u,key)=>{calls.probe.push(key);u.fireControl.lineProbeRequest=key;return true;},
    selectTarget:(u,id,now)=>{calls.select.push({id,now});if(options.reject?.has(id))return false;const previous=[u.observation.designation,u.observation.tracking].find(active);if(previous?.target!==id)u.fireControl.aimProgress=0;const c=u.observation.contacts[id];u.observation.designation={status:'designated',target:id,key:c.key,source:'ai',pose:{...c.pose},startedAt:now};u.observation.tracking={status:'idle'};return true;},
    clearTarget:(u,now,reason,target)=>{const d=[u.observation.designation,u.observation.tracking].find(active);if(d?.source==='ai'&&(target==null||d.target===target))d.status='lost';calls.clear.push({now,reason,target});return true;},
    targetStatus:u=>[u.observation.designation,u.observation.tracking].find(active)||null,onEvent:e=>calls.events.push(e)});
  const assign=(u,policy='maintain')=>runtime.assign(u,{id:'mission',type:'patrol',policy,loop:true,waypoints:[{x:100,y:0},{x:200,y:0}]},0);
  const advance=(units,to,from=0)=>{let now=from;while(now+.05<=to+1e-9){now=+(now+.05).toFixed(10);runtime.advance(units,.05,now);}return now;};
  return{runtime,calls,assign,advance};
}

test('W16 tuning defaults retain distributed decisions and define stable target switching',()=>{
  assert.deepEqual({period:AI.defaults.decisionPeriod,hold:AI.defaults.targetMinHold,margin:AI.defaults.switchMargin,confirmations:AI.defaults.switchConfirmations,blockedRetry:AI.defaults.blockedRetry,blockedAlongChange:AI.defaults.blockedAlongChange,blockedHeightChange:AI.defaults.blockedHeightChange},{period:.75,hold:2.25,margin:.20,confirmations:2,blockedRetry:2,blockedAlongChange:192,blockedHeightChange:.5});
});

test('W16 target score ignores recency, uses gunner/retention bonuses and deterministic tie breaks',()=>{
  const choose=reverse=>{const u=unit('TIE'),h=harness({decisionPeriod:.25});const entries=[['B',{x:1000,key:'contact-b',identifiedAt:2,lastSeen:99}],['A',{x:1000,key:'contact-a',identifiedAt:2,lastSeen:1}]];for(const [id,v]of reverse?entries:entries.slice().reverse())addContact(u,id,v);h.assign(u);h.advance([u],.5);return{state:h.runtime.inspect(u),calls:h.calls};};
  const a=choose(false),b=choose(true);assert.equal(a.state.autoTargetId,'A');assert.equal(b.state.autoTargetId,'A');assert.equal(a.calls.select.length,1);assert.equal(b.calls.select.length,1);
  const u=unit('SCORE'),h=harness({decisionPeriod:.25});addContact(u,'near',{x:900,lastSeen:1});addContact(u,'recent',{x:1800,lastSeen:100,gunner:true});h.assign(u);h.advance([u],.5);assert.equal(h.runtime.inspect(u).autoTargetId,'near');
});

test('W16 valid target is held 2.25 seconds and switches only after two consecutive 0.20 advantages',()=>{
  const u=unit('HOLD'),h=harness({decisionPeriod:.5,targetMinHold:2.25,switchMargin:.20,switchConfirmations:2});const a=addContact(u,'A',{x:500}),b=addContact(u,'B',{x:1900});h.assign(u);let now=h.advance([u],1);let state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'A');assert.equal(h.calls.select.length,1);const selectedAt=state.targetSelectedAt;
  a.pose.x=1900;b.pose.x=100;
  now=h.advance([u],selectedAt+2.24,now);assert.equal(h.runtime.inspect(u).autoTargetId,'A');assert.equal(h.calls.select.length,1);
  now=h.advance([u],selectedAt+2.8,now);assert.equal(h.runtime.inspect(u).autoTargetId,'A');assert.equal(h.runtime.inspect(u).challengerCount,1);
  h.advance([u],selectedAt+3.3,now);state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'B');assert.equal(state.counters.targetSwitches,1);assert.deepEqual(h.calls.select.map(v=>v.id),['A','B']);
});

test('W16 manual designation wins immediately and cancellation resumes automatic ownership without masquerading source',()=>{
  const u=unit('MANUAL'),h=harness({decisionPeriod:.5});addContact(u,'A',{x:500});addContact(u,'B',{x:700});h.assign(u);let now=h.advance([u],1);assert.equal(h.runtime.inspect(u).autoTargetId,'A');
  u.observation.designation={status:'designated',target:'B',key:'contact-B',source:'manual',pose:{x:700,y:0}};h.runtime.manualChanged(u,now);now=h.advance([u],now+.1,now);assert.equal(u.observation.designation.source,'manual');assert.equal(u.observation.designation.target,'B');assert.deepEqual(h.calls.select.map(v=>v.id),['A']);
  u.observation.designation={status:'cancelled',source:'manual'};h.runtime.manualChanged(u,now);h.advance([u],now+.1,now);assert.equal(u.observation.designation.source,'ai');assert.equal(u.observation.designation.target,'A');assert.deepEqual(h.calls.select.map(v=>v.id),['A','A']);
});

test('W16 automatic candidates exclude shared memory, unidentified, wreck and out-of-range contacts',()=>{
  const u=unit('BOUNDARY'),h=harness({decisionPeriod:.25});addContact(u,'shared',{x:100,current:false});u.observation.contacts.shared.shared={pose:{x:100,y:0}};addContact(u,'unknown',{x:200,identified:false});addContact(u,'wreck',{x:300,wreckConfirmed:true});addContact(u,'far',{x:2200});addContact(u,'valid',{x:1900});h.assign(u,'halt');h.advance([u],.5);assert.equal(h.runtime.inspect(u).autoTargetId,'valid');assert.deepEqual(h.calls.select.map(v=>v.id),['valid']);assert.equal(h.calls.stop.length,1);
  u.observation.contacts.valid.current=false;h.advance([u],1,.5);assert.equal(h.runtime.inspect(u).behavior,'observe');
});

test('W16 fire-line block uses the existing result, changes target once and invalidates retry on geometry change',()=>{
  const u=unit('BLOCK'),h=harness({decisionPeriod:.25,blockedRetry:2});const a=addContact(u,'A',{x:400}),b=addContact(u,'B',{x:800});h.assign(u);let now=h.advance([u],.5);assert.equal(h.runtime.inspect(u).autoTargetId,'A');assert(h.runtime.fireBlocked(u,'A','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],.8,now);let state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'B');assert.equal(state.counters.blockedTargets,1);assert.deepEqual(h.calls.select.map(v=>v.id),['A','B']);
  a.pose.y=20;now=h.advance([u],1.1,now);state=h.runtime.inspect(u);assert(!Object.hasOwn(state.blockedCandidates,'A'));assert.equal(h.calls.select.length,2);
});

test('W16 reload keeps engagement while total ammunition zero releases stop and resumes once',()=>{
  const u=unit('AMMO'),h=harness({decisionPeriod:.25,lossGrace:.5,observationHold:.5});addContact(u,'A',{x:500});h.assign(u,'halt');let now=h.advance([u],.8);let state=h.runtime.inspect(u);assert.equal(state.mission.status,'paused');assert.equal(state.autoTargetId,'A');u.fireControl.loaded=false;now=h.advance([u],1.3,now);assert.equal(h.runtime.inspect(u).autoTargetId,'A');
  u.fireControl.ammo=0;now=h.advance([u],1.6,now);state=h.runtime.inspect(u);assert.equal(state.autoTargetId,null);assert.equal(state.mission.status,'active');assert.equal(state.counters.resumes,1);assert(!u.fireControl.autoSuppressed);h.advance([u],2.5,now);assert.equal(h.runtime.inspect(u).counters.resumes,1);
});

test('W16 confirmed wreck bypasses target hold and loss grace',()=>{
  const u=unit('WRECK'),h=harness({decisionPeriod:.75,lossGrace:1.5,observationHold:2.5});const c=addContact(u,'A',{x:500});h.assign(u,'halt');let now=h.advance([u],1);assert.equal(h.runtime.inspect(u).mission.status,'paused');c.wreckConfirmed=true;now=h.advance([u],now+.05,now);const state=h.runtime.inspect(u);assert.equal(state.autoTargetId,null);assert.equal(state.mission.status,'active');assert.equal(state.counters.resumes,1);assert(h.calls.clear.some(v=>v.reason==='confirmed-wreck'));
});

test('W16 persistent blocked geometry retries separately, then resumes one preserved mission without stop loops',()=>{
  const u=unit('BLOCK-TIMEOUT'),h=harness({decisionPeriod:.25,blockedRetry:2,lossGrace:1.5,observationHold:2.5});addContact(u,'A',{x:500});h.assign(u,'halt');let now=h.advance([u],.5);assert.equal(h.calls.stop.length,1);
  assert(h.runtime.fireBlocked(u,'A','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],2.8,now);assert.equal(h.runtime.inspect(u).autoTargetId,'A');assert(h.runtime.fireBlocked(u,'A','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],5,now);
  let state=h.runtime.inspect(u);assert.equal(state.mission.id,'mission');assert.equal(state.mission.index,0);assert.equal(state.mission.status,'active');assert.equal(state.counters.stops,1);assert.equal(state.counters.resumes,1);assert.equal(state.counters.blockedTargets,2);assert.equal(state.autoTargetId,null);assert(state.blockedCandidates.A.abandoned);const commands=state.counters.targetCommands;
  now=h.advance([u],8,now);state=h.runtime.inspect(u);assert.equal(state.counters.stops,1);assert.equal(state.counters.resumes,1);assert.equal(state.counters.targetCommands,commands);
});

test('W16 all blocked candidates share one termination wait while a new alternative or changed line remains eligible',()=>{
  const u=unit('BLOCK-MULTI'),h=harness({decisionPeriod:.25,blockedRetry:2,lossGrace:.5,observationHold:.5});const a=addContact(u,'A',{x:400}),b=addContact(u,'B',{x:700});h.assign(u,'halt');let now=h.advance([u],.5);assert(h.runtime.fireBlocked(u,'A','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],.8,now);assert.equal(h.runtime.inspect(u).autoTargetId,'B');assert(h.runtime.fireBlocked(u,'B','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],2,now);
  let state=h.runtime.inspect(u);assert.equal(state.mission.status,'active');assert.equal(state.counters.stops,1);assert.equal(state.counters.resumes,1);assert(state.blockedCandidates.A.abandoned&&state.blockedCandidates.B.abandoned);
  addContact(u,'C',{x:600});now=h.advance([u],2.5,now);state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'C');assert.equal(state.mission.status,'paused');assert.equal(state.counters.stops,2);
  h.runtime.fireBlocked(u,'C','fire-line-blocked',now);u.observation.designation.status='lost';a.pose.y=24;now=h.advance([u],3,now);state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'A');assert(state.blockedCandidates.A.probePending);assert(u.fireControl.autoSuppressed);assert(h.calls.probe.includes(a.key));u.fireControl.lineProbeQueries=state.blockedCandidates.A.probeQueries+1;u.fireControl.lineProbeTarget=a.key;u.fireControl.lineProbeBlocked=false;u.fireControl.lineProbeResult='clear';now=h.advance([u],3.3,now);state=h.runtime.inspect(u);assert(!Object.hasOwn(state.blockedCandidates,'A'));
});

test('W16 abandoned line reopens on material forward, backward or height movement but ignores small jitter',()=>{
  const exercise=({delta=0,height=.0})=>{
    let ground=0;const u=unit('MOVE-'+delta+'-'+height),h=harness({decisionPeriod:.25,blockedRetry:.5,lossGrace:.5,observationHold:.5,blockedAlongChange:192,blockedHeightChange:.5},{groundHeight:()=>ground});const a=addContact(u,'A',{x:500});h.assign(u,'halt');let now=h.advance([u],.5);assert(h.runtime.fireBlocked(u,'A','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],1.1,now);assert(h.runtime.fireBlocked(u,'A','fire-line-blocked',now));u.observation.designation.status='lost';now=h.advance([u],1.8,now);let state=h.runtime.inspect(u);assert(state.blockedCandidates.A.abandoned);const commands=state.counters.targetCommands;
    u.x+=Math.sign(delta)*4;ground=.2;now=h.advance([u],2.3,now);state=h.runtime.inspect(u);assert.equal(state.counters.targetCommands,commands);assert(!state.blockedCandidates.A.probePending);
    u.x+=delta;ground=height;now=h.advance([u],2.8,now);state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'A');assert(state.blockedCandidates.A.probePending);assert.equal(state.counters.stops,1);assert.equal(state.counters.resumes,1);
    assert(u.fireControl.autoSuppressed);assert(h.calls.probe.includes(a.key));u.fireControl.lineProbeQueries=state.blockedCandidates.A.probeQueries+1;u.fireControl.lineProbeTarget=a.key;u.fireControl.lineProbeBlocked=false;u.fireControl.lineProbeResult='clear';now=h.advance([u],3.1,now);state=h.runtime.inspect(u);assert(!Object.hasOwn(state.blockedCandidates,'A'));return state;
  };
  exercise({delta:193});exercise({delta:-193});exercise({height:.6});
});

test('W16 manual ownership outside range and rejected automatic handoff are not successful engagements',()=>{
  const u=unit('MANUAL-RANGE'),h=harness({decisionPeriod:.25,lossGrace:.5,observationHold:.5});addContact(u,'A',{x:500});addContact(u,'B',{x:2200});u.observation.designation={status:'waiting',target:'B',key:'contact-B',source:'manual',pose:{x:2200,y:0},reason:'range'};h.assign(u,'halt');let now=h.advance([u],1);let state=h.runtime.inspect(u);assert.equal(u.observation.designation.source,'manual');assert.equal(u.observation.designation.target,'B');assert.equal(state.mission.status,'active');assert.equal(state.counters.stops,0);assert.equal(state.counters.targetCommands,0);assert.equal(h.calls.select.length,0);
  u.observation.designation={status:'cancelled',source:'manual'};h.runtime.manualChanged(u,now);now=h.advance([u],1.5,now);state=h.runtime.inspect(u);assert.equal(state.autoTargetId,'A');assert.equal(state.mission.status,'paused');assert.equal(state.counters.stops,1);
  const rejected=unit('REJECTED'),r=harness({decisionPeriod:.25},{reject:new Set(['A'])});addContact(rejected,'A',{x:500});r.assign(rejected,'halt');r.advance([rejected],1);const rejectedState=r.runtime.inspect(rejected);assert.equal(rejectedState.counters.targetCommands,0);assert.equal(rejectedState.counters.stops,0);assert.equal(rejectedState.mission.status,'active');assert.equal(rejected.observation.designation.status,'idle');assert(r.calls.events.some(e=>e.type==='target-command-rejected'));
});
