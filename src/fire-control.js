'use strict';
/* Abstract video-game firing states and independent hit/part rolls. No real
 * fire-control solution, projectile trajectory, armour penetration or damage. */
const TacticalFireControl=(()=>{
  const G=typeof TacticalVehicleGeometry!=='undefined'?TacticalVehicleGeometry:require('./vehicle-geometry.js');
  const zones=['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function random(text,seed){let n=(2166136261^seed^0x51f15e)>>>0;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);return((n^(n>>>15))>>>0)/4294967296;}
  const active=s=>['designated','waiting','acquiring','acquired'].includes(s?.status);
  function mission(u){const o=u.observation;return active(o?.designation)?o.designation:active(o?.tracking)?o.tracking:null;}
  function init(u,p){
    return u.fireControl??={status:'no-target',reason:'no-target',targetKey:null,aimProgress:0,aimElapsed:0,ammo:p.fireControl.testRounds,
      shotCount:0,nextShotAt:0,pending:null,lastShot:null,hitChance:null,zoneProbabilities:null,previousSample:null,targetMotion:0};
  }
  function distribution(observer,pose,exposure,f){
    const result=Object.fromEntries(zones.map(z=>[z,0])),hull=clamp(exposure.hull,0,1)*f.zoneWeights.hull,turret=clamp(exposure.turret,0,1)*f.zoneWeights.turret,total=hull+turret;
    if(!(total>0))return result;
    const incoming=Math.atan2(observer.y-pose.y,observer.x-pose.x);
    function group(prefix,heading,amount){
      const a=diff(incoming,heading),front=Math.max(0,Math.cos(a)),side=Math.abs(Math.sin(a)),rear=Math.max(0,-Math.cos(a)),sum=front+side+rear;
      result[prefix+'Front']=amount/total*front/sum;result[prefix+'Side']=amount/total*side/sum;result[prefix+'Rear']=amount/total*rear/sum;
    }
    group('hull',pose.heading,hull);group('turret',pose.turret,turret);
    // Upper is reserved: there is no elevation/top-attack model in this stage.
    return result;
  }
  function estimate(observer,pose,exposure,f,targetMotion=0){
    const distance=Math.hypot(pose.x-observer.x,pose.y-observer.y),weight=f.zoneWeights.hull+f.zoneWeights.turret;
    const visible=(clamp(exposure.hull,0,1)*f.zoneWeights.hull+clamp(exposure.turret,0,1)*f.zoneWeights.turret)/weight;
    const accuracy=f.accuracyNear+(f.accuracyFar-f.accuracyNear)*clamp(distance/f.maxRange,0,1);
    const own=1-f.selfMotionPenalty*clamp(Math.abs(observer.speed||0)/f.motionReference,0,1),moving=1-f.targetMotionPenalty*clamp(targetMotion/f.motionReference,0,1);
    return{hitChance:distance<=f.maxRange?clamp(accuracy*own*moving*visible,0,1):0,zoneProbabilities:distribution(observer,pose,exposure,f)};
  }
  function resolve(hitChance,probabilities,hitRoll,zoneRoll){
    if(!(hitRoll<hitChance))return{hit:false,zone:null};
    let cumulative=0,last=null;for(const z of zones){if(probabilities[z]>0)last=z;cumulative+=probabilities[z];if(zoneRoll<cumulative)return{hit:true,zone:z};}
    return last?{hit:true,zone:last}:{hit:false,zone:null};
  }
  function create({profileOf,freshSight,seed=7}){
    const events=[];
    function inspect(u,now){
      const p=profileOf(u),f=p.fireControl,s=init(u,p),d=mission(u),c=d?u.observation.contacts[d.target]:null;
      if(!f.enabled||!p.weapons.mainGun.enabled||!p.sensors.gunner.enabled)return{reason:'disabled'};
      if(!d)return{reason:'no-target'};
      if(d.status!=='acquired')return{reason:'not-acquired',d,c};
      if(!c?.identified||!c.enemyConfirmed)return{reason:'unidentified',d,c};
      if(!c.sources.gunner.current||now-c.sources.gunner.lastSeen>p.sensors.tuning.queryPeriod+1e-6||!c.pose)return{reason:'own-sight-lost',d,c};
      const distance=Math.hypot(c.pose.x-u.x,c.pose.y-u.y);
      if(distance>f.maxRange||distance>p.sensors.gunner.range)return{reason:'range',d,c};
      const error=Math.abs(diff(Math.atan2(c.pose.y-u.y,c.pose.x-u.x),u.turret));
      if(error>f.alignmentTolerance)return{reason:'aligning',d,c};
      if(s.ammo<=0)return{reason:'out-of-ammo',d,c};
      if(now<s.nextShotAt)return{reason:'interval',d,c};
      return{reason:null,d,c};
    }
    function step(units,dt,now){
      for(const u of units){
        const p=profileOf(u),f=p.fireControl,s=init(u,p),check=inspect(u,now),{d,c}=check;
        if(s.targetKey!==d?.key){s.targetKey=d?.key??null;s.aimElapsed=0;s.aimProgress=0;s.previousSample=null;s.targetMotion=0;}
        if(c?.sources.gunner.current&&c.pose&&s.previousSample?.time!==c.sources.gunner.lastSeen){
          const previous=s.previousSample;
          if(previous&&c.sources.gunner.lastSeen>previous.time)s.targetMotion=Math.hypot(c.pose.x-previous.x,c.pose.y-previous.y)/(c.sources.gunner.lastSeen-previous.time);
          s.previousSample={x:c.pose.x,y:c.pose.y,time:c.sources.gunner.lastSeen};
        }
        if(check.reason){s.status=check.reason==='interval'?'interval':check.reason==='aligning'?'aligning':'blocked';if(check.reason==='no-target')s.status='no-target';s.reason=check.reason;s.aimElapsed=0;s.aimProgress=0;s.hitChance=null;s.zoneProbabilities=null;}
        else{
          s.aimElapsed=Math.min(f.aimSeconds,s.aimElapsed+dt);s.aimProgress=clamp(s.aimElapsed/f.aimSeconds,0,1);
          s.status=s.aimProgress>=1-1e-9?'ready':'aiming';s.reason=null;
          const ex=c.gunnerExposure||{hull:0,turret:0},preview=estimate(u,c.pose,ex,f,s.targetMotion);s.hitChance=preview.hitChance;s.zoneProbabilities=preview.zoneProbabilities;
        }
        if(!s.pending)continue;
        const request=s.pending;s.pending=null;
        if(s.status!=='ready'||request.key!==s.targetKey){s.lastRejection=check.reason||'target-changed';continue;}
        // A fire command must recheck its own current range/FOV/terrain samples;
        // an old 10Hz contact or team knowledge cannot authorize a shot.
        const sight=freshSight(u,d.target);
        if(!sight?.visible){s.status='blocked';s.reason=sight?.reason||'fresh-sight-failed';s.aimElapsed=0;s.aimProgress=0;s.lastRejection=s.reason;s.hitChance=null;s.zoneProbabilities=null;continue;}
        const pose=sight.pose,range=Math.hypot(pose.x-u.x,pose.y-u.y);
        if(range>f.maxRange||Math.abs(diff(Math.atan2(pose.y-u.y,pose.x-u.x),u.turret))>f.alignmentTolerance){s.status='aligning';s.reason='fresh-alignment-failed';s.aimElapsed=0;s.aimProgress=0;s.hitChance=null;s.zoneProbabilities=null;continue;}
        const chance=estimate(u,pose,sight,f,s.targetMotion),number=s.shotCount+1;
        const result=resolve(chance.hitChance,chance.zoneProbabilities,random(u.id+':'+number+':hit',seed),random(u.id+':'+number+':zone',seed));
        const shot={id:u.id+'-shot-'+number,time:now,team:u.team,shooterId:u.id,targetKey:s.targetKey,source:d.source,
          origin:G.muzzleWorld(u,p.model),muzzleHeading:u.turret,
          targetPose:{x:pose.x,y:pose.y,heading:pose.heading,turret:pose.turret},...chance,...result,ammoRemaining:s.ammo-1};
        events.push(shot);if(events.length>200)events.shift();s.shotCount=number;s.ammo--;s.lastShot=shot;s.nextShotAt=now+f.shotIntervalSeconds;s.aimElapsed=0;s.aimProgress=0;s.status='interval';s.reason='interval';
      }
    }
    function request(u,key,now){
      const s=init(u,profileOf(u)),check=inspect(u,now);
      if(s.pending)return{ok:false,reason:'pending'};
      if(check.reason||s.status!=='ready'||key!==s.targetKey)return{ok:false,reason:check.reason||'not-ready'};
      s.pending={key};return{ok:true};
    }
    function view(u,key=null){
      const s=init(u,profileOf(u)),same=!key||key===s.targetKey;
      return{status:s.status,reason:s.reason,targetKey:s.targetKey,aimProgress:s.aimProgress,ammo:s.ammo,pending:!!s.pending,
        canFire:same&&s.status==='ready'&&!s.pending,hitChance:same?s.hitChance:null,zoneProbabilities:same&&s.zoneProbabilities?{...s.zoneProbabilities}:null,
        shotCount:s.shotCount,lastShot:s.lastShot?JSON.parse(JSON.stringify(s.lastShot)):null};
    }
    function cancel(u){const s=init(u,profileOf(u));s.pending=null;s.aimElapsed=0;s.aimProgress=0;s.status='blocked';s.reason='cancelled';s.hitChance=null;s.zoneProbabilities=null;}
    const publicEvents=(team,since=-Infinity)=>events.filter(e=>e.team===team&&e.time>=since).map(e=>JSON.parse(JSON.stringify(e)));
    return{step,request,view,cancel,events:publicEvents};
  }
  return Object.freeze({create,init,estimate,distribution,resolve,zones:Object.freeze(zones)});
})();
if(typeof module!=='undefined')module.exports=TacticalFireControl;
