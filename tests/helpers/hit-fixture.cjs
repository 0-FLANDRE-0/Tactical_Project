// Test-only synthetic visible samples; never performs a terrain/LOS query.
const P=require('../../src/vehicle-profiles.js').M1A2,F=require('../../src/fire-control.js');
function exposure(hull=Array(6).fill(true),turret=Array(3).fill(true)){
 const samples=[];P.exposure.hullAlong.forEach((along,col)=>P.exposure.hullHeights.forEach((z,row)=>samples.push({part:'hull',col,row,along,z,x:0,y:0,visible:!!hull[col*2+row],forestDepth:0})));
 P.exposure.turretAlong.forEach((along,col)=>samples.push({part:'turret',col,row:0,along,z:P.exposure.turretHeight,x:0,y:0,visible:!!turret[col],forestDepth:0}));
 return{hull:hull.filter(Boolean).length/6,turret:turret.filter(Boolean).length/3,samples};
}
const pose=(x=1000,y=0,heading=Math.PI,turret=heading)=>({x,y,heading,turret,model:structuredClone(P.model)});
function fixture(seed=7,sourceProfile=P){
 const profile=structuredClone(sourceProfile),c={identified:true,enemyConfirmed:true,pose:{...pose(),model:structuredClone(profile.model)},sources:{gunner:{current:true,lastSeen:0}},gunnerExposure:exposure()},u={id:'A',team:'blue',x:0,y:0,heading:0,turret:0,speed:0,observation:{designation:{status:'acquired',target:'PRIVATE',key:'contact-1',source:'manual'},tracking:{status:'idle'},contacts:{PRIVATE:c}}};
 let blocked=false,calls=0,time=0,fresh=null,observed=true,cover=false,gone=false;const rolls=[];
 const runtime=F.create({seed,profileOf:()=>profile,debug:true,onDecisionRoll:kind=>rolls.push(kind),isObserved:()=>observed,
  impactEnvironment:{heightAt:()=>0,buildingAt:()=>null,world:{w:5000,h:5000}},
  impactSight:()=>{const e=structuredClone(c.gunnerExposure);if(cover)for(const sample of e.samples)sample.visible=false;return{...e,visible:!cover&&!gone,gone,presented:structuredClone(profile.fireControl.presented),pose:structuredClone(c.pose)};},
  freshSight:()=>{calls++;return{...(fresh||c.gunnerExposure),visible:!blocked,fireEye:2.2,presented:structuredClone(profile.fireControl.presented),reason:'fire-line-blocked',pose:structuredClone(c.pose)};}});F.init(u,profile,'hold');
 const tickAt=(now,observe=true)=>{time=now;if(observe&&c.sources.gunner.current)c.sources.gunner.lastSeen=time;runtime.step([u],.05,time);};
 const step=(seconds=.05,move=null)=>{for(let i=0;i<Math.round(seconds/.05);i++){move?.(c,u,time+.05);tickAt(time+.05);}};
 const land=()=>{let count=0;while(runtime.view(u).inFlight.length&&count++<110)step();};
 return{profile,u,c,runtime,step,tickAt,land,rolls:()=>[...rolls],observed:v=>observed=v,cover:v=>cover=v,gone:v=>gone=v,view:()=>runtime.view(u),fire:()=>runtime.request(u,'contact-1',time),block:v=>blocked=v,fresh:v=>fresh=v,calls:()=>calls,time:()=>time};
}
module.exports={exposure,pose,fixture,P,F};
