'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/vehicle-profiles.js'),Observation=require('../src/observation.js');
const C=()=>require('./load.cjs')();
const deg=value=>value*Math.PI/180;
const delta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('WIP22 T-80U observation/traverse data remains unchanged after WIP23 fire extension',()=>{
 const p=Profiles.T80U_1989;
 assert.deepEqual(p.capabilities,{target:true,mobility:false,observation:true,fire:true,ai:false});
 assert.equal(p.sensors.hunterKiller,false);assert.equal(p.sensors.commanderDesignation,true);
 assert.equal(p.sensors.ambient.range,200);assert.equal(p.sensors.ambient.fov,Math.PI*2);
 assert.equal(p.sensors.commander.range,2000);assert.equal(p.sensors.commander.fov,Math.PI/2);assert.equal(p.sensors.commander.eyeHeight,2.5);assert.equal(p.sensors.commander.rate,deg(40));assert.equal(p.sensors.commander.scan.amplitude,Math.PI);assert.equal(p.sensors.commander.scan.period,90);assert.equal(p.sensors.commander.scan.rate,deg(12));
 assert.equal(p.sensors.gunner.range,2000);assert.equal(p.sensors.gunner.fov,Math.PI/6);assert.equal(p.sensors.gunner.eyeHeight,2.15);assert.equal(p.sensors.gunner.rate,deg(24));assert.equal(p.sensors.gunner.scan.amplitude,Math.PI/6);assert.equal(p.sensors.gunner.scan.period,24);assert.equal(p.sensors.gunner.scan.rate,deg(8));
 assert.equal(p.sensors.tuning.commanderHandoffSeconds,.5);assert.equal(p.sensors.tuning.acquireSeconds,.4);
 assert.equal(p.mobility,undefined);assert.equal(p.fireControl.readiness.loading.type,'automatic');assert.equal(p.ammoIncidents.enabled,false);assert.equal(p.hitReactions.enabled,false);
 assert.equal(Profiles.M1A2.sensors.commanderDesignation,undefined);assert.equal(Profiles.M1A2.sensors.hunterKiller,true);assert.equal(Profiles.M1A2.sensors.tuning.commanderHandoffSeconds,undefined);
});

test('WIP22 registry validates observation-only declarations without weakening full profiles',()=>{
 const clean=()=>{const p=structuredClone(Profiles.T80U_1989);p.id='T80U_TEST';return p;};
 assert.doesNotThrow(()=>Profiles.registry.create([clean()]));
 for(const mutate of [
   p=>p.sensors.commander.rate=0,p=>p.sensors.gunner.rate=Infinity,p=>p.sensors.commander.fov=Math.PI*2+.01,
   p=>p.sensors.gunner.scan.period=0,p=>p.sensors.commander.scan.rate=p.sensors.commander.rate+.01,
   p=>p.sensors.tuning.acquireSeconds=0,p=>p.sensors.tuning.commanderHandoffSeconds=-.01,
   p=>p.capabilities.observation=false,p=>{p.fireControl.maxRange=0;}
 ]){const p=clean();mutate(p);assert.throws(()=>Profiles.registry.create([p]));}
 const full=structuredClone(Profiles.M1A2);full.id='M1_TEST';delete full.mobility;assert.throws(()=>Profiles.registry.create([full]));
});

test('WIP22 runtime capability mask only narrows declared capabilities',()=>{
 const core=C(),enabled=core.makeTank('U','T80',100,100,0,'red','T80U_1989'),disabled=core.makeTank('D','T80',120,100,0,'red','T80U_1989','auto',{capabilityMask:{observation:false,fire:false}});
 assert(core.can(enabled,'observation'));assert(enabled.observation);assert(core.can(enabled,'fire'));assert(enabled.fireControl);assert(!core.can(enabled,'mobility'));assert.equal(enabled.drive,undefined);
 assert(!core.can(disabled,'observation'));assert.equal(disabled.observation,undefined);
 assert.throws(()=>core.makeTank('X','bad',0,0,0,'red','T80U_1989','auto',{capabilityMask:{mobility:true}}),/비활성/);
 assert.throws(()=>core.makeTank('X','bad',0,0,0,'red','T80U_1989','auto',{capabilityMask:{unknown:false}}),/마스크/);
});

test('WIP22 keeps WIP21 armour targets inert while the observation trial creates only sensor state',()=>{
 const core=C(),armor=core.createScenario(7,{scenarioId:'t80u-armor'}),trial=core.createScenario(7,{scenarioId:'t80u-observation',recordObservationEvents:true});
 const old=armor.units.filter(u=>u.profileId==='T80U_1989'),before=old.map(u=>[u.x,u.y,u.heading,u.turret,u.commander]);for(let i=0;i<120;i++)core.step(armor,.05);
 assert.deepEqual(old.map(u=>[u.x,u.y,u.heading,u.turret,u.commander]),before);assert(old.every(u=>!u.observation&&!core.can(u,'observation')));
 const t80=trial.units.find(u=>u.profileId==='T80U_1989'),m1=trial.units.find(u=>u.team==='blue');
 assert(t80.observation);assert(!t80.drive&&!t80.fireControl&&!t80.ai&&!t80.hitReactions&&!t80.hitReactionModifiers);assert.equal(t80.state,'대기');
 assert.equal(core.fireStatus(trial,m1).mode,'hold');assert.equal(core.fireMode(trial,m1,'auto'),true);assert.equal(core.fireStatus(trial,m1).mode,'auto');
 assert.equal(core.issueMove(t80,{x:500,y:500},false,trial.units).ok,false);assert.equal(core.assignMission(trial,t80,{id:'x',type:'move',waypoints:[{x:1,y:1}]}),null);assert.equal(core.requestFire(trial,t80,'x').reason,'disabled');
});

test('WIP22 real core performs seeded search, commander handoff, physical slew and gunner acquisition',()=>{
 const core=C(),s=core.createScenario(7,{scenarioId:'t80u-observation',recordObservationEvents:true}),u=s.units.find(v=>v.profileId==='T80U_1989'),target=s.units.find(v=>v.team==='blue');
 const fixed={x:u.x,y:u.y,heading:u.heading},initialBearing=Math.atan2(target.y-u.y,target.x-u.x);assert(delta(initialBearing,u.commander)>u._profile.sensors.commander.fov/2);
 let previous={turret:u.turret,commander:u.commander},scanTurret=0,scanCommander=0,allTurret=0,allCommander=0;
 for(let i=0;i<1200;i++){
   core.step(s,.05);const td=delta(u.turret,previous.turret),cd=delta(u.commander,previous.commander);allTurret=Math.max(allTurret,td);allCommander=Math.max(allCommander,cd);
   if(s.time<35){scanTurret=Math.max(scanTurret,td);scanCommander=Math.max(scanCommander,cd);}previous={turret:u.turret,commander:u.commander};
 }
 assert.deepEqual({x:u.x,y:u.y,heading:u.heading},fixed);assert(allTurret<=deg(24)*.05+1e-12);assert(allCommander<=deg(40)*.05+1e-12);assert(scanTurret<=deg(8)*.05+1e-12);assert(scanCommander<=deg(12)*.05+1e-12);
 const events=s.observationEvents.filter(e=>e.observer===u.id),find=type=>events.find(e=>e.type===type),detected=find('detected'),identified=find('identified'),queued=find('candidate-queued'),designated=find('designated'),acquired=find('target-acquired');
 assert(detected&&identified&&queued&&designated&&acquired);assert.equal(detected.channel,'commander');assert.equal(identified.channel,'commander');assert.equal(designated.source,'commander');assert.equal(acquired.source,'commander');
 assert(designated.time-identified.time>=.5-1e-9);assert(acquired.time>designated.time);assert.equal(core.ownObservation(s,u).status,'acquired');
 const gunnerSeen=events.find(e=>e.type==='channel-seen'&&e.channel==='gunner'&&e.time>=designated.time);assert(gunnerSeen);assert(acquired.time-gunnerSeen.time>=.4-1e-9);
 assert.equal(core.fireStatus(s,u).status,'disabled');assert.equal(core.aiStatus(s,u).status,'disabled');
});

test('WIP22 ambient channel detects a silhouette but cannot identify it',()=>{
 const p=structuredClone(Profiles.T80U_1989);p.sensors.commander.enabled=false;p.sensors.gunner.enabled=false;
 const observer={id:'O',team:'blue',x:0,y:0,heading:0,turret:0,commander:0,profile:p},target={id:'T',name:'hidden type',team:'red',x:-100,y:0,heading:0,turret:0,commander:0,profile:Profiles.M1A2};
 const runtime=Observation.create({profileOf:u=>u.profile,seed:13,exposure:()=>({visible:true,forestDepth:0,samples:[{x:target.x,y:target.y,visible:true,forestDepth:0,part:'hull'}]})});Observation.init(observer);
 for(let i=1;i<=200;i++)runtime.advance([observer],.05,i*.05,[observer,target]);
 const c=Object.values(observer.observation.contacts)[0];assert(c?.detected);assert.equal(c.detectedBy,'ambient');assert.equal(c.identified,false);assert.equal(c.enemyConfirmed,false);assert.equal(c.known,null);
});

test('WIP22 loss tracks only the last observed pose and destruction stops both axes',()=>{
 const core=C(),s=core.createScenario(7,{scenarioId:'t80u-observation'}),u=s.units.find(v=>v.profileId==='T80U_1989'),target=s.units.find(v=>v.team==='blue');
 for(let i=0;i<1200&&core.ownObservation(s,u).status!=='acquired';i++)core.step(s,.05);assert.equal(core.ownObservation(s,u).status,'acquired');
 const contact=Object.values(u.observation.contacts).find(c=>c.key===core.ownObservation(s,u).targetKey),last={x:contact.pose.x,y:contact.pose.y};
 target.x=u.x;target.y=u.y+400;for(let i=0;i<10;i++)core.step(s,.05);
 assert.deepEqual({x:contact.pose.x,y:contact.pose.y},last);assert(delta(u.turret,Math.atan2(last.y-u.y,last.x-u.x))<delta(u.turret,Math.atan2(target.y-u.y,target.x-u.x)));
 u.combat.status='destroyed';u.combat.hp=0;const fixed=[u.turret,u.commander];for(let i=0;i<100;i++)core.step(s,.05);assert.deepEqual([u.turret,u.commander],fixed);
});

test('WIP22 fixed-step results are deterministic across render batching and queries do not advance without steps',()=>{
 const core=C(),a=core.createScenario(73,{scenarioId:'t80u-observation'}),b=core.createScenario(73,{scenarioId:'t80u-observation'});
 const before=core.observationStats(a).queries;for(let i=0;i<100;i++){core.contacts(a);core.observationView(a,a.units[1]);core.ownObservation(a,a.units[1]);}assert.equal(core.observationStats(a).queries,before);
 for(let i=0;i<1200;i++)core.step(a,.05);for(let frame=0;frame<300;frame++)for(let tick=0;tick<4;tick++)core.step(b,.05);
 const state=s=>({units:s.units.map(u=>({x:u.x,y:u.y,heading:u.heading,turret:u.turret,commander:u.commander,observation:u.observation})),contacts:core.contacts(s),stats:core.observationStats(s)});
 assert.deepEqual(state(a),state(b));
});


test('WIP22 a real observed lethal impact freezes the commander independently from the turret',()=>{
 const core=C(),s=core.createScenario(7,{scenarioId:'t80u-observation',recordFireEvents:true}),target=s.units.find(u=>u.team==='red'),blue=s.units.find(u=>u.team==='blue');
 // Natural search and handoff. Only HP is lowered to keep the lethal fixture short.
 for(let i=0;i<1200;i++)core.step(s,.05);
 const contact=core.contacts(s).find(c=>c.current&&c.identified);assert(contact);assert(core.designate(s,blue,contact.key));target.combat.hp=1;
 let shots=0;for(let i=0;i<4000&&target.combat.status!=='destroyed';i++){
   // Wait for naturally separated headings before starting the lethal flight.
   if(delta(target.commander,target.turret)>2*Math.PI/3&&core.fireStatus(s,blue,contact.key).canFire){assert(core.requestFire(s,blue,contact.key).ok);shots++;}
   core.step(s,.05);
 }
 assert(shots>0);assert.equal(target.combat.status,'destroyed');assert(delta(target.commander,target.turret)>Math.PI/2,'fixture must distinguish the two headings');
 const wreck=core.contacts(s).find(c=>c.wreck&&c.key===contact.key);assert(wreck);assert(delta(wreck.commander,target.commander)<1e-9);assert(delta(wreck.turret,target.turret)<1e-9);
 const fixed=[wreck.commander,wreck.turret];for(let i=0;i<100;i++)core.step(s,.05);
 const after=core.contacts(s).find(c=>c.key===contact.key);assert.deepEqual([after.commander,after.turret],fixed);
 assert.equal(target.drive,undefined);assert.equal(target.fireControl,undefined);
});
