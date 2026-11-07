// Source-rule reproduction: synthetic nine samples, no terrain or UI stubs
// masquerading as actual core/browser verification. Baseline source is read via
// git show into an isolated function; no checkout or worktree reset.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const {fixture}=require('../tests/helpers/observation-fixture.cjs');
const ref=process.argv[2]||null;
const load=file=>new Function('module',execFileSync('git',['show',ref+':src/'+file],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'})+'\nreturn module.exports;')({exports:{}});
const O=ref?load('observation.js'):require('../src/observation.js'),P=ref?load('vehicle-profiles.js').M1A2:require('../src/vehicle-profiles.js').M1A2;
const cases=[];
for(const hk of [true,false]){
 const f=fixture({bearing:1.5,observation:O,profileBase:P});f.p.sensors.hunterKiller=hk;f.guard();
 const events={},trace=[];for(let i=0;i<200;i++){f.step();const c=f.u.observation.contacts['SECRET-ID'],s=f.u.observation;
  if(c?.detected&&!events.detected)events.detected=f.s.time;
  if(c?.identified&&!events.identified)events.identified=f.s.time;
  if(s.gunner.focus&&!events.gunnerFocus){events.gunnerFocus=f.s.time;events.atFocus={channels:c.channels,identified:c.identified,designation:s.designation.status};}
  if(s.designation.status==='designated'&&!events.designated)events.designated=f.s.time;
  if(s.designation.status==='acquired'&&!events.acquired)events.acquired=f.s.time;
  if(i%10===0)trace.push({time:f.s.time,turret:f.u.turret,commander:f.u.commander,channels:c?.channels||[],identified:c?.identified||false,status:s.designation.status});
 }cases.push({issue:'commander-only pre-identification gunner focus',hk,seed:7,bearing:1.5,events,trace,transitions:f.events});
}
const f=fixture({distance:150,observation:O,profileBase:P});f.p.sensors.gunner.enabled=false;f.p.sensors.hunterKiller=false;f.guard();f.step(1.2);
const c=f.u.observation.contacts['SECRET-ID'],before=c.identityEvidence;f.p.sensors.commander.enabled=false;f.step(20);
cases.push({issue:'unfinished identity decay with ambient-only observation',seed:7,initialSeconds:1.2,ambientSeconds:20,initial:before,threshold:c.identifyAt,identified:c.identified,after:c.identityEvidence,ratio:c.identityEvidence/before,expectedRatio:Math.pow(.5,20/8)});
const result={source:ref||'working tree',kind:'synthetic observation fixture',cases};
const target=path.resolve(__dirname,'../tests/releases/WIP07A-'+(ref?'before':'after')+'.json');fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({source:result.source,cases:cases.map(({trace,transitions,...c})=>c)},null,2));
